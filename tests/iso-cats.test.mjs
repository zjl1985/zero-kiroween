import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CAT_ART } from "../dist/render/art-index.js";
import { officialVariant } from "../dist/cats/official.js";
import { ISO_CAT } from "../dist/render/iso/cat-sheet.js";
import { ISO_DEPTH } from "../dist/render/iso/depth.js";
import { CAT_PUPPET_FRAMES } from "../dist/render/iso/gen/cats-pixels.js";
import { SCENERY_PALETTE } from "../dist/render/iso/gen/scenery-pixels.js";
import {
  decodeRuns, genBounds, genCanvas, genImage, GEN_SPRITES, genSpriteCacheKeys, genSpriteCacheSize,
} from "../dist/render/iso/gen-sprites.js";
import { PUPPET, drawPuppetFigure, puppetFrame, puppetLayer, puppetSprite } from "../dist/render/iso/puppet.js";
import { figureScale, paintPlaybillPortrait } from "../dist/render/playbill-stage.js";
import { drawPuppetStatus } from "../dist/render/iso/puppet-status.js";
import { ISO, snap, toScreen } from "../dist/render/iso/projection.js";
import { ISO_ANIMS, ISO_DIRS, clearIsoDirections, isoDirectionMemorySize } from "../dist/render/iso/sprite-sheet.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { createSim } from "../dist/game/sim.js";
import { drawWorld } from "../dist/render/world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";
import { COSTUME_DEFS } from "../dist/defs/registries.js";

// Data and dispatch contracts of the baked cat puppets (scripts/iso-art/puppet.py). The frames were
// looked at offline (contact sheets and frame-shot PNGs), not in a browser.
const cats = CAT_ART.all();
const frames = (puppet) => ISO_DIRS.flatMap((dir) => ISO_ANIMS.flatMap((anim) =>
  Array.from({ length: puppet.frames[anim] }, (_, f) => ({ dir, anim, f }))));
const lower = (c) => c.toLowerCase();
const channel = (c, i) => parseInt(c.slice(i, i + 2), 16);

/** Decoded frame: its sprite and one colour ("" transparent) per pixel. */
function grid(id) {
  const s = GEN_SPRITES[id], idx = decodeRuns(s.data, s.w * s.h);
  const px = Array.from(idx, (v) => (v ? SCENERY_PALETTE[v] : ""));
  return { s, px };
}
/** Colour of frame `g` at native pixel (x, y) counted from its foot, "" outside the sprite. */
function at(g, x, y) {
  const u = x + g.s.ax, v = y + g.s.ay;
  return u >= 0 && u < g.s.w && v >= 0 && v < g.s.h ? g.px[v * g.s.w + u] : "";
}
/** True when frame `b` is exactly the horizontal mirror of frame `a` about the foot column. */
function mirrored(a, b) {
  for (let y = -40; y <= 8; y++) for (let x = -24; x <= 24; x++) if (at(a, -x, y) !== at(b, x, y)) return false;
  return true;
}
function colours(puppet, dir, anim = "idle", f = 0) {
  return new Set(grid(puppetSprite(puppet, dir, anim, f)).px.filter(Boolean));
}
/** Is some colour of `set` within `tol` per channel of `hexColour`? */
const near = (set, hexColour, tol = 16) => [...set].some((c) => [1, 3, 5].every((i) => Math.abs(channel(c, i) - channel(hexColour, i)) <= tol));

