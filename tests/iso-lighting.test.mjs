import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ambientRgb, drawLighting, gatherLights, IMPACT_LIGHT, LIGHTING, lightFrame, spotPixels,
} from "../dist/render/iso/lighting.js";
import { boxBlurRGBA } from "../dist/render/iso/blur.js";
import { isoYardPieces } from "../dist/render/iso/yard-models.js";
import { toScreen } from "../dist/render/iso/projection.js";
import { createSim } from "../dist/game/sim.js";
import { CAT_ART } from "../dist/render/art-index.js";
import { FIRE } from "../dist/defs/fire.js";

// Command and pixel contracts only; the light buffer was not viewed in a browser.
const view = (over = {}) => ({
  project: (x, y) => { const s = toScreen(x, y); return { x: s.x + 480, y: s.y + 270 }; },
  zoom: 1, width: 960, height: 540, focus: { x: 0, y: 0 }, dawn: 0, time: 1.3, reduced: false, ...over,
});
function recorder() {
  const calls = [], state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", imageSmoothingEnabled: true }, stack = [];
  const methods = { save() { stack.push({ ...state }); }, restore() { Object.assign(state, stack.pop()); } };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return ctx;
}

test("the light count is capped and higher priorities survive the cap", () => {
  const lamps = Array.from({ length: 80 }, (_, i) => ({ kind: "lamp", x: (i % 10) * 12 - 60, y: Math.floor(i / 10) * 12 - 40 }));
  const fire = { kind: "fire", x: 50, y: 50 };
  const frame = lightFrame([...lamps, fire], view());
  assert.equal(frame.lights.length, LIGHTING.maxLights);
  assert.equal(frame.lights[0].kind, "fire", "fire sorts before lamps");
  assert.ok(frame.lights.slice(1).every((l) => l.kind === "lamp"));
});

test("sources beyond the cull distance, off the view or without power are dropped", () => {
  const near = { kind: "lamp", x: 10, y: 10 };
  const far = { kind: "lamp", x: LIGHTING.cull + 40, y: 0 };
  const offView = { kind: "window", x: -600, y: 600, z: 0 };
  const dark = { kind: "lantern", x: 5, y: 5, power: 0 };
  const frame = lightFrame([near, far, offView, dark], view());
  assert.equal(frame.lights.length, 1);
  assert.deepEqual([frame.lights[0].sx, frame.lights[0].sy], [480, 280]);
  // Height lifts the glow centre; zoom scales spots.
  const lifted = lightFrame([{ kind: "lamp", x: 0, y: 0, z: 30 }], view({ zoom: 2 })).lights[0];
  assert.equal(lifted.sy, 270 - 60);
  assert.equal(lifted.scale, 2);
});

test("nothing is composited when there is nothing to light; no spots means one ambient fill", () => {
  const none = recorder();
  assert.equal(drawLighting(none, { ambient: [255, 255, 255], lights: [] }, 960, 540), "none");
  assert.equal(none.calls.length, 0);
  const ambient = recorder();
  assert.equal(drawLighting(ambient, { ambient: ambientRgb(0), lights: [] }, 960, 540), "ambient");
  const fills = ambient.calls.filter((c) => c.op === "fillRect");
  assert.equal(fills.length, 1);
  assert.equal(fills[0].globalCompositeOperation, "multiply");
  assert.ok(!ambient.calls.some((c) => c.op === "drawImage"), "no buffer without spots");
  // With spots: the buffer gets ambient + additive spots, then one multiply drawImage onto the scene.
  const target = recorder(), bctx = recorder(), canvas = { width: 960, height: 540 };
  const spot = { image: { spot: true }, width: 10, height: 6 };
  const frame = lightFrame([{ kind: "lamp", x: 0, y: 0 }, { kind: "fire", x: 20, y: 0 }], view());
  assert.equal(drawLighting(target, frame, 960, 540, { buffer: { canvas, ctx: bctx }, spot: () => spot }), "buffer");
  const draws = target.calls.filter((c) => c.op === "drawImage");
  assert.equal(draws.length, 1);
  assert.equal(draws[0].args[0], canvas);
  assert.equal(draws[0].globalCompositeOperation, "multiply");
  const spots = bctx.calls.filter((c) => c.op === "drawImage");
  assert.equal(spots.length, 2);
  assert.ok(spots.every((c) => c.globalCompositeOperation === "lighter" && c.globalAlpha > 0 && c.globalAlpha <= 1));
  assert.ok(spots.every((c) => c.args.slice(1).every(Number.isInteger)), "spots sit on whole pixels");
});

