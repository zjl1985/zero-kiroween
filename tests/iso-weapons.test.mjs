import assert from "node:assert/strict";
import { test } from "node:test";
import { WEAPON_ART } from "../dist/render/art-index.js";
import { drawBoltFlight, paintSoundBlade } from "../dist/render/pixel-primary-weapons.js";
import { atFoot } from "../dist/render/iso/place.js";
import { ISO, depthKey, snap, toScreen } from "../dist/render/iso/projection.js";
import { observeLaunch } from "../dist/game/combat-observation.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { createSim, orbitPositions, step } from "../dist/game/sim.js";
import { playerStats } from "../dist/game/upgrades.js";
import { FIXED_DT } from "../dist/game/clock.js";

// Screen-geometry contracts only; the iso projectiles were not viewed in a browser.
// A context that tracks translate / uniform scale (atFoot's upright transform) and records drawImage / fillRect in screen pixels.
function tracker() {
  const stack = [], images = [], rects = [];
  let state = { tx: 0, ty: 0, s: 1, globalAlpha: 1, fillStyle: "#000" };
  const ctx = new Proxy({}, {
    get: (_, key) => {
      if (key === "images") return images;
      if (key === "rects") return rects;
      if (key === "save") return () => stack.push({ ...state });
      if (key === "restore") return () => { state = stack.pop(); assert.ok(state, "balanced saves"); };
      if (key === "translate") return (x, y) => { state.tx += x * state.s; state.ty += y * state.s; };
      if (key === "scale") return (x) => { state.s *= x; };
      if (key === "drawImage") return (img, x, y, w, h) => images.push({ img, x: x * state.s + state.tx, y: y * state.s + state.ty, w: (w ?? img.width) * state.s, h: (h ?? img.height) * state.s });
      if (key === "fillRect") return (x, y, w, h) => rects.push({ x: x * state.s + state.tx, y: y * state.s + state.ty, w: w * state.s, h: h * state.s, color: state.fillStyle });
      if (key in state) return state[key];
      return () => {};
    },
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return ctx;
}
function mockCanvas() {
  const c = { width: 0, height: 0 };
  c.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
  return c;
}
function environment(t) {
  clearSpriteCache();
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: { createElement: mockCanvas } });
  t.after(() => { old ? Object.defineProperty(globalThis, "document", old) : delete globalThis.document; clearSpriteCache(); });
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
}
const centre = (im) => ({ x: im.x + im.w / 2, y: im.y + im.h / 2 });

test("moon stars stand at the projection of their sim positions, on a 2:1 ellipse, sorted by their own foot", (t) => {
  environment(t);
  const sim = createSim({ cat: "nicole", seed: 7 });
  for (let i = 0; i < 40; i++) step(sim, { ax: 0, ay: 0, dash: false }, FIXED_DT);
  const before = structuredClone(sim), stars = orbitPositions(sim), r = playerStats(sim).orbitRadius;
  assert.ok(stars.length >= 1);
  const added = [], ctx = tracker();
  WEAPON_ART.get("moon-stars").sprites(ctx, sim, 1.2, (y, draw, foot) => added.push({ y, draw, foot }));
  assert.equal(added.length, stars.length);
  const o = toScreen(sim.player.x, sim.player.y);
  added.forEach((a, i) => {
    assert.deepEqual(a.foot, stars[i], "the hook passes the sim position as the foot");
    assert.equal(depthKey(a.foot.x, a.foot.y) + (a.y - a.foot.y), depthKey(stars[i].x, stars[i].y), "sorted by depthKey of the star");
    const n = ctx.images.length;
    atFoot(ctx, a.foot.x, a.foot.y, a.draw);
    assert.equal(ctx.images.length, n + 1);
    const im = ctx.images.at(-1), s = toScreen(stars[i].x, stars[i].y), c = centre(im);
    // Upright art draws at UPRIGHT_SCALE (0.5): the star floats 7 native px above its ground point.
    assert.ok(Math.abs(c.x - snap(s.x)) <= 0.5, `star ${i} x`);
    assert.ok(Math.abs(c.y - (snap(s.y) - 7)) <= 0.5, `star ${i} y (7 px above its ground point)`);
    // The screen offset from the cat lies on the projected orbit: semi-axes r*sqrt2*k and r*sqrt2*k/2.
    const k = ISO.k, ex = (s.x - o.x) / (r * Math.SQRT2 * k), ey = (s.y - o.y) / (r * Math.SQRT2 * k / 2);
    assert.ok(Math.abs(ex * ex + ey * ey - 1) < 0.02, `star ${i} on the 2:1 ellipse`);
  });
  // Over a full turn the screen orbit is twice as wide as it is tall.
  const xs = [], ys = [];
  for (let i = 0; i < 120; i++) {
    step(sim, { ax: 0, ay: 0, dash: false }, FIXED_DT);
    const p = toScreen(sim.player.x, sim.player.y);
    for (const q of orbitPositions(sim)) { const s = toScreen(q.x, q.y); xs.push(s.x - p.x); ys.push(s.y - p.y); }
  }
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.abs(w / h - 2) < 0.1, `orbit aspect ${w / h}`);
  assert.ok(before, "snapshot taken before the extra steps");
});

test("the meow bolt is drawn at the projection of the shot and turns with the projected heading", (t) => {
  environment(t);
  for (const [vx, vy] of [[300, 0], [0, 300], [-212, 212], [212, 212], [-300, -40]]) {
    const shot = { id: 1, x: 420.3, y: 310.8, vx, vy, life: 0.5, alive: true };
    const ctx = tracker();
    atFoot(ctx, shot.x, shot.y, () => drawBoltFlight(ctx, shot, 0));
    assert.equal(ctx.images.length, 1, "no launch mark without an observed launch");
    const im = ctx.images[0], s = toScreen(shot.x, shot.y), c = centre(im);
    assert.ok(Math.abs(c.x - snap(s.x)) <= 0.5 && Math.abs(c.y - (snap(s.y) - 7)) <= 0.5, `bolt at its projected point (${vx}, ${vy})`);
    // The cached blade is the one for the projected velocity.
    const h = toScreen(vx, vy), probe = tracker();
    paintSoundBlade(probe, 0, 0, h.x, h.y);
    assert.equal(im.img, probe.images[0].img, `projected heading (${vx}, ${vy})`);
    const flat = tracker();
    paintSoundBlade(flat, 0, 0, vx, vy);
    if (Math.round(Math.atan2(h.y, h.x) * 8 / Math.PI) !== Math.round(Math.atan2(vy, vx) * 8 / Math.PI))
      assert.notEqual(im.img, flat.images[0].img, "not the top-down heading");
  }
});

test("the bolt's launch mark sits at the projected muzzle, not at the world offset", (t) => {
  environment(t);
  const shot = { id: 2, x: 100, y: 200, vx: 300, vy: 0, life: 0.5, alive: true };
  observeLaunch(shot, 1);
  shot.x += 15;
  const ctx = tracker();
  atFoot(ctx, shot.x, shot.y, () => drawBoltFlight(ctx, shot, 1.02));
  assert.ok(ctx.rects.length > 0, "the launch mark draws");
  const muzzle = toScreen(100, 200);
  const mx = ctx.rects.reduce((a, r) => a + r.x, 0) / ctx.rects.length, my = ctx.rects.reduce((a, r) => a + r.y, 0) / ctx.rects.length;
  assert.ok(Math.hypot(mx - muzzle.x, my - (muzzle.y - 7)) < 3, `mark near the projected muzzle (${mx}, ${my})`);
});
