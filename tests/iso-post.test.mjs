import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  drawFog, drawNearLayer, drawParticles, fogOffset, fogTilePixels, nearBox, nearFaded, nearLeavesPixels, particles, POST,
} from "../dist/render/iso/post.js";
import { boxBlurRGBA, paintBlurred } from "../dist/render/iso/blur.js";

// Pixel and command contracts only; fog, particles and the near layer were not viewed in a browser.
const view = (over = {}) => ({ width: 960, height: 540, cameraX: 1200, cameraY: 800, time: 3.7, reduced: false, dawn: 0, fires: [], ...over });
function recorder() {
  const calls = [], state = { globalAlpha: 1, fillStyle: "#000" }, stack = [];
  const methods = { save() { stack.push({ ...state }); }, restore() { Object.assign(state, stack.pop()); } };
  return new Proxy({}, {
    get: (_, key) => key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
}

test("particles never exceed the cap, even with many fires", (t) => {
  t.mock.method(Math, "random", () => assert.fail("particles use the render hash"));
  const fires = Array.from({ length: 40 }, (_, i) => ({ x: 100 + i * 10, y: 300 }));
  const P = POST.particles;
  assert.ok(P.fireflies + P.leaves + P.ashMax > P.cap, "the kinds together can exceed the cap");
  for (const time of [0, 1.1, 4.9, 33.3]) {
    const list = particles(view({ time, fires }));
    assert.ok(list.length <= P.cap, `${list.length} <= cap`);
    assert.ok(list.some((p) => p.kind === "ash"), "ash rises from burning cells");
    for (const p of list) assert.ok([p.x, p.y, p.w, p.h].every(Number.isInteger), "whole pixels");
  }
  assert.ok(!particles(view()).some((p) => p.kind === "ash"), "no fire, no ash");
  assert.equal(particles(view({ dawn: 1 })).filter((p) => p.kind === "firefly").length, 0, "fireflies leave at dawn");
});

test("particles are deterministic for the same time and move over time", () => {
  assert.deepEqual(particles(view()), particles(view()));
  assert.notDeepEqual(particles(view({ time: 3.7 })), particles(view({ time: 4.2 })));
  // The ground particles follow the camera (whole-pixel parallax).
  const a = particles(view({ cameraX: 1200 })), b = particles(view({ cameraX: 1210 }));
  assert.notDeepEqual(a, b);
});

test("reduced motion holds fog, particles and the near layer still", () => {
  const still = [0, 2.5, 19.1].map((time) => particles(view({ time, reduced: true })));
  assert.deepEqual(still[0], still[1]);
  assert.deepEqual(still[0], still[2]);
  assert.deepEqual(fogOffset(0, 300, 200, 0, true), fogOffset(0, 300, 200, 50, true));
  assert.notDeepEqual(fogOffset(0, 300, 200, 0, false), fogOffset(0, 300, 200, 50, false), "fog drifts with motion allowed");
  for (const i of [0, 1]) {
    const o = fogOffset(i, 12345, -678, 9.5, false);
    assert.ok(o.x <= 0 && o.x > -POST.fog.tile.width && o.y <= 0 && o.y > -POST.fog.tile.height, "tile origin covers the view");
    assert.ok(Number.isInteger(o.x) && Number.isInteger(o.y));
  }
  // The two layers move at different parallax.
  assert.notDeepEqual(
    [fogOffset(0, 100, 0, 0, true).x - fogOffset(0, 0, 0, 0, true).x],
    [fogOffset(1, 100, 0, 0, true).x - fogOffset(1, 0, 0, 0, true).x],
  );
});

test("fog tiles repeat without a seam and are pure of the layer", () => {
  for (const i of [0, 1]) {
    const p = fogTilePixels(i), { width, height, data } = p;
    assert.deepEqual(fogTilePixels(i).data, data);
    const a = (x, y) => data[(y * width + x) * 4 + 3];
    let edge = 0, inner = 0;
    for (let y = 0; y < height; y++) { edge += Math.abs(a(0, y) - a(width - 1, y)); inner += Math.abs(a(width / 2, y) - a(width / 2 - 1, y)); }
    assert.ok(edge <= inner * 2 + height * 2, `layer ${i}: the wrap seam is no rougher than the interior`);
    assert.ok(data.some((v, k) => k % 4 === 3 && v > 0), "the tile has fog");
  }
});

test("near leaves sit in the bottom corners, mirrored, blurred, and fade over the cat", () => {
  const l = nearLeavesPixels(0), r = nearLeavesPixels(1), { width, height } = l;
  const a = (p, x, y) => p.data[(y * width + x) * 4 + 3];
  assert.ok(a(l, 2, height - 3) > 0, "left corner has leaves");
  assert.equal(a(l, width - 1, 0), 0, "away from the corner is clear");
  for (let y = 0; y < height; y += 7) for (let x = 0; x < width; x += 5) assert.equal(a(l, x, y), a(r, width - 1 - x, y));
  const soft = [...l.data].filter((v, k) => k % 4 === 3 && v > 0 && v < 255).length;
  assert.ok(soft > 0, "the edges are pre-blurred");
  // Where no canvas exists nothing is drawn; with images present a corner box fades over the cat.
  const ctx = recorder();
  drawNearLayer(ctx, 960, 540, [{ x: 20, y: 530 }], 1, false);
  drawFog(ctx, 960, 540, 0, 0, 1, false);
  assert.equal(ctx.calls.length, 0, "no canvas in Node: no draws");
  const box = nearBox(1, 960, 540);
  assert.deepEqual(box, { x: 960 - POST.near.width, y: 540 - POST.near.height, w: POST.near.width, h: POST.near.height });
});

test("near corners stay small and fade over any watched actor, not only the cat", () => {
  // Portrait view (390 x 844 CSS at about 443 internal px wide): both corners together cover under half the bottom band.
  const w = 443, h = 960;
  assert.ok(2 * POST.near.width < 0.5 * w && POST.near.height <= 64, JSON.stringify(POST.near));
  assert.ok(POST.near.alpha <= 0.7 && POST.near.faded < POST.near.alpha);
  const left = nearBox(0, w, h), right = nearBox(1, w, h);
  const enemy = { x: left.x + 30, y: left.y + 20 }, chest = { x: right.x + 10, y: right.y - 10 }, clear = { x: w / 2, y: h - 10 };
  assert.equal(nearFaded(0, w, h, [enemy]), true, "a hostile in the left corner fades it");
  assert.equal(nearFaded(1, w, h, [enemy]), false);
  assert.equal(nearFaded(1, w, h, [chest]), true, "a pickup just above the right corner fades it");
  assert.equal(nearFaded(0, w, h, [clear]), false);
  assert.equal(nearFaded(0, w, h, []), false);
});

test("particles draw as whole-pixel rectangles and nothing for an empty list", () => {
  const ctx = recorder();
  drawParticles(ctx, []);
  assert.equal(ctx.calls.length, 0);
  drawParticles(ctx, particles(view()));
  assert.ok(ctx.calls.length > 0 && ctx.calls.every((c) => c.op === "fillRect" && c.args.every(Number.isInteger)));
});

test("cache-time blur: padded painting keeps neighbouring blocks seamless; fallback paints unblurred", () => {
  // A global stripe pattern painted into two neighbouring 8 px blocks with a margin.
  const paintStripe = (ox) => (data, w, h, m) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gx = ox + x - m, o = (y * w + x) * 4; if (gx % 6 < 3) data.set([200, 100, 50, 255], o); }
  };
  const block = (ox) => {
    const m = 2, w = 8 + 2 * m, h = 3, d = new Uint8ClampedArray(w * h * 4);
    paintStripe(ox)(d, w, h, m);
    boxBlurRGBA(d, w, h, 1, 2);
    return Array.from({ length: 8 }, (_, x) => d[(1 * w + x + m) * 4 + 3]);
  };
  const whole = (() => {
    const m = 2, w = 16 + 2 * m, h = 3, d = new Uint8ClampedArray(w * h * 4);
    paintStripe(0)(d, w, h, m);
    boxBlurRGBA(d, w, h, 1, 2);
    return Array.from({ length: 16 }, (_, x) => d[(1 * w + x + m) * 4 + 3]);
  })();
  assert.deepEqual([...block(0), ...block(8)], whole);
  const target = recorder();
  let painted = 0;
  paintBlurred(target, undefined, 8, 8, 1, 2, (c, dx, dy) => { painted++; assert.equal(c, target); assert.deepEqual([dx, dy], [0, 0]); });
  assert.equal(painted, 1);
});

