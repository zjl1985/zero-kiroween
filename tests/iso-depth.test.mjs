import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actorBehind,
  actorBox,
  artBox,
  decorFootprint,
  footprintKey,
  ISO_DEPTH,
  isoOccludesActor,
  pointFootprint,
} from "../dist/render/iso/depth.js";
import { depthKey, toScreen } from "../dist/render/iso/projection.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { CAT_ART, LANDMARK_ART } from "../dist/render/art-index.js";
import { createSim } from "../dist/game/sim.js";
import { landmarkParts, landmarks } from "../dist/game/world-gen.js";
import { drawWorld } from "../dist/render/world.js";
import { worldSprites } from "../dist/render/craft-world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { isoSpriteCacheKeys, isoSpriteFrame } from "../dist/render/iso/sprite-sheet.js";

// Command-order contracts only; the iso view was not viewed in a browser.
class Path {
  constructor() { this.ops = []; }
}
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
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(clearSpriteCache);
}

test("art and cat boxes sit around their projected foot points", () => {
  const b = { l: -10, r: 20, t: -50, b: 5 }, at = toScreen(300, 200);
  assert.deepEqual(artBox(300, 200, 2, b), { x0: at.x - 20, x1: at.x + 40, y0: at.y - 100, y1: at.y + 10 });
  const c = actorBox({ x: 300, y: 200 }), k = ISO_DEPTH.cat;
  assert.deepEqual(c, { x0: at.x - k.halfWidth, x1: at.x + k.halfWidth, y0: at.y - k.top, y1: at.y + k.bottom });
});

test("a tall piece fades only when the cat stands behind it and their projected boxes overlap", () => {
  const tree = { l: -82, r: 82, t: -158, b: 16 }, x = 1000, y = 1000;
  // North (behind, smaller x + y) and on screen under the crown.
  assert.equal(isoOccludesActor(x, y, 1, tree, { x: x - 40, y: y - 40 }), true);
  // South (in front): normal order.
  assert.equal(isoOccludesActor(x, y, 1, tree, { x: x + 30, y: y + 30 }), false);
  // Behind but far off to the side on screen: nothing to fade.
  assert.equal(isoOccludesActor(x, y, 1, tree, { x: x + 200, y: y - 260 }), false);
});

test("multi-tile buildings sort by the front-most corner and use their footprint for occlusion", () => {
  const x = 2000, y = 1500, fp = decorFootprint("cottage", x, y, 1);
  assert.ok(fp && fp.x1 > x && fp.y1 >= y);
  assert.equal(footprintKey(fp), depthKey(fp.x1, fp.y1));
  assert.ok(footprintKey(fp) > depthKey(x, y), "the east corner sorts nearer than the foot");
  // Past the front (south) wall: in front even though its depthKey is below the corner's.
  const south = { x: x + 60, y: fp.y1 + 6 };
  assert.ok(depthKey(south.x, south.y) < footprintKey(fp));
  assert.equal(actorBehind(fp, south), false);
  // North of the back wall: behind.
  assert.equal(actorBehind(fp, { x, y: fp.y0 - 20 }), true);
  // A single-point footprint compares depthKey, ties count as behind.
  assert.equal(actorBehind(pointFootprint(x, y), { x: x + 5, y: y - 5 }), true);
  assert.equal(actorBehind(pointFootprint(x, y), { x: x + 5, y: y - 4 }), false);
  assert.equal(decorFootprint("tree", x, y, 1), null);
});

// The chosen cat draws its cached iso frame; find that frame's drawImage (iso/cat-sheet.ts).
function catFrameIndex(calls, id) {
  const sheet = CAT_ART.get(id).iso, prefix = `iso-sprite:${sheet.identity}:`;
  const canvases = new Set(isoSpriteCacheKeys().filter((k) => k.startsWith(prefix)).map((k) => {
    const [, , dir, anim, frame, palette] = k.split(":");
    return isoSpriteFrame(sheet, dir, anim, Number(frame), palette).canvas;
  }));
  return calls.findIndex((c) => c.op === "drawImage" && canvases.has(c.args[0]));
}

function roofFrame(t, dy) {
  environment(t);
  clearWorldRenderCache();
  t.after(clearWorldRenderCache);
  const sim = createSim({ cat: "nicole", seed: 2026 });
  const art = LANDMARK_ART.get("star-observatory");
  const place = landmarks(sim.seed).find((l) => l.kind === art.id);
  const roof = art.pieces.find((p) => p.bounds.t < -200);
  const decor = landmarkParts(place).decor.find((d) => d.kind === roof.kind);
  Object.assign(sim.player, { x: decor.x, y: decor.y + dy });
  t.mock.method(roof, "paint", (c) => c.fillRect(45, 46, 47, 48));
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true });
  const draws = ctx.calls;
  const withRect = (marker) => {
    const matches = (op) => op.op === "fillRect" && marker.every((value, i) => op.args[i] === value);
    return draws.findIndex((c) => matches(c) || c.op === "drawImage" && c.args[0].getContext("2d").calls.some(matches));
  };
  const pop = { cat: sim.player, reduced: true };
  const sprite = worldSprites(canvas().getContext("2d"), sim.seed, { x: decor.x, y: decor.y, width: 960, height: 540 }, 0, pop)
    .sprites.find((s) => s.foot?.x === decor.x && s.foot?.y === decor.y);
  return { draws, building: withRect([45, 46, 47, 48]), cat: catFrameIndex(draws, sim.player.id), occludes: sprite.occludesPlayer };
}

test("cat north of a building: the building draws after the cat, translucent", (t) => {
  const { draws, building, cat, occludes } = roofFrame(t, -70);
  assert.equal(occludes, true);
  assert.ok(cat >= 0 && building > cat, JSON.stringify({ cat, building }));
  assert.ok(draws[building].globalAlpha < 1);
  assert.equal(draws[cat].globalAlpha, 1, "the cat stays visible");
});

test("cat south of a building: normal order, building opaque before the cat", (t) => {
  const { draws, building, cat, occludes } = roofFrame(t, 70);
  assert.equal(occludes, false);
  assert.ok(building >= 0 && cat > building, JSON.stringify({ cat, building }));
  assert.equal(draws[building].globalAlpha, 1);
});
