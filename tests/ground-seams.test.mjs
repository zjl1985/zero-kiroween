import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import "../dist/render/art-index.js";
import { buildChunk, clearWorldRenderCache, drawChunks } from "../dist/render/craft-world.js";
import { drawLawnEdge, lawnContour } from "../dist/render/start-lawn.js";
import { PAPER_EDGE, PAPER_SHADOW } from "../dist/render/paper-rules.js";
import { CHUNK, SCREEN } from "../dist/game/world-gen.js";

// Ground seams around the start lawn and unbaked tiles (FEAT-003). Static command
// contracts on a recording canvas; they do not claim pixel or art approval.
class Path {
  constructor(source) { this.ops = source instanceof Path ? [...source.ops] : source ? [["path", source]] : []; }
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
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", lineWidth: 1 };
  let shift = [0, 0];
  const record = (op, args) => calls.push({ op, args, ...state, shift: [...shift] });
  const methods = {
    save() { stack.push({ state: { ...state }, shift: [...shift] }); },
    restore() { const top = stack.pop(); assert.ok(top, "balanced saves"); state = top.state; shift = top.shift; },
    translate(x, y) { shift = [shift[0] + x, shift[1] + y]; record("translate", [x, y]); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { kind: "paper", setTransform() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key === "depth" ? stack.length : key in state ? state[key] : methods[key] ?? ((...args) => record(key, args)),
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
  t.mock.method(Date, "now", () => assert.fail("rendering consumes no wall time"));
  t.after(() => { clearSpriteCache(); clearWorldRenderCache(); });
}
/** Every call of a context and of the canvases it drew, each visited once. */
function allCalls(ctx, seen = new Set()) {
  if (seen.has(ctx)) return [];
  seen.add(ctx);
  return ctx.calls.flatMap((c) => c.op === "drawImage" && c.args[0]?.getContext ? [c, ...allCalls(c.args[0].getContext("2d"), seen)] : [c]);
}
/** End points of a recorded path (moveTo / lineTo / curve ends). */
function points(p) {
  return p.ops.flatMap(([op, ...a]) => op === "moveTo" || op === "lineTo" ? [[a[0], a[1]]] : op === "quadraticCurveTo" ? [[a[2], a[3]]] : []);
}

test("the start lawn's south edge is a finely torn contour, not a few long straight cuts", () => {
  const { width, height } = SCREEN;
  const south = lawnContour().filter(([x, y]) => x >= 0 && x <= width && y > height);
  assert.ok(south.length >= 60, `many short segments along the south edge (${south.length})`);
  const gaps = south.slice(1).map((p, i) => Math.hypot(p[0] - south[i][0], p[1] - south[i][1]));
  assert.ok(Math.max(...gaps) < 20, `short cuts (longest ${Math.max(...gaps).toFixed(1)})`);
  // Least-squares line through the south vertices: the edge wanders well away from it.
  const n = south.length, mx = south.reduce((s, p) => s + p[0], 0) / n, my = south.reduce((s, p) => s + p[1], 0) / n,
    slope = south.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / south.reduce((s, p) => s + (p[0] - mx) ** 2, 0),
    off = Math.max(...south.map(([x, y]) => Math.abs(y - (my + slope * (x - mx)))));
  assert.ok(off > 10, `irregular, not one straight line (max deviation ${off.toFixed(1)})`);
  // Neighbouring vertices step to both sides: a torn edge, not a smooth curve.
  let turns = 0;
  for (let i = 2; i < n; i++) {
    const d1 = south[i - 1][1] - south[i - 2][1], d2 = south[i][1] - south[i - 1][1];
    if (d1 * d2 < 0) turns++;
  }
  assert.ok(turns > n / 3, `torn zigzag (${turns} turns over ${n} vertices)`);
});

test("district stock meets the lawn with a cut-paper edge: shadow, card side, rim, lip and fringe", (t) => {
  environment(t);
  const tile = { x0: 0, y0: CHUNK.height, x1: CHUNK.width, y1: 2 * CHUNK.height };
  const ctx = canvas().getContext("2d");
  drawLawnEdge(ctx, tile, 7);
  assert.equal(ctx.depth, 0);
  const calls = allCalls(ctx);
  const shadow = calls.find((c) => c.op === "fill" && c.args[1] === "evenodd" && c.fillStyle === PAPER_SHADOW.color);
  assert.ok(shadow, "the stock casts a hard shadow onto the lawn floor");
  assert.ok(shadow.shift[0] > 0 && shadow.shift[1] > 0, "the shadow falls down-right");
  const lawnClip = calls.find((c) => c.op === "clip" && c.args.length === 1);
  assert.ok(lawnClip && calls.indexOf(lawnClip) < calls.indexOf(shadow), "the shadow stays on the lawn side");
  const edgeStrokes = calls.filter((c) => c.op === "stroke" && c.args[0] instanceof Path &&
    points(c.args[0]).some(([x, y]) => x > 0 && x < CHUNK.width && y > CHUNK.height + 20 && y < CHUNK.height + 110));
  assert.ok(edgeStrokes.some((c) => c.lineWidth === 3), "a darker card side along the cut");
  assert.ok(edgeStrokes.some((c) => c.strokeStyle === PAPER_EDGE.lip && c.shift[0] > 0 && c.shift[1] < 0), "a pressed lip toward the light");
  assert.ok(edgeStrokes.some((c) => c.lineWidth === 2 && c.shift[0] < 0 && c.shift[1] > 0), "a lit rim on the stock");
  const fringe = calls.filter((c) => c.op === "fill" && Array.isArray(c.args[0]?.ops) && points(c.args[0]).length > 16 &&
    points(c.args[0]).every(([x, y]) => y > CHUNK.height && y < CHUNK.height + 120));
  assert.ok(fringe.length >= 1, "fringe-cut grass stands along the south edge");
});

test("a baked tile under the yard paints the lawn edge after laying its sheets, in both neighbours", (t) => {
  environment(t);
  const edge = (cx) => {
    const calls = buildChunk(7, cx, 1).getContext("2d").calls;
    const clip = calls.findIndex((c) => c.op === "clip" && c.args[1] === "evenodd");
    const shadow = calls.findIndex((c) => c.op === "fill" && c.args[1] === "evenodd" && c.fillStyle === PAPER_SHADOW.color);
    assert.ok(clip >= 0 && shadow > clip, `tile ${cx},1 cuts its sheets and then paints the cut edge`);
    return calls[shadow].args[0].ops.find(([op]) => op === "addPath")[1].ops;
  };
  assert.deepEqual(edge(1), edge(0), "neighbouring tiles share one world-anchored edge");
});

test("moss hatching is world-anchored: the start yard and the tile below draw the same marks along y = 540", (t) => {
  environment(t);
  const marks = (cx, cy) => {
    const out = new Set();
    for (const c of allCalls(buildChunk(7, cx, cy).getContext("2d")))
      if (c.op === "stroke" && (c.strokeStyle === "#6c7358" || c.strokeStyle === "#92906a") && c.lineWidth === 0.35)
        for (const [op, x, y] of c.args[0].ops)
          if (op === "moveTo" && x >= 0 && x <= CHUNK.width && y >= CHUNK.height - 1.5 && y <= CHUNK.height + 1.5) out.add(`${x},${y}`);
    return [...out].sort();
  };
  const yard = marks(0, 0), below = marks(0, 1);
  assert.ok(yard.length >= 5, `the yard draws moss up to its edge (${yard.length})`);
  assert.deepEqual(below, yard, "both bakes place the same marks across the shared edge");
});

test("an unbaked tile shows graded pulp, district stock and fibre, never one flat block", (t) => {
  environment(t);
  const cx = 4, cy = 4, ctx = canvas().getContext("2d");
  drawChunks(ctx, 7, { x: (cx + 0.5) * CHUNK.width, y: (cy + 0.5) * CHUNK.height }, false);
  const fills = ctx.calls.filter((c) => c.op === "fill");
  assert.ok(fills.length >= 2, "the placeholder paints more than one layer");
  assert.ok(!fills.some((c) => c.fillStyle === "#414538"), "no flat ungraded #414538 block");
  assert.ok(new Set(fills.map((c) => c.fillStyle)).size >= 2, "pulp and district stock differ");
  const fibre = ctx.calls.filter((c) => c.op === "stroke" && c.args[0] instanceof Path && c.args[0].ops.filter(([op]) => op === "moveTo").length > 100);
  assert.ok(fibre.length >= 2, "world-anchored fibre over the placeholder");
  assert.equal(ctx.depth, 0);
});
