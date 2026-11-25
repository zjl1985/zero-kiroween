import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSim,
  snapshot,
  startBossAttack,
  step,
  bossEnemy,
  livingEnemies,
} from "../dist/game/sim.js";
import { BOSS, CRUMPLE, ELITE, ENEMIES, HORDE, PHASE_AT, WAVES } from "../dist/game/enemies.js";
import { CHEST } from "../dist/game/interactions.js";
import { STATS } from "../dist/game/types.js";
import { SCREEN, WORLD, insideWorld, viewCentre } from "../dist/game/world-gen.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
const idle = { ax: 0, ay: 0, dash: false, choose: 0 };
const NIGHT = STATS.sessionSeconds;

/** Runs a sturdy cat so the night keeps going; records every kind that spawns. */
function survive(seed, seconds, cat = "zero") {
  const s = createSim({ cat, seed, sessionSeconds: NIGHT }),
    seen = new Map();
  while (s.elapsed < seconds && s.ended === "playing") {
    s.player.hp = s.player.maxHp;
    step(s, idle, DT);
    for (const e of s.enemies)
      if (!seen.has(e.id)) seen.set(e.id, { kind: e.kind, at: s.elapsed, elite: !!e.elite });
  }
  return { s, seen: [...seen.values()] };
}
function quietBoss(seed = 7) {
  const s = createSim({ cat: "zero", seed, sessionSeconds: NIGHT });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.wavesDone = WAVES.length;
  s.elitesDone = 1e3;
  s.elapsed = BOSS.spawnAt * s.sessionSeconds - 0.05;
  return s;
}
function untilBoss(s) {
  for (let i = 0; i < 60 && !s.boss.spawned; i++) step(s, idle, DT);
  return bossEnemy(s);
}

test("the night lasts 600 s and the Eraser is due at 540 s", () => {
  assert.equal(STATS.sessionSeconds, 600);
  assert.equal(Math.round(BOSS.spawnAt * STATS.sessionSeconds), 540);
  assert.equal(HORDE.hardCap, 100);
  assert.ok(HORDE.capByMinute.every((c) => c <= HORDE.hardCap));
});

test("phase 0 introduces Kiro ghosts among ink blobs", () => {
  const { seen } = survive(11, PHASE_AT[0] * NIGHT - 1);
  assert.ok(seen.length > 3);
  assert.ok(seen.every((e) => ["ink-blob", "kiro-ghost"].includes(e.kind)));
  assert.ok(seen.some((e) => e.kind === "kiro-ghost"));
});

test("later phases bring bats, crumples and smudges, deterministically", () => {
  const a = survive(11, 300),
    b = survive(11, 300);
  const kinds = new Set(a.seen.filter((e) => !e.elite).map((e) => e.kind));
  for (const k of ["paper-bat", "crumple", "smudge"]) assert.ok(kinds.has(k), k);
  assert.ok(
    a.seen.filter((e) => e.kind === "paper-bat").every((e) => e.at >= PHASE_AT[0] * NIGHT),
  );
  assert.deepEqual(a.seen, b.seen);
  assert.deepEqual(snapshot(a.s), snapshot(b.s));
});

test("the living crowd ramps up over the night and never passes the hard cap", () => {
  const s = createSim({ cat: "zero", seed: 21, sessionSeconds: NIGHT });
  let peak = 0,
    early = 0,
    late = 0;
  while (s.ended === "playing") {
    // A sturdy cat that keeps strolling, so the night runs its whole length.
    s.player.hp = s.player.maxHp;
    s.player.invuln = 1;
    step(s, { ax: Math.sin(s.elapsed / 7), ay: Math.cos(s.elapsed / 9), dash: false, choose: 0 }, DT);
    const living = livingEnemies(s);
    assert.ok(living <= HORDE.hardCap, `${living} alive at ${s.elapsed.toFixed(1)} s`);
    peak = Math.max(peak, living);
    if (s.elapsed < 60) early = Math.max(early, living);
    if (s.elapsed > 480) late = Math.max(late, living);
  }
  // The night ran to dawn; with the Eraser still loose that is the boss-escaped loss.
  assert.equal(s.timeLeft, 0);
  assert.equal(s.endReason, bossEnemy(s) ? "boss-escaped" : "dawn");
  assert.ok(late > early * 2, `early ${early}, late ${late}`);
  assert.ok(late >= 60, `late peak ${late}`);
  assert.ok(peak <= HORDE.hardCap);
});

