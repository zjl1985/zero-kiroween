import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isoYardPieces } from "../dist/render/iso/yard-models.js";
import { genCanvas, genShadowCanvas, genSprite, genSpriteCacheSize } from "../dist/render/iso/gen-sprites.js";
import { modelFootprint } from "../dist/render/iso/depth.js";
import { SOLID_SCENERY, YARD_FURNITURE, YARD_RAILS } from "../dist/game/scenery.js";
import { CROP_PATCHES, HOMESTEADS, HOUSE_WALKS, YARD_EXTENSION_PLOTS } from "../dist/render/homestead-layout.js";
import { plotDistance } from "../dist/render/pixel-yard-garden.js";
import { clampToWorld, WORLD } from "../dist/game/world-gen.js";
import { STATS } from "../dist/game/types.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { CAT_ART } from "../dist/render/art-index.js";
import { createSim } from "../dist/game/sim.js";
import { drawWorld } from "../dist/render/world.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";
import { isoSpriteCacheKeys, isoSpriteFrame } from "../dist/render/iso/sprite-sheet.js";

// Footprint and draw-order contracts only; the baked yard sprites were viewed offline (frame-shot), not in a browser.
const pieces = isoYardPieces();
const world = (p) => modelFootprint(p.base, p.x, p.y);
const capsuleBox = (c) => ({
  x0: Math.min(c.x1, c.x2) - c.radius, y0: Math.min(c.y1, c.y2) - c.radius,
  x1: Math.max(c.x1, c.x2) + c.radius, y1: Math.max(c.y1, c.y2) + c.radius,
});
const inside = (e, b) => e.x >= b.x && e.y >= b.y && e.x + e.w <= b.x + b.w && e.y + e.d <= b.y + b.d;

test("every rail, furniture piece and the boulder declare exactly their sim capsule grown by the radius", () => {
  const rails = pieces.filter((p) => p.kind === "rail"), furniture = pieces.filter((p) => p.kind === "furniture");
  assert.equal(rails.length, YARD_RAILS.length);
  assert.equal(furniture.length, YARD_FURNITURE.length);
  const used = new Set();
  for (const p of pieces.filter((q) => q.solid && q.kind !== "building")) {
    const fp = world(p);
    const match = SOLID_SCENERY.findIndex((c) => JSON.stringify(capsuleBox(c)) === JSON.stringify(fp));
    assert.ok(match >= 0, `${p.key} at ${p.x},${p.y}: ${JSON.stringify(fp)} matches no SOLID_SCENERY capsule`);
    assert.ok(!used.has(match), "one sprite per capsule");
    used.add(match);
    const f = YARD_FURNITURE.find((q) => q.x === p.x && q.y === p.y);
    if (f) assert.equal(fp.y1 - fp.y0, 2 * f.radius);
    // The baked voxels stand inside the declared base.
    const g = genSprite(p.sprite);
    assert.ok(g, p.sprite);
    assert.ok(inside(g.extent, p.base), `${p.key}: ${JSON.stringify(g.extent)} inside ${JSON.stringify(p.base)}`);
  }
});

test("yard sprites were baked for the footprints the game declares", () => {
  for (const p of pieces) {
    const g = genSprite(p.sprite);
    assert.ok(g, `${p.sprite} baked`);
    if (g.base) assert.deepEqual(g.base, p.base, `${p.sprite}: scripts/iso-art/inputs.json is current`);
  }
});

test("barn and cottages fill their base and stand where the sim's world clamp keeps the cat out", () => {
  const buildings = pieces.filter((p) => p.kind === "building");
  assert.equal(buildings.length, 3, "barn and two cottages");
  for (const [i, h] of HOMESTEADS.entries()) {
    const p = buildings[i];
    assert.equal(p.key, `yard:${h.kind === "barn" ? "barn" : "cottage"}`);
    assert.ok(Math.hypot(p.x - HOUSE_WALKS[i][0][0], p.y - HOUSE_WALKS[i][0][1]) <= 1.5, "door on the house walk");
  }
  for (const p of [...buildings, ...pieces.filter((q) => q.kind === "dressing" && q.fades)]) {
    const e = genSprite(p.sprite).extent;
    assert.ok(inside(e, p.base), `${p.key}: voxels inside the base`);
    if (p.kind === "building") assert.ok(e.w * e.d >= 0.85 * p.base.w * p.base.d, `${p.key}: walls fill the base`);
    const fp = world(p);
    assert.ok(fp.y1 <= WORLD.playTop, `${p.key} front north of playTop`);
    for (let x = fp.x0; x <= fp.x1; x += 4)
      for (let y = fp.y0; y <= fp.y1; y += 4) {
        const c = clampToWorld(x, y, STATS.playerRadius);
        assert.ok(c.y - STATS.playerRadius >= fp.y1, "the cat's circle never enters a building base");
      }
    for (const c of SOLID_SCENERY) {
      const b = capsuleBox(c);
      assert.ok(b.x1 <= fp.x0 || b.x0 >= fp.x1 || b.y1 <= fp.y0 || b.y0 >= fp.y1, `${p.key} overlaps a capsule`);
    }
  }
});

