import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { RETRO, drawRetro, grainFrame, grainPixels, vignetteAlpha } from "../dist/render/iso/retro.js";
import { PRESENT_MAX_SCALE, pixelBacking, presentBacking } from "../dist/render/pixel-resolution.js";
import { VIEW_HEIGHT, VIEW_WIDTH, boardLayout } from "../dist/render/viewport.js";

// Pattern and call contracts only; the retro layer was viewed in offline harness frames, not in a browser.
test("the scene frame is 480 x 270 native pixels, presented at a whole enlargement", () => {
  assert.deepEqual([VIEW_WIDTH, VIEW_HEIGHT], [480, 270]);
  const l = boardLayout(1920, 1080, 1, true);
  assert.deepEqual(pixelBacking(l.viewWidth, l.viewHeight), { width: 480, height: 270 });
  assert.deepEqual(presentBacking({ width: 480, height: 270 }, 1920, 1), { width: 1920, height: 1080, scale: 4 });
  assert.deepEqual(presentBacking({ width: 480, height: 270 }, 960, 1), { width: 960, height: 540, scale: 2 });
  assert.equal(presentBacking({ width: 480, height: 270 }, 1920, 3).scale, PRESENT_MAX_SCALE, "capped");
  assert.equal(presentBacking({ width: 480, height: 270 }, 200, 1).scale, 1);
});

test("grain cycles four cached tiles at 12 fps and reduced motion freezes it", () => {
  assert.equal(RETRO.grain.tiles, 4);
  assert.equal(grainFrame(0, false), 0);
  assert.equal(grainFrame(1 / 12 + 1e-6, false), 1);
  assert.equal(grainFrame(5 / 12 + 1e-6, false), 1);
  for (const t of [0.3, 1.7, 9.9]) assert.equal(grainFrame(t, true), 0);
  assert.deepEqual(grainPixels(2).data, grainPixels(2).data);
  assert.notDeepEqual(grainPixels(1).data, grainPixels(2).data);
});

test("the vignette is clear in the middle and darkens toward rounded corners", () => {
  const w = 480, h = 270;
  assert.equal(vignetteAlpha(240, 135, w, h), 0);
  assert.ok(vignetteAlpha(0, 0, w, h) > vignetteAlpha(40, 40, w, h));
  assert.ok(vignetteAlpha(0, 0, w, h) > 150, "the curved corner is dark");
  assert.ok(vignetteAlpha(240, 2, w, h) < 60, "edges stay readable");
});

test("drawRetro uses cached patterns only: scanlines, grain, vignette and the light split", () => {
  const calls = [], made = [];
  const rec = (log) => {
    const state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", imageSmoothingEnabled: false };
    return new Proxy({}, {
      get: (_, k) => k in state ? state[k] : k === "createImageData" ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
        : k === "createPattern" ? (img) => ({ pattern: img }) : (...args) => log.push({ op: k, args, ...state }),
      set: (_, k, v) => { state[k] = v; return true; },
    });
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true,
    value: { createElement: () => { const c = { width: 0, height: 0 }; c.getContext = () => rec([]); made.push(c); return c; } } });
  try {
    const ctx = rec(calls), light = { width: 480, height: 270 };
    drawRetro(ctx, 960, 540, { time: 1, reduced: false, light });
    const first = made.length;
    drawRetro(ctx, 960, 540, { time: 1.2, reduced: false, light });
    assert.equal(made.length, first, "no new canvases on the second frame");
    assert.ok(calls.every((c) => c.op !== "getImageData"), "no pixel reads");
    const split = calls.filter((c) => c.op === "drawImage" && c.globalCompositeOperation === "lighter");
    assert.equal(split.length, 4, "red and blue copies, two frames");
    assert.ok(split.every((c) => Math.abs(c.args[1]) === RETRO.split.offset));
    assert.ok(calls.filter((c) => c.op === "fillRect").length >= 4, "scanline and grain fills");
  } finally {
    if (old) Object.defineProperty(globalThis, "document", old); else delete globalThis.document;
  }
  const src = readFileSync(new URL("../src/render/iso/retro.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\.filter\s*=|getImageData|Math\.random/);
});