test("lighting is deterministic, flicker comes from the time bucket and reduced motion holds it still", () => {
  const sources = [{ kind: "fire", x: 0, y: 0 }, { kind: "candle", x: 30, y: 10 }, { kind: "lamp", x: -20, y: 40, z: 30 }];
  assert.deepEqual(lightFrame(sources, view()), lightFrame(sources, view()));
  const a = lightFrame(sources, view({ time: 0.01 })), b = lightFrame(sources, view({ time: 0.02 }));
  assert.deepEqual(a, b, "same bucket, same flicker");
  const times = [0.1, 0.6, 1.1, 2.7, 5.3].map((time) => lightFrame(sources, view({ time })).lights[0].power);
  assert.ok(new Set(times).size > 1, "fire flickers over time");
  const still = [0.1, 0.6, 2.7].map((time) => lightFrame(sources, view({ time, reduced: true })));
  assert.deepEqual(still[0], still[1]);
  assert.deepEqual(still[0], still[2]);
  // Ambient: cool blue-purple at night, warmer at dawn.
  const [r, g, bl] = ambientRgb(0), [r1, , b1] = ambientRgb(1);
  assert.ok(bl > r && bl > g, "night ambient leans blue");
  assert.ok(r1 > r && r1 >= b1, "dawn ambient warms");
  assert.deepEqual(ambientRgb(NaN), ambientRgb(0));
});

test("light spots are pre-blurred stepped ellipses, pure of the kind", () => {
  const p = spotPixels("lamp"), q = spotPixels("lamp");
  assert.deepEqual(p.data, q.data);
  const k = LIGHTING.kinds.lamp, at = (x, y) => p.data[(y * p.width + x) * 4 + 3];
  assert.ok(at(p.width / 2, p.height / 2) > 200, "bright centre");
  assert.equal(at(0, 0), 0, "clear corner");
  assert.ok(p.width > 2 * k.rx && p.height > 2 * k.ry);
  // Blur softens a hard edge and keeps alpha-free pixels colourless.
  const d = new Uint8ClampedArray(8 * 1 * 4);
  for (let i = 4; i < 8; i++) d.set([255, 128, 0, 255], i * 4);
  boxBlurRGBA(d, 8, 1, 1, 1);
  assert.ok(d[3 * 4 + 3] > 0 && d[3 * 4 + 3] < 255, "edge is soft");
  assert.equal(d[3 * 4], 255, "premultiplied blur keeps the colour");
});

test("frame sources: lamps, yard windows, decor, lit pumpkins, lanterns, fire cells and skill hits", () => {
  const sim = createSim({ cat: CAT_ART.ids()[0], seed: 7 });
  const windows = isoYardPieces().flatMap((p) => (p.glows ?? []).map((g) => ({ x: p.x + g.x, y: p.y + g.y, z: g.z })));
  assert.ok(windows.length >= 10, "barn and both cottages glow");
  sim.fire.cells["3,4"] = FIRE.burnTime;
  sim.impacts.push({ kind: "hit", x: 1, y: 2, life: 0.1 }, { kind: "collect", x: 1, y: 2, life: 0.2 });
  const before = structuredClone(sim);
  const sources = gatherLights({ lamps: [{ x: 1, y: 1, s: 1 }], windows, decor: [{ kind: "candles", x: 5, y: 5, s: 1 }, { kind: "stone", x: 0, y: 0, s: 1 }], sim });
  assert.deepEqual(sim, before, "gathering lights leaves SimState untouched");
  const kinds = sources.map((s) => s.kind);
  assert.ok(kinds.includes("fire") && kinds.includes("hit") && kinds.includes("window") && kinds.includes("candle") && kinds.includes("lamp"));
  const fire = sources.find((s) => s.kind === "fire");
  assert.deepEqual([fire.x, fire.y], [3.5 * FIRE.cell, 4.5 * FIRE.cell]);
  assert.equal(sources.filter((s) => s.kind === "hit").length, 1, "only light-giving impacts");
  assert.equal(IMPACT_LIGHT.collect, undefined);
  assert.ok(sim.interactables.every((o) => o.kind !== "pumpkin" || o.lit > 0 || !sources.some((s) => s.x === o.x && s.y === o.y && s.kind === "pumpkin")), "unlit pumpkins give no light");
  assert.deepEqual(gatherLights({ lamps: [], windows, decor: [], sim }), gatherLights({ lamps: [], windows, decor: [], sim }));
});

test("lighting runs after the scene and before the screen overlays, with no per-frame filter or randomness", () => {
  const src = (p) => readFileSync(new URL(`../src/render/${p}`, import.meta.url), "utf8");
  for (const name of ["iso/lighting.ts", "iso/blur.ts"]) {
    const text = src(name);
    assert.doesNotMatch(text, /Math\.random|\.filter\s*=|shadowBlur|createRadialGradient/, name);
  }
  const world = src("world.ts"), light = world.indexOf("drawLighting("), restore = world.lastIndexOf("ctx.restore();", light);
  assert.ok(light > 0 && restore > world.indexOf("drawPlaybillStage"), "after the camera-space scene");
  assert.ok(light < world.indexOf("drawNavArrows(ctx") && light < world.indexOf("drawCueScreen(ctx") && light < world.indexOf("drawFrame(ctx"));
});
