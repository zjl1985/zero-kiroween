import assert from "node:assert/strict";
import { test } from "node:test";
import { materialAt, prepareTerrainField } from "../dist/render/iso/terrain-field.js";
import {
  ISO_BLOCK, bakeBlockPixels, blockWorldBox, cachedIsoBlockCount, cachedIsoImageCount, clearIsoGroundCache, createBlockCache, drawIsoGround, isoGroundPixel,
} from "../dist/render/iso/terrain-bake.js";
import { toScreen, toWorld } from "../dist/render/iso/projection.js";
import { visHash } from "../dist/render/hash.js";
import { CHUNK, WORLD, roads, waterRegionsNear } from "../dist/game/world-gen.js";

const SEED = 7, W = ISO_BLOCK.width, H = ISO_BLOCK.height;
const h = (i, salt) => visHash(i * 7919 + salt * 104729 + 31);
const blockOf = (x, y) => { const s = toScreen(x, y); return { col: Math.floor(s.x / W), row: Math.floor(s.y / H) }; };
/** Blocks over the start yard, a water region, a road bend and plain country. */
function blocksToCheck(seed) {
  const out = [blockOf(480, 270), blockOf(1040, 420)];
  const water = waterRegionsNear(seed, 2400, 2700, 3000)[0];
  if (water) out.push(blockOf((water.bounds.minX + water.bounds.maxX) / 2, (water.bounds.minY + water.bounds.maxY) / 2));
  const road = roads(seed)[1] ?? roads(seed)[0];
  out.push(blockOf(road.points[1].x, road.points[1].y), blockOf(-3000, 4000));
  return out;
}

test("the prepared per-block field answers exactly like materialAt", () => {
  let checked = 0;
  for (const seed of [SEED, 22])
    for (const [b, { col, row }] of blocksToCheck(seed).entries()) {
      const field = prepareTerrainField(seed, blockWorldBox(col, row));
      for (let i = 0; i < 400; i++) {
        const px = col * W + Math.floor(h(i, b * 3 + 1) * W), py = row * H + Math.floor(h(i, b * 3 + 2) * H),
          w = toWorld(px + 0.5, py + 0.5);
        if (w.x < WORLD.minX || w.x >= WORLD.maxX || w.y < WORLD.minY || w.y >= WORLD.maxY) continue;
        assert.deepEqual(field(w.x, w.y), materialAt(seed, w.x, w.y), `seed ${seed} at ${w.x}, ${w.y}`);
        checked++;
      }
    }
  assert.ok(checked > 3000, "most sample pixels fall inside the world");
});

test("a block bakes the same pixels twice and its pixels follow the global pixel function", () => {
  const { col, row } = blockOf(1040, 420);
  const a = bakeBlockPixels(SEED, col, row), b = bakeBlockPixels(SEED, col, row);
  assert.equal(a.length, W * H * 4);
  assert.deepEqual(a, b);
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(h(i, 9) * W), y = Math.floor(h(i, 10) * H), k = (y * W + x) * 4;
    assert.deepEqual([...a.slice(k, k + 4)], [...isoGroundPixel(SEED, col * W + x, row * H + y, (wx, wy) => materialAt(SEED, wx, wy))]);
  }
  const materials = new Set();
  for (let i = 0; i < a.length; i += 4 * 97) materials.add(a[i] * 65536 + a[i + 1] * 256 + a[i + 2]);
  assert.ok(materials.size > 4, "the teaching basin block shows more than one colour");
});

