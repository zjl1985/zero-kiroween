import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { drawPaperStack, projectStackPoint } from "../dist/render/paper-sprite-stack.js";

// Command/geometry tests only: no browser pixels or performance claims.
function canvas() {
  const surface = { width: 1, height: 1 }, calls = [], saved = [];
  let state = {
    globalAlpha: 1, globalCompositeOperation: "source-over", shadowBlur: 0, filter: "none", imageSmoothingEnabled: true,
    transform: [1, 0, 0, 1, 0, 0],
  };
  const multiply = ([a, b, c, d, e, f]) => {
    const [u, v, w, x, y, z] = state.transform;
    state.transform = [u * a + w * b, v * a + x * b, u * c + w * d, v * c + x * d,
      u * e + w * f + y, v * e + x * f + z];
  };
  const record = (op, args) => calls.push({ op, args, ...state, transform: [...state.transform] });
  const methods = {
    save() { saved.push({ ...state, transform: [...state.transform] }); },
    restore() { assert.ok(saved.length, "restore must have a matching save"); state = saved.pop(); },
    translate(x, y) { multiply([1, 0, 0, 1, x, y]); },
    scale(x, y) { multiply([x, 0, 0, y, 0, 0]); },
    rotate(a) { multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    transform(...m) { multiply(m); },
    setTransform(...m) { state.transform = m; },
    resetTransform() { state.transform = [1, 0, 0, 1, 0, 0]; },
    createPattern() { return { setTransform() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? surface : key === "calls" ? calls : key === "depth" ? saved.length :
      key === "matrix" ? [...state.transform] : methods[key] ?? (key in state ? state[key] : ((...args) => record(key, args))),
    set: (_, key, value) => { state[key] = value; record(`set:${String(key)}`, [value]); return true; },
  });
  surface.getContext = () => ctx;
  return surface;
}
class Path {
  constructor() { this.ops = []; }
}
for (const op of ["moveTo", "lineTo", "rect", "ellipse", "arc", "closePath", "quadraticCurveTo", "bezierCurveTo"])
  Path.prototype[op] = function (...args) { this.ops.push([op, ...args]); };
function environment(t) {
  clearSpriteCache();
  const surfaces = [];
  for (const [key, value] of Object.entries({
    document: { createElement(tag) { assert.equal(tag, "canvas"); const c = canvas(); surfaces.push(c); return c; } },
    Path2D: Path,
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.after(clearSpriteCache);
  return surfaces;
}
function near(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-9, `${actual} != ${expected}`));
}
function model(id, paint = (ctx, z) => { ctx.fillStyle = z % 2 ? "#ceb68e" : "#8c7261"; ctx.fillRect(-5, -3, 10, 6); }) {
  return { id, width: 12, depth: 8, count: 4, paint };
}

test("slice projection preserves cardinal rotation and a common vertical anchor", () => {
  near(projectStackPoint(8, 4, 0, 0, 0.5, 2), [8, 2]);
  near(projectStackPoint(8, 4, 0, Math.PI / 2, 0.5, 2), [-4, 4]);
  near(projectStackPoint(8, 4, 0, Math.PI, 0.5, 2), [-8, -2]);
  near(projectStackPoint(8, 4, 0, Math.PI * 1.5, 0.5, 2), [4, -4]);
  for (const turn of [0, 0.7, Math.PI / 2, Math.PI])
    near(projectStackPoint(0, 0, 3, turn, 0.5, 2), [0, -6]);
  near(projectStackPoint(0, 0, 0), [0, 0]);
});

test("one procedural atlas is reused across placements, turns and projection settings", (t) => {
  const surfaces = environment(t), painted = [];
  const shape = model("reuse-contract", (ctx, z) => { painted.push(z); ctx.fillRect(-5, -3, 10, 6); });
  const ctx = canvas().getContext("2d");
  drawPaperStack(ctx, shape, { x: 10, y: 20, turn: 0, shadow: false });
  assert.deepEqual(painted, [0, 1, 2, 3], "each slice is generated once");
  const allocationCount = surfaces.length;
  for (const turn of [0.1, 0.9, Math.PI, Math.PI * 2])
    drawPaperStack(ctx, shape, { x: 100, y: -30, turn, squash: 0.6, spacing: 1.2, shadow: false });
  assert.equal(painted.length, shape.count, "view transform does not rebake slices");
  assert.equal(surfaces.length, allocationCount, "no per-frame atlas allocation");
  const sources = new Set(ctx.calls.filter(c => c.op === "drawImage").map(c => c.args[0]));
  assert.equal(sources.size, 1, "all layers and views share one atlas");
});

test("every source strip remains inside its atlas and does not sample an adjacent slice", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d"), shape = model("strip-contract");
  drawPaperStack(ctx, shape, { shadow: false });
  const draws = ctx.calls.filter(c => c.op === "drawImage");
  assert.equal(draws.length, shape.count);
  const boxes = draws.map(({ args }) => {
    assert.equal(args.length, 9, "slice sampling uses a source rectangle");
    const [atlas, x, y, w, h] = args;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0);
    assert.ok(x + w <= atlas.width && y + h <= atlas.height);
    return { x, y, w, h };
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y,
      "different z layers use disjoint source strips");
  }
});

test("stack placement respects parent transforms, restores drawing state and uses no gloss", (t) => {
  const surfaces = environment(t);
  const ctx = canvas().getContext("2d");
  ctx.translate(13, 17);
  ctx.scale(2, 3);
  ctx.globalAlpha = 0.4;
  ctx.globalCompositeOperation = "source-over";
  const before = ctx.matrix;
  drawPaperStack(ctx, model("state-contract"), { x: 30, y: 40, turn: Math.PI / 2 });
  near(ctx.matrix, before);
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, 0.4);
  assert.equal(ctx.imageSmoothingEnabled, true);
  assert.equal(ctx.globalCompositeOperation, "source-over");
  const calls = [...ctx.calls, ...surfaces.flatMap(c => c.getContext("2d").calls)];
  assert.ok(!calls.some(c => /Gradient/.test(c.op) || c.shadowBlur > 0 || /blur/.test(c.filter) || c.globalCompositeOperation === "lighter"));
});

