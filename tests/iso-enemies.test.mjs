import assert from "node:assert/strict";
import { test } from "node:test";
import { ENEMY_ART } from "../dist/render/art-index.js";
import { ENEMY_DEFS } from "../dist/defs/registries.js";
import { ELITE } from "../dist/defs/horde.js";
import { decodeRuns, genImage, genSprite, genSpriteCacheKeys } from "../dist/render/iso/gen-sprites.js";
import { SCENERY_PALETTE } from "../dist/render/iso/gen/scenery-pixels.js";
import { ISO_COLOUR_CAP } from "../dist/render/iso/palette.js";
import { ISO } from "../dist/render/iso/projection.js";
import { drawEnemyPuppet, enemyPose } from "../dist/render/iso/enemy-puppets.js";
import { puppetSprite } from "../dist/render/iso/puppet.js";
import { ISO_DIRS, ISO_SPRITE, clearIsoDirections, isoMotion, isoMotionMemorySize } from "../dist/render/iso/sprite-sheet.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { createSim } from "../dist/game/sim.js";
import { drawWorld } from "../dist/render/world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";

test("every registered enemy and available elite bakes each pose in four directions", () => {
  assert.ok(SCENERY_PALETTE.length <= ISO_COLOUR_CAP);
  for (const def of ENEMY_DEFS.all()) {
    const p = ENEMY_ART.get(def.id).puppet;
    assert.ok(p, def.id);
    assert.equal(!!p.elite, ELITE.kinds.includes(def.id), def.id);
    for (const puppet of p.elite ? [p, p.elite] : [p]) {
      const r = def.stats.radius * (puppet === p ? 1 : ELITE.radiusMul);
      assert.deepEqual(
        [puppet.frames.idle, puppet.frames.walk, puppet.frames.hurt], [2, 4, 1],
      );
      assert.ok(puppet.halfWidth > 0 && puppet.halfWidth <= r * 1.5);
      assert.ok(puppet.top + puppet.bottom <= r * 3.6);
      assert.ok(Math.abs(puppet.shadow[0] - r * Math.SQRT2 * ISO.k) < 2);
      assert.ok(puppet.crown >= puppet.top + 2);
      for (const dir of ISO_DIRS) for (const [anim, count] of Object.entries(puppet.frames)) {
        for (let f = 0; f < count; f++) {
          const id = puppetSprite(puppet, dir, anim, f), s = genSprite(id);
          assert.ok(s, id);
          const pixels = decodeRuns(s.data, s.w * s.h);
          assert.ok(pixels.some((p) => p > 0) && pixels.every((p) => p < SCENERY_PALETTE.length), id);
          assert.ok(s.ay <= puppet.top && s.h - s.ay <= puppet.bottom, id);
        }
      }
    }
  }
  assert.ok(genSprite("crown-elite"));
  assert.ok(genSprite("shot-ink"));
  assert.ok(genSprite("shot-water"));
});

test("isoMotion is render-only, bounded and reports a step for a short while", () => {
  clearIsoDirections();
  assert.deepEqual(isoMotion("m", 0, 0, 1), { vx: 0, vy: 0, moving: false });
  assert.deepEqual(isoMotion("m", 3, -1, 1.01), { vx: 3, vy: -1, moving: true });
  assert.deepEqual(isoMotion("m", 3, -1, 1.05), { vx: 3, vy: -1, moving: true });
  assert.equal(isoMotion("m", 3, -1, 1.01 + ISO_SPRITE.moving + 0.01).moving, false);
  for (let i = 0; i < ISO_SPRITE.memoryLimit * 2; i++) isoMotion(i, i, 0, 0);
  assert.equal(isoMotionMemorySize(), ISO_SPRITE.memoryLimit);
  clearIsoDirections();
  assert.equal(isoMotionMemorySize(), 0);
});

// ------------------------------------------------------------- drawing
class Path { constructor() { this.ops = []; } }
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
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  clearWorldRenderCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(() => { clearSpriteCache(); clearWorldRenderCache(); });
}
function enemy(over = {}) {
  return { id: 7, kind: "ink-blob", x: 100, y: 50, hp: 3, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, ...over };
}

