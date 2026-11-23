import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FX } from "../dist/render/pixel-vfx.js";
import { BOSS } from "../dist/defs/enemies/eraser-boss/def.js";
import { lobFlightTime } from "../dist/defs/enemies/behaviours.js";
import { SMUDGE } from "../dist/defs/enemies/smudge/def.js";
import { WASH_DRIP } from "../dist/defs/enemies/wash/def.js";
import { FIRE } from "../dist/defs/fire.js";
import { LANDMARK_DEFS } from "../dist/defs/registries.js";
import { landmarkActivityPoint } from "../dist/defs/landmark-activities.js";
import { EFFECT_LIFE } from "../dist/game/types.js";
import { clearSpriteCache, SPRITE_CACHE_LIMIT, spriteCacheSize } from "../dist/engine/sprite.js";
import { CAT_ART, ENEMY_ART, LANDMARK_ART, WEAPON_ART } from "../dist/render/art-index.js";
import { drawActorPaperStatus, drawPaperFlame, drawPaperStatusEffect } from "../dist/render/paper-status-art.js";
import { drawFireGround, drawProp, fireSprites } from "../dist/render/craft-props.js";
import { drawHitFlash, drawLandmarkActivity } from "../dist/render/craft-juice.js";
import { drawCraftEnemy, drawEnemyGround, drawWarningEdges, drawWarningGround, enemyWarnings } from "../dist/render/craft-enemies.js";
import { drawCraftShot, paperDent } from "../dist/render/craft-combat.js";
import { drawOrbitStar, drawSkillEffect, ring, star } from "../dist/render/combat-fx.js";
import { withPaperMotion } from "../dist/render/paper-motion.js";
import { drawChunks, clearWorldRenderCache, cachedChunkCount, paperOccludesActor } from "../dist/render/craft-world.js";

// Static command contracts only. These do not claim pixel, animation or performance approval.
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
const pixels = (ctx) => ctx.calls.filter(c => c.op === "fillRect");
const images = (ctx) => ctx.calls.filter((c) => c.op === "drawImage");
/** Gloss anywhere in a painted command stream, including cached sprite canvases it drew. */
const gloss = (calls) => calls.filter((c) => /Gradient$/.test(c.op) || c.op === "shadowBlur" ||
  c.op === "filter" && /blur/.test(String(c.args[0])) || c.globalCompositeOperation === "lighter").map((c) => c.op);
function allPaint(ctx, seen = new Set()) {
  // Bake passes (value grade, lit rim) read a canvas back through a scratch canvas; visit each once.
  if (seen.has(ctx)) return [];
  seen.add(ctx);
  return ctx.calls.flatMap((c) => c.op === "drawImage" ? [c, ...allPaint(c.args[0].getContext("2d"), seen)] : [c]);
}
function restored(ctx) {
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, "source-over");
  assert.ok(!ctx.calls.some((c) => c.op === "filter" || c.fillStyle?.kind === "paper"), "no live filter or texture pass");
}

test("reduced paper motion holds decorative orientation without pinning attack positions or poisoning caches", (t) => {
  environment(t);
  const draw = (reduced, time, x = 30) => {
    const ctx = canvas().getContext("2d");
    withPaperMotion(reduced, () => drawOrbitStar(ctx, x, 50, time, 1));
    restored(ctx);
    return ctx;
  };
  const transforms = (ctx) => ctx.calls.filter((c) => ["rotate", "scale"].includes(c.op)).map((c) => [c.op, ...c.args]);
  const calm = draw(true, 0.1), later = draw(true, 0.7, 80);
  assert.deepEqual(transforms(calm), transforms(later), "calm star does not spin or flip");
  assert.deepEqual(pixels(later).map(c => c.args[0] - 50), pixels(calm).map(c => c.args[0]), "actual orbit position follows gameplay");
  assert.deepEqual(pixels(draw(false, 0.1)).map(c => c.args), pixels(calm).map(c => c.args), "preference switching retains the authored sprite");
  assert.deepEqual(transforms(draw(true, 0.1)), transforms(calm));
  const dent = (phase) => {
    const ctx = canvas().getContext("2d");
    withPaperMotion(true, () => paperDent(ctx, 20, 30, 10, phase));
    restored(ctx);
    return ctx;
  };
  const early = dent(0.1), late = dent(0.8);
  assert.deepEqual(transforms(early), transforms(late), "calm hit has no spring oscillation");
  assert.ok(pixels(early)[0].globalAlpha > pixels(late)[0].globalAlpha, "the original hit lifetime still fades out");
});

test("pixel hits reuse finite marks across enemies and recover without changing actor state", (t) => {
  environment(t);
  const kind = ENEMY_ART.all()[0].id;
  let warm;
  for (let i = 0; i < 40; i++) {
    const actor = Object.freeze({ id: i, kind, x: i * 3, y: 60, hitFlash: 0.14 * (1 - i / 40) }),
      ctx = canvas().getContext("2d");
    const before = JSON.stringify(actor);
    drawHitFlash(ctx, actor);
    assert.equal(JSON.stringify(actor), before);
    restored(ctx);
    assert.ok(pixels(ctx).length > 0, "hit uses native pixel marks");
    assert.equal(gloss(allPaint(ctx)).length, 0, "no flash glow or blurred material");
    if (i === 0) warm = spriteCacheSize();
    else assert.equal(spriteCacheSize(), warm, "phase and actor id do not grow the cache");
  }
  const idle = canvas().getContext("2d");
  drawHitFlash(idle, Object.freeze({ kind, x: 0, y: 0, hitFlash: 0 }));
  assert.equal(idle.calls.length, 0, "the effect ends with the original hit timer");
});

test("actor fire and wet status are distinct, read-only overlays with finite pieces", (t) => {
  environment(t);
  const fire = Object.freeze({ x: 30, y: 50, burnTime: 2, burnClock: 0.4 }),
    wet = Object.freeze({ x: 30, y: 50, wetTime: 1 });
  const a = canvas().getContext("2d"), b = canvas().getContext("2d"), idle = canvas().getContext("2d");
  drawActorPaperStatus(a, fire, 0, 16, 58);
  drawActorPaperStatus(b, wet, 0, 16, 58);
  drawActorPaperStatus(idle, Object.freeze({ x: 0, y: 0 }), 0, 16);
  assert.equal(idle.calls.length, 0);
  const fireTones = new Set(pixels(a).map(c => c.fillStyle));
  assert.ok(fireTones.has("#302c30") && fireTones.has("#d0b992") && fireTones.has("#d89648"),
    "the burn shows a charred core, turned paper edge and orange flame");
  const wetTones = new Set(pixels(b).map(c => c.fillStyle));
  assert.ok(wetTones.has("#64828a") && wetTones.has("#3f6472") && wetTones.has("#b8c8b9"),
    "wet paper shows pigment and both sides of the wrinkle");
  const both = canvas().getContext("2d");
  drawActorPaperStatus(both, { ...fire, ...wet }, 0, 16, 58);
  assert.deepEqual(pixels(both), pixels(b), "wet extinguishing shows the same paper as the wet-only state");
  const count = spriteCacheSize();
  for (const time of [0.17, 9, 10000]) {
    drawActorPaperStatus(a, fire, time, 24, 48);
    drawActorPaperStatus(b, wet, time, 9, 20);
    assert.equal(spriteCacheSize(), count);
  }
  restored(a); restored(b); restored(both);
});

