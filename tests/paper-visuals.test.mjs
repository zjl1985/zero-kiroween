import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FIRE } from "../dist/defs/fire.js";
import { LANDMARK_DEFS } from "../dist/defs/registries.js";
import { landmarkActivityPoint } from "../dist/defs/landmark-activities.js";
import { EFFECT_LIFE } from "../dist/game/types.js";
import { clearSpriteCache, spriteCacheSize } from "../dist/engine/sprite.js";
import { ENEMY_ART, LANDMARK_ART, WEAPON_ART } from "../dist/render/art-index.js";
import { drawActorPaperStatus, drawPaperFlame, drawPaperStatusEffect } from "../dist/render/paper-status-art.js";
import { drawFireGround, drawProp, fireSprites } from "../dist/render/craft-props.js";
import { drawLandmarkActivity } from "../dist/render/craft-juice.js";
import { drawCraftShot } from "../dist/render/craft-combat.js";
import { ring, star } from "../dist/render/combat-fx.js";
import { paperOccludesActor } from "../dist/render/world.js";

// Static command contracts only. These do not claim pixel, animation or performance approval.
class Path {
  constructor(source) { this.ops = source instanceof Path ? [...source.ops] : source ? [["path", source]] : []; }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(point) { return point; }
}
function canvas() {
  const c = { width: 400, height: 300 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", filter: "none" };
  const record = (op, args) => calls.push({ op, args, ...state });
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { kind: "paper", setTransform() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key === "depth" ? stack.length : key in state ? state[key] : methods[key] ?? ((...args) => record(key, args)),
    set: (_, key, value) => { state[key] = value; if (key === "filter") record("filter", [value]); return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.mock.method(Date, "now", () => assert.fail("rendering consumes no wall time"));
  t.after(clearSpriteCache);
}
const images = (ctx) => ctx.calls.filter((c) => c.op === "drawImage");
function allPaint(ctx) {
  return ctx.calls.flatMap((c) => c.op === "drawImage" ? [c, ...allPaint(c.args[0].getContext("2d"))] : [c]);
}
function restored(ctx) {
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, "source-over");
  assert.ok(!ctx.calls.some((c) => c.op === "filter" || c.fillStyle?.kind === "paper"), "no live filter or texture pass");
}

test("actor fire and damp paper are distinct, read-only overlays with finite pieces", (t) => {
  environment(t);
  const fire = Object.freeze({ x: 30, y: 50, burnTime: 2, burnClock: 0.4 }),
    wet = Object.freeze({ x: 30, y: 50, wetTime: 1 });
  const a = canvas().getContext("2d"), b = canvas().getContext("2d"), idle = canvas().getContext("2d");
  drawActorPaperStatus(a, fire, 0, 16, 58);
  drawActorPaperStatus(b, wet, 0, 16, 58);
  drawActorPaperStatus(idle, Object.freeze({ x: 0, y: 0 }), 0, 16);
  assert.equal(idle.calls.length, 0);
  assert.ok(allPaint(a).some((c) => c.fillStyle === "#cf6037"));
  assert.ok(allPaint(a).some((c) => c.fillStyle === "#33262b"), "burnt side/hem, not just orange light");
  assert.ok(allPaint(b).some((c) => c.fillStyle === "#83b8c5"));
  assert.ok(!allPaint(b).some((c) => c.fillStyle === "#cf6037"));
  assert.ok(b.calls.some((c) => c.op === "stroke" && c.strokeStyle === "#a5ced0"));
  const both = canvas().getContext("2d");
  drawActorPaperStatus(both, { ...fire, ...wet }, 0, 16);
  assert.ok(!allPaint(both).some((c) => c.fillStyle === "#cf6037"), "wet extinguishing does not show contradictory flames");
  const count = spriteCacheSize();
  for (const time of [0.17, 9, 10000]) {
    drawActorPaperStatus(a, fire, time, 24, 48);
    drawActorPaperStatus(b, wet, time, 9, 20);
    assert.equal(spriteCacheSize(), count);
  }
  restored(a); restored(b); restored(both);
});

test("steam, regrowth, washed ink and rewards have separate cached paper effects", (t) => {
  environment(t);
  const colors = { steam: "#d6ded6", regrow: "#9db484", "ink-wash": "#51405f", "landmark-reward": "#e5c37d" };
  for (const [kind, color] of Object.entries(colors)) {
    const ctx = canvas().getContext("2d"), impact = Object.freeze({ kind, x: 10, y: 20, life: EFFECT_LIFE[kind] * 0.7, seed: 7, radius: 40 });
    assert.equal(drawPaperStatusEffect(ctx, impact), true);
    assert.ok(allPaint(ctx).some((c) => c.fillStyle === color), kind);
    assert.ok(!ctx.calls.some((c) => c.op === "fillText"));
    restored(ctx);
  }
  const count = spriteCacheSize();
  for (const kind of Object.keys(colors)) for (const fraction of [0.1, 0.9]) {
    const ctx = canvas().getContext("2d");
    drawPaperStatusEffect(ctx, { kind, x: -300, y: 90, life: EFFECT_LIFE[kind] * fraction, seed: 88, radius: 100 });
    assert.equal(spriteCacheSize(), count);
  }
  assert.equal(drawPaperStatusEffect(canvas().getContext("2d"), { kind: "hit", x: 0, y: 0, life: 0.1 }), false);
});

test("ground-fire footprint and flame count come only from positive active grid cells", (t) => {
  environment(t);
  const sim = Object.freeze({ fire: Object.freeze({
    cells: Object.freeze({ "0,0": 1, "1,0": 0.8, "2,0": 0, "100,100": 1 }), ash: Object.freeze({ "3,0": 1 }),
  }) });
  const ctx = canvas().getContext("2d"), cam = { x: 0, y: 0 }, added = [];
  drawFireGround(ctx, sim, cam);
  const cells = ctx.calls.filter((c) => c.op === "fillRect" && c.fillStyle === "#633a2b");
  assert.deepEqual(cells.map((c) => c.args), [[0, 0, FIRE.cell, FIRE.cell], [FIRE.cell, 0, FIRE.cell, FIRE.cell]]);
  fireSprites(ctx, sim, cam, 0.2, (y, draw) => added.push({ y, draw }));
  assert.equal(added.length, 2);
  added.forEach((s) => s.draw());
  assert.equal(images(ctx).length, 2, "one flame cut per live visible cell, none for ash/expired cells");
  drawPaperFlame(ctx, 0, 0, 10, 0.2, 0);
  drawPaperFlame(ctx, 0, 0, 10, 0.2, 1);
  const count = spriteCacheSize();
  for (const size of [8, 16, 25]) drawPaperFlame(ctx, 100, 200, size, 0.9, 103);
  assert.equal(spriteCacheSize(), count, "flame height and flicker never create sprites");
});

test("folded/inked props reuse intact cuts, tint only their alpha and leave caller state alone", (t) => {
  environment(t);
  let paints = 0;
  const art = { id: "visual-test-prop", bounds: { l: -12, r: 12, t: -30, b: 4 }, variants: 1, flames: [], scraps: ["#ccbbaa"],
    paint(ctx) { paints++; ctx.fillRect(-5, -20, 10, 20); } };
  const p = Object.freeze({ id: "visual-prop", kind: art.id, x: 40, y: 50, s: 1, seed: 1 });
  const draw = (state) => {
    const ctx = canvas().getContext("2d");
    drawProp(ctx, art, p, 0, false, false, 0, Object.freeze(state));
    restored(ctx);
    return ctx;
  };
  const intact = draw({}), folded = draw({ folded: true }), inked = draw({ inked: true });
  assert.equal(images(intact)[0].args[0], images(folded)[0].args[0]);
  assert.ok(folded.calls.some((c) => c.op === "transform" && c.args[3] === 0.2));
  assert.notEqual(images(intact)[0].args[0], images(inked)[0].args[0]);
  assert.ok(allPaint(inked).some((c) => c.globalCompositeOperation === "source-atop" && c.fillStyle === "#30233f"));
  assert.ok(!inked.calls.some((c) => c.globalCompositeOperation === "source-atop"));
  assert.equal(paints, 1);
  const count = spriteCacheSize();
  draw({ inked: true, folded: true });
  assert.equal(spriteCacheSize(), count);
});

test("registered enemies reuse finite faceted sheets across static times, positions and actor ids", (t) => {
  environment(t);
  const draw = (art, id, time, x = 0) => {
    const ctx = canvas().getContext("2d"), e = Object.freeze({ id, kind: art.id, x, y: 0, hp: 10000, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, windup: 0 });
    for (const side of [-1, 1]) art.draw(ctx, e, time, { x: x + side * 200, y: -20 });
    assert.ok(images(ctx).length > 0);
    restored(ctx);
  };
  for (const art of ENEMY_ART.all()) for (const id of [0, 1, 2]) draw(art, id, 0);
  const count = spriteCacheSize();
  assert.ok(count < 40, `bounded enemy cuts: ${count}`);
  for (const art of ENEMY_ART.all()) for (const id of [300, 301, 302]) draw(art, id, 19.4, -312);
  assert.equal(spriteCacheSize(), count);
});

test("weapon flight, stars and rings retain negative space without live texture loops", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d");
  ring(ctx, 0, 0, 50, "#ddccaa");
  assert.equal(ctx.calls.filter((c) => c.op === "stroke").length, 2, "one under-edge plus one eight-arc path");
  assert.equal(ctx.calls.filter((c) => c.op === "fillRect").length, 0);
  const draw = (time, id) => {
    for (const art of WEAPON_ART.all()) if (art.shot) art.shot(ctx, Object.freeze({ id, x: 0, y: 0, vx: 100, vy: 20, weapon: art.shotTag }), time);
    for (const echo of [false, true]) for (const empowered of [false, true]) drawCraftShot(ctx, 5, 10, 50, 20, empowered, echo);
    star(ctx, 2, 3, 5 + time % 3, "#ddccaa", time);
  };
  draw(0, 1);
  const count = spriteCacheSize();
  draw(10000, 999);
  assert.equal(spriteCacheSize(), count);
  restored(ctx);
});

test("activity progress uses the simulation court anchor, seconds and cooldown, without text or mutation", (t) => {
  environment(t);
  for (const def of LANDMARK_DEFS.all().filter((d) => d.activity)) {
    const place = { id: "visual-court", kind: def.id, x: 100, y: 200, radius: def.radius, seed: 1 }, point = landmarkActivityPoint(place);
    const sim = Object.freeze({ player: Object.freeze(point), landmarkEvents: Object.freeze({ [place.id]: Object.freeze({ progress: def.activity.seconds / 2, cooldown: 0, activations: 0, wind: 0 }) }) });
    const ctx = canvas().getContext("2d");
    drawLandmarkActivity(ctx, sim, place);
    assert.ok(ctx.calls.some((c) => c.op === "stroke" && c.args[0].ops.some((op) => op[0] === "ellipse" && op[1] === point.x && op[2] === point.y && op[3] === def.activity.radius)));
    assert.ok(!ctx.calls.some((c) => c.op === "fillText"));
    restored(ctx);
  }
});

test("tall registered buildings yield by their bounds, not a historical landmark-id list", () => {
  const pieces = LANDMARK_ART.all().flatMap((a) => a.pieces ?? []).filter((p) => p.bounds.t < -80);
  assert.ok(pieces.length > 3);
  for (const p of pieces) {
    const b = p.bounds, actor = { x: (b.l + b.r) / 2, y: b.t * 0.65 };
    assert.equal(paperOccludesActor(0, 0, 1, b, actor), true, p.kind);
    assert.equal(paperOccludesActor(0, 0, 1, b, { ...actor, y: 20 }), false);
    assert.equal(paperOccludesActor(0, 0, 1, b, { ...actor, x: b.r + 30 }), false);
  }
});

test("world status hooks follow actual actor art and exclude decoys; props follow deferred lifecycle", () => {
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /catArt\(pose\.id\)\.draw\(ctx, pose\);\s*if \(sim && !pose\.decoy\) drawActorPaperStatus/);
  assert.match(world, /drawCraftEnemy\(ctx, e,[\s\S]*?if \(e\.spawnTime <= 0\) drawActorPaperStatus/);
  assert.match(world, /drawPaperStatusEffect\(ctx, effect\)/);
  const props = readFileSync(new URL("../src/render/craft-props.ts", import.meta.url), "utf8");
  assert.match(props, /folded: m\?\.foldedUntil !== undefined/);
  assert.match(props, /activeFire\.some/);
  for (const file of ["paper-face.ts", "paper-status-art.ts", "craft-combat.ts", "craft-enemies.ts", "combat-fx.ts"])
    assert.doesNotMatch(readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8"), /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b/);
});
