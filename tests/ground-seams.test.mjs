import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import "../dist/render/art-index.js";
import { buildChunk, clearWorldRenderCache, drawChunks } from "../dist/render/craft-world.js";
import { drawLawnEdge, drawLawnVerge, lawnContour } from "../dist/render/start-lawn.js";
import { groundUnderlay } from "../dist/render/craft-scene.js";
import { ROAD_STOCK } from "../dist/render/road-art.js";
import { CHUNK, SCREEN, START_ROAD_EXIT, roads } from "../dist/game/world-gen.js";

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

test("the start lawn preserves its irregular shared world contour without long straight seams", () => {
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

test("district grass banks follow the lawn clip with native pixel verge details", (t) => {
  environment(t);
  const tile = { x0: 0, y0: CHUNK.height, x1: CHUNK.width, y1: 2 * CHUNK.height };
  const ctx = canvas().getContext("2d");
  drawLawnEdge(ctx, tile, 7);
  drawLawnVerge(ctx, tile, 7);
  assert.equal(ctx.depth, 0);
  const calls = allCalls(ctx), clip = calls.findIndex(c => c.op === "clip");
  assert.ok(clip >= 0, "the bank is clipped to the shared lawn footprint");
  const edgeStrokes = calls.filter(c => c.op === "stroke" && c.args[0] instanceof Path &&
    points(c.args[0]).some(([x, y]) => x > 0 && x < CHUNK.width && y > CHUNK.height + 20 && y < CHUNK.height + 110));
  assert.ok(edgeStrokes.some(c => c.lineWidth === 6), "dark earthen bank");
  assert.ok(edgeStrokes.some(c => c.lineWidth === 2), "narrow grass edge");
  assert.ok(edgeStrokes.every(c => calls.indexOf(c) > clip), "bank strokes stay within the lawn clip");
  const pixels = calls.filter(c => c.op === "fillRect");
  assert.ok(pixels.length > 12, "authored grass/stone clusters interrupt the bank");
  assert.ok(pixels.every(c => c.args.every(n => Number.isInteger(n))), "verge is authored on the 1-unit world pixel lattice");
  assert.ok(new Set(pixels.map(c => c.fillStyle)).size >= 3, "clusters have distinct shadow, midtone and light pixels");
});

test("neighbouring native tiles paint the same lawn footprint after cutting the district patches", (t) => {
  environment(t);
  const probe = canvas().getContext("2d");
  drawLawnEdge(probe, { x0: 0, y0: CHUNK.height, x1: CHUNK.width, y1: 2 * CHUNK.height }, 7);
  const lawnOps = probe.calls.find(c => c.op === "clip").args[0].ops;
  for (const cx of [0, 1]) {
    const tile = buildChunk(7, cx, 1), calls = tile.getContext("2d").calls;
    assert.equal(tile.width, CHUNK.width, "one native pixel represents one world unit");
    assert.equal(tile.height, CHUNK.height);
    const outside = calls.findIndex(c => c.op === "clip" && c.args[1] === "evenodd");
    const lawn = calls.findIndex((c, i) => i > outside && c.op === "clip" && JSON.stringify(c.args[0]?.ops) === JSON.stringify(lawnOps));
    assert.ok(outside >= 0 && lawn > outside, `tile ${cx},1 paints the bank after clipping its district patches`);
    assert.ok(calls.slice(lawn + 1).some(c => c.op === "stroke" && c.lineWidth === 6), "bank remains visible in each neighbour");
  }
});

test("native grass marks are world-anchored across the opening's y = 540 boundary", (t) => {
  environment(t);
  // The global 28-unit source row straddling the boundary is evaluated by
  // both painters, then clipped by their individual native canvases.
  const row = Math.floor(CHUNK.height / 28) * 28;
  const marks = calls => [...new Set(calls.filter(c => c.op === "fillRect" && c.fillStyle === "#527351" &&
    c.args[2] === 4 && c.args[3] === 1 && c.args[0] >= 0 && c.args[0] < CHUNK.width && c.args[1] >= row && c.args[1] < row + 28)
    .map(c => c.args.join(",")))].sort();
  const yard = marks(allCalls(buildChunk(7, 0, 0).getContext("2d"))),
    below = marks(allCalls(buildChunk(7, 0, 1).getContext("2d")));
  assert.ok(yard.length > 0, "opening evaluates the boundary source row");
  assert.deepEqual(below, yard, "neighbours generate identical pixel marks before clipping");
  // The lightweight fallback uses that same world row, rather than restarting
  // its pattern at the tile's origin while a worker is still baking.
  const fallback = canvas().getContext("2d");
  groundUnderlay(fallback, 0, CHUNK.height, CHUNK.width, CHUNK.height, false);
  assert.deepEqual(marks(fallback.calls), yard, "placeholder and ready tile share the boundary pattern");
});

test("an unbaked tile has continuous base coverage plus native pixel detail", (t) => {
  environment(t);
  const cx = 4, cy = 4, ctx = canvas().getContext("2d");
  drawChunks(ctx, 7, { x: (cx + 0.5) * CHUNK.width, y: (cy + 0.5) * CHUNK.height }, false);
  const bases = ctx.calls.filter(c => c.op === "fill" && c.fillStyle === "#3d624e");
  assert.ok(bases.length > 0, "placeholder draws the same authored ground base as ready tiles");
  assert.ok(bases.some(base => base.args[0].ops.some(([op, x, y, w, h]) => op === "rect" &&
    x <= cx * CHUNK.width && y <= cy * CHUNK.height && x + w >= (cx + 1) * CHUNK.width && y + h >= (cy + 1) * CHUNK.height)),
    "base covers every pixel through all four chunk edges, preventing gaps");
  const pixels = ctx.calls.filter(c => c.op === "fillRect" && c.fillStyle === "#527351");
  assert.ok(pixels.length > 20, "placeholder has sparse authored native detail instead of one flat block");
  assert.ok(pixels.every(c => c.args.every(n => Number.isInteger(n))), "placeholder marks use the same world pixel lattice");
  assert.equal(ctx.depth, 0);
});

test("the opening road meets the world road with the same native width, centre and material", t => {
  environment(t);
  const cx = Math.floor(START_ROAD_EXIT.x / CHUNK.width),
    opening = allCalls(buildChunk(7, cx, 0).getContext("2d")),
    below = allCalls(buildChunk(7, cx, 1).getContext("2d")),
    lastRow = opening.find(c => c.op === "fillRect" && c.fillStyle === ROAD_STOCK.face && c.args[1] === SCREEN.height - 1);
  assert.ok(lastRow, "opening draws road pixels through the final native row");
  const [x, y, width, height] = lastRow.args;
  assert.equal(width, START_ROAD_EXIT.width * 2, "opening does not flare out before the narrow world road");
  assert.ok(Math.abs(x + width / 2 - START_ROAD_EXIT.x) <= 1, "centres agree within native half-pixel rounding");
  assert.equal(y + height, START_ROAD_EXIT.y, "last native row reaches the shared boundary without a gap");
  assert.deepEqual(roads(7)[0].points[0], { x: START_ROAD_EXIT.x, y: START_ROAD_EXIT.y });
  assert.ok(below.some(c => c.op === "fill" && c.fillStyle === ROAD_STOCK.rim && c.args[0]?.ops.some(
    ([op, px, py, radius]) => op === "arc" && px === START_ROAD_EXIT.x && py === START_ROAD_EXIT.y && radius === START_ROAD_EXIT.width)),
    "the lower tile paints the unchanged world-road join with the same outer material edge and half-width");
});
