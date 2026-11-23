import assert from "node:assert/strict";
import { test } from "node:test";
import { materialAt, prepareTerrainField } from "../dist/render/iso/terrain-field.js";
import {
  ISO_BLOCK, bakeBlockLayers, bakeBlockPixels, blockWorldBox, cachedIsoBlockCount, cachedIsoImageCount, clearIsoGroundCache,
  drawIsoGround, drawIsoWater, isoGroundPixel, isoRipplePixel,
} from "../dist/render/iso/terrain-bake.js";
import { ISO_WATER, rippleFrame, rippleRgb, waterRgb } from "../dist/render/iso/water-layers.js";
import { neighbourMaterial } from "../dist/render/iso/transitions.js";
import { rampRgb } from "../dist/render/iso/palette.js";
import { surfaceRgb, surfaceStep } from "../dist/render/iso/surface-texture.js";
import { toScreen, toWorld } from "../dist/render/iso/projection.js";
import { WORLD, waterRegionsNear } from "../dist/game/world-gen.js";

const SEED = 7, W = ISO_BLOCK.width, H = ISO_BLOCK.height;
const blockOf = (x, y) => { const s = toScreen(x, y); return { col: Math.floor(s.x / W), row: Math.floor(s.y / H) }; };
const px = (buf, x, y, w = W) => [...buf.slice((y * w + x) * 4, (y * w + x) * 4 + 4)];
const isLand = (m) => m === "grass" || m === "road" || m === "soil";
const inWorld = (w) => w.x >= WORLD.minX && w.x < WORLD.maxX && w.y >= WORLD.minY && w.y < WORLD.maxY;
/** The teaching basin block and a block over the core of a deep region. */
function deepBlock(seed) {
  for (const region of waterRegionsNear(seed, 500, 2700, 6000)) {
    const b = region.bounds;
    for (let y = b.minY; y < b.maxY; y += 8)
      for (let x = b.minX; x < b.maxX; x += 8) {
        const s = materialAt(seed, x, y);
        if (s.material === "deep" && s.edge >= ISO_WATER.coreFrom + 4) return { ...blockOf(x, y), x, y };
      }
  }
  return undefined;
}

test("shallow water shows its bed, thicker towards the shore", () => {
  const near = { material: "shallow", edge: 1.5 }, far = { material: "shallow", edge: 40 };
  let nearBed = 0, farBed = 0;
  const lit = rampRgb("shallow", 3).join();
  for (let y = 0; y < 200; y++)
    for (let x = 0; x < 200; x++) {
      if (waterRgb(SEED, x, y, 0, 0, near, undefined)?.join() === lit) nearBed++;
      if (waterRgb(SEED, x, y, 0, 0, far, undefined)?.join() === lit) farBed++;
    }
  assert.ok(farBed > 0, "the bed shows in open shallow water");
  assert.ok(nearBed > farBed * 2, `more pebbles near the shore (${nearBed} vs ${farBed})`);
});

test("deep water darkens to a core and keeps a lighter shelf rim", () => {
  let core = 0, rim = 0;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const step = surfaceStep(SEED, "deep", x, y);
      assert.deepEqual(waterRgb(SEED, x, y, 0, 0, { material: "deep", edge: 30 }, undefined), rampRgb("deep", Math.max(0, step - 1)));
      assert.deepEqual(waterRgb(SEED, x, y, 0, 0, { material: "deep", edge: 1 }, "shallow"), rampRgb("deep", step + 1));
      if (step > 0) core++;
      if (step < 4) rim++;
    }
  assert.ok(core > 0 && rim > 0, "the core is darker and the rim lighter than the base texture somewhere");
  assert.equal(waterRgb(SEED, 0, 0, 0, 0, { material: "deep", edge: 8 }, undefined), undefined, "between rim and core the base texture shows");
});