test("elites spawn on their timer, crowned and tougher, and drop a chest", () => {
  const s = createSim({ cat: "zero", seed: 4, sessionSeconds: NIGHT });
  s.spawnTimer = 1e6;
  s.wavesDone = WAVES.length;
  s.elapsed = ELITE.first - 0.05;
  for (let i = 0; i < 10 && !s.enemies.some((e) => e.elite); i++) {
    s.player.hp = s.player.maxHp;
    step(s, idle, DT);
  }
  const elite = s.enemies.find((e) => e.elite);
  assert.ok(elite, "an elite arrived");
  assert.ok(s.elapsed >= ELITE.first);
  assert.equal(s.elitesDone, 1);
  assert.equal(elite.kind, ELITE.kinds[0]);
  assert.ok(elite.radius > ENEMIES[elite.kind].radius);
  assert.ok(elite.maxHp >= ENEMIES[elite.kind].hp * ELITE.hpMul);
  assert.ok(insideWorld(elite.x, elite.y));
  // Defeat it next to the cat.
  elite.spawnTime = 0;
  elite.hp = 0.1;
  elite.x = s.player.x + 40;
  elite.y = s.player.y;
  s.shots.push({ id: 999, x: elite.x, y: elite.y, vx: 0, vy: 0, life: 1, alive: true });
  step(s, idle, DT);
  assert.equal(elite.alive, false);
  assert.equal(s.chests.length, 1);
  assert.equal(s.chests[0].big, false);
  assert.equal(s.stats.elitesDefeated, 1);
  // The next slot comes ELITE.every seconds later.
  s.enemies = [];
  s.elapsed = ELITE.first + ELITE.every - 0.05;
  for (let i = 0; i < 10 && s.elitesDone < 2; i++) step(s, idle, DT);
  assert.equal(s.elitesDone, 2);
  assert.equal(s.enemies.filter((e) => e.elite).length, 1);
});

test("touching a chest without a ready evolution levels up an owned item at once", () => {
  const s = createSim({ cat: "nicole", seed: 8, sessionSeconds: NIGHT });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.chests.push({ id: s.nextChestId++, x: s.player.x + 4, y: s.player.y, big: false, alive: true, age: CHEST.settle });
  const level = s.level,
    xp = s.xp,
    taken = s.stats.upgradesTaken,
    before = s.upgrades["moon-stars"];
  step(s, idle, DT);
  assert.equal(s.chests.length, 0);
  assert.equal(s.stats.chestsOpened, 1);
  // No card: the only owned item, the starting weapon, gained a level.
  assert.equal(s.pendingChoice, null);
  assert.equal(s.upgrades["moon-stars"], before + CHEST.levels);
  assert.equal(s.stats.upgradesTaken, taken + CHEST.levels);
  assert.equal(s.chestReveal.items.length, CHEST.levels);
  assert.deepEqual(
    s.chestReveal.items,
    Array.from({ length: CHEST.levels }, (_, i) => ({ id: "moon-stars", level: before + i + 1 })),
  );
  assert.equal(s.chestReveal.evolved, null);
  // No XP was spent and no level was gained.
  assert.equal(s.level, level);
  assert.equal(s.xp, xp);
});

test("a Boss chest grants several levels", () => {
  const s = createSim({ cat: "zero", seed: 8, sessionSeconds: NIGHT });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.chests.push({ id: s.nextChestId++, x: s.player.x, y: s.player.y, big: true, alive: true, age: 1 });
  step(s, idle, DT);
  assert.equal(s.pendingChoice, null);
  assert.equal(s.stats.upgradesTaken, CHEST.bigLevels);
  assert.equal(s.chestReveal.items.length, CHEST.bigLevels);
  assert.equal(s.chestReveal.big, true);
});

test("the Eraser enters outside the view, inside the map, wherever the cat is, and hunts it", () => {
  for (const at of [
    { x: 480, y: 400 },
    { x: WORLD.minX + 120, y: WORLD.maxY - 120 },
    { x: WORLD.maxX - 300, y: 2600 },
  ]) {
    const s = quietBoss(12);
    Object.assign(s.player, at);
    const boss = untilBoss(s);
    assert.ok(boss, "the Boss spawned");
    assert.ok(s.elapsed >= 540 - DT);
    const c = viewCentre(s.player.x, s.player.y);
    assert.ok(
      Math.abs(boss.x - c.x) >= SCREEN.width / 2 || Math.abs(boss.y - c.y) >= SCREEN.height / 2,
      `boss in view at ${boss.x},${boss.y}`,
    );
    assert.ok(insideWorld(boss.x, boss.y));
    const d0 = Math.hypot(boss.x - s.player.x, boss.y - s.player.y);
    for (let i = 0; i < 60 * 4; i++) {
      s.player.hp = s.player.maxHp;
      step(s, idle, DT);
    }
    const d1 = Math.hypot(boss.x - s.player.x, boss.y - s.player.y);
    assert.ok(d1 < d0, `closed from ${d0.toFixed(0)} to ${d1.toFixed(0)}`);
    assert.ok(insideWorld(boss.x, boss.y));
    // Run far away: the Eraser hunts across the map at its hunt speed.
    boss.act = null;
    boss.timer = 1e6;
    const away = s.player.x > 0 ? -1 : 1;
    s.player.x += away * 1200;
    const d2 = Math.hypot(boss.x - s.player.x, boss.y - s.player.y);
    for (let i = 0; i < 60 * 3; i++) step(s, idle, DT);
    const d3 = Math.hypot(boss.x - s.player.x, boss.y - s.player.y);
    assert.ok(d2 - d3 > BOSS.huntSpeed * 2.5, `hunted from ${d2.toFixed(0)} to ${d3.toFixed(0)}`);
    assert.ok(insideWorld(boss.x, boss.y));
  }
});

