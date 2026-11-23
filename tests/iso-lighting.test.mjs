import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  bloomPixels, dawnTint, drawLighting, frameLightBuffer, gatherLights, IMPACT_LIGHT, LIGHTING, lightFrame, spotPixels,
} from "../dist/render/iso/lighting.js";
import { UPRIGHT_SCALE } from "../dist/render/iso/place.js";
import { genGlows } from "../dist/render/iso/gen-sprites.js";
import { isoYardPieces } from "../dist/render/iso/yard-models.js";
import { toScreen } from "../dist/render/iso/projection.js";
import { createSim } from "../dist/game/sim.js";
import { CAT_ART } from "../dist/render/art-index.js";
import { FIRE } from "../dist/defs/fire.js";

// Command and pixel contracts only; the light buffer was not viewed in a browser.
const view = (over = {}) => ({
  project: (x, y) => { const s = toScreen(x, y); return { x: s.x + 240, y: s.y + 135 }; },
  zoom: 1, width: 480, height: 270, focus: { x: 0, y: 0 }, dawn: 0, time: 1.3, reduced: false, ...over,
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
  const offView = { kind: "window", x: -1200, y: 1200, z: 0 };
  const dark = { kind: "lantern", x: 5, y: 5, power: 0 };
  const frame = lightFrame([near, far, offView, dark], view());
  assert.equal(frame.lights.length, 1);
  assert.deepEqual([frame.lights[0].sx, frame.lights[0].sy], [240, 140]);
  // Height lifts the glow centre (in upright art units, so at UPRIGHT_SCALE); zoom scales spots.
  const lifted = lightFrame([{ kind: "lamp", x: 0, y: 0, z: 30 }], view({ zoom: 2 })).lights[0];
  assert.equal(lifted.sy, 135 - 60 * UPRIGHT_SCALE);
  assert.equal(lifted.scale, 2);
});

test("no ambient multiply: nothing runs at night without lights, dawn is one low tint, spots go through an additive buffer", () => {
  const none = recorder();
  assert.equal(drawLighting(none, { dawn: 0, lights: [] }, 480, 270), "none");
  assert.equal(none.calls.length, 0);
  assert.equal(frameLightBuffer(), undefined, "no light buffer for the colour split");
  const tint = recorder();
  assert.equal(drawLighting(tint, { dawn: 1, lights: [] }, 480, 270), "tint");
  const fills = tint.calls.filter((c) => c.op === "fillRect");
  assert.equal(fills.length, 1);
  assert.equal(fills[0].globalCompositeOperation, "source-over");
  assert.ok(fills[0].globalAlpha > 0 && fills[0].globalAlpha <= LIGHTING.dawn.alpha);
  assert.ok(!tint.calls.some((c) => c.op === "drawImage"), "no buffer without spots");
  // With spots: the buffer is cleared, gets additive spots and blooms, then one additive drawImage onto the scene.
  const target = recorder(), bctx = recorder(), canvas = { width: 480, height: 270 };
  const spot = { image: { spot: true }, width: 10, height: 6 }, bloom = { image: { bloom: true }, width: 4, height: 4 };
  const frame = lightFrame([{ kind: "lamp", x: 0, y: 0 }, { kind: "fire", x: 20, y: 0 }, { kind: "window", x: 0, y: 20 }], view());
  assert.equal(drawLighting(target, frame, 480, 270, { buffer: { canvas, ctx: bctx }, spot: () => spot, bloom: () => bloom }), "buffer");
  const all = [...target.calls, ...bctx.calls];
  assert.ok(!all.some((c) => c.globalCompositeOperation === "multiply"), "no multiply anywhere");
  const draws = target.calls.filter((c) => c.op === "drawImage");
  assert.equal(draws.length, 1);
  assert.equal(draws[0].args[0], canvas);
  assert.equal(draws[0].globalCompositeOperation, "lighter");
  assert.ok(bctx.calls.some((c) => c.op === "clearRect"), "the buffer starts black");
  const spots = bctx.calls.filter((c) => c.op === "drawImage" && c.args[0] === spot.image);
  assert.equal(spots.length, 3);
  const blooms = bctx.calls.filter((c) => c.op === "drawImage" && c.args[0] === bloom.image);
  assert.equal(blooms.length, 2, "lamp and fire bloom, windows do not");
  assert.ok([...spots, ...blooms].every((c) => c.globalCompositeOperation === "lighter" && c.globalAlpha > 0 && c.globalAlpha <= 1));
  assert.ok(spots.every((c) => c.args.slice(1).every(Number.isInteger)), "spots sit on whole pixels");
  assert.equal(frameLightBuffer(), canvas, "this frame's buffer is offered to the retro colour split");
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
  // Dawn: no tint at night, a warm low-alpha tint at full dawn.
  assert.equal(dawnTint(0).alpha, 0);
  assert.equal(dawnTint(NaN).alpha, 0);
  const [dr, , db] = LIGHTING.dawn.rgb;
  assert.ok(dawnTint(1).alpha > 0 && dawnTint(1).alpha <= 0.25 && dr > db, "dawn warms");
});