test("release poses persist briefly after a lob or Boss attack; hurt and stun remain legible", () => {
  const lob = enemy({ kind: "smudge", windup: 0.1 });
  const sp = ENEMY_ART.get(lob.kind).puppet;
  assert.deepEqual(enemyPose(lob, sp, 1, false, false), { anim: "attack", frame: 0 });
  lob.windup = 0;
  assert.deepEqual(enemyPose(lob, sp, 1.1, true, false), { anim: "attack", frame: 1 });
  assert.equal(enemyPose(lob, sp, 1.4, true, false).anim, "walk");
  lob.stun = 1;
  assert.deepEqual(enemyPose(lob, sp, 1.5, true, false), { anim: "idle", frame: 0 });
  lob.hitFlash = 0.14;
  assert.deepEqual(enemyPose(lob, sp, 1.6, false, false), { anim: "hurt", frame: 0 });

  const boss = enemy({ kind: "eraser-boss", act: { kind: "charge", t: 1, run: 0 } });
  const bp = ENEMY_ART.get(boss.kind).puppet;
  assert.deepEqual(enemyPose(boss, bp, 1, false, false), { anim: "charge", frame: 0 });
  boss.act.t = 0;
  boss.act.run = 0.5;
  assert.deepEqual(enemyPose(boss, bp, 1.2, true, false), { anim: "charge", frame: 1 });
  boss.act = null;
  assert.deepEqual(enemyPose(boss, bp, 1.6, true, true), { anim: "charge", frame: 0 });
  assert.equal(enemyPose(boss, bp, 1.9, true, false).anim, "walk");
});

test("the enemy stamps the selected baked frame at the projected foot", (t) => {
  environment(t);
  const e = enemy(), look = { x: 0, y: 200 }, p = ENEMY_ART.get(e.kind).puppet;
  const ctx = canvas().getContext("2d");
  drawEnemyPuppet(ctx, p, e, 1, look, true);
  const key = genSpriteCacheKeys().find((k) => k.startsWith("enemy-ink-blob-sw-idle") && k.endsWith("|pencil"));
  assert.ok(key);
  const s = genSprite(key.split("|")[0]), call = ctx.calls.find((c) => c.op === "drawImage" && c.args[0] === genImage(key.split("|")[0], "pencil"));
  assert.deepEqual(call.args.slice(1), [25 - s.ax, 38 - s.ay]);
  e.y -= 1;
  e.hitFlash = 0.14;
  drawEnemyPuppet(ctx, p, e, 1.05, look, false);
  assert.ok(genSpriteCacheKeys().includes("enemy-ink-blob-ne-hurt-0|flash"));
});

test("the world draws native bodies, an elite crown and both drops without touching the sim", (t) => {
  environment(t);
  const sim = createSim({ seed: 2026 });
  const { x, y } = sim.player;
  sim.enemies.push(
    enemy({ id: 900, x: x + 60, y }),
    enemy({ id: 901, x: x - 60, y, elite: true }),
    enemy({ id: 902, kind: "paper-bat", x, y: y + 60 }),
    enemy({ id: 903, kind: "crumple", x: x + 30, y, spawnTime: 0.4 }),
  );
  for (const kind of [undefined, "water"]) sim.enemyShots.push({
    id: sim.enemyShots.length, x0: x, y0: y, tx: x + 50, ty: y, t: 0.4, flight: 1, alive: true, kind,
  });
  const before = structuredClone(sim);
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0.35, camera: createIsoCamera(480, 270, sim.player), reducedMotion: true });
  assert.deepEqual(sim, before);
  const keys = genSpriteCacheKeys();
  for (const id of ["enemy-ink-blob-", "enemy-ink-blob@elite-", "enemy-paper-bat-", "crown-elite", "shot-ink", "shot-water"]) {
    const key = keys.find((k) => k.startsWith(id));
    assert.ok(key, id);
    assert.ok(ctx.calls.some((c) => c.op === "drawImage" && c.args[0] === genImage(key)), key);
  }
  assert.ok(!keys.some((k) => k.startsWith("enemy-crumple-")), "spawn pad precedes the body");
});