test("every registered cat is a baked voxel puppet that stands 30 to 34 native pixels inside its box", () => {
  assert.ok(cats.length >= 2);
  assert.deepEqual(CAT_PUPPET_FRAMES, { idle: 2, walk: 6, hurt: 1 });
  for (const art of cats) {
    const puppet = art.iso;
    assert.ok(puppet, `${art.id} registers a puppet`);
    assert.equal(puppet.identity, `cat-${art.id}`);
    assert.deepEqual(puppet.frames, CAT_PUPPET_FRAMES);
    for (const { dir, anim, f } of frames(puppet)) {
      const id = puppetSprite(puppet, dir, anim, f), s = GEN_SPRITES[id];
      assert.ok(s, id);
      let total = 0;
      for (let i = 0; i < s.data.length; i++) {
        const c = s.data.charCodeAt(i);
        if (c >= 0x500) { total += c - 0x500 - 1; continue; }
        assert.ok(c >= 0x100 && c - 0x100 < SCENERY_PALETTE.length, `${id}: index in palette`);
        total++;
      }
      assert.equal(total, s.w * s.h, `${id}: runs cover the frame exactly`);
      const g = grid(id), b = genBounds(id), box = ISO_CAT.box;
      assert.ok(g.px.some(Boolean), `${id}: not empty`);
      assert.ok(-b.l <= box.halfWidth && b.r <= box.halfWidth && -b.t <= box.top && b.b <= box.bottom, `${id}: inside the box`);
      // Soles on the foot row: a standing cat is 30 to 34 px to its ear tips (the hurt pose ducks).
      assert.ok(-b.t >= (anim === "hurt" ? 28 : 30) && -b.t <= 34, `${id}: ${-b.t} px over the foot`);
      assert.ok(b.b <= 4, `${id}: nothing far under the foot`);
    }
    assert.equal(-genBounds(puppetSprite(puppet, "se", "idle", 0)).t, ISO_CAT.stand, `${art.id}: standing height`);
  }
});

test("the occlusion box (ISO_DEPTH.cat) is the puppet's box on screen and covers every frame", () => {
  const k = ISO_DEPTH.cat, box = ISO_CAT.box;
  assert.equal(k.halfWidth * ISO.k, box.halfWidth);
  assert.equal(k.top * ISO.k, box.top);
  assert.equal(k.bottom * ISO.k, box.bottom);
  for (const art of cats) for (const { dir, anim, f } of frames(art.iso)) {
    const b = genBounds(puppetSprite(art.iso, dir, anim, f));
    assert.ok(-b.l <= box.halfWidth && b.r <= box.halfWidth && -b.t <= box.top && b.b <= box.bottom, `${art.iso.identity} ${dir} ${anim} ${f}`);
  }
});

test("four real directions: SW and NW are turned frames, never mirrors of SE and NE, and frames animate", () => {
  for (const art of cats) {
    for (const anim of ISO_ANIMS) for (let f = 0; f < art.iso.frames[anim]; f++) {
      const g = Object.fromEntries(ISO_DIRS.map((dir) => [dir, grid(puppetSprite(art.iso, dir, anim, f))]));
      const sig = (d) => `${g[d].s.w}x${g[d].s.h}@${g[d].s.ax},${g[d].s.ay}:${g[d].px.join()}`;
      assert.equal(new Set(ISO_DIRS.map(sig)).size, 4, `${art.id} ${anim} ${f}: the four directions differ`);
      assert.ok(!mirrored(g.se, g.sw) && !mirrored(g.ne, g.nw), `${art.id} ${anim} ${f}: a real turn, not a mirror`);
    }
    const sig = (anim, f) => grid(puppetSprite(art.iso, "se", anim, f)).px.join();
    const walk = Array.from({ length: art.iso.frames.walk }, (_, f) => sig("walk", f));
    assert.equal(new Set(walk).size, walk.length, `${art.id}: every walk frame is distinct`);
    assert.notEqual(sig("idle", 0), sig("idle", 1), `${art.id}: idle breathes`);
    assert.notEqual(sig("idle", 0), sig("hurt", 0), `${art.id}: hurt recoils`);
  }
});