test("post layers run after the light buffer and before the UI overlays, with no filter or randomness", () => {
  const src = (p) => readFileSync(new URL(`../src/render/${p}`, import.meta.url), "utf8");
  for (const name of ["iso/post.ts", "iso/off-map.ts"])
    assert.doesNotMatch(src(name), /Math\.random|\.filter\s*=|shadowBlur|createRadialGradient|createLinearGradient/, name);
  const world = src("world.ts"), scene = world.indexOf("function drawWorldFrame"), present = world.indexOf("export function presentWorld");
  const at = (s, from) => world.indexOf(s, from);
  // The native scene: light buffer -> fog -> particles -> near layer.
  const order = ["drawLighting(ctx", "drawFog(ctx", "drawParticles(ctx", "drawNearLayer(ctx"].map((s) => at(s, scene));
  assert.ok(order.every((i) => i > 0), "every layer is wired");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "scene -> light -> fog -> particles -> near");
  // The presentation: enlarge -> retro -> screen UI.
  const ui = ["drawImage(native", "drawRetro(ctx", "drawCueScreen(ctx", "drawNavArrows(ctx", "drawFrame(ctx"].map((s) => at(s, present));
  assert.ok(ui.every((i) => i > present), "the presentation is wired");
  assert.deepEqual([...ui].sort((a, b) => a - b), ui, "native -> retro -> overlays");
  assert.match(src("iso/off-map.ts"), /paintBlurred\(/, "the far layer is blurred at cache time");
});