test("light spots are Bayer-dithered stepped ellipses, pure of the kind", () => {
  const p = spotPixels("lamp"), q = spotPixels("lamp");
  assert.deepEqual(p.data, q.data);
  const k = LIGHTING.kinds.lamp, red = (x, y) => p.data[(y * p.width + x) * 4];
  assert.equal(p.width, 2 * k.rx);
  assert.equal(p.height, 2 * k.ry);
  assert.ok(red(p.width / 2, p.height / 2) >= k.rgb[0] * 0.6, "bright centre");
  assert.equal(red(0, 0), 0, "black (no light) corner");
  // Stepped: only a few distinct levels; dithered: a band edge mixes two levels in a 4 x 4 cell.
  const levels = new Set();
  for (let i = 0; i < p.data.length; i += 4) levels.add(p.data[i]);
  assert.ok(levels.size <= LIGHTING.bands + 1, `${levels.size} levels`);
  let mixed = 0;
  for (let y = 0; y + 4 <= p.height; y += 4) for (let x = 0; x + 4 <= p.width; x += 4) {
    const cell = new Set();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) cell.add(red(x + i, y + j));
    if (cell.size > 1) mixed++;
  }
  assert.ok(mixed > 4, "band edges are dithered");
  // Every opaque pixel is a straight colour (additive black is a no-op), so no blur halo.
  for (let i = 3; i < p.data.length; i += 4) assert.ok(p.data[i] === 0 || p.data[i] === 255);
  const b = bloomPixels();
  assert.ok(b.width <= 16 && b.data[((b.height / 2) * b.width + b.width / 2) * 4] > 0, "a small bright bloom core");
});

test("frame sources: lamps, yard windows, decor, lit pumpkins, lanterns, fire cells and skill hits", () => {
  const sim = createSim({ cat: CAT_ART.ids()[0], seed: 7 });
  // Baked yard sprites carry their window anchors (scripts/iso-art emissive layer).
  const glows = [];
  for (const p of isoYardPieces()) genGlows(p.sprite, p.x, p.y, glows);
  assert.ok(glows.filter((g) => g.kind === "window").length >= 10, "barn and both cottages glow");
  const glowSources = gatherLights({ lamps: [], windows: [], decor: [], glows, sim: null });
  assert.equal(glowSources.length, glows.length);
  assert.ok(glowSources.every((s, i) => s.dx === glows[i].dx && s.lift === glows[i].lift && s.lift > 0), "native offsets above the foot");
  const windows = glows.filter((g) => g.kind === "window").map((g) => ({ x: g.x, y: g.y, z: 0 }));
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
  for (const name of ["iso/lighting.ts", "iso/blur.ts", "iso/retro.ts"]) {
    const text = src(name);
    assert.doesNotMatch(text, /Math\.random|\.filter\s*=|shadowBlur|createRadialGradient/, name);
  }
  const world = src("world.ts"), light = world.indexOf("drawLighting("), restore = world.lastIndexOf("ctx.restore();", light);
  assert.ok(light > 0 && restore > world.indexOf("drawPlaybillStage"), "after the camera-space scene");
  // The screen UI moved to the presentation pass, after the retro layer.
  const present = world.indexOf("export function presentWorld"), retro = world.indexOf("drawRetro(ctx", present);
  assert.ok(present > 0 && retro > present);
  assert.ok(retro < world.indexOf("drawNavArrows(ctx", present) && retro < world.indexOf("drawCueScreen(ctx", present) && retro < world.indexOf("drawFrame(ctx", present));
  assert.ok(!world.slice(world.indexOf("function drawWorldFrame")).includes("drawNavArrows(ctx, sim, camera"), "no UI in the native scene");
});