test("adjacent blocks meet without a seam", () => {
  const { col, row } = blockOf(480, 270), sample = (x, y) => materialAt(SEED, x, y);
  const here = bakeBlockPixels(SEED, col, row), right = bakeBlockPixels(SEED, col + 1, row), below = bakeBlockPixels(SEED, col, row + 1);
  const px = (buf, x, y) => [...buf.slice((y * W + x) * 4, (y * W + x) * 4 + 4)];
  for (let y = 0; y < H; y++) {
    assert.deepEqual(px(here, W - 1, y), [...isoGroundPixel(SEED, (col + 1) * W - 1, row * H + y, sample)]);
    assert.deepEqual(px(right, 0, y), [...isoGroundPixel(SEED, (col + 1) * W, row * H + y, sample)]);
  }
  let same = 0;
  for (let x = 0; x < W; x++) {
    assert.deepEqual(px(here, x, H - 1), [...isoGroundPixel(SEED, col * W + x, (row + 1) * H - 1, sample)]);
    assert.deepEqual(px(below, x, 0), [...isoGroundPixel(SEED, col * W + x, (row + 1) * H, sample)]);
    if (px(here, x, H - 1).join() === px(below, x, 0).join()) same++;
  }
  // Across the seam the texture continues: neighbouring rows share most colours, as inside a block.
  let inside = 0;
  for (let x = 0; x < W; x++) if (px(here, x, H - 2).join() === px(here, x, H - 1).join()) inside++;
  assert.ok(Math.abs(same - inside) < W * 0.25, `seam rows match like interior rows (${same} vs ${inside})`);
});

test("pixels outside WORLD stay transparent", () => {
  const top = toScreen(WORLD.minX, WORLD.minY), col = Math.floor(top.x / W), row = Math.floor(top.y / H) - 1;
  const out = bakeBlockPixels(SEED, col, row);
  for (let i = 3; i < out.length; i += 4 * 251) assert.equal(out[i], 0);
});

test("the block cache keeps its limit, protects wanted blocks and releases what it evicts", () => {
  assert.ok(ISO_BLOCK.limit * W * H <= ISO_BLOCK.budgetArea);
  // The legacy 14-chunk world area, in native pixels at k = 0.5 (a quarter of the k = 1 pixel area).
  assert.equal(ISO_BLOCK.budgetArea, 14 * CHUNK.width * CHUNK.height / 4);
  // A 480 x 270 view touches at most 3 x 4 blocks; they all fit with room to prefetch.
  assert.ok(ISO_BLOCK.limit >= (Math.ceil(480 / W) + 1) * (Math.ceil(270 / H) + 1));
  const released = [], cache = createBlockCache(3, (v) => released.push(v));
  cache.set("a", "A"); cache.set("b", "B"); cache.set("c", "C");
  cache.get("a");
  cache.set("d", "D");
  assert.deepEqual(released, ["B"]);
  assert.deepEqual(cache.keys(), ["c", "a", "d"]);
  cache.set("e", "E", new Set(["c", "a", "d"]));
  assert.equal(cache.size, 4, "wanted entries may exceed the limit briefly instead of being dropped");
  cache.set("f", "F");
  assert.equal(cache.size, 3);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.deepEqual(released.sort(), ["A", "B", "C", "D", "E", "F"]);
});