test("steam, regrowth, washed ink and rewards have separate native pixel effects", (t) => {
  environment(t);
  const colors = { steam: FX.cream, regrow: FX.green, "ink-wash": FX.purple, "landmark-reward": FX.gold };
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
  assert.ok(pixels(ctx).some(c => c.fillStyle === FX.red), "live visible cells emit native flames");
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

test("registered enemies reuse finite pixel sprites across static times, positions and actor ids", (t) => {
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
  assert.ok(pixels(ctx).length > 20);
  assert.ok(pixels(ctx).every(c => Math.hypot(c.args[0], c.args[1]) > 45), "ring retains negative space");
  const draw = (time, id) => {
    for (const art of WEAPON_ART.all()) if (art.shot) art.shot(ctx, Object.freeze({ id, x: 0, y: 0, vx: 100, vy: 20, weapon: art.shotTag }), time);
    for (const echo of [false, true]) for (const empowered of [false, true]) drawCraftShot(ctx, 5, 10, 50, 20, empowered, echo);
    star(ctx, 2, 3, 5 + time % 3, "#ddccaa", time);
  };
  for (const id of [0, 1, 2]) draw(0, id); // Warm the three fixed paper-crane poses.
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
    assert.ok(pixels(ctx).some(c => c.args[0] === Math.round(point.x - 8) &&
      c.args[1] === Math.round(point.y + 4) && c.args[2] === 8 && c.args[3] === 2),
      "half progress fills half the small bar at the court anchor");
    assert.ok(pixels(ctx).every(c => Math.abs(c.args[0] - point.x) <= 10 &&
      Math.abs(c.args[1] - point.y) <= 12), "progress does not outline the court radius");
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
  assert.match(world, /paintCat\(ctx\);\s*if \(sim && !pose\.decoy\) drawActorPaperStatus/);
  assert.match(world, /drawCraftEnemy\(ctx, e,[\s\S]*?if \(e\.spawnTime <= 0\) drawActorPaperStatus/);
  assert.match(world, /drawPaperStatusEffect\(ctx, effect\)/);
  const props = readFileSync(new URL("../src/render/craft-props.ts", import.meta.url), "utf8");
  assert.match(props, /folded = m\?\.foldedUntil !== undefined/);
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

test("ink and water warnings keep their damage circles and countdown as the shots leave the enemy", (t) => {
  environment(t);
  for (const [kind, lob] of [["smudge", SMUDGE], ["wash", WASH_DRIP]]) {
    const e = { kind, alive: true, x: -70, y: 40, tx: 30, ty: 40, windup: 0.001, spawnTime: 0 };
    const tell = (enemies, enemyShots) => {
      const ground = canvas().getContext("2d"), edges = canvas().getContext("2d");
      const warnings = enemyWarnings({ enemies, enemyShots });
      drawWarningGround(ground, warnings);
      drawWarningEdges(edges, warnings);
      restored(ground);
      restored(edges);
      return { ground: ground.calls, edges: edges.calls };
    };
    const shot = { alive: true, tx: e.tx, ty: e.ty, t: 0.001, flight: lobFlightTime(100, lob), kind: lob.shot };
    const windup = tell([e], []), flight = tell([], [shot]);
    for (const { ground, edges } of [windup, flight]) {
      const circle = ground.find(c => c.op === "fill").args[0];
      assert.deepEqual(circle.ops, [["arc", e.tx, e.ty, lob.splashRadius, 0, Math.PI * 2]]);
      const rims = edges.filter(c => c.op === "stroke" && c.args[0] === circle);
      assert.equal(rims.length, 2, "dark keyline and lighter dashes");
      assert.ok(rims[0].lineWidth > rims[1].lineWidth);
      assert.ok(ground.some(c => c.op === "fillRect"), "native warning symbol remains visible");
    }
    const alpha = ({ ground }) => ground.find(c => c.op === "fill").globalAlpha;
    assert.ok(alpha(flight) > alpha(windup) && alpha(flight) - alpha(windup) < 0.001);
  }
});

test("the lingering ink edge follows the slowdown ellipse and expires with it", (t) => {
  environment(t);
  const h = { id: 1, x: 30, y: 40, radius: SMUDGE.puddleRadius, life: 2, maxLife: SMUDGE.puddleLife };
  const ctx = canvas().getContext("2d");
  drawEnemyGround(ctx, { enemies: [], hazards: [h, { ...h, life: 0 }] });
  const rows = pixels(ctx);
  assert.ok(rows.length > 0);
  for (const c of rows) { const [x,y,w] = c.args; assert.ok(x >= h.x-h.radius && x+w <= h.x+h.radius); assert.ok(Math.abs(y-h.y) <= h.radius/SMUDGE.puddleAspect+1); }
  const live = canvas().getContext("2d"); drawEnemyGround(live, { enemies: [], hazards: [h] });
  assert.deepEqual(ctx.calls, live.calls, "expired puddles add no paint");
  restored(ctx);
});

test("the Eraser shows its locked sweep and the full width of its dry-ground charge", (t) => {
  environment(t);
  const boss = { kind: "eraser-boss", alive: true, spawnTime: 0, x: 45, y: 50 };
  const tell = (kind) => {
    boss.act = { kind, x: 40, y: 50, dx: 1, dy: 0, t: BOSS[kind].telegraph };
    return enemyWarnings({ enemies: [boss], enemyShots: [] })[0].area.ops;
  };
  const radius = ENEMIES[boss.kind].radius, half = BOSS.sweep.width / 2;
  assert.deepEqual(tell("sweep"), [
    ["moveTo", 40 - radius, 50 + half], ["lineTo", 40 + BOSS.sweep.length, 50 + half],
    ["lineTo", 40 + BOSS.sweep.length, 50 - half], ["lineTo", 40 - radius, 50 - half], ["closePath"],
  ]);
  const length = BOSS.charge.speed * BOSS.charge.time;
  assert.deepEqual(tell("charge"), [
    ["arc", boss.x, boss.y, radius, Math.PI / 2, 3 * Math.PI / 2],
    ["arc", boss.x + length, boss.y, radius, -Math.PI / 2, Math.PI / 2], ["closePath"],
  ]);
});

test("enemy recoil and directional dash marks are read-only and reuse finite cuts", (t) => {
  environment(t);
  const art = ENEMY_ART.get("kiro-ghost"), times = [];
  t.mock.method(art, "draw", (_ctx, _e, time) => times.push(time));
  const e = Object.freeze({id: 2, kind: art.id, x: 20, y: 30, hitFlash: 0.14, stun: 1});
  const ctx = canvas().getContext("2d");
  drawCraftEnemy(ctx, e, 10, {x: 0, y: 0});
  assert.deepEqual(times, [0], "stunned body does not keep flapping");
  assert.equal(e.x, 20); assert.equal(e.y, 30);
  const effect = Object.freeze({kind: "dash", x: 20, y: 30, life: 0.3});
  drawSkillEffect(ctx, effect);
  const count = spriteCacheSize();
  drawSkillEffect(ctx, {...effect, life: 0.1});
  assert.equal(spriteCacheSize(), count);
  restored(ctx);
});

test("the first star-fall paint puts the star at the lethal contact", (t) => {
  environment(t);
  const x = 112, y = 156;
  const strike = { kind: "star-fall", x, y, life: EFFECT_LIFE["star-fall"], radius: 39 };
  for (const still of [false, true]) {
    const at = canvas().getContext("2d");
    withPaperMotion(still, () => drawSkillEffect(at, strike));
    assert.ok(images(at).some(({ args }) => Math.abs(args[1] - x) <= 18 &&
      args[2] <= y && args[2] + args[4] >= y), "the star sprite reaches the ground on the damage step");
    const after = canvas().getContext("2d");
    withPaperMotion(still, () => drawSkillEffect(after, { ...strike, life: strike.life * .35 }));
    assert.equal(images(after).length, 0, "afterglow no longer draws an airborne star");
    assert.ok(pixels(after).length > 0, "small grounded remnants remain");
    restored(at); restored(after);
  }
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

test("redrawn enemy bodies, elites and trail marks are native pixels: no gradients, shadowBlur or blur filters", (t) => {
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
  const fills = new Set(allPaint(ctx).filter((c) => c.op === "fillRect").map((c) => c.fillStyle));
  assert.ok(fills.size >= 4, "eraser uses separate block/sleeve palette values");
  restored(ctx);
});

test("legacy paper helper scraps and ash are a few large flat pieces, and damaged tears curl over to show the paper back", (t) => {
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
import { CHUNK, chunkOf, landmarkParts, landmarks } from "../dist/game/world-gen.js";
import { BIOME_ART } from "../dist/render/art-index.js";

/** A JSON-safe command stream: nested sprite/noise canvases are expanded, paths become their ops. */
function stream(ctx, seen = new Set()) {
  // Bake passes (value grade, lit rim) read a canvas back through a scratch canvas; expand each once.
  if (seen.has(ctx)) return "self";
  seen.add(ctx);
  const value = (a) => a?.getContext ? stream(a.getContext("2d"), seen) : a instanceof Path ? a.ops : a?.data ? a.data.length : a;
  return ctx.calls.map((c) => ({
    op: c.op, args: (c.args ?? []).map(value), alpha: c.globalAlpha, composite: c.globalCompositeOperation,
    fill: typeof c.fillStyle === "object" ? "pattern" : c.fillStyle, stroke: typeof c.strokeStyle === "object" ? "pattern" : c.strokeStyle,
  }));
}

test("every landmark kind uses native material footings and a distinct full construction", (t) => {
  environment(t);
  const firsts = new Set();
  for (const def of LANDMARK_DEFS.all()) {
    const art = LANDMARK_ART.get(def.id), ctx = canvas().getContext("2d");
    const place = Object.freeze({ id: `base-${def.id}`, kind: def.id, x: 0, y: 0, radius: def.radius, seed: 7, ...(def.span ? { span: 260 } : {}) });
    assert.equal(typeof art.base, "function", `${def.id} has a base painter`);
    art.base(ctx, place);
    const calls = allPaint(ctx), fills = calls.filter((c) => c.op === "fillRect");
    assert.ok(fills.length >= 3, `${def.id} base paints paper layers`);
    assert.deepEqual(gloss(calls), [], `${def.id} base stays flat paper`);
    assert.ok(fills.every(c => c.args.every(Number.isInteger)), "footing is authored on a pixel lattice");
    // The first painted base path identifies the kind's footing.
    firsts.add(JSON.stringify(fills.map(c => [c.args,c.fillStyle])));
    assert.equal(ctx.depth, 0);
  }
  assert.ok(firsts.size >= 3, "stone, timber and garden footings differ");
  const silhouettes = new Set(LANDMARK_ART.all().map(a => {
    const c=canvas().getContext("2d"), d=LANDMARK_DEFS.get(a.id), place={id:"test",kind:a.id,x:0,y:0,radius:d.radius,seed:7,span:260};
    a.base(c,place); a.ground(c,place);
    for(const p of a.pieces??[]) p.paint(c,0,0,1,0);
    return JSON.stringify(stream(c));
  }));
  assert.equal(silhouettes.size, LANDMARK_DEFS.ids().length, "landmarks retain distinct full constructions");
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
  assert.ok(a.some(c => c.op === "fillRect"), "terrain contains authored pixel marks");
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

test("painted and washed neighbouring tiles do not resurrect obsolete raised stock panels", t=>{
  environment(t);
  for(const layer of ["paint","sketch"])for(const cx of [0,1]){
    const ctx=buildChunk(7,cx,1,layer).getContext("2d");
    const commands=stream(ctx);
    assert.ok(commands.some(c=>c.op==="fillRect"),`${layer} contains native ground coverage`);
    assert.ok(commands.some(c=>c.op==="stroke"||c.op==="drawImage"),`${layer} contains terrain or outline detail`);
    assert.ok(!ctx.calls.some(c=>c.op==="clip"&&c.args[1]==="evenodd"&&c.args[0]?.ops?.some(op=>op[0]==="addPath")),`${layer} has no obsolete district-panel cutout`);
    assert.equal(ctx.depth,0,"both representations restore their drawing state");
  }
});

// ---------------------------------------------------------------- washed paper rendering (FEAT-005)
import { createSim, spillWater, paintColour } from "../dist/game/sim.js";
import { WASH } from "../dist/defs/wash.js";
import { sketchTile } from "../dist/render/craft-world.js";
import { cellCode, clearWashRender, drawFoldGuards, drawWashGround, washFrame, washMaskRevision, washMaskCount, washStep } from "../dist/render/wash-art.js";
import { drawSketched, drawSketchedParts, rasterScale, sketchedSprite, sketchStep, SKETCH_STEPS } from "../dist/render/sprite-sketch.js";
import { cachedSprite } from "../dist/engine/sprite.js";
import { WASH_LOOK, ZOOM, washBloom } from "../dist/render/timeline.js";

const WASH_AT = { x: 2180, y: 2150 };
function washedSim() {
  const sim = createSim({ cat: "nicole", seed: 7 });
  spillWater(sim, WASH_AT.x, WASH_AT.y, 70, 1, false);
  return sim;
}
/** Bakes visible tiles (and pencil layers for `washed`) through the budgeted fallback until the chunk's tiles are ready. */
function bake(seed, cam, washed, cx, cy) {
  for (let i = 0; i < 40000; i++) {
    drawChunks(canvas().getContext("2d"), seed, cam, false, washed);
    if (!washed || sketchTile(seed, cx, cy)) return;
  }
}

test("an unwashed page does no mask work and never bakes a pencil layer", (t) => {
  const sim = createSim({ cat: "zero", seed: 7 });
  environment(t);
  clearWorldRenderCache();
  clearWashRender();
  t.after(clearWorldRenderCache);
  assert.equal(washFrame(sim), null, "no stored cells: one check, no frame");
  const ctx = canvas().getContext("2d"), { cx, cy } = chunkOf(WASH_AT.x, WASH_AT.y);
  drawWashGround(ctx, WASH_AT, null);
  assert.equal(ctx.calls.length, 0);
  bake(7, WASH_AT, undefined, cx, cy);
  for (let i = 0; i < 400; i++) drawChunks(canvas().getContext("2d"), 7, WASH_AT, false);
  assert.equal(sketchTile(7, cx, cy), undefined, "pencil layers are only baked for washed chunks");
});

test("washed chunks reuse one native overlay per dirty tile without repainting unchanged marks", (t) => {
  const sim = washedSim(), before = structuredClone(sim);
  environment(t); clearWashRender();
  const draw = () => { const c=canvas().getContext("2d"); drawWashGround(c,WASH_AT,washFrame(sim)); return c; };
  const a=draw(), tiles=images(a).map(c=>c.args[0]), counts=tiles.map(c=>c.getContext("2d").calls.length);
  assert.ok(tiles.length>0); assert.equal(new Set(tiles).size,tiles.length);
  const stains = tiles.flatMap(tile => {
    const occupied = new Set();
    const runs = tile.getContext("2d").calls.filter(c => c.op === "fillRect" && c.fillStyle === "#bcc0aa");
    for (const { args: [x,y,w,h], globalAlpha } of runs) {
      assert.ok(globalAlpha > 0 && globalAlpha <= .26, "the neutral wash lets terrain show through");
      for (let row = y; row < y+h; row++) for (let col = x; col < x+w; col++) {
        const pixel = row * tile.width + col;
        assert.ok(!occupied.has(pixel), "overlapping cells tint each pixel only once");
        occupied.add(pixel);
      }
    }
    return runs;
  });
  assert.ok(stains.length > 0, "there is visible pigment loss");
  const b=draw(); assert.deepEqual(images(b).map(c=>c.args[0]),tiles);
  assert.deepEqual(tiles.map(c=>c.getContext("2d").calls.length),counts,"unchanged frames do no mask work");
  assert.deepEqual(sim,before); assert.deepEqual(gloss(allPaint(a)),[]); restored(a); restored(b);
});

test("the pencil layer is flat graphite on cream: no gradients, filters or pixel reads, and the worker bake matches the fallback", (t) => {
  environment(t);
  clearWorldRenderCache();
  clearWashRender();
  t.after(clearWorldRenderCache);
  const sim = washedSim(), { cx, cy } = chunkOf(WASH_AT.x, WASH_AT.y);
  const full = stream(buildChunk(sim.seed, cx, cy, "sketch").getContext("2d"));
  assert.ok(full.some(c=>c.op==="stroke"&&c.args.some(a=>Array.isArray(a)&&a.some(op=>["moveTo","lineTo","quadraticCurveTo"].includes(op[0])))), "the underlayer retains actual world outline geometry, not obsolete panel command counts");
  assert.deepEqual(full, stream(buildChunk(sim.seed, cx, cy, "sketch").getContext("2d")), "deterministic");
  assert.ok(full.some((c) => c.op === "fillRect" && c.fill === "#eee4cf"), "raw cream paper");
  assert.ok(full.some((c) => c.op === "stroke" && c.stroke === "#45434f"), "graphite lines");
  assert.ok(!full.some((c) => /Gradient$/.test(c.op) || c.op === "filter" || c.op === "getImageData" || c.op === "shadowBlur"));
  assert.notDeepEqual(full, stream(buildChunk(sim.seed, cx, cy).getContext("2d")), "a separate layer from the painted tile");
  bake(sim.seed, WASH_AT, washFrame(sim).chunks, cx, cy);
  assert.deepEqual(stream(sketchTile(sim.seed, cx, cy).getContext("2d")), full, "budgeted fallback and full (worker) bake paint identically");
});

test("wash masks are quantised, rebuilt only when a chunk's cells change, and bloom timing settles", (t) => {
  const sim = washedSim();
  environment(t);
  clearWashRender();
  const steps = new Set();
  for (let i = 0; i <= 100; i++) steps.add(washStep(i / 100));
  assert.deepEqual([...steps].sort(), [0, 1, 2, 3, 4], "five quantised levels");
  const codes = new Set();
  for (let i = 0; i <= 50; i++) codes.add(cellCode({ level: i / 50, changedAt: 0, wetUntil: i % 2 ? 9 : 0, cutUntil: i % 3 ? 9 : 0, blank: i % 5 === 0 }, 1));
  assert.ok([...codes].every((c) => Number.isInteger(c) && c >= 0 && c < 128));
  const { cx, cy } = chunkOf(WASH_AT.x, WASH_AT.y), draw = () => drawWashGround(canvas().getContext("2d"), WASH_AT, washFrame(sim));
  draw();
  const rev = washMaskRevision(cx, cy);
  assert.ok(rev > 0);
  draw();
  const cell = Object.values(sim.wash.cells).find((c) => c.level >= 1);
  cell.level = 0.99;
  draw();
  assert.equal(washMaskRevision(cx, cy), rev, "same quantised look: no rebuild");
  paintColour(sim, WASH_AT.x, WASH_AT.y, 30, 0.7);
  draw();
  assert.equal(washMaskRevision(cx, cy), rev + 1, "a real change rebuilds once");
  assert.deepEqual(SKETCH_STEPS, [0, 0.5, 1]);
  for (let i = 0; i <= 20; i++) assert.ok(SKETCH_STEPS.includes(sketchStep(i / 20)));
  const b0 = washBloom(0.05), b1 = washBloom(WASH_LOOK.seconds * 0.4), done = washBloom(WASH_LOOK.seconds + 0.01);
  assert.ok(b0.pigment > 0 && b1.tide > b0.tide);
  assert.equal(done.pigment, 0);
  assert.equal(done.tide, 0);
});

test("pieces and actors on colourless paper use finite pencil variants; painted ones are untouched", (t) => {
  environment(t);
  const base = cachedSprite("visual-sketch-base", 20, 30, 2, (c) => c.fillRect(2, 2, 16, 26), { x: 0.5, y: 1 });
  assert.equal(sketchedSprite(base, 0), base);
  const a = sketchedSprite(base, 1);
  assert.notEqual(a, base);
  const count = spriteCacheSize();
  for (const amount of [0.8, 0.95, 1, 0.6, 0.5, 0.74]) sketchedSprite(base, amount);
  assert.ok(spriteCacheSize() <= count + 1, "only one more step (0.5) is ever cached");
  const ops = allPaint(a.canvas.getContext("2d"));
  for (const op of ["saturation", "multiply", "destination-in", "destination-out"])
    assert.ok(ops.some((c) => c.globalCompositeOperation === op), `pencil composition uses ${op}`);
  assert.deepEqual(gloss(ops), []);
  let direct = null;
  const ctx = canvas().getContext("2d");
  drawSketched(ctx, 0, 10, 20, { l: -20, r: 20, t: -40, b: 8 }, (c) => { direct = c; });
  assert.equal(direct, ctx, "painted actors draw straight onto the page");
  drawSketched(ctx, 1, 10, 20, { l: -20, r: 20, t: -40, b: 8 }, (c) => { direct = c; c.fillRect(0, 0, 4, 4); });
  assert.notEqual(direct, ctx, "a colourless actor is composed on a scratch canvas");
  assert.ok(images(ctx).length >= 6, "outline, cut, pencil body and hatching");
  restored(ctx);
});

test("pencil enemies stamp cached per-part pencil variants: one drawImage per part, finite cache", (t) => {
  environment(t);
  const look = { x: 140, y: 60 };
  const enemy = (kind, id, extra = {}) => ({ id, kind, x: 120, y: 120, hp: 1e6, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0, ...extra });
  const draw = (amount, e, time) => {
    const ctx = canvas().getContext("2d");
    drawSketchedParts(ctx, amount, (c) => drawCraftEnemy(c, e, time, look));
    restored(ctx);
    return images(ctx);
  };
  for (const art of ENEMY_ART.all()) for (const extra of [{}, { elite: true }]) {
    const e = enemy(art.id, 7, extra), painted = draw(0, e, 1.3), pencil = draw(1, e, 1.3);
    assert.ok(painted.length > 0, `${art.id} draws cached parts`);
    assert.ok(pencil.length <= painted.length + 1, `${art.id}: ${pencil.length} pencil stamps for ${painted.length} parts`);
    const painted2d = new Set(painted.map((c) => c.args[0]));
    assert.ok(pencil.some((c) => !painted2d.has(c.args[0])), `${art.id}: pencil parts are their own cached variants`);
    for (const c of pencil) {
      const inner = c.args[0].getContext("2d").calls;
      assert.ok(!inner.some((op) => op.op === "getImageData" || op.op === "filter"), "no pixel reads or filters");
    }
  }
  // Varying time, ids and steps adds no new entries once every part and step is cached.
  const sweep = () => {
    for (const art of ENEMY_ART.all()) for (let i = 0; i < 12; i++) for (const amount of [0.5, 1])
      draw(amount, enemy(art.id, i, i % 4 === 0 ? { elite: true } : {}), i * 0.37);
  };
  sweep();
  const size = spriteCacheSize();
  t.diagnostic(`shared sprite cache after the enemy pencil sweep: ${size}`);
  sweep();
  assert.equal(spriteCacheSize(), size, "pencil part variants are finite (part key x step)");
  assert.ok(size < 256, `cache stays under the LRU limit (${size})`);
  // Dense washed page: every kind, painted and both pencil steps, many ids, times,
  // facings and states. The whole enemy working set (painted parts plus their
  // sketch-live variants) must stay well inside the shared 256-entry LRU, so it
  // cannot thrash the props, decor, cat and townsfolk sprites (measured 91).
  for (const art of ENEMY_ART.all()) for (let i = 0; i < 60; i++) for (const amount of [0, 0.5, 1])
    for (const lk of [{ x: -400, y: 60 }, { x: 400, y: 400 }]) {
      const ctx = canvas().getContext("2d"),
        e = enemy(art.id, i, { elite: i % 3 === 0, hitFlash: i % 5 === 0 ? 0.1 : 0, slowTime: i % 7 === 0 ? 1 : 0,
          stun: i % 11 === 0 ? 1 : 0, hp: i % 2 ? 1 : 1e6, maxHp: 1e6 });
      drawSketchedParts(ctx, amount, (c) => drawCraftEnemy(c, e, i * 0.173, lk));
    }
  const dense = spriteCacheSize();
  t.diagnostic(`shared sprite cache after the dense enemy sweep: ${dense}`);
  assert.ok(dense <= SPRITE_CACHE_LIMIT / 2, `enemy parts and pencil variants use at most half the LRU (${dense})`);
});

test("pencil chunk layers bake one tile at a time, inside the shared 14-tile budget", (t) => {
  environment(t);
  clearWorldRenderCache();
  clearWashRender();
  t.after(clearWorldRenderCache);
  const sim = washedSim(), frame = washFrame(sim);
  // Every visible chunk asks for a pencil layer, as in a paper-rain moment.
  const cam = { x: WASH_AT.x, y: WASH_AT.y }, all = new Set();
  for (let cy = -2; cy <= 6; cy++) for (let cx = -2; cx <= 8; cx++) all.add(`${cx},${cy}`);
  for (const key of frame.chunks) all.add(key);
  let before = cachedChunkCount();
  for (let i = 0; i < 4000; i++) {
    drawChunks(canvas().getContext("2d"), sim.seed, cam, false, all);
    const now = cachedChunkCount();
    assert.ok(now - before <= 1, "at most one tile finishes per frame");
    assert.ok(now <= 14, `ready tiles stay within the budget (${now})`);
    before = now;
  }
});

/** A recording context that reports a live transform scale of `k` (as a cue-zoomed 2x back canvas would). */
const scaledContext = (ctx, k) => new Proxy(ctx, {
  get: (o, key) => key === "getTransform" ? () => ({ a: k, b: 0 }) : o[key],
  set: (o, key, value) => { o[key] = value; return true; },
});
test("offscreen pencil copies never rasterise below the live transform scale", (t) => {
  environment(t);
  // rasterScale: quarter steps at or above the live scale, floored at 1 and capped at 4.
  for (const s of [0.4, 1, 1.01, 1.3, 2, 2.07, 2.2, 3.9, 4]) {
    const k = rasterScale(s);
    assert.ok(k >= s - 1e-9, `${s} -> ${k}`);
    assert.ok(k - s < 0.25 || s < 1, "no more than one quarter step above");
    assert.equal(k * 4, Math.round(k * 4), "quarter steps keep sizes few");
  }
  assert.equal(rasterScale(0.3), 1, "never below one pixel per unit");
  assert.equal(rasterScale(9), 4, "capped above (far beyond any cue zoom)");
  const peak = Math.max(...Object.values(ZOOM).flatMap((z) => Object.values(z)));
  for (const s of [1, 2, 2 * peak, 0.5]) {
    const ctx = scaledContext(canvas().getContext("2d"), s);
    drawSketched(ctx, 1, 10, 20, { l: -20, r: 20, t: -40, b: 8 }, (c) => c.fillRect(0, 0, 4, 4));
    const draws = images(ctx);
    assert.ok(draws.length >= 6);
    for (const d of draws) {
      const density = d.args[0].width / d.args[3];
      assert.ok(density >= Math.max(1, s) - 1e-9, `scale ${s}: copy at ${density} px/unit`);
    }
  }
});

test("fold protection shows for the whole fold life and draws nothing without folds", (t) => {
  environment(t);
  const sim = createSim({ cat: "nicole", seed: 7 }), cam = { x: WASH_AT.x, y: WASH_AT.y };
  const empty = canvas().getContext("2d");
  drawFoldGuards(empty, sim, cam);
  assert.equal(empty.calls.length, 0, "no folds: no work");
  sim.wash.folds.push({ x: WASH_AT.x, y: WASH_AT.y, radius: 60, until: sim.elapsed + WASH.fold.seconds });
  const at = (dt) => {
    const s = { ...sim, elapsed: sim.elapsed + dt }, ctx = canvas().getContext("2d");
    drawFoldGuards(ctx, s, cam);
    restored(ctx);
    return ctx;
  };
  for (const dt of [0.3, 1, 3, 5, WASH.fold.seconds - 0.2]) {
    const ctx = at(dt);
    assert.ok(pixels(ctx).length > 20, `a mark at ${dt} s`);
    assert.deepEqual(gloss(ctx.calls), []);
  }
  const late = at(WASH.fold.seconds - 0.1).calls.find((c) => c.op === "fillRect"),
    mid = at(5).calls.find((c) => c.op === "fillRect");
  assert.ok(late.globalAlpha < mid.globalAlpha, "it fades out at the end of the protection");
  assert.equal(at(6.5).calls.length, 0, "gone once the protection ends");
  const far = canvas().getContext("2d");
  drawFoldGuards(far, sim, { x: WASH_AT.x + 3000, y: WASH_AT.y });
  assert.equal(far.calls.length, 0, "culled outside the view");
  assert.equal(sim.wash.size, 0, "the mark stores no wash cells");
});

test("cut cells show a dark opening with one pixel lip and expire on simulation time", (t) => {
  const sim=washedSim(); environment(t); clearWashRender();
  for(const cell of Object.values(sim.wash.cells)) if(cell.level>=WASH.colourless) cell.cutUntil=sim.elapsed+2;
  const c=canvas().getContext("2d"); drawWashGround(c,WASH_AT,washFrame(sim));
  const calls=images(c).flatMap(c=>c.args[0].getContext("2d").calls), holes=calls.filter(c=>c.op==="fillRect"&&c.fillStyle===FX.dark), lips=calls.filter(c=>c.op==="fillRect"&&c.fillStyle===FX.cream);
  assert.ok(holes.length>0); assert.equal(lips.length,holes.length);
  for(let i=0;i<holes.length;i++) assert.deepEqual(lips[i].args,[holes[i].args[0],holes[i].args[1],holes[i].args[2],2]);
  sim.elapsed+=3; const later=washFrame(sim); assert.ok([...later.buckets.values()].every(b=>b.marks.every(m=>!(m.code&16)))); restored(c);
});

import { drawPaperRain, drawWashEffect, rainAmount } from "../dist/render/wash-art.js";
import { paintGallery } from "../dist/render/gallery.js";
import { CATS } from "../dist/defs/registries.js";

test("splashes, pigment confetti and paper rain are native pixel effects with bounded cache use", (t) => {
  const sim = createSim({ cat: "zero", seed: 7 });
  environment(t);
  for (const kind of ["splash", "pigment"]) {
    const ctx = canvas().getContext("2d"), e = Object.freeze({ kind, x: 10, y: 20, life: EFFECT_LIFE[kind] * 0.6, seed: 5, radius: 40, src: "ink-blob" });
    assert.equal(drawWashEffect(ctx, e, sim), true);
    assert.ok(pixels(ctx).length >= 8, `${kind} throws native particles`);
    assert.deepEqual(gloss(allPaint(ctx)), []);
    restored(ctx);
  }
  const count = spriteCacheSize();
  for (const f of [0.05, 0.3, 0.55, 0.95]) for (const kind of ["splash", "pigment"])
    drawWashEffect(canvas().getContext("2d"), { kind, x: -50, y: 9, life: EFFECT_LIFE[kind] * f, seed: 5, radius: 60, src: "ink-blob" }, sim);
  assert.ok(spriteCacheSize() <= count + 18, "confetti turns and drop sizes are a small finite set");
  assert.equal(drawWashEffect(canvas().getContext("2d"), { kind: "hit", x: 0, y: 0, life: 0.1 }, sim), false);
  const dry = canvas().getContext("2d");
  drawPaperRain(dry, sim, { x: 480, y: 270 }, 3, false);
  assert.equal(dry.calls.length, 0, "no rain outside the spell");
  const wet = { ...sim, elapsed: (WASH.rain.at + WASH.rain.until) / 2 * sim.sessionSeconds };
  assert.ok(rainAmount(wet) > 0);
  const rain = canvas().getContext("2d");
  drawPaperRain(rain, wet, { x: 480, y: 270 }, 3, false);
  assert.ok(pixels(rain).length > 10);
  const rainCount = spriteCacheSize();
  for (const time of [0.1, 7, 900]) drawPaperRain(canvas().getContext("2d"), wet, { x: 480, y: 270 }, time, false);
  assert.equal(spriteCacheSize(), rainCount, "falling drops reuse two cached cuts");
  restored(rain);
});

test("the watercolour brush trails native pigment marks, read-only", (t) => {
  const sim = createSim({ cat: "nicole", seed: 7 });
  environment(t);
  const art = WEAPON_ART.get("watercolour-brush"), ctx = canvas().getContext("2d");
  assert.equal(typeof art.ground, "function");
  for (let i = 0; i < 8; i++) {
    sim.player.x += 9;
    sim.elapsed += 0.05;
    const before = structuredClone(sim);
    ctx.calls.length = 0;
    art.ground(ctx, sim);
    assert.deepEqual(sim, before, "the ribbon never mutates SimState");
  }
  const pigment = pixels(ctx), x = sim.player.x;
  assert.ok(pigment.some(c => c.args[0] < x - 24) && pigment.some(c => c.args[0] > x + 2),
    "pigment runs from the older position through the brush's leading edge");
  assert.ok(pigment.every(c => c.args.every(Number.isInteger)), "the trail stays on the native lattice");
  assert.ok(new Set(pigment.map(c => c.fillStyle)).size >= 4, "wet pigment and dry bristles use distinct tones");
  assert.deepEqual(gloss(ctx.calls), []);
  restored(ctx);
  ctx.calls.length = 0;
  sim.elapsed += 1;
  art.ground(ctx, sim);
  assert.equal(pixels(ctx).length, 0, "old brush marks retire once the player stops");
});

test("the gallery presents distinct colored, washed, blank and tide review states", (t) => {
  environment(t); const page=canvas(); page.style={};
  assert.ok(paintGallery(page,"en",1240,1)>0);
  const calls=allPaint(page.getContext("2d"));
  assert.ok(calls.some(c=>c.op==="fillRect"),"native sprite and terrain marks are shown");
  const source=readFileSync(new URL("../src/render/gallery.ts",import.meta.url),"utf8");
  for(const state of ["colourless","blank","tide"]) assert.ok(source.includes(`"${state}"`),`${state} has an explicit review painter`);
  assert.ok(new Set(calls.filter(c=>c.op==="fillRect").map(c=>c.fillStyle)).size>8,"review retains finite distinct palettes");
});

import { drawWorld } from "../dist/render/world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";
import { toScreen } from "../dist/render/iso/projection.js";
// The live view is isometric: drawWorld takes an iso camera that frames a world point.
const isoCam = (at, width = 960, height = 540) => createIsoCamera(width, height, at);

test("the pixel world draws all the way to the bottom and right of a portrait camera", (t) => {
  environment(t);
  const sim = createSim({ cat: "zero", seed: 7 });
  const ctx = canvas().getContext("2d");
  const width = 360, height = 720;
  drawWorld(ctx, sim, { time: 0, camera: isoCam({ x: sim.player.x, y: 360 }, width, height) });
  const edge = (...rect) => ctx.calls.some(c => c.op === "fillRect" && rect.every((n, i) => c.args[i] === n));
  assert.ok(edge(0, height - 1, width, 1), "bottom cut edge");
  assert.ok(edge(width - 1, 0, 1, height), "right cut edge");
});

test("warning tint stays below actors while its edge passes above raised skills and around the cat's face", (t) => {
  environment(t);
  const sim = createSim({ cat: "nicole", seed: 7 });
  const { x, y } = sim.player;
  sim.upgrades["page-fold"] = 1;
  sim.upgrades["full-moon"] = 1;
  sim.enemies = [{ id: 17, kind: "smudge", x: x + 65, y, hp: 3, alive: true, spawnTime: 0,
    windup: 0.4, tx: x, ty: y }];
  t.mock.method(WEAPON_ART.get("page-fold"), "ground", ctx => {ctx.save();ctx.fillStyle="#010203";ctx.fillRect(x,y,2,3);ctx.restore();});
  t.mock.method(ENEMY_ART.get("smudge"), "draw", ctx => {ctx.save();ctx.fillStyle="#040506";ctx.fillRect(x,y,4,5);ctx.restore();});
  t.mock.method(WEAPON_ART.get("full-moon"), "front", ctx => {ctx.save();ctx.fillStyle="#070809";ctx.fillRect(x,y,6,7);ctx.restore();});
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 1, camera: isoCam(sim.player) });
  const skill = ctx.calls.findIndex(c => c.op === "fillRect" && c.fillStyle === "#010203" && c.args[0] === x && c.args[1] === y);
  const warning = ctx.calls.findIndex(c => c.op === "fill" && c.args[0].ops?.some(([op, cx, cy, r]) =>
    op === "arc" && cx === x && cy === y && r === SMUDGE.splashRadius));
  const actor = ctx.calls.findIndex(c => c.op === "fillRect" && c.fillStyle === "#040506" && c.args[0] === x && c.args[1] === y);
  const front = ctx.calls.findIndex(c => c.op === "fillRect" && c.fillStyle === "#070809" && c.args[0] === x && c.args[1] === y);
  // The face opening is cut in projected view space around the cat's projected foot.
  const face = toScreen(x, y);
  const faceClip = ctx.calls.findIndex(c => c.op === "clip" && c.args[1] === "evenodd" &&
    c.args[0].ops.some(([op, l, top, width, height]) =>
      op === "roundRect" && l < face.x && l + width > face.x && top < face.y - 40 && top + height > face.y - 40));
  const edge = ctx.calls.findIndex(c => c.op === "stroke" && c.args[0] === ctx.calls[warning]?.args[0]);
  assert.ok(skill >= 0 && warning > skill && actor > warning && front > actor && faceClip > front && edge > faceClip, JSON.stringify({skill,warning,actor,front,faceClip,edge}));
});

test("the selected cat retains its colours and draws above a foreground landmark", (t) => {
  environment(t);
  const sim = createSim({ cat: "nicole", seed: 2026 });
  const art = LANDMARK_ART.get("star-observatory");
  const place = landmarks(sim.seed).find(l => l.kind === art.id);
  const roof = art.pieces.find(p => p.bounds.t < -200);
  const decor = landmarkParts(place).decor.find(d => d.kind === roof.kind);
  Object.assign(sim.player, { x: decor.x, y: decor.y - 70 });
  spillWater(sim, sim.player.x, sim.player.y, 16, 1, false);
  t.mock.method(roof, "paint", c => c.fillRect(45, 46, 47, 48));
  t.mock.method(CAT_ART.get(sim.player.id), "draw", c => c.fillRect(51, 52, 53, 54));
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0, camera: isoCam(sim.player), reducedMotion: true });
  const draws = ctx.calls;
  // Match the complete sentinel: real cached pixel art can also draw at x45/51.
  const withRect = marker => {
    const matches = op => op.op === "fillRect" && marker.every((value, i) => op.args[i] === value);
    return draws.findIndex(c => matches(c) || c.op === "drawImage" && c.args[0].getContext("2d").calls.some(matches));
  };
  const building = withRect([45,46,47,48]), cat = withRect([51,52,53,54]);
  assert.ok(building >= 0 && cat > building);
  assert.ok(draws[building].globalAlpha < 1, "a blocking building yields while retaining its shape");
  assert.equal(draws[cat].globalAlpha, 1);
});

test("a whole world frame over washed, cut and folded paper leaves SimState untouched", (t) => {
  const sim = washedSim();
  spillWater(sim, sim.player.x, sim.player.y, 90, 1, false);
  const near = Object.entries(sim.wash.cells)[0][1];
  near.cutUntil = sim.elapsed + 2;
  sim.wash.folds.push({ x: sim.player.x, y: sim.player.y, radius: 78, until: sim.elapsed + 2 });
  const before = structuredClone(sim);
  environment(t);
  clearWorldRenderCache();
  clearWashRender();
  t.after(clearWorldRenderCache);
  for (const at of [sim.player, WASH_AT]) {
    const ctx = canvas().getContext("2d");
    drawWorld(ctx, sim, { time: 1.5, camera: isoCam(at) });
    assert.ok(ctx.calls.length > 50);
  }
  assert.deepEqual(sim, before, "rendering never mutates SimState");
});

test("washed-paper painters never read pixels or set a live filter", () => {
  for (const file of ["wash-art.ts", "pencil.ts", "sprite-sketch.ts", "craft-world.ts", "world.ts"]) {
    const text = readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /getImageData|\.filter\s*=|shadowBlur|create(Linear|Radial|Conic)Gradient|Math\.random/, file);
  }
});

import { COSTUME_DEFS } from "../dist/defs/index.js";
import { COSTUME_ART, costumeArt, effectPainter } from "../dist/render/art-index.js";
import { drawCombatGround } from "../dist/render/combat-fx.js";

test("the fold corner stays local in both motion modes regardless of attack size", (t) => {
  environment(t);
  const paint = WEAPON_ART.get("page-fold").ground;
  const sim = createSim({ cat: "nicole", seed: 7 });
  const { x, y } = sim.player;
  const draw = (age, half, band, reduced) => {
    sim.elapsed = age;
    sim.fold.flaps = [{ id: 1, x, y, nx: 0, ny: 1, half, band, at: 0 }];
    const ctx = canvas().getContext("2d");
    withPaperMotion(reduced, () => paint(ctx, sim));
    restored(ctx);
    return pixels(ctx);
  };
  for (const reduced of [false, true]) {
    const local = draw(.12, 60, 40, reduced);
    assert.ok(local.length > 0, "a visible fold remains");
    assert.deepEqual(draw(.12, 180, 160, reduced), local, "attack bounds do not affect the paint");
    assert.ok(local.every(({args: [px,py,w,h]}) =>
      px >= x - 50 && px + w <= x + 50 && py >= y - 50 && py + h <= y + 50));
    assert.equal(draw(.4, 180, 160, reduced).length, 0, "the fold disappears promptly");
  }
});

test("a spent Paper Cut only lifts a short edge at the closure", (t) => {
  environment(t);
  const paint = WEAPON_ART.get("paper-cut").ground, sim = createSim({ cat: "zero", seed: 7 });
  sim.cut.outs = [{ id: 1, at: 0, points: [{x:60,y:55},{x:300,y:65},{x:275,y:265},{x:104,y:240}] }];
  for (const reduced of [false, true]) {
    sim.elapsed = .16;
    const ctx = canvas().getContext("2d"), before = JSON.stringify(sim);
    withPaperMotion(reduced, () => paint(ctx, sim));
    const marks = pixels(ctx);
    assert.ok(marks.length > 0, "the closure exposes a paper back");
    assert.ok(marks.every(({args: [x,y,w,h]}) => x >= 57 && x+w <= 84 && y >= 45 && y+h <= 83),
      "the visible peel stays near the closure even with a large cut-out");
    assert.equal(JSON.stringify(sim), before);
    restored(ctx);
    sim.elapsed = .5;
    const late = canvas().getContext("2d");
    withPaperMotion(reduced, () => paint(late, sim));
    assert.equal(pixels(late).length, 0);
  }
});

test("angled cranes and seeds stamp one crisp bounded native sprite", (t) => {
  environment(t);
  for (const [id, weapon, poses] of [["paper-crane", "crane", 3], ["pumpkin-seed", "seed", 1]]) {
    const paint = WEAPON_ART.get(id).shot;
    for (let heading = 0; heading < 16; heading++) for (let pose = 0; pose < poses; pose++) {
      const angle = heading * Math.PI / 8, ctx = canvas().getContext("2d");
      paint(ctx, { id: pose, weapon, x: 80.7, y: 40.4, vx: Math.cos(angle), vy: Math.sin(angle) }, 0);
      assert.equal(images(ctx).length, 1);
      assert.ok(!allPaint(ctx).some(c => c.op === "rotate"), "diagonal pixels are baked before they reach the screen");
      const spritePixels = allPaint(ctx).filter(c => c.op === "fillRect");
      assert.ok(spritePixels.length > 10);
      assert.ok(spritePixels.every(({args: [x,y,w,h]}) => [x,y,w,h].every(Number.isInteger) &&
        x >= 0 && y >= 0 && x+w <= 36 && y+h <= 36), "no wing or seed is cropped at an angled heading");
    }
  }
  assert.equal(spriteCacheSize(), 64, "cache keys only include weapon, heading and wing pose");
});

test("costume zones draw friendly ground marks and standing pieces for the worn costume only, read-only", (t) => {
  environment(t);
  const plain = createSim({ cat: "zero", seed: 7 });
  assert.equal(plain.costume, undefined);
  assert.equal(costumeArt(plain), undefined, "a plain run has no costume art");
  for (const id of COSTUME_DEFS.ids()) {
    const state = createSim({ cat: "nicole", seed: 7, costume: id }), art = costumeArt(state);
    assert.equal(art, COSTUME_ART.get(COSTUME_DEFS.get(id).art));
    const { x, y } = state.player;
    state.elapsed = 10;
    state.costume.buff = 1;
    state.costume.zones = [
      { kind: "lane", x, y, x2: x + 120, y2: y, radius: 20, until: 11, power: 1 },
      { kind: "circle", x, y, radius: 80, until: 11, power: 1, armed: 10.4 },
      { kind: "circle", x: x + 40, y, radius: 80, until: 11, power: 1 },
      { kind: "circle", x: x - 60, y, radius: 10, until: 11, power: 0 },
      { kind: "burst", x: x + 60, y, radius: 50, until: 11, power: 1, armed: 10.5 },
      { kind: "pad", x, y: y + 30, radius: 22, until: 11, power: 1, armed: 10 },
    ];
    const before = JSON.stringify(state), ctx = canvas().getContext("2d"), sprites = [];
    drawCombatGround(ctx, state);
    art.sprites(ctx, state, 3, (sy, draw) => sprites.push({ sy, draw }));
    for (const s of sprites) s.draw();
    restored(ctx);
    assert.ok(pixels(ctx).length >= 6, `${id}: zone marks drawn`);
    assert.ok(sprites.length >= 1, `${id}: go stone stands in the world`);
    assert.equal(JSON.stringify(state), before, `${id}: rendering does not mutate the run`);
    // Expired zones draw nothing.
    state.elapsed = 12;
    const later = canvas().getContext("2d");
    art.ground(later, { ...state, costume: { ...state.costume, buff: 0 } });
    assert.equal(later.calls.filter((c) => c.op === "stroke" || c.op === "drawImage" || c.op === "fillRect").length, 0, `${id}: expired zones fade out`);
  }
});

test("costume impacts have native pixel painters for the worn costume", (t) => {
  environment(t);
  for (const kind of ["costume-burst", "costume-push", "costume-pull"]) {
    const painter = effectPainter(kind);
    assert.equal(typeof painter, "function", kind);
    assert.ok(EFFECT_LIFE[kind] > 0);
    const state = createSim({ cat: "zero", seed: 3, costume: COSTUME_DEFS.ids()[0] }), ctx = canvas().getContext("2d");
    ctx.save();
    painter(ctx, { kind, x: 100, y: 100, life: EFFECT_LIFE[kind] / 2, radius: 60 }, { t: 0.5, fade: 0.5, ease: 0.875 }, state);
    ctx.restore();
    restored(ctx);
    assert.ok(ctx.calls.some((c) => c.op === "fillRect" && Object.values(FX).includes(c.fillStyle)), `${kind} paints`);
  }
});

// ---------------------------------------------------------------- washed paper look (task-wash-and-seam-fix)
import { biomeAt, roads } from "../dist/game/world-gen.js";
import { waterRegionsNear } from "../dist/game/water.js";
import { landmarkReach } from "../dist/render/art-registry.js";
import { PAPER_VALUE } from "../dist/render/paper-rules.js";
import { gradeColour, relativeLuminance } from "../dist/render/paper-value.js";
import { PENCIL, PENCIL_GROUND, WASHED_PAPER } from "../dist/render/pencil.js";
import { mix } from "../dist/render/paper-material.js";
import { washLook } from "../dist/render/wash-art.js";

/** A chunk of seed 7 with no road, water or landmark near it: open district ground only. */
function openChunk(seed) {
  for (let cy = 1; cy < 9; cy++)
    for (let cx = 1; cx < 18; cx++) {
      const x0 = cx * CHUNK.width, y0 = cy * CHUNK.height, x1 = x0 + CHUNK.width, y1 = y0 + CHUNK.height, pad = 60;
      const roadNear = roads(seed).some((r) => r.points.some((p) => p.x > x0 - r.width - pad && p.x < x1 + r.width + pad && p.y > y0 - r.width - pad && p.y < y1 + r.width + pad));
      if (roadNear) continue;
      if (waterRegionsNear(seed, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(CHUNK.width, CHUNK.height) / 2 + 24).length) continue;
      if (landmarks(seed).some((l) => { const r = landmarkReach(l) + pad; return l.x + r > x0 && l.x - r < x1 && l.y + r > y0 && l.y - r < y1; })) continue;
      return { cx, cy, x0, y0, x1, y1 };
    }
  return null;
}
/** Start points of every graphite mark stroked in a recorded stream. */
function graphiteMarks(calls) {
  const out = [];
  for (const c of calls) {
    if (c.op !== "stroke" || !(c.args[0] instanceof Path) || (c.strokeStyle !== PENCIL.graphite && c.strokeStyle !== PENCIL.soft)) continue;
    for (const [op, x, y] of c.args[0].ops) if (op === "moveTo") out.push([x, y]);
  }
  return out;
}

test("the washed grade sits between graded painted ground and graded decor", () => {
  const L = (hex) => relativeLuminance(hex),
    washed = L(gradeColour(PENCIL.paper, PAPER_VALUE.washed)),
    pulp = L(gradeColour("#52574b", PAPER_VALUE.ground)),
    decor = L(gradeColour(PENCIL.paper, PAPER_VALUE.decor));
  assert.ok(washed > pulp * 2, `washed paper (${washed.toFixed(3)}) clearly lighter than painted ground (${pulp.toFixed(3)})`);
  assert.ok(washed < decor, `washed paper (${washed.toFixed(3)}) no brighter than decor (${decor.toFixed(3)})`);
  assert.equal(WASHED_PAPER.paper, gradeColour(PENCIL.paper, PAPER_VALUE.washed), "the flat fallback paper is the graded tile colour");
  assert.deepEqual(PAPER_VALUE.ground, { desaturate: 0.36, multiply: "#c3bfcf" }, "painted ground grade unchanged");
  assert.deepEqual(PAPER_VALUE.decor, { desaturate: 0.24, multiply: "#dcd8e3" }, "decor grade unchanged");
});

test("an open-ground pencil tile is value-graded, fibrous and carries a world-anchored pencil underdrawing", (t) => {
  environment(t);
  const seed = 7, open = openChunk(seed);
  assert.ok(open, "seed 7 has an open-ground chunk");
  const ctx = buildChunk(seed, open.cx, open.cy, "sketch").getContext("2d"), calls = allPaint(ctx);
  assert.ok(calls.some((c) => c.op === "fillRect" && c.globalCompositeOperation === "multiply" && c.fillStyle === PAPER_VALUE.washed.multiply),
    "the bake ends with the washed value grade");
  // Fibre: at least two dark hairs per fibre cell, plus pressed-pulp flecks.
  const cells = (CHUNK.width / PENCIL.fibreCell) * (CHUNK.height / PENCIL.fibreCell),
    hairs = ctx.calls.filter((c) => c.op === "stroke" && c.strokeStyle === PENCIL.fibre)
      .reduce((n, c) => n + c.args[0].ops.filter(([op]) => op === "quadraticCurveTo").length, 0);
  assert.ok(hairs / cells >= 2, `dense paper fibre (${(hairs / cells).toFixed(2)} dark hairs per cell)`);
  assert.ok(ctx.calls.some((c) => c.op === "fill" && c.fillStyle === PENCIL.paperShade), "pressed-pulp mottling");
  // Underdrawing: nearly every 64 x 64 window of open ground shows several graphite marks.
  const marks = graphiteMarks(ctx.calls);
  let windows = 0, marked = 0;
  for (let y = open.y0; y + 64 <= open.y1; y += 64)
    for (let x = open.x0; x + 64 <= open.x1; x += 64) {
      windows++;
      if (marks.filter(([mx, my]) => mx >= x && mx < x + 64 && my >= y && my < y + 64).length >= 3) marked++;
    }
  assert.ok(marked / windows >= 0.85, `${marked}/${windows} open-ground windows show at least three pencil marks`);
  // World-anchored: the neighbouring tile draws the same marks along their shared edge.
  const right = graphiteMarks(buildChunk(seed, open.cx + 1, open.cy, "sketch").getContext("2d").calls),
    edge = (list) => list.filter(([x, y]) => Math.abs(x - open.x1) <= 4 && y > open.y0 + 30 && y < open.y1 - 30).map((p) => p.join(","));
  assert.ok(edge(marks).length > 0, "marks reach the shared tile edge");
  assert.ok(edge(marks).every((p) => edge(right).includes(p)), "neighbouring tiles draw the same marks across their edge");
  restored(ctx);
});

test("washed cells render immediately without a secondary terrain bake", (t) => {
  const sim=washedSim(), before=structuredClone(sim); environment(t); clearWorldRenderCache(); clearWashRender(); t.after(clearWorldRenderCache);
  const {cx,cy}=chunkOf(WASH_AT.x,WASH_AT.y); assert.equal(sketchTile(sim.seed,cx,cy),undefined);
  const c=canvas().getContext("2d"); drawWashGround(c,WASH_AT,washFrame(sim));
  assert.ok(images(c).length>0); assert.ok(allPaint(c).some(c=>c.op==="fillRect"&&c.globalAlpha>0&&c.globalAlpha<1),"wash preserves underlying terrain");
  assert.ok(!allPaint(c).some(c=>c.op==="getImageData"||c.op==="filter")); assert.deepEqual(sim,before); restored(c);
});

test("wash overlays release their backing pixels on clear", (t) => {
  const sim=washedSim(); environment(t); clearWashRender();
  const c=canvas().getContext("2d"); drawWashGround(c,WASH_AT,washFrame(sim));
  const tiles=images(c).map(c=>c.args[0]); assert.ok(tiles.length>0);
  clearWashRender(); assert.ok(tiles.every(c=>c.width===0&&c.height===0));
});


test("wash overlay travel stays within sixteen tiles and reuses dirty backing canvases", (t) => {
  const sim=createSim({cat:"zero",seed:7}); environment(t); clearWashRender();
  const tiles=[];
  for(let i=0;i<24;i++) {
    const x=i*CHUNK.width+100,y=100;
    sim.wash.cells[`${Math.floor(x/WASH.cell)},3`]={level:1,changedAt:0}; sim.wash.size++;
    const c=canvas().getContext("2d"); drawWashGround(c,{x,y},washFrame(sim));
    tiles.push(...images(c).map(c=>c.args[0])); assert.ok(washMaskCount()<=16);
  }
  assert.ok(tiles.some(c=>c.width===0),"eviction releases old backing pixels");
  const at={x:23*CHUNK.width+100,y:100}, c=canvas().getContext("2d"); drawWashGround(c,at,washFrame(sim));
  const active=images(c).map(c=>c.args[0]);
  sim.elapsed+=.1; Object.values(sim.wash.cells).at(-1).level=.2;
  const d=canvas().getContext("2d"); drawWashGround(d,at,washFrame(sim));
  assert.deepEqual(images(d).map(c=>c.args[0]),active,"dirty rebuild reuses live tile surfaces");
  assert.ok(pixels(d).some(c=>c.fillStyle===FX.green),"recolour emits the restored-pigment cue");
  clearWashRender(); assert.equal(washMaskCount(),0);
});

test("a live cut polygon suppresses duplicate wash cell holes without changing the simulation", (t) => {
  const sim=washedSim(); environment(t); clearWashRender();
  for(const c of Object.values(sim.wash.cells)) c.cutUntil=sim.elapsed+2;
  sim.cut.outs=[{at:sim.elapsed,points:[{x:2000,y:2000},{x:2350,y:2000},{x:2350,y:2350},{x:2000,y:2350}]}];
  const before=structuredClone(sim), frame=washFrame(sim);
  assert.ok([...frame.buckets.values()].every(b=>b.marks.every(m=>!(m.code&16)))); assert.deepEqual(sim,before);
});
