import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSim,
  snapshot,
  startBossAttack,
  step,
  bossEnemy,
} from "../dist/game/sim.js";
import { BOSS, CRUMPLE, ENEMIES, WAVES } from "../dist/game/enemies.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
const idle = { ax: 0, ay: 0, dash: false, choose: 0 };

/** Runs a sturdy cat so the night keeps going; records every kind that spawns. */
function survive(seed, seconds, cat = "zero") {
  const s = createSim({ cat, seed, sessionSeconds: 300 }),
    seen = new Map();
  while (s.elapsed < seconds && s.ended === "playing") {
    s.player.hp = s.player.maxHp;
    step(s, idle, DT);
    for (const e of s.enemies)
      if (!seen.has(e.id)) seen.set(e.id, { kind: e.kind, at: s.elapsed });
  }
  return { s, seen: [...seen.values()] };
}
function quietBoss(seed = 7) {
  const s = createSim({ cat: "zero", seed, sessionSeconds: 300 });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.wavesDone = WAVES.length;
  s.elapsed = BOSS.spawnAt * s.sessionSeconds - 0.05;
  return s;
}
function untilBoss(s) {
  for (let i = 0; i < 60 && !s.boss.spawned; i++) step(s, idle, DT);
  return bossEnemy(s);
}

test("phase 0 spawns only ink blobs", () => {
  const { seen } = survive(11, 59);
  assert.ok(seen.length > 3);
  assert.ok(seen.every((e) => e.kind === "ink-blob"));
});

test("later phases bring bats, crumples and smudges, deterministically", () => {
  const a = survive(11, 230),
    b = survive(11, 230);
  const kinds = new Set(a.seen.map((e) => e.kind));
  for (const k of ["paper-bat", "crumple", "smudge"]) assert.ok(kinds.has(k), k);
  assert.ok(
    a.seen.filter((e) => e.kind === "paper-bat").every((e) => e.at >= 60),
  );
  assert.deepEqual(a.seen, b.seen);
  assert.deepEqual(snapshot(a.s), snapshot(b.s));
});

test("a crumpled ball splits into two small blobs on defeat", () => {
  const s = createSim({ cat: "zero", seed: 3, sessionSeconds: 300 });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.player.x = 480;
  s.player.y = 400;
  s.enemies.push({
    id: s.nextEnemyId++,
    kind: "crumple",
    x: 600,
    y: 400,
    hp: 0.5,
    alive: true,
    spawnTime: 0,
    slowTime: 0,
    orbitCooldown: 0,
  });
  for (let i = 0; i < 120 && s.enemies.some((e) => e.kind === "crumple"); i++)
    step(s, idle, DT);
  assert.equal(s.enemies.filter((e) => e.kind === "crumple").length, 0);
  const blobs = s.enemies.filter((e) => e.kind === "ink-blob");
  assert.equal(blobs.length, CRUMPLE.splitCount);
  assert.ok(blobs.every((e) => e.maxHp === CRUMPLE.splitHp));
  assert.equal(s.pickups.at(-1).value, ENEMIES.crumple.xp);
});

test("the Eraser arrives exactly once at its scheduled time", () => {
  const s = quietBoss();
  assert.equal(s.boss.spawned, false);
  let spawns = 0;
  for (let i = 0; i < 600; i++) {
    const before = s.boss.spawned;
    s.player.hp = s.player.maxHp;
    step(s, idle, DT);
    if (!before && s.boss.spawned) {
      spawns++;
      assert.ok(s.elapsed >= BOSS.spawnAt * s.sessionSeconds);
      assert.equal(s.notice.kind, "boss-incoming");
    }
  }
  assert.equal(spawns, 1);
  assert.equal(
    s.enemies.filter((e) => e.kind === "eraser-boss").length +
      (s.boss.defeated ? 1 : 0),
    1,
  );
});

function sweepSetup(playerY) {
  const s = quietBoss(5);
  const boss = untilBoss(s);
  boss.spawnTime = 0;
  boss.x = 420;
  boss.y = 400;
  s.player.x = 560;
  s.player.y = 400;
  s.player.invuln = 0;
  s.stroke.points = [{ x: 570, y: 425 }];
  s.stroke.ink = 1;
  s.stroke.blankTime = 0;
  const act = startBossAttack(s, boss, "sweep");
  s.player.y = playerY;
  return { s, act };
}
function resolve(s, act) {
  for (let i = 0; i < 120 && act.t > 0; i++) step(s, idle, DT);
}

test("the erase sweep blanks the ink line and hurts a cat inside it", () => {
  const { s, act } = sweepSetup(400);
  const hp = s.player.hp;
  resolve(s, act);
  assert.ok(act.t <= 0);
  assert.equal(s.stroke.ink, 0);
  assert.equal(s.player.hp, hp - BOSS.sweep.damage);
});

test("the erase sweep spares a cat outside the dashed outline", () => {
  const { s, act } = sweepSetup(500);
  s.stroke.points = [{ x: 560, y: 500 }];
  const hp = s.player.hp;
  resolve(s, act);
  assert.equal(s.player.hp, hp);
  assert.ok(s.stroke.ink > 0);
});

test("defeating the Eraser drops a large XP reward", () => {
  const s = quietBoss(9);
  const boss = untilBoss(s);
  boss.spawnTime = 0;
  boss.hp = 0.1;
  boss.x = s.player.x + 90;
  boss.y = s.player.y;
  for (let i = 0; i < 120 && !s.boss.defeated; i++) step(s, idle, DT);
  assert.equal(s.stats.bossDefeated, true);
  assert.equal(
    s.pickups.reduce((sum, p) => sum + p.value, 0) >= BOSS.rewardShards * BOSS.rewardValue,
    true,
  );
});
