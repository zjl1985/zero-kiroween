import assert from "node:assert/strict";
import { test } from "node:test";
import { TERRAIN, materialAt } from "../dist/render/iso/terrain-field.js";
import { visHash } from "../dist/render/hash.js";
import { CHUNK, WORLD, biomeAt, roads, waterRegionsNear } from "../dist/game/world-gen.js";
import { waterAt } from "../dist/game/water.js";

const SEED = 7;
const h = (i, salt) => visHash(i * 7919 + salt * 104729 + 17);
function segDist(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy,
    t = d <= 1e-8 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / d));
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}
const simRoad = (x, y) => roads(SEED).some((r) => r.points.some((a, i) => i > 0 && segDist(x, y, r.points[i - 1], a) < r.width));
function waterShapes(seed) {
  const found = new Map();
  for (let cy = CHUNK.minCy; cy <= CHUNK.maxCy; cy++)
    for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++)
      for (const r of waterRegionsNear(seed, (cx + 0.5) * CHUNK.width, (cy + 0.5) * CHUNK.height, 300)) found.set(r.id, r);
  return [...found.values()];
}
/** 1000 render-hash points: a third uniform over the world, a third around water, a third along roads. */
function samples(seed) {
  const regions = waterShapes(seed), segs = roads(seed).flatMap((r) => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, w: r.width })));
  const out = [];
  for (let i = 0; i < 1000; i++) {
    const k = i % 3;
    if (k === 0) out.push({ x: WORLD.minX + h(i, 1) * WORLD.width, y: WORLD.playTop + h(i, 2) * (WORLD.maxY - WORLD.playTop) });
    else if (k === 1) {
      const b = regions[Math.floor(h(i, 3) * regions.length)].bounds;
      out.push({ x: b.minX - 20 + h(i, 4) * (b.maxX - b.minX + 40), y: b.minY - 20 + h(i, 5) * (b.maxY - b.minY + 40) });
    } else {
      const s = segs[Math.floor(h(i, 6) * segs.length)], t = h(i, 7), len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1,
        off = (h(i, 8) - 0.5) * 2.6 * s.w;
      out.push({ x: s.a.x + (s.b.x - s.a.x) * t - (s.b.y - s.a.y) / len * off, y: s.a.y + (s.b.y - s.a.y) * t + (s.b.x - s.a.x) / len * off });
    }
  }
  return out;
}

test("1000 hashed points agree with the sim water, bridge and road classification", (t) => {
  t.mock.method(Math, "random", () => assert.fail("the terrain field uses no random numbers"));
  const counts = {};
  for (const p of samples(SEED)) {
    const s = materialAt(SEED, p.x, p.y), status = waterAt(SEED, p.x, p.y);
    counts[s.material] = (counts[s.material] ?? 0) + 1;
    if (status !== "dry") assert.equal(s.material, status, `water status at ${p.x},${p.y}`);
    else if (simRoad(p.x, p.y)) assert.equal(s.material, "road", `road at ${p.x},${p.y}`);
    else if (s.material === "road") assert.ok(p.y < TERRAIN.yardBottom + 28, `extra road only on the yard approach (${p.x},${p.y})`);
    else assert.ok(s.material === "grass" || s.material === "soil", `dry ground at ${p.x},${p.y}`);
    assert.equal(s.biome, biomeAt(SEED, Math.floor(p.x / CHUNK.width), Math.floor(p.y / CHUNK.height)).id);
    assert.ok(s.edge >= 0 && s.edge <= TERRAIN.edgeCap);
  }
  for (const m of ["grass", "road", "shallow", "deep", "bridge"]) assert.ok(counts[m] > 5, `${m} sampled (${JSON.stringify(counts)})`);
});

test("the teaching basin is fully shallow and the yard holds road and garden soil", () => {
  assert.equal(materialAt(SEED, 1040, 420).material, "shallow");
  assert.equal(materialAt(SEED, 525.5, 520).material, "road");
  assert.equal(materialAt(SEED, 330, 390).material, "soil");
  assert.equal(materialAt(SEED, 700, 620).material, "soil", "south extension plot (seed 7 routes a branch road over its west half)");
  assert.equal(materialAt(SEED, 150, 480).material, "grass");
  assert.deepEqual(materialAt(SEED, 300, 300), materialAt(SEED, 300, 300), "pure");
});

test("edge distances are continuous and reach zero where the material changes", () => {
  const step = 0.5;
  let changes = 0;
  for (const [i, p] of samples(SEED).entries()) {
    const a = h(i, 9) * Math.PI * 2, q = { x: p.x + Math.cos(a) * step, y: p.y + Math.sin(a) * step },
      s = materialAt(SEED, p.x, p.y), r = materialAt(SEED, q.x, q.y);
    if (s.material === r.material) assert.ok(Math.abs(s.edge - r.edge) <= step + 1e-6, `${s.material} at ${p.x},${p.y}: ${s.edge} vs ${r.edge}`);
    else {
      changes++;
      assert.ok(s.edge <= step + 1e-6 && r.edge <= step + 1e-6, `${s.material}->${r.material} at ${p.x},${p.y}: ${s.edge}, ${r.edge}`);
    }
  }
  // Walk across a road and through the teaching basin in small steps.
  for (const line of [{ x0: 480, x1: 580, y: 900 }, { x0: 940, x1: 1140, y: 420 }]) {
    let prev = materialAt(SEED, line.x0, line.y);
    for (let x = line.x0 + step; x <= line.x1; x += step) {
      const s = materialAt(SEED, x, line.y);
      if (s.material === prev.material) assert.ok(Math.abs(s.edge - prev.edge) <= step + 1e-6);
      else { changes++; assert.ok(s.edge <= step + 1e-6 && prev.edge <= step + 1e-6); }
      prev = s;
    }
  }
  assert.ok(changes > 4, `${changes} material changes crossed`);
});