test("identity colours are baked from the official head data and the cat's clothing; faces show only in front", () => {
  const zero = CAT_ART.get("zero"), nicole = CAT_ART.get("nicole");
  const zp = officialVariant("zero").palette, np = officialVariant("nicole").palette;
  // A shaded step of a material (its base mixed toward the night or the moon) still counts for it.
  const step = (set, base) => near(set, base, 48);
  for (const dir of ISO_DIRS) {
    const z = colours(zero.iso, dir), n = colours(nicole.iso, dir);
    assert.ok(z.has(lower(zp.mark)) && z.has(lower(zp.head)), `Zero ${dir}: gold hair over the official fur`);
    assert.ok(step(n, nicole.body.denim) && step(n, nicole.body.body) && n.has(lower(np.head)), `Nicole ${dir}: jeans, white T-shirt, official fur`);
    assert.ok(near(n, np.headDark, 22), `Nicole ${dir}: dark hair`);
    assert.ok(!n.has(lower(zp.mark)), "Nicole has no gold hair");
  }
  for (const dir of ["se", "sw"]) {
    const z = colours(zero.iso, dir), n = colours(nicole.iso, dir);
    assert.ok(step(z, zero.body.metal) && step(z, zero.body.bib), `Zero ${dir}: gold chain on the bib`);
    assert.ok(n.has(lower(np.blush)) && n.has(lower(nicole.body.paw)), `Nicole ${dir}: pink cheeks and paws`);
  }
  for (const dir of ["ne", "nw"]) {
    assert.ok(colours(zero.iso, dir).has(lower(zero.body.cape)), `Zero ${dir}: the cape over the back`);
    assert.ok(!colours(nicole.iso, dir).has(lower(np.blush)), `Nicole ${dir}: no face on the back of the head`);
  }
});

test("every costume is a baked layer on every standing and walking cat frame, inside the cat's box", () => {
  const costumes = COSTUME_DEFS.ids(), box = ISO_CAT.box;
  assert.equal(costumes.length, 14);
  let layers = 0, absent = [];
  for (const art of cats) for (const costume of costumes) for (const { dir, anim, f } of frames(art.iso)) {
    const id = puppetLayer(art.iso, costume, dir, anim, f);
    if (!id) {
      // Only a hurt pose (arms swung forward) can hide a costume completely from behind.
      assert.equal(anim, "hurt", `${art.id} ${costume} ${dir} ${anim} ${f} has a layer`);
      absent.push(`${art.id} ${costume} ${dir} ${anim} ${f}`);
      continue;
    }
    layers++;
    const s = GEN_SPRITES[id];
    let total = 0;
    for (let i = 0; i < s.data.length; i++) {
      const c = s.data.charCodeAt(i);
      if (c >= 0x500) { total += c - 0x500 - 1; continue; }
      assert.ok(c >= 0x100 && c - 0x100 < SCENERY_PALETTE.length, `${id}: index in palette`);
      total++;
    }
    assert.equal(total, s.w * s.h, `${id}: runs cover the layer exactly`);
    const g = grid(id);
    assert.ok(g.px.some(Boolean), `${id}: not empty`);
    const b = genBounds(id);
    assert.ok(-b.l <= box.halfWidth && b.r <= box.halfWidth && -b.t <= box.top && b.b <= box.bottom, `${id}: inside the cat's box`);
  }
  assert.ok(layers >= costumes.length * cats.length * 35, `${layers} layers`);
  assert.ok(absent.length <= 2, absent.join(", "));
  assert.equal(puppetLayer(cats[0].iso, "no-such-layer", "se", "idle", 0), undefined);
  // Every costume shows on a standing front frame with more than a couple of pixels.
  for (const art of cats) for (const costume of costumes) {
    const g = grid(puppetLayer(art.iso, costume, "se", "idle", 0));
    assert.ok(g.px.filter(Boolean).length >= 3, `${art.id} ${costume}: visible`);
  }
});

test("the shared puppet runtime names no cat and uses no randomness", () => {
  for (const f of ["cat-sheet", "puppet", "puppet-status"]) {
    const src = readFileSync(new URL(`../src/render/iso/${f}.ts`, import.meta.url), "utf8");
    for (const id of CAT_ART.ids()) assert.doesNotMatch(src, new RegExp(`["'\`]${id}["'\`]`), f);
    assert.doesNotMatch(src, /Math\.random/, f);
  }
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /art\.iso/);
});

