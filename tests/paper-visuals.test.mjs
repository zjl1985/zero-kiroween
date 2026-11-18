import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FIRE } from "../dist/defs/fire.js";
import { LANDMARK_DEFS } from "../dist/defs/registries.js";
import { landmarkActivityPoint } from "../dist/defs/landmark-activities.js";
import { EFFECT_LIFE } from "../dist/game/types.js";
import { clearSpriteCache, spriteCacheSize } from "../dist/engine/sprite.js";
import { ENEMY_ART, LANDMARK_ART, WEAPON_ART } from "../dist/render/art-index.js";
import { drawActorPaperStatus, drawPaperFlame, drawPaperStatusEffect } from "../dist/render/paper-status-art.js";
import { drawFireGround, drawProp, fireSprites } from "../dist/render/craft-props.js";
import { drawLandmarkActivity } from "../dist/render/craft-juice.js";
import { drawCraftEnemy, dangerRing } from "../dist/render/craft-enemies.js";
import { drawCraftShot } from "../dist/render/craft-combat.js";
import { drawSkillEffect, ring, star } from "../dist/render/combat-fx.js";
import { drawChunks, clearWorldRenderCache, cachedChunkCount } from "../dist/render/craft-world.js";
import { paperOccludesActor } from "../dist/render/world.js";

// Static command contracts only. These do not claim pixel, animation or performance approval.
class Path {
  constructor(source) { this.ops = source instanceof Path ? [...source.ops] : source ? [["path", source]] : []; }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(point) { return point; }
}
function canvas() {
  const c = { width: 400, height: 300 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", filter: "none" };
  const record = (op, args) => calls.push({ op, args, ...state });
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { kind: "paper", setTransform() {} }; },
    createLinearGradient() { record("createLinearGradient", []); return { addColorStop() {} }; },
    createRadialGradient() { record("createRadialGradient", []); return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key === "depth" ? stack.length : key in state ? state[key] : methods[key] ?? ((...args) => record(key, args)),
    set: (_, key, value) => {
      state[key] = value;
      if (key === "filter") record("filter", [value]);
      if (key === "shadowBlur" && value > 0) record("shadowBlur", [value]);
      return true;
    },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.mock.method(Date, "now", () => assert.fail("rendering consumes no wall time"));
  t.after(clearSpriteCache);
}
const images = (ctx) => ctx.calls.filter((c) => c.op === "drawImage");
/** Gloss anywhere in a painted command stream, including cached sprite canvases it drew. */
const gloss = (calls) => calls.filter((c) => /Gradient$/.test(c.op) || c.op === "shadowBlur" ||
  c.op === "filter" && /blur/.test(String(c.args[0])) || c.globalCompositeOperation === "lighter").map((c) => c.op);
function allPaint(ctx) {
  return ctx.calls.flatMap((c) => c.op === "drawImage" ? [c, ...allPaint(c.args[0].getContext("2d"))] : [c]);
}
function restored(ctx) {
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, "source-over");
  assert.ok(!ctx.calls.some((c) => c.op === "filter" || c.fillStyle?.kind === "paper"), "no live filter or texture pass");
}

test("actor fire and damp paper are distinct, read-only overlays with finite pieces", (t) => {
  environment(t);
  const fire = Object.freeze({ x: 30, y: 50, burnTime: 2, burnClock: 0.4 }),
    wet = Object.freeze({ x: 30, y: 50, wetTime: 1 });
  const a = canvas().getContext("2d"), b = canvas().getContext("2d"), idle = canvas().getContext("2d");
  drawActorPaperStatus(a, fire, 0, 16, 58);
  drawActorPaperStatus(b, wet, 0, 16, 58);
  drawActorPaperStatus(idle, Object.freeze({ x: 0, y: 0 }), 0, 16);
  assert.equal(idle.calls.length, 0);
  assert.ok(allPaint(a).some((c) => c.fillStyle === "#cf6037"));
  assert.ok(allPaint(a).some((c) => c.fillStyle === "#33262b"), "burnt side/hem, not just orange light");
  assert.ok(allPaint(b).some((c) => c.fillStyle === "#83b8c5"));
  assert.ok(!allPaint(b).some((c) => c.fillStyle === "#cf6037"));
  assert.ok(b.calls.some((c) => c.op === "stroke" && c.strokeStyle === "#a5ced0"));
  const both = canvas().getContext("2d");
  drawActorPaperStatus(both, { ...fire, ...wet }, 0, 16);
  assert.ok(!allPaint(both).some((c) => c.fillStyle === "#cf6037"), "wet extinguishing does not show contradictory flames");
  const count = spriteCacheSize();
  for (const time of [0.17, 9, 10000]) {
    drawActorPaperStatus(a, fire, time, 24, 48);
    drawActorPaperStatus(b, wet, time, 9, 20);
    assert.equal(spriteCacheSize(), count);
  }
  restored(a); restored(b); restored(both);
});