test("position and height share one foot anchor under an existing canvas transform", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d"), shape = model("anchor-contract");
  ctx.translate(13, 17);
  ctx.scale(2, 3);
  drawPaperStack(ctx, shape, { x: 30, y: 40, turn: Math.PI / 2, squash: 0.5, spacing: 2, shadow: false });
  const draws = ctx.calls.filter(c => c.op === "drawImage");
  draws.forEach(({ args, transform: [a, b, c, d, e, f] }, z) => {
    const [, , , , , dx, dy, dw, dh] = args;
    const centerX = dx + dw / 2, centerY = dy + dh / 2;
    near([a * centerX + c * centerY + e, b * centerX + d * centerY + f], [73, 137 - z * 6]);
    // A local +X step becomes +Y at a quarter turn, then parent scale applies.
    near([a, b], [0, 1.5]);
  });
});

test("invalid dimensions and poses fail before allocating or touching the destination", (t) => {
  const surfaces = environment(t), ctx = canvas().getContext("2d"), shape = model("invalid-contract");
  for (const field of ["width", "depth", "count"]) {
    const limit = field === "count" ? 128 : 256;
    for (const value of [0, -1, 1.5, NaN, Infinity, limit + 1])
      assert.throws(() => drawPaperStack(ctx, { ...shape, [field]: value }), RangeError);
  }
  for (const pose of [{ x: NaN }, { y: Infinity }, { turn: NaN }, { squash: 0 }, { squash: -1 },
    { squash: 1.01 }, { squash: Infinity }, { spacing: -1 }, { spacing: Infinity }, { spacing: 1e100 }])
    assert.throws(() => drawPaperStack(ctx, shape, pose), RangeError);
  assert.throws(() => drawPaperStack(ctx, { ...shape, width: 256, depth: 256, count: 128 }), RangeError,
    "reject excessive atlas pixel area before allocating");
  assert.equal(surfaces.length, 0);
  assert.equal(ctx.calls.length, 0);
  assert.equal(ctx.depth, 0);
});

test("the cast shadow composites only into its isolated cache, never the destination", (t) => {
  const surfaces = environment(t), ctx = canvas().getContext("2d");
  drawPaperStack(ctx, model("shadow-contract"));
  assert.ok(surfaces.some(c => c.getContext("2d").calls.some(call => call.globalCompositeOperation === "source-in")));
  assert.ok(ctx.calls.every(c => c.globalCompositeOperation === "source-over"));
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, 1);
});

test("seventeen layers wrap into atlas rows without crossing a neighboring source cell", (t) => {
  environment(t);
  const shape = { ...model("packed-rows-contract"), count: 17 }, ctx = canvas().getContext("2d");
  drawPaperStack(ctx, shape, { shadow: false });
  const samples = ctx.calls.filter(c => c.op === "drawImage").map(c => c.args);
  assert.equal(samples.length, 17);
  assert.ok(samples.some(([, , sy]) => sy > 0), "large stacks use multiple atlas rows");
  const rectangles = new Set();
  for (const [atlas, sx, sy, sw, sh] of samples) {
    assert.ok(sx >= 0 && sy >= 0 && sx + sw <= atlas.width && sy + sh <= atlas.height);
    assert.equal(sw, shape.width * 2);
    assert.equal(sh, shape.depth * 2);
    assert.equal(sx % sw, 0);
    assert.equal(sy % sh, 0);
    rectangles.add(`${sx},${sy},${sw},${sh}`);
  }
  assert.equal(rectangles.size, shape.count, "each z samples its own complete section");
});