test("baked water pixels layer foam, bed and deep core from the field", () => {
  let foam = 0, cores = 0, checked = 0;
  const foamRgb = rampRgb("cloth", 4).join();
  for (const { col, row } of [blockOf(1040, 420), deepBlock(SEED)].filter(Boolean)) {
    const field = prepareTerrainField(SEED, blockWorldBox(col, row)), out = bakeBlockPixels(SEED, col, row);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const sx = col * W + x, sy = row * H + y, w = toWorld(sx + 0.5, sy + 0.5);
        if (!inWorld(w)) continue;
        const s = field(w.x, w.y);
        if (s.material !== "shallow" && s.material !== "deep") continue;
        const n = neighbourMaterial(field, w.x, w.y, s), got = px(out, x, y).slice(0, 3).join();
        checked++;
        if (s.material === "shallow" && isLand(n) && s.edge < 1) { assert.equal(got, foamRgb, `foam at ${sx}, ${sy}`); foam++; }
        if (s.material === "deep" && n === undefined && s.edge >= ISO_WATER.coreFrom) {
          const step = surfaceStep(SEED, "deep", sx, sy);
          assert.equal(got, rampRgb("deep", Math.max(0, step - 1)).join(), `core at ${sx}, ${sy}`);
          cores++;
        }
      }
  }
  assert.ok(checked > 1000 && foam > 20, `shore foam on real shore pixels (${foam} of ${checked})`);
  assert.ok(cores > 0 || deepBlock(SEED) === undefined, "a deep core is baked where the field has one");
  assert.ok(surfaceRgb(SEED, "shallow", 0, 0), "surface texture still resolves");
});

test("the ripple frame comes from time and reduced motion keeps frame 0", () => {
  const p = ISO_WATER.period;
  assert.ok(ISO_WATER.frames >= 2 && ISO_WATER.frames <= 3);
  assert.deepEqual([0, p, 2 * p, 3 * p, 3.5 * p].map((t) => rippleFrame(t, false)), [0, 1, 2, 0, 0].map((f) => f % ISO_WATER.frames));
  assert.equal(rippleFrame(-p, false), ISO_WATER.frames - 1, "negative time wraps");
  assert.equal(rippleFrame(Number.NaN, false), 0);
  for (const t of [0, p, 2 * p, 7.3, 1e6]) assert.equal(rippleFrame(t, true), 0);
});

test("ripple layers are deterministic, sparse, differ by frame and keep block seams on the global function", () => {
  const { col, row } = blockOf(1040, 420), sample = (x, y) => materialAt(SEED, x, y);
  const a = bakeBlockLayers(SEED, col, row), b = bakeBlockLayers(SEED, col, row);
  assert.deepEqual(a, b);
  assert.ok(a.ripples, "the teaching basin block has ripple frames");
  const { box, frames } = a.ripples;
  assert.equal(frames.length, ISO_WATER.frames);
  assert.ok(box.w * box.h < W * H, "ripple frames are cropped to their glints");
  for (const f of frames) assert.equal(f.length, box.w * box.h * 4);
  assert.notDeepEqual(frames[0], frames[1], "frames differ");
  let opaque = 0;
  for (let f = 0; f < frames.length; f++)
    for (let y = 0; y < box.h; y += 3)
      for (let x = 0; x < box.w; x++) {
        const got = px(frames[f], x, y, box.w), sx = col * W + box.x + x, sy = row * H + box.y + y;
        assert.deepEqual(got, [...isoRipplePixel(sx, sy, f, sample)]);
        if (got[3]) opaque++;
      }
  assert.ok(opaque > 0 && opaque < (frames.length * box.w * box.h) / 6, `glints stay sparse (${opaque})`);
  // Pixels outside the crop are transparent in every frame (global function), so a frame needs nothing outside its box.
  for (let f = 0; f < frames.length; f++)
    for (let x = 0; x < W; x += 5) {
      if (x >= box.x && x < box.x + box.w) continue;
      assert.equal(isoRipplePixel(col * W + x, row * H + box.y, f, sample)[3], 0);
    }
  // Ground seams still equal the global pixel function on both sides with water layers baked in.
  const right = bakeBlockPixels(SEED, col + 1, row), below = bakeBlockPixels(SEED, col, row + 1);
  for (let y = 0; y < H; y++) {
    assert.deepEqual(px(a.ground, W - 1, y), [...isoGroundPixel(SEED, (col + 1) * W - 1, row * H + y, sample)]);
    assert.deepEqual(px(right, 0, y), [...isoGroundPixel(SEED, (col + 1) * W, row * H + y, sample)]);
  }
  for (let x = 0; x < W; x++) {
    assert.deepEqual(px(a.ground, x, H - 1), [...isoGroundPixel(SEED, col * W + x, (row + 1) * H - 1, sample)]);
    assert.deepEqual(px(below, x, 0), [...isoGroundPixel(SEED, col * W + x, (row + 1) * H, sample)]);
  }
  // Glints never sit on land.
  assert.equal(rippleRgb(0, 0, 0, { material: "grass", edge: 30 }), undefined);
});