test("steam, regrowth, washed ink and rewards have separate cached paper effects", (t) => {
  environment(t);
  const colors = { steam: "#d6ded6", regrow: "#9db484", "ink-wash": "#51405f", "landmark-reward": "#e5c37d" };
  for (const [kind, color] of Object.entries(colors)) {
    const ctx = canvas().getContext("2d"), impact = Object.freeze({ kind, x: 10, y: 20, life: EFFECT_LIFE[kind] * 0.7, seed: 7, radius: 40 });
    assert.equal(drawPaperStatusEffect(ctx, impact), true);
    assert.ok(allPaint(ctx).some((c) => c.fillStyle === color), kind);
    assert.ok(!ctx.calls.some((c) => c.op === "fillText"));
    restored(ctx);
  }
  const count = spriteCacheSize();
  for (const kind of Object.keys(colors)) for (const fraction of [0.1, 0.9]) {
    const ctx = canvas().getContext("2d");
    drawPaperStatusEffect(ctx, { kind, x: -300, y: 90, life: EFFECT_LIFE[kind] * fraction, seed: 88, radius: 100 });
    assert.equal(spriteCacheSize(), count);
  }
  assert.equal(drawPaperStatusEffect(canvas().getContext("2d"), { kind: "hit", x: 0, y: 0, life: 0.1 }), false);
});

test("ground-fire footprint and flame count come only from positive active grid cells", (t) => {
  environment(t);
  const sim = Object.freeze({ fire: Object.freeze({
    cells: Object.freeze({ "0,0": 1, "1,0": 0.8, "2,0": 0, "100,100": 1 }), ash: Object.freeze({ "3,0": 1 }),
  }) });
  const ctx = canvas().getContext("2d"), cam = { x: 0, y: 0 }, added = [];
  drawFireGround(ctx, sim, cam);
  const cells = ctx.calls.filter((c) => c.op === "fillRect" && c.fillStyle === "#633a2b");
  assert.deepEqual(cells.map((c) => c.args), [[0, 0, FIRE.cell, FIRE.cell], [FIRE.cell, 0, FIRE.cell, FIRE.cell]]);
  fireSprites(ctx, sim, cam, 0.2, (y, draw) => added.push({ y, draw }));
  assert.equal(added.length, 2);
  added.forEach((s) => s.draw());
  assert.equal(images(ctx).length, 2, "one flame cut per live visible cell, none for ash/expired cells");
  drawPaperFlame(ctx, 0, 0, 10, 0.2, 0);
  drawPaperFlame(ctx, 0, 0, 10, 0.2, 1);
  const count = spriteCacheSize();
  for (const size of [8, 16, 25]) drawPaperFlame(ctx, 100, 200, size, 0.9, 103);
  assert.equal(spriteCacheSize(), count, "flame height and flicker never create sprites");
});

test("folded/inked props reuse intact cuts, tint only their alpha and leave caller state alone", (t) => {
  environment(t);
  let paints = 0;
  const art = { id: "visual-test-prop", bounds: { l: -12, r: 12, t: -30, b: 4 }, variants: 1, flames: [], scraps: ["#ccbbaa"],
    paint(ctx) { paints++; ctx.fillRect(-5, -20, 10, 20); } };
  const p = Object.freeze({ id: "visual-prop", kind: art.id, x: 40, y: 50, s: 1, seed: 1 });
  const draw = (state) => {
    const ctx = canvas().getContext("2d");
    drawProp(ctx, art, p, 0, false, false, 0, Object.freeze(state));
    restored(ctx);
    return ctx;
  };
  const intact = draw({}), folded = draw({ folded: true }), inked = draw({ inked: true });
  assert.equal(images(intact)[0].args[0], images(folded)[0].args[0]);
  assert.ok(folded.calls.some((c) => c.op === "transform" && c.args[3] === 0.2));
  assert.notEqual(images(intact)[0].args[0], images(inked)[0].args[0]);
  assert.ok(allPaint(inked).some((c) => c.globalCompositeOperation === "source-atop" && c.fillStyle === "#30233f"));
  assert.ok(!inked.calls.some((c) => c.globalCompositeOperation === "source-atop"));
  assert.equal(paints, 1);
  const count = spriteCacheSize();
  draw({ inked: true, folded: true });
  assert.equal(spriteCacheSize(), count);
});