test("drawIsoGround bakes visible blocks on the fallback path and evicts canvases over the budget", (t) => {
  const canvases = [];
  const ctx2d = (canvas) => ({
    canvas,
    createImageData: (w, hgt) => ({ data: new Uint8ClampedArray(w * hgt * 4) }),
    putImageData() {},
  });
  const draws = [];
  const view = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    drawImage: (img) => draws.push(img),
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true, writable: true,
    value: { createElement: () => { const c = { width: 0, height: 0 }; c.getContext = () => ctx2d(c); canvases.push(c); return c; } },
  });
  t.mock.method(Math, "random", () => assert.fail("the ground bake consumes no random numbers"));
  t.after(() => { clearIsoGroundCache(); if (old) Object.defineProperty(globalThis, "document", old); else delete globalThis.document; });
  clearIsoGroundCache();
  const rectAt = (x, y) => { const s = toScreen(x, y); return { x0: s.x - 240, y0: s.y - 135, x1: s.x + 240, y1: s.y + 135 }; };
  // Title screen style (no prefetch): keep drawing until the visible blocks are ready.
  for (let frame = 0; frame < 4000 && draws.length === 0; frame++) drawIsoGround(view, SEED, rectAt(-3000, 4000), false);
  assert.ok(cachedIsoBlockCount() > 0 && draws.length > 0, "a baked block is drawn");
  // Walk across the map: the cache stays inside its limit and evicted canvases are released.
  for (let step = 0; step < 6; step++)
    for (let frame = 0; frame < 3000; frame++) {
      drawIsoGround(view, SEED, rectAt(-3000 + step * 1800, 4000 - step * 600), false);
      assert.ok(cachedIsoBlockCount() <= ISO_BLOCK.limit + 1);
    }
  assert.ok(canvases.length > ISO_BLOCK.limit, `baked more blocks (${canvases.length}) than the cache keeps`);
  assert.equal(cachedIsoBlockCount(), ISO_BLOCK.limit);
  const kept = canvases.filter((c) => c.width > 0);
  // Water blocks also hold their cropped ripple frames; everything else that was evicted is released.
  assert.equal(kept.length, cachedIsoImageCount(), "every evicted canvas is released (width = height = 0)");
  clearIsoGroundCache();
  assert.equal(cachedIsoBlockCount(), 0);
  assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
});

test("a failed or stalled terrain worker is replaced once, then blocks bake on the main thread", (t) => {
  const workers = [];
  class TerrainWorker {
    requests = [];
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(request) { this.requests.push(request); }
    terminate() { this.terminated = true; }
  }
  const canvases = [], draws = [];
  const ctx2d = (canvas) => ({ canvas, createImageData: (w, hgt) => ({ data: new Uint8ClampedArray(w * hgt * 4) }), putImageData() {} });
  const view = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    drawImage: (img) => draws.push(img),
  };
  const globals = {
    Worker: TerrainWorker, OffscreenCanvas: class {},
    document: { createElement: () => { const c = { width: 0, height: 0 }; c.getContext = () => ctx2d(c); canvases.push(c); return c; } },
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  let clock = 1000;
  t.mock.method(performance, "now", () => clock);
  t.after(clearIsoGroundCache);
  clearIsoGroundCache();
  const s = toScreen(480, 270), rect = { x0: s.x - 480, y0: s.y - 270, x1: s.x + 480, y1: s.y + 270 };
  drawIsoGround(view, SEED, rect, false);
  assert.equal(workers.length, 1);
  assert.equal(workers[0].requests.length, 1);
  // A null reply (no OffscreenCanvas context in the worker) terminates it; the next frame starts a fresh worker.
  workers[0].onmessage({ data: { id: workers[0].requests[0].id, bitmap: null } });
  assert.equal(workers[0].terminated, true);
  drawIsoGround(view, SEED, rect, false);
  assert.equal(workers.length, 2, "one retry with a fresh worker");
  assert.equal(workers[1].requests.length, 1);
  // The fresh worker never replies: within the timeout warming waits, after it the worker is dropped.
  clock += ISO_BLOCK.workerTimeoutMs - 1;
  drawIsoGround(view, SEED, rect, false);
  assert.equal(workers[1].terminated, false);
  assert.equal(cachedIsoBlockCount(), 0);
  clock += 2;
  drawIsoGround(view, SEED, rect, false);
  assert.equal(workers[1].terminated, true, "a stalled request times out");
  assert.equal(workers.length, 2, "no third worker: bake locally from now on");
  assert.ok(cachedIsoBlockCount() > 0, "the main-thread fallback baked a block in the same frame");
  // A late reply from the dropped worker is ignored.
  const late = { closed: false, close() { this.closed = true; } };
  workers[1].onmessage({ data: { id: workers[1].requests[0].id, bitmap: late } });
  assert.equal(late.closed, true);
  // clearIsoGroundCache starts the next run with a fresh worker budget.
  clearIsoGroundCache();
  drawIsoGround(view, SEED, rect, false);
  assert.equal(workers.length, 3);
});
