import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { WATER, inWaterPolygon, nearestWaterEdge, waterBounds } from "../dist/defs/water.js";
import { POND } from "../dist/defs/landmarks/wishing-well/def.js";
import { RIVER } from "../dist/defs/landmarks/stone-bridge/def.js";
import { CHUNK, WORLD, clearWorldCache, chunkContent, landmarks, roads } from "../dist/game/world-gen.js";
import { avoidDeepWater, resolveWaterMove, waterAt, waterRegionsNear } from "../dist/game/water.js";
import { drawWaterGround, drawWaterCrossings, waterPath } from "../dist/render/water-art.js";

const all = (seed) => waterRegionsNear(seed, (WORLD.minX + WORLD.maxX) / 2, WORLD.maxY / 2, WORLD.width);
const centre = (polygon) => ({ x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length,
  y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length });
function clearCircle(seed, p, radius) {
  for (const r of waterRegionsNear(seed, p.x, p.y, radius)) for (const s of r.solids) {
    assert.ok(!inWaterPolygon(p, s), `${r.id}: centre is in deep water at ${JSON.stringify(p)}`);
    assert.ok(nearestWaterEdge(p, s).distance >= radius - 1e-5, `${r.id}: radius clips a deep edge`);
  }
}
function expectedAt(regions, p) {
  if (regions.some((r) => r.crossings.some((c) => inWaterPolygon(p, c.polygon)))) return "bridge";
  if (regions.some((r) => inWaterPolygon(p, r.core))) return "deep";
  return regions.some((r) => inWaterPolygon(p, r.shore)) ? "shallow" : "dry";
}

test("water regions are deterministic, local, bounded, and support negative world coordinates", (t) => {
  t.mock.method(Math, "random", () => assert.fail("water consumed random state"));
  for (const seed of [0, 7, 23, 0xffffffff]) {
    const first = all(seed), saved = JSON.stringify(first);
    assert.ok(first.length > 10 && first.length <= CHUNK_COL_LIMIT(), "bounded pockets and landmarks");
    assert.ok(first.some((r) => r.bounds.maxX < 0));
    assert.equal(new Set(first.map((r) => r.id)).size, first.length);
    const local = first.find((r) => r.id.startsWith("canal:")), p = centre(local.shore);
    assert.ok(waterRegionsNear(seed, p.x, p.y, 0).includes(local), "cached geometry identity reused");
    assert.ok(waterRegionsNear(seed, p.x, p.y, 0).length < first.length);
    clearWorldCache();
    assert.equal(JSON.stringify(all(seed)), saved);
    for (let i = 100; i < 106; i++) all(i); // exceed the fixed seed-cache cap
    assert.equal(JSON.stringify(all(seed)), saved, "cache eviction cannot change geometry");
  }
  assert.deepEqual(waterRegionsNear(7, -100000, -100000, 10), []);
  assert.equal(waterAt(7, -100000, -100000), "dry");
  assert.notEqual(JSON.stringify(all(7)), JSON.stringify(all(8)));
});
function CHUNK_COL_LIMIT() { return (CHUNK.maxCx - CHUNK.minCx + 1) * (CHUNK.maxCy + 1) * 2 + 25; }

test("dry/shallow/deep/bridge status agrees with rendered polygons at centres, edges and corners", () => {
  for (const seed of [0, 7, 91]) {
    const regions = all(seed), seen = new Set();
    for (const r of regions) {
      const points = [centre(r.shore), ...r.shore, ...r.core, ...r.crossings.flatMap((c) => [centre(c.polygon), ...c.polygon])];
      const b = waterBounds(r.shore);
      for (let y = b.minY - 10; y <= b.maxY + 10; y += 17)
        for (let x = b.minX - 10; x <= b.maxX + 10; x += 19) points.push({ x, y });
      for (const p of points) {
        const actual = waterAt(seed, p.x, p.y);
        assert.equal(actual, expectedAt(regions, p), `${seed}/${r.id}/${JSON.stringify(p)}`);
        seen.add(actual);
      }
    }
    assert.deepEqual([...seen].sort(), ["bridge", "deep", "dry", "shallow"]);
  }
});