test("registered enemies reuse finite faceted sheets across static times, positions and actor ids", (t) => {
  environment(t);
  const draw = (art, id, time, x = 0) => {
    const ctx = canvas().getContext("2d"), e = Object.freeze({ id, kind: art.id, x, y: 0, hp: 10000, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, windup: 0 });
    for (const side of [-1, 1]) art.draw(ctx, e, time, { x: x + side * 200, y: -20 });
    assert.ok(images(ctx).length > 0);
    restored(ctx);
  };
  for (const art of ENEMY_ART.all()) for (const id of [0, 1, 2]) draw(art, id, 0);
  const count = spriteCacheSize();
  assert.ok(count < 40, `bounded enemy cuts: ${count}`);
  for (const art of ENEMY_ART.all()) for (const id of [300, 301, 302]) draw(art, id, 19.4, -312);
  assert.equal(spriteCacheSize(), count);
});

test("weapon flight, stars and rings retain negative space without live texture loops", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d");
  ring(ctx, 0, 0, 50, "#ddccaa");
  assert.equal(ctx.calls.filter((c) => c.op === "stroke").length, 2, "one under-edge plus one eight-arc path");
  assert.equal(ctx.calls.filter((c) => c.op === "fillRect").length, 0);
  const draw = (time, id) => {
    for (const art of WEAPON_ART.all()) if (art.shot) art.shot(ctx, Object.freeze({ id, x: 0, y: 0, vx: 100, vy: 20, weapon: art.shotTag }), time);
    for (const echo of [false, true]) for (const empowered of [false, true]) drawCraftShot(ctx, 5, 10, 50, 20, empowered, echo);
    star(ctx, 2, 3, 5 + time % 3, "#ddccaa", time);
  };
  draw(0, 1);
  const count = spriteCacheSize();
  draw(10000, 999);
  assert.equal(spriteCacheSize(), count);
  restored(ctx);
});

test("activity progress uses the simulation court anchor, seconds and cooldown, without text or mutation", (t) => {
  environment(t);
  for (const def of LANDMARK_DEFS.all().filter((d) => d.activity)) {
    const place = { id: "visual-court", kind: def.id, x: 100, y: 200, radius: def.radius, seed: 1 }, point = landmarkActivityPoint(place);
    const sim = Object.freeze({ player: Object.freeze(point), landmarkEvents: Object.freeze({ [place.id]: Object.freeze({ progress: def.activity.seconds / 2, cooldown: 0, activations: 0, wind: 0 }) }) });
    const ctx = canvas().getContext("2d");
    drawLandmarkActivity(ctx, sim, place);
    assert.ok(ctx.calls.some((c) => c.op === "stroke" && c.args[0].ops.some((op) => op[0] === "ellipse" && op[1] === point.x && op[2] === point.y && op[3] === def.activity.radius)));
    assert.ok(!ctx.calls.some((c) => c.op === "fillText"));
    restored(ctx);
  }
});

test("tall registered buildings yield by their bounds, not a historical landmark-id list", () => {
  const pieces = LANDMARK_ART.all().flatMap((a) => a.pieces ?? []).filter((p) => p.bounds.t < -80);
  assert.ok(pieces.length > 3);
  for (const p of pieces) {
    const b = p.bounds, actor = { x: (b.l + b.r) / 2, y: b.t * 0.65 };
    assert.equal(paperOccludesActor(0, 0, 1, b, actor), true, p.kind);
    assert.equal(paperOccludesActor(0, 0, 1, b, { ...actor, y: 20 }), false);
    assert.equal(paperOccludesActor(0, 0, 1, b, { ...actor, x: b.r + 30 }), false);
  }
});