test("dawn at 600 s is a win", () => {
  const s = createSim({ cat: "zero", seed: 2, sessionSeconds: NIGHT });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.wavesDone = WAVES.length;
  s.elitesDone = 1e3;
  s.boss.spawned = true;
  s.elapsed = NIGHT - 0.5;
  s.timeLeft = 0.5;
  for (let i = 0; i < 60 && s.ended === "playing"; i++) step(s, idle, DT);
  assert.equal(s.ended, "won");
  assert.ok(s.elapsed >= NIGHT - 1e-6);
});

/** Steps to dawn (or an earlier end), keeping the cat alive. */
function toDawn(s) {
  s.elapsed = NIGHT - 0.5;
  s.timeLeft = 0.5;
  for (let i = 0; i < 120 && s.ended === "playing"; i++) {
    s.player.hp = s.player.maxHp;
    step(s, idle, DT);
  }
}

test("dawn with the Eraser still loose ends the night as a boss-escaped loss", () => {
  const s = quietBoss(9),
    boss = untilBoss(s);
  assert.ok(boss, "the Boss spawned");
  assert.equal(s.endReason, null);
  // Keep it far away so it cannot reach the cat before sunrise.
  boss.x = s.player.x + 2000;
  boss.timer = 1e6;
  toDawn(s);
  assert.equal(s.ended, "lost");
  assert.equal(s.endReason, "boss-escaped");
  assert.equal(s.timeLeft, 0);
  assert.equal(bossEnemy(s), boss);
  assert.equal(s.stats.bossDefeated, false);
});

test("dawn after the Eraser is worn down is a win, and its defeat does not end the night early", () => {
  const s = quietBoss(9),
    boss = untilBoss(s);
  assert.ok(boss);
  boss.spawnTime = 0;
  boss.hp = 0.1;
  boss.timer = 1e6;
  boss.x = s.player.x + 60;
  boss.y = s.player.y;
  s.shots.push({ id: 999, x: boss.x, y: boss.y, vx: 0, vy: 0, life: 1, alive: true });
  step(s, idle, DT);
  assert.equal(boss.alive, false);
  assert.equal(s.boss.defeated, true);
  assert.equal(s.ended, "playing");
  assert.equal(s.endReason, null);
  toDawn(s);
  assert.equal(s.ended, "won");
  assert.equal(s.endReason, "dawn");
});

test("falling before dawn ends the night with the fallen reason", () => {
  const s = createSim({ cat: "zero", seed: 2, sessionSeconds: NIGHT });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.player.hp = 1;
  s.player.invuln = 0;
  s.player.shield = 0;
  s.enemies.push({
    id: s.nextEnemyId++, kind: "ink-blob", x: s.player.x, y: s.player.y,
    hp: 500, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0,
  });
  for (let i = 0; i < 120 && s.ended === "playing"; i++) step(s, idle, DT);
  assert.equal(s.ended, "lost");
  assert.equal(s.endReason, "fallen");
  assert.ok(s.timeLeft > 0);
});

test("a full 600 s night steps in node within a generous budget", () => {
  const s = createSim({ cat: "nicole", seed: 5, sessionSeconds: NIGHT }),
    t0 = performance.now();
  while (s.ended === "playing") {
    s.player.hp = s.player.maxHp;
    s.player.invuln = 1;
    step(s, { ax: Math.cos(s.elapsed / 5), ay: Math.sin(s.elapsed / 6), dash: s.elapsed % 7 < DT, choose: 0 }, DT);
  }
  const ms = performance.now() - t0;
  assert.equal(s.timeLeft, 0);
  assert.equal(s.endReason, bossEnemy(s) ? "boss-escaped" : "dawn");
  assert.ok(ms < 20000, `took ${ms.toFixed(0)} ms`);
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

test("Kiro ghost glide approaches without RNG and its actor clock pauses under stun", async () => {
  const { KIRO_GHOST_DEF } = await import("../dist/defs/enemies/kiro-ghost/def.js");
  const { GHOST_GLIDE } = await import("../dist/defs/enemies/behaviours.js");
  const s = createSim({ cat: "zero", seed: 7 });
  s.spawnTimer = 1e6;
  const e = { id: 901, kind: "kiro-ghost", x: s.player.x + 200, y: s.player.y,
    hp: 100, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, stun: 1 };
  KIRO_GHOST_DEF.onSpawn(e, s);
  s.enemies = [e];
  const timer = e.timer;
  step(s, idle, DT);
  assert.equal(e.timer, timer);
  e.stun = 0;
  step(s, idle, DT);
  assert.notEqual(e.timer, timer);
  assert.ok(e.x < s.player.x + 200, "glides toward the cat");
  let min = Infinity, max = 0;
  for (let i = 0; i < 240; i++) {
    const move = { dx: -42 * DT, dy: 0, dt: DT };
    GHOST_GLIDE.steer(s, e, move);
    assert.ok(move.dx < 0 && move.dy === 0, "pulse preserves approach direction");
    min = Math.min(min, -move.dx / DT);
    max = Math.max(max, -move.dx / DT);
  }
  assert.ok(min < 30 && max > 60, "alternates gathering and gliding");
});