test("well ponds and canal pockets have accessible shallow shelves around blocked cores", () => {
  for (const seed of [7, 23]) {
    const regions = all(seed);
    assert.ok(regions.some((r) => r.id.startsWith("canal:") && r.core.length));
    for (const r of regions.filter((r) => r.core.length)) {
      const p = centre(r.shore);
      let accessible = 0;
      for (let i = 0; i < r.shore.length; i++) {
        const edge = r.shore[i], dx = edge.x - p.x, dy = edge.y - p.y, len = Math.hypot(dx, dy),
          start = { x: edge.x + dx / len * 20, y: edge.y + dy / len * 20 },
          wet = { x: edge.x - dx / len * 10, y: edge.y - dy / len * 10 };
        if (waterAt(seed, wet.x, wet.y) !== "shallow") continue;
        const reached = resolveWaterMove(seed, start, wet, 9);
        if (Math.hypot(reached.x - wet.x, reached.y - wet.y) < 0.01) accessible++;
      }
      assert.ok(accessible > 0, `${r.id}: at least one rim can extinguish an actor`);
    }
  }
});

test("teaching basin is fully shallow, close to the start yard and clear of its road/test points", () => {
  const b = WATER.startBasin;
  assert.ok(WATER.shallowSlow > 0 && WATER.shallowSlow < 1);
  for (const seed of [0, 1, 7, 23, 91]) {
    assert.equal(waterAt(seed, b.x, b.y), "shallow");
    const from = { x: 960, y: b.y }, to = { x: b.x, y: b.y };
    assert.deepEqual(resolveWaterMove(seed, from, to, 10), to);
    assert.deepEqual(avoidDeepWater(seed, b.x, b.y, 10), to);
    assert.equal(all(seed).find((r) => r.id === "start-basin").core.length, 0);
    for (const [x, y] of [[480, 380], [525.5, 540], [525.5, 560], [790, 500]])
      assert.equal(waterAt(seed, x, y), "dry");
  }
});

test("spawn projection handles core centres, rounded corners and bridge corners with actor radius", () => {
  for (const seed of [0, 7]) for (const r of all(seed).filter((r) => r.core.length)) {
    const points = [centre(r.core), ...r.core, ...r.crossings.flatMap((c) => c.polygon)];
    for (const p of points) for (const radius of [1, 9, 18]) {
      const q = avoidDeepWater(seed, p.x, p.y, radius);
      clearCircle(seed, q, radius);
      assert.deepEqual(avoidDeepWater(seed, q.x, q.y, radius), q, "projection is stable");
    }
  }
});

test("swept moves stop at deep water even if a dash ends on the opposite dry bank", () => {
  for (const seed of [0, 7, 23]) {
    const l = landmarks(seed).find((l) => l.kind === "wishing-well"), y = l.y + POND.dy;
    for (const direction of [-1, 1]) for (const radius of [0, 9, 18]) {
      const from = { x: l.x - direction * (POND.rx + 70), y }, to = { x: l.x + direction * (POND.rx + 70), y },
        q = resolveWaterMove(seed, from, to, radius);
      assert.ok(direction * (q.x - l.x) < 0, "cannot emerge on the far shore");
      assert.ok(Math.hypot(q.x - to.x, q.y - to.y) > 30);
      clearCircle(seed, q, radius);
    }
  }
});

test("diagonal dashes respect curved core corners and parallel motion can slide past them", () => {
  const seed = 7, r = all(seed).find((r) => r.id.startsWith("canal:") && r.crossings.length === 0),
    p = centre(r.core), b = waterBounds(r.core);
  assert.ok(r);
  for (const [dx, dy] of [[160, 110], [-160, 110], [160, -110], [-160, -110]]) {
    const from = { x: p.x - dx, y: p.y - dy }, to = { x: p.x + dx, y: p.y + dy },
      q = resolveWaterMove(seed, from, to, 9);
    assert.ok(Math.hypot(q.x - to.x, q.y - to.y) > 1, "diagonal sweep did not skip the core");
    clearCircle(seed, q, 9);
  }
  const from = { x: b.maxX + 10, y: b.minY - 15 }, to = { x: b.maxX + 10, y: b.maxY + 15 };
  assert.deepEqual(resolveWaterMove(seed, from, to, 9), to, "tangent bank path is not blocked by the core's AABB");
});

test("the stone deck is dry and passable; adjacent deep channel blocks a long crossing", () => {
  for (const seed of [0, 7, 23]) {
    const l = landmarks(seed).find((l) => l.kind === "stone-bridge");
    assert.equal(waterAt(seed, l.x, l.y), "bridge");
    for (const x of [l.x - RIVER.deckHalf, l.x + RIVER.deckHalf]) {
      assert.equal(waterAt(seed, x, l.y), "bridge");
      assert.deepEqual(avoidDeepWater(seed, x, l.y, 0), { x, y: l.y }, "point-sized actor on a dry deck edge");
    }
    for (const x of [l.x, l.x - RIVER.deckHalf + 12, l.x + RIVER.deckHalf - 12]) {
      const from = { x, y: l.y - 100 }, to = { x, y: l.y + 100 };
      assert.deepEqual(resolveWaterMove(seed, from, to, 9), to);
    }
    const r = all(seed).find((r) => r.id === `${l.id}:channel`);
    const deep = r.solids.find((s) => Math.abs(centre(s).x - l.x) > RIVER.deckHalf + 30);
    assert.ok(deep);
    const p = centre(deep), q = resolveWaterMove(seed, { x: p.x, y: l.y - 100 }, { x: p.x, y: l.y + 100 }, 9);
    assert.ok(q.y < l.y);
    clearCircle(seed, q, 9);
  }
});