test("pose steps: walk runs at 12 fps, idle is a slow breath, reduced motion holds frame 0", () => {
  const puppet = cats[0].iso;
  assert.deepEqual([0.35, 0.5, 0.6].map((t) => puppetFrame(puppet, "walk", t, false)), [4, 0, 1]);
  assert.equal(puppetFrame(puppet, "idle", 0.35, false), 0);
  assert.equal(puppetFrame(puppet, "idle", 0.5, false), 1);
  for (const anim of ISO_ANIMS) {
    assert.equal(puppetFrame(puppet, anim, 3.7, true), 0);
    assert.equal(puppetFrame(puppet, anim, NaN, false), 0);
  }
});

// ------------------------------------------------------------- world dispatch
class Path { constructor() { this.ops = []; } }
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse", "addPath", "roundRect"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(point) { return point; }
}
function canvas() {
  const c = { width: 400, height: 300 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", filter: "none", imageSmoothingEnabled: true };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  clearWorldRenderCache();
  clearIsoDirections();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(() => { clearSpriteCache(); clearWorldRenderCache(); clearIsoDirections(); });
}
/** The cat frames drawn in a recorded frame, in draw order: { i, id (|look), alpha, argc }. */
function catDraws(calls, art) {
  const prefix = `cat-${art.id}`, canvases = new Map();
  for (const key of genSpriteCacheKeys()) {
    const [id, look] = key.split("|");
    if (id.startsWith(prefix)) canvases.set((look ? genImage(id, look) : genCanvas(id)), key);
  }
  return calls.flatMap((c, i) => c.op === "drawImage" && canvases.has(c.args[0])
    ? [{ i, key: canvases.get(c.args[0]), alpha: c.globalAlpha, argc: c.args.length }] : []);
}
function frame(t, id, setup = () => {}, view = {}, config = {}, ctx = canvas().getContext("2d")) {
  environment(t);
  const sim = createSim({ cat: id, seed: 2026, ...config });
  setup(sim);
  const before = structuredClone(sim);
  drawWorld(ctx, sim, { time: 0.35, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true, ...view });
  assert.deepEqual(sim, before, "drawing leaves SimState untouched");
  return catDraws(ctx.calls, CAT_ART.get(id));
}

test("world.ts draws the chosen cat's baked frame 1:1, never the other cat's", (t) => {
  for (const art of cats) {
    const draws = frame(t, art.id);
    assert.equal(draws.length, 1, art.id);
    assert.equal(draws[0].key, `cat-${art.id}-se-idle-0`);
    assert.equal(draws[0].argc, 3, "drawImage(image, x, y) at native scale");
    assert.equal(draws[0].alpha, 1);
    for (const other of cats) if (other !== art) assert.ok(!genSpriteCacheKeys().some((k) => k.startsWith(`cat-${other.id}-`)), `${other.id} is never decoded`);
  }
});

test("the frame is stamped with its foot on the snapped projected foot of the cat", (t) => {
  const art = cats[0];
  environment(t);
  const sim = createSim({ cat: art.id, seed: 2026 }), ctx = canvas().getContext("2d");
  const foot = toScreen(sim.player.x, sim.player.y);
  drawWorld(ctx, sim, { time: 0.35, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true });
  const d = catDraws(ctx.calls, art)[0], s = GEN_SPRITES[d.key.split("|")[0]];
  assert.deepEqual(ctx.calls[d.i].args.slice(1), [snap(foot.x) - s.ax, snap(foot.y) - s.ay]);
});

test("the direction follows the projected velocity; walking animates unless motion is reduced", (t) => {
  const art = cats[0];
  const move = (vx, vy) => (sim) => Object.assign(sim.player, { vx, vy, facing: vx < 0 ? -1 : 1 });
  // World (0, -1) projects up-right on screen: north-east, the back view.
  assert.match(frame(t, art.id, move(0, -120))[0].key, /-ne-walk-0$/);
  assert.match(frame(t, art.id, move(-120, 0))[0].key, /-nw-walk-0$/);
  assert.match(frame(t, art.id, move(120, 0))[0].key, /-se-walk-0$/);
  assert.match(frame(t, art.id, move(0, 120))[0].key, /-sw-walk-0$/);
  const live = frame(t, art.id, move(120, 0), { reducedMotion: false });
  assert.match(live[0].key, /-se-walk-4$/, "0.35 s at 12 fps is walk frame 4");
  assert.ok(isoDirectionMemorySize() > 0);
  clearWorldRenderCache();
  assert.equal(genSpriteCacheSize(), 0, "leaving a run releases the decoded frames");
  assert.equal(isoDirectionMemorySize(), 0);
});

test("hurt, the hit flash and squash, the decoy and a costume draw through the cat puppet", (t) => {
  const art = cats[0];
  const hurt = (sim) => sim.impacts.push({ kind: "hurt", x: sim.player.x, y: sim.player.y, life: 0.35 });
  assert.match(frame(t, art.id, hurt, { time: 0 })[0].key, /-se-hurt-0$/);
  // A dropped hp flashes the frame warm white for a few render frames and squashes it about the foot.
  for (const reducedMotion of [false, true]) {
    environment(t);
    const sim = createSim({ cat: art.id, seed: 2026 }), ctx = canvas().getContext("2d");
    const view = { camera: createIsoCamera(960, 540, sim.player), reducedMotion };
    drawWorld(ctx, sim, { ...view, time: 0 });
    assert.equal(catDraws(ctx.calls, art)[0].key, `cat-${art.id}-se-idle-0`);
    sim.player.hp -= 5;
    hurt(sim);
    ctx.calls.length = 0;
    drawWorld(ctx, sim, { ...view, time: 0.05 });
    const hit = catDraws(ctx.calls, art);
    assert.equal(hit.length, 1);
    assert.equal(hit[0].key, `cat-${art.id}-se-hurt-0${reducedMotion ? "" : "|flash"}`);
    assert.equal(hit[0].argc, 5, "squashed about the foot row");
    ctx.calls.length = 0;
    // 0.3 s: the hurt flicker is on again (it blinks at 8 Hz) and the flash and squash are over.
    drawWorld(ctx, sim, { ...view, time: 0.3 });
    const later = catDraws(ctx.calls, art)[0];
    assert.equal(later.key, `cat-${art.id}-se-hurt-0`, "the flash is over");
    assert.equal(later.argc, 3, "and the squash has eased back");
  }
  const decoy = frame(t, art.id, (sim) => Object.assign(sim.decoy, { live: true, x: sim.player.x + 40, y: sim.player.y }));
  assert.equal(decoy.length, 2, "the decoy and the cat");
  assert.deepEqual(decoy.map((d) => d.alpha).sort(), [0.35, 1]);
  // A costumed run draws the base frame and, right after it at the same foot, its costume layer.
  const costume = COSTUME_DEFS.ids()[0];
  const worn = frame(t, art.id, undefined, {}, { costume });
  assert.deepEqual(worn.map((d) => d.key), [`cat-${art.id}-se-idle-0`, `cat-${art.id}@${costume}-se-idle-0`]);
  assert.deepEqual(worn.map((d) => d.argc), [3, 3]);
  assert.ok(worn.every((d) => d.alpha === 1));
  for (const id of COSTUME_DEFS.ids())
    for (const art2 of cats) assert.equal(typeof puppetLayer(art2.iso, id, "sw", "walk", 3), "string", `${id} on ${art2.id}`);
});

test("UI figures stamp the baked frame and its layer at a whole-number scale on the same foot", (t) => {
  const art = cats[0], costume = COSTUME_DEFS.ids()[0];
  environment(t);
  const ctx = canvas().getContext("2d");
  assert.equal(drawPuppetFigure(ctx, art.iso, { x: 100.6, y: 50.2, scale: 3, layer: costume }), true);
  const draws = catDraws(ctx.calls, art);
  assert.deepEqual(draws.map((d) => d.key), [`cat-${art.id}-se-idle-0`, `cat-${art.id}@${costume}-se-idle-0`], "the layer follows the frame");
  const s = GEN_SPRITES[`cat-${art.id}-se-idle-0`], l = GEN_SPRITES[`cat-${art.id}@${costume}-se-idle-0`];
  assert.deepEqual(ctx.calls[draws[0].i].args.slice(1), [101 - s.ax * 3, 50 - s.ay * 3, s.w * 3, s.h * 3], "3x about the foot (101, 50)");
  assert.deepEqual(ctx.calls[draws[1].i].args.slice(1), [101 - l.ax * 3, 50 - l.ay * 3, l.w * 3, l.h * 3], "the layer keeps the frame's foot");
  assert.equal(drawPuppetFigure(ctx, art.iso, { x: 0, y: 0, scale: 3, layer: "no-such-layer" }), true, "a missing layer is skipped");
  assert.equal(catDraws(ctx.calls, art).length, 3);
  // The roster dais paints the same figure over its pedestal for the character panel.
  const stage = canvas();
  paintPlaybillPortrait(stage, art.id, costume);
  const dais = catDraws(stage.getContext("2d").calls, art);
  assert.deepEqual(dais.map((d) => d.key), [`cat-${art.id}-se-idle-0`, `cat-${art.id}@${costume}-se-idle-0`]);
  const k = figureScale(stage.height);
  assert.ok(Number.isInteger(k) && k >= 2, `scale ${k}`);
  assert.deepEqual(stage.getContext("2d").calls[dais[0].i].args.slice(1), [200 - s.ax * k, 231 - s.ay * k, s.w * k, s.h * k]);
});

test("burn and wet marks sit on the puppet's body box; a wet cat does not burn", () => {
  const box = ISO_CAT.box, foot = toScreen(0, 0);
  const rects = (actor, time = 0) => {
    const ctx = canvas().getContext("2d");
    drawPuppetStatus(ctx, actor, time, box);
    assert.ok(ctx.calls.every((c) => c.op === "fillRect"), "pixel stamps only");
    return ctx.calls;
  };
  const inside = (c, top = box.top) => {
    const [x, y, w, h] = c.args, fx = snap(foot.x), fy = snap(foot.y);
    return x >= fx - box.halfWidth - 1 && x + w <= fx + box.halfWidth + 1 && y >= fy - top && y + h <= fy + box.bottom;
  };
  assert.equal(rects({ x: 0, y: 0 }).length, 0, "nothing when clean");
  const burning = rects({ x: 0, y: 0, burnTime: 1 }), fy = snap(foot.y);
  const crown = burning.filter((c) => c.args[1] + c.args[3] <= fy - box.top), body = burning.filter((c) => !crown.includes(c));
  assert.ok(body.length >= 10 && body.every((c) => inside(c)), "flames on the body stay inside the box");
  assert.ok(crown.length >= 8, "one small flame licks above the crown");
  assert.ok(crown.every((c) => inside(c, box.top + 4)), "just above the crown");
  assert.deepEqual([...new Set(burning.map((c) => c.fillStyle))].sort(), ["#a83a1e", "#ef7f24", "#f9bf3c", "#fff0a8"].sort(), "four fire steps");
  assert.notDeepEqual(rects({ x: 0, y: 0, burnTime: 1 }, 0.15).map((c) => c.args), rects({ x: 0, y: 0, burnTime: 1 }, 0).map((c) => c.args), "the flames flicker");
  const wet = rects({ x: 0, y: 0, wetTime: 1, burnTime: 1 });
  assert.ok(wet.length >= 4 && wet.every((c) => inside(c)), "soaked patches stay inside the box");
  assert.ok(wet.every((c) => c.fillStyle !== "#ef7f24"), "a wet cat does not burn");
});