test("world status hooks follow actual actor art and exclude decoys; props follow deferred lifecycle", () => {
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /catArt\(pose\.id\)\.draw\(ctx, pose\);\s*if \(sim && !pose\.decoy\) drawActorPaperStatus/);
  assert.match(world, /drawCraftEnemy\(ctx, e,[\s\S]*?if \(e\.spawnTime <= 0\) drawActorPaperStatus/);
  assert.match(world, /drawPaperStatusEffect\(ctx, effect\)/);
  const props = readFileSync(new URL("../src/render/craft-props.ts", import.meta.url), "utf8");
  assert.match(props, /folded: m\?\.foldedUntil !== undefined/);
  assert.match(props, /activeFire\.some/);
  for (const file of ["paper-face.ts", "paper-status-art.ts", "craft-combat.ts", "craft-enemies.ts", "combat-fx.ts"])
    assert.doesNotMatch(readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8"), /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b/);
});

test("leaving a run clears chunk pixels and permits rebuilding the same view", (t) => {
  environment(t);
  clearWorldRenderCache();
  const ctx = canvas().getContext("2d");
  drawChunks(ctx, 7, { x: 480, y: 270 });
  assert.ok(cachedChunkCount() > 0);
  const chunks = images(ctx).map(c => c.args[0]);
  assert.ok(chunks.every(c => c.width > 0));
  clearWorldRenderCache();
  assert.equal(cachedChunkCount(), 0);
  assert.ok(chunks.every(c => c.width === 0 && c.height === 0));
  drawChunks(ctx, 7, { x: 480, y: 270 });
  assert.ok(cachedChunkCount() > 0);
  clearWorldRenderCache();
});

test("terrain prefetch stops at capacity and closes results from an abandoned run", (t) => {
  environment(t);
  clearWorldRenderCache();
  let worker;
  class TerrainWorker {
    requests = [];
    terminated = false;
    constructor() { worker = this; }
    postMessage(request) { this.requests.push(request); }
    terminate() { this.terminated = true; }
  }
  for (const [key, value] of [["Worker", TerrainWorker], ["OffscreenCanvas", class {}]]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  t.after(clearWorldRenderCache);
  const ctx = canvas().getContext("2d"), center = { x: 2180, y: 2150 };
  const bitmaps = [];
  const reply = () => {
    const bitmap = { closed: false, close() { this.closed = true; } };
    bitmaps.push(bitmap);
    worker.onmessage({ data: { id: worker.requests.at(-1).id, bitmap } });
  };
  for (let i = 0; i < 24; i++) {
    drawChunks(ctx, 7, center);
    if (worker.requests.length > bitmaps.length) reply();
  }
  assert.equal(cachedChunkCount(), 14);
  assert.equal(worker.requests.length, 14, "stationary camera must not rebake evicted margin tiles");
  drawChunks(ctx, 7, { x: -2100, y: 2700 });
  assert.equal(worker.requests.length, 15, "another region can start baking while the cache is full");
  clearWorldRenderCache();
  assert.equal(worker.terminated, true);
  reply();
  assert.equal(cachedChunkCount(), 0);
  assert.ok(bitmaps.every((bitmap) => bitmap.closed), "both cached and late bitmaps release their pixels");
});

test("splash warnings preserve circular damage geometry and draw a legible cross", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d");
  dangerRing(ctx, 30, 40, 20, 0.5);
  const shape = ctx.calls.find(c => c.op === "fill").args[0];
  assert.deepEqual(shape.ops[0], ["arc", 30, 40, 20, 0, Math.PI * 2]);
  assert.ok(ctx.calls.some(c => c.op === "stroke" && c.strokeStyle === "#ffe2bb"));
  restored(ctx);
});

test("enemy recoil and directional dash marks are read-only and reuse finite cuts", (t) => {
  environment(t);
  const art = ENEMY_ART.get("kiro-ghost"), times = [];
  t.mock.method(art, "draw", (_ctx, _e, time) => times.push(time));
  const e = Object.freeze({id: 2, kind: art.id, x: 20, y: 30, hitFlash: 0.14, stun: 1});
  const ctx = canvas().getContext("2d");
  drawCraftEnemy(ctx, e, 10, {x: 0, y: 0});
  assert.deepEqual(times, [0], "stunned body does not keep flapping");
  assert.ok(ctx.calls.some(c => c.op === "scale" && c.args[0] > 1 && c.args[1] < 1), "hit compresses around the feet");
  const effect = Object.freeze({kind: "dash", x: 20, y: 30, life: 0.3});
  drawSkillEffect(ctx, effect);
  const count = spriteCacheSize();
  drawSkillEffect(ctx, {...effect, life: 0.1});
  assert.equal(spriteCacheSize(), count);
  restored(ctx);
});

// ---------------------------------------------------------------- paper washout (FEAT-003)
import { PROP_ART } from "../dist/render/art-index.js";
import { ashPatch, backSide, curledFlap, scrapPieces, tornStub } from "../dist/render/paper-scraps.js";
import { ENEMIES } from "../dist/game/enemies.js";

function pathBox(p) {
  const pts = p.ops.flatMap(([, ...args]) => Array.from({ length: Math.floor(args.length / 2) }, (_, i) => [args[i * 2], args[i * 2 + 1]]))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

test("redrawn enemy bodies, elites and trail marks are flat paper: no gradients, shadowBlur or blur filters", (t) => {
  environment(t);
  const look = { x: 200, y: -20 };
  for (const art of ENEMY_ART.all()) for (const elite of [false, true]) for (const time of [0, 3.7]) {
    const ctx = canvas().getContext("2d"),
      e = Object.freeze({ id: 3, kind: art.id, x: 0, y: 0, hp: 1, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, windup: 0, elite,
        radius: ENEMIES[art.id].radius * (elite ? 1.5 : 1) });
    drawCraftEnemy(ctx, e, time, look);
    art.ground?.(ctx, e, look);
    assert.deepEqual(gloss(allPaint(ctx)), [], `${art.id}${elite ? " elite" : ""} stays flat paper`);
    restored(ctx);
  }
});

test("enemy redraws keep their kind's collision radius and the eraser reads as a three-face block with a sleeve", (t) => {
  environment(t);
  assert.deepEqual(Object.fromEntries(Object.entries(ENEMIES).map(([id, d]) => [id, d.radius])),
    { "ink-blob": 10, "paper-bat": 8, crumple: 14, smudge: 11, "kiro-ghost": 12, "eraser-boss": 26, wash: 11, sketch: 10 });
  const ctx = canvas().getContext("2d"), art = ENEMY_ART.get("eraser-boss");
  art.draw(ctx, Object.freeze({ id: 1, kind: art.id, x: 0, y: 0, hp: 420, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0 }), 0, { x: 100, y: 0 });
  const fills = new Set(allPaint(ctx).filter((c) => c.op === "fill").map((c) => c.fillStyle));
  for (const color of ["#ec9aaa", "#ffd0d7", "#f7b6c2", "#f9dfe0", "#41639a", "#7f9fd0"]) assert.ok(fills.has(color), `eraser face ${color}`);
  restored(ctx);
});

test("prop scraps and ash are a few large flat pieces, and damaged tears curl over to show the paper back", (t) => {
  environment(t);
  const ctx = canvas().getContext("2d");
  scrapPieces(ctx, 0, 0, 30, ["#c9a46a", "#8a6a45"], 7, 11);
  const fills = ctx.calls.filter((c) => c.op === "fill" && c.fillStyle !== "#120d1c" && c.globalCompositeOperation === "source-over");
  // Each large scrap is one body plus one curled corner, each with its card side.
  const bodies = fills.filter((c) => c.fillStyle === "#c9a46a" || c.fillStyle === "#8a6a45");
  assert.ok(bodies.length >= 2 && bodies.length <= 5, `few scraps: ${bodies.length}`);
  for (const b of bodies) assert.ok(pathBox(b.args[0]).w >= 9, "scraps are big enough to read at gameplay zoom");
  ashPatch(ctx, 0, 0, 30, 9, 3);
  tornStub(ctx, 0, 0, 8, 12, "#c9a46a", 2, true);
  curledFlap(ctx, [[30, -20], [20, -22], [10, -19], [0, -21], [-10, -18], [-20, -20]], "#c9a46a", 4, 12);
  assert.ok(ctx.calls.some((c) => c.op === "fill" && c.fillStyle === backSide("#c9a46a")), "a paler back side shows");
  assert.deepEqual(gloss(ctx.calls), []);
  assert.equal(ctx.depth, 0);
  // Every registered prop's scraps and burnt states are flat: no blurred shadows or gradients.
  for (const art of PROP_ART.all()) for (const burnt of [false, true]) {
    const c = canvas().getContext("2d");
    art.paint(c, 0, 0, 1, 0, "scraps", burnt);
    assert.deepEqual(gloss(allPaint(c)), [], `${art.id} ${burnt ? "ash" : "scraps"} stay flat`);
    assert.equal(c.depth, 0);
    assert.equal(c.globalCompositeOperation, "source-over");
  }
});

import { buildChunk } from "../dist/render/craft-world.js";
import { CHUNK, chunkOf, landmarks } from "../dist/game/world-gen.js";
import { BIOME_ART } from "../dist/render/art-index.js";

/** A JSON-safe command stream: nested sprite/noise canvases are expanded, paths become their ops. */
function stream(ctx) {
  const value = (a) => a?.getContext ? stream(a.getContext("2d")) : a instanceof Path ? a.ops : a?.data ? a.data.length : a;
  return ctx.calls.map((c) => ({
    op: c.op, args: (c.args ?? []).map(value), alpha: c.globalAlpha, composite: c.globalCompositeOperation,
    fill: typeof c.fillStyle === "object" ? "pattern" : c.fillStyle, stroke: typeof c.strokeStyle === "object" ? "pattern" : c.strokeStyle,
  }));
}

test("every landmark kind stands on its own flat grounded base, not one shared oval", (t) => {
  environment(t);
  const firsts = new Set();
  for (const def of LANDMARK_DEFS.all()) {
    const art = LANDMARK_ART.get(def.id), ctx = canvas().getContext("2d");
    const place = Object.freeze({ id: `base-${def.id}`, kind: def.id, x: 0, y: 0, radius: def.radius, seed: 7, ...(def.span ? { span: 260 } : {}) });
    assert.equal(typeof art.base, "function", `${def.id} has a base painter`);
    art.base(ctx, place);
    const calls = allPaint(ctx), fills = calls.filter((c) => c.op === "fill");
    assert.ok(fills.length >= 3, `${def.id} base paints paper layers`);
    assert.deepEqual(gloss(calls), [], `${def.id} base stays flat paper`);
    assert.ok(calls.some((c) => c.op === "translate" && c.args[0] > 0 && c.args[1] > 0), `${def.id} base casts its shadow down-right`);
    // The first painted base path identifies the kind's footing.
    firsts.add(JSON.stringify(fills.find((c) => c.args[0] instanceof Path)?.args[0].ops));
    assert.equal(ctx.depth, 0);
  }
  assert.equal(firsts.size, LANDMARK_DEFS.ids().length, "no two kinds share the same base footing");
});

test("district sheet looks are distinct per district: colour and seam style", () => {
  const looks = BIOME_ART.all().map((a) => a.sheet);
  assert.equal(new Set(looks.map((l) => l.seam)).size, looks.length);
  assert.equal(new Set(looks.map((l) => l.colors[0])).size, looks.length);
});

test("chunk ground baking is deterministic and the budgeted fallback bakes the same tile as a full build", (t) => {
  environment(t);
  clearWorldRenderCache();
  const seed = 7, l = landmarks(seed)[0], { cx, cy } = chunkOf(l.x, l.y);
  const a = stream(buildChunk(seed, cx, cy).getContext("2d")), b = stream(buildChunk(seed, cx, cy).getContext("2d"));
  assert.ok(a.length > 200, `a real tile was painted (${a.length} commands)`);
  assert.deepEqual(a, b, "same seed and chunk paint the same command stream");
  assert.ok(a.some((c) => c.op === "fill" && Array.isArray(c.args[0]) && c.args[0].length > 20), "large sheets are cut, not only pixels");
  // Fallback path: no Worker/OffscreenCanvas here, so drawChunks bakes with the budgeted generator.
  const cam = { x: (cx + 0.5) * CHUNK.width, y: (cy + 0.5) * CHUNK.height };
  let image;
  for (let i = 0; i < 20000 && !image; i++) {
    const ctx = canvas().getContext("2d");
    drawChunks(ctx, seed, cam, false);
    image = images(ctx).find((c) => c.args[1] === cx * CHUNK.width && c.args[2] === cy * CHUNK.height)?.args[0];
  }
  assert.ok(image, "the fallback finished the tile");
  assert.deepEqual(stream(image.getContext("2d")), a, "fallback and full build paint identically");
  clearWorldRenderCache();
});