test("every generated road has explicit matching dry crossings and swept passage", () => {
  let crossings = 0;
  for (const seed of [0, 7, 23, 91]) {
    const regions = all(seed);
    for (const road of roads(seed)) for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i], b = road.points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d <= len; d += 13) {
        const p = { x: a.x + (b.x - a.x) * d / len, y: a.y + (b.y - a.y) * d / len };
        assert.ok(["dry", "bridge"].includes(waterAt(seed, p.x, p.y)), `road under water: ${seed}/${JSON.stringify(p)}`);
        if (regions.some((r) => inWaterPolygon(p, r.shore))) {
          assert.ok(regions.some((r) => r.crossings.some((c) => inWaterPolygon(p, c.polygon))));
          crossings++;
        }
      }
      const q = resolveWaterMove(seed, a, b, 9);
      assert.ok(Math.hypot(q.x - b.x, q.y - b.y) < 0.01, `road segment blocked ${seed}/${i}`);
    }
  }
  assert.ok(crossings > 20, "tests exercise real road-water intersections");
});

test("generated props and building contacts stay out of wet footprints", () => {
  for (const seed of [7, 23]) for (let cy = 0; cy <= CHUNK.maxCy; cy++)
    for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) {
      const chunk = chunkContent(seed, cx, cy);
      for (const p of [...chunk.props, ...chunk.decor])
        assert.ok(!["deep", "shallow"].includes(waterAt(seed, p.x, p.y)), `${seed}/${p.kind} buried in water`);
      for (const c of chunk.colliders) for (let t = 0; t <= 1; t += 0.25)
        assert.notEqual(waterAt(seed, c.x1 + (c.x2 - c.x1) * t, c.y1 + (c.y2 - c.y1) * t), "deep");
    }
});

class RecordingPath { constructor() { this.ops = []; } }
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "closePath"])
  RecordingPath.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class Matrix { scale() { return this; } inverse() { return this; } transformPoint(p) { return p; } }
function canvas() {
  const c = { width: 480, height: 540 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over" };
  const methods = {
    save() { stack.push({ ...state }); }, restore() { state = stack.pop(); assert.ok(state); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; }, getTransform() { return new Matrix(); },
  };
  const ctx = new Proxy({}, {
    get: (_, k) => k === "canvas" ? c : k === "calls" ? calls : k === "depth" ? stack.length : k in state ? state[k] :
      methods[k] ?? ((...args) => calls.push({ op: k, args, ...state })),
    set: (_, k, v) => { state[k] = v; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
test("water ground/core/deck Canvas paths use simulation vertices without hidden smoothing", (t) => {
  for (const [key, value] of Object.entries({ Path2D: RecordingPath, DOMMatrix: Matrix,
    document: { createElement: () => canvas() } })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("water art used RNG"));
  for (const r of all(7)) {
    const before = JSON.stringify(r), ctx = canvas().getContext("2d");
    drawWaterGround(ctx, r); drawWaterCrossings(ctx, r);
    const fill = (color) => ctx.calls.filter((c) => c.op === "fill" && c.fillStyle === color).map((c) => c.args[0].ops);
    assert.deepEqual(fill("#628b87"), [waterPath(r.shore).ops]);
    assert.deepEqual(fill("#2c4560"), r.core.length ? [waterPath(r.core).ops] : []);
    assert.deepEqual(fill("#9a8b7e"), r.crossings.map((c) => waterPath(c.polygon).ops));
    assert.ok(waterPath(r.shore).ops.every(([op]) => ["moveTo", "lineTo", "closePath"].includes(op)));
    assert.equal(ctx.depth, 0);
    assert.equal(JSON.stringify(r), before);
  }
  const renderer = readFileSync(new URL("../src/render/craft-world.ts", import.meta.url), "utf8");
  assert.match(renderer, /waterRegionsNear/);
  assert.match(renderer, /drawWaterGround\(ctx, water\)/);
  assert.match(renderer, /drawWaterCrossings\(ctx, water\)/);
  assert.match(renderer, /drawWaterShape\(ctx, water\)/, "previews draw the def geometry too");
});