test("drawIsoWater draws cached frames by time, never bakes, and the ripple cache stays bounded and released", (t) => {
  const canvases = [];
  const ctx2d = (canvas) => ({
    canvas,
    createImageData: (w, hgt) => ({ data: new Uint8ClampedArray(w * hgt * 4) }),
    putImageData() {},
  });
  const draws = [];
  const view = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    drawImage: (img, x, y, w, h) => draws.push({ img, x, y, w, h }),
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true, writable: true,
    value: { createElement: () => { const c = { width: 0, height: 0 }; c.getContext = () => ctx2d(c); canvases.push(c); return c; } },
  });
  t.mock.method(Math, "random", () => assert.fail("the water layers consume no random numbers"));
  t.after(() => { clearIsoGroundCache(); if (old) Object.defineProperty(globalThis, "document", old); else delete globalThis.document; });
  clearIsoGroundCache();
  const s = toScreen(1040, 420), rect = { x0: s.x - 480, y0: s.y - 270, x1: s.x + 480, y1: s.y + 270 };
  for (let frame = 0; frame < 6000 && cachedIsoImageCount() <= cachedIsoBlockCount(); frame++) drawIsoGround(view, SEED, rect, false);
  assert.ok(cachedIsoImageCount() > cachedIsoBlockCount(), "a water block brought its ripple frames");
  const made = canvases.length;
  const pick = (time, reduced) => { draws.length = 0; drawIsoWater(view, SEED, rect, time, reduced); return draws.map((d) => d.img); };
  const f0 = pick(0, false), f1 = pick(ISO_WATER.period, false);
  assert.ok(f0.length > 0 && f0.length === f1.length);
  assert.ok(f0.every((img, i) => img !== f1[i]), "another time shows another cached frame");
  assert.deepEqual(pick(3 * ISO_WATER.period, false), f0, "frames cycle");
  assert.deepEqual(pick(ISO_WATER.period, true), f0, "reduced motion keeps frame 0");
  for (const d of draws) assert.ok(d.w === d.img.width && d.h === d.img.height && d.w <= W && d.h <= H);
  for (let i = 0; i < 100; i++) drawIsoWater(view, SEED, rect, i * 0.13, false);
  assert.equal(canvases.length, made, "drawing ripples bakes nothing");
  // Walk across the map: images stay bounded by the block limit and evicted ripple canvases are released.
  for (let step = 0; step < 6; step++) {
    const q = toScreen(1040 + step * 700, 420 + step * 500), r = { x0: q.x - 480, y0: q.y - 270, x1: q.x + 480, y1: q.y + 270 };
    for (let frame = 0; frame < 3000; frame++) drawIsoGround(view, SEED, r, false);
    assert.ok(cachedIsoImageCount() <= (ISO_BLOCK.limit + 1) * (1 + ISO_WATER.frames));
  }
  assert.equal(canvases.filter((c) => c.width > 0).length, cachedIsoImageCount(), "only cached images keep pixels");
  clearIsoGroundCache();
  assert.equal(cachedIsoImageCount(), 0);
  assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
});