test("crops are walkable dressing inside the garden plots", () => {
  const crops = pieces.filter((p) => p.kind === "crop");
  assert.ok(crops.length > 20);
  const plots = [...CROP_PATCHES.map((p) => p.outline), ...YARD_EXTENSION_PLOTS];
  for (const c of crops) {
    assert.equal(c.solid, false);
    assert.equal(c.fades, false);
    assert.ok(plots.some((o) => plotDistance(o, c.x, c.y) < 0), `${c.x},${c.y} in a plot`);
  }
});

test("yard pieces are pure data with a bounded set of sprites", () => {
  const sprites = new Set(pieces.map((p) => p.sprite));
  assert.ok(sprites.size <= 40, `${sprites.size} distinct yard sprites`);
  const src = readFileSync(new URL("../src/render/iso/yard-models.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Math\.random/);
  for (const id of CAT_ART.ids()) assert.doesNotMatch(src, new RegExp(`["'\`]${id}["'\`]`));
});

// ---------------------------------------------------------------- world.ts draw order
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
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", filter: "none" };
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
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(() => { clearSpriteCache(); clearWorldRenderCache(); });
}

// The chosen cat draws its cached iso frame; find that frame's drawImage (iso/cat-sheet.ts).
function catFrameIndex(calls, id) {
  const sheet = CAT_ART.get(id).iso, prefix = `iso-sprite:${sheet.identity}:`;
  const canvases = new Set(isoSpriteCacheKeys().filter((k) => k.startsWith(prefix)).map((k) => {
    const [, , dir, anim, frame, palette] = k.split(":");
    return isoSpriteFrame(sheet, dir, anim, Number(frame), palette).canvas;
  }));
  return calls.findIndex((c) => c.op === "drawImage" && canvases.has(c.args[0]));
}

function frame(t, at) {
  environment(t);
  clearWorldRenderCache();
  const sim = createSim({ cat: CAT_ART.ids()[0], seed: 2026 });
  Object.assign(sim.player, at);
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true });
  const barn = pieces.find((p) => p.key === "yard:barn");
  const barnImage = genCanvas(barn.sprite), shadow = genShadowCanvas(barn.sprite);
  assert.ok(barnImage && shadow, "baked canvases in the mock DOM");
  const calls = ctx.calls, image = (c) => calls.findIndex((d) => d.op === "drawImage" && d.args[0] === c);
  return {
    calls, barn,
    building: image(barnImage),
    shadow: image(shadow),
    cat: catFrameIndex(calls, sim.player.id),
  };
}

test("world.ts draws the baked yard sprites; their shadows lie under every sprite", (t) => {
  const { calls, shadow, building, cat } = frame(t, { x: 430, y: 300 });
  assert.ok(shadow >= 0 && building > shadow && cat > shadow);
  for (const p of pieces.filter((q) => q.kind !== "building" && Math.hypot(q.x - 430, q.y - 300) < 300))
    assert.ok(calls.some((d) => d.op === "drawImage" && d.args[0] === genCanvas(p.sprite)), `${p.key} drawn`);
  // Native scale: the barn is stamped at its own pixel size, never through the half-size upright transform.
  const barnCall = calls[building];
  assert.equal(barnCall.args.length, 3, "drawImage(image, x, y) at 1:1");
});

test("a cat west of the barn's front corner still draws after it: the barn sorts by its footprint", (t) => {
  // depthKey of the cat (360 + 280) is below the barn's foot (418 + 242), yet the cat is south of its front wall.
  const { calls, building, cat } = frame(t, { x: 360, y: 280 });
  assert.ok(building >= 0 && cat > building, JSON.stringify({ building, cat }));
  assert.equal(calls[building].globalAlpha, 1);
});

test("a cat behind the barn: the barn draws after the cat, faded", (t) => {
  const { calls, building, cat } = frame(t, { x: 418, y: 150 });
  assert.ok(cat >= 0 && building > cat, JSON.stringify({ building, cat }));
  assert.ok(calls[building].globalAlpha < 1);
  assert.equal(calls[cat].globalAlpha, 1, "the cat stays visible");
});

test("leaving a run releases the decoded sprites", (t) => {
  frame(t, { x: 430, y: 300 });
  assert.ok(genSpriteCacheSize() > 0);
  clearWorldRenderCache();
  assert.equal(genSpriteCacheSize(), 0);
});
