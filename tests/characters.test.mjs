import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSim,
  bossEnemy,
  step,
  orbitPositions,
  snapshot,
  nightPhase,
} from "../dist/game/sim.js";
import { CHARACTERS as C } from "../dist/game/characters.js";
import { HORDE } from "../dist/game/enemies.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
const idle = { ax: 0, ay: 0, dash: false };
function quiet(cat = "zero") {
  const s = createSim({ cat, seed: 45 });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.player.x = 480;
  s.player.y = 360;
  s.stroke.ink = 1;
  return s;
}
function enemy(s, x, y, hp = 30) {
  const e = {
    id: s.nextEnemyId++,
    kind: "ink-blob",
    x,
    y,
    hp,
    alive: true,
    spawnTime: 0,
    slowTime: 0,
    orbitCooldown: 0,
  };
  s.enemies.push(e);
  return e;
}
function advance(s, count, input = idle) {
  for (let i = 0; i < count; i++) step(s, input, DT);
}

test("different health and movement profiles affect real simulation", () => {
  const z = quiet("zero"),
    n = quiet("nicole");
  advance(z, 60, { ax: 1, ay: 0, dash: false });
  advance(n, 60, { ax: 1, ay: 0, dash: false });
  assert.equal(z.player.maxHp, 4);
  assert.equal(n.player.maxHp, 6);
  assert.ok(z.player.x - n.player.x > 25);
  assert.equal("partner" in z, false);
  assert.equal("partner" in n, false);
});
test("only Zero fires aimed bolts; Nicole attacks with three moving stars", () => {
  const z = quiet("zero"),
    n = quiet("nicole");
  enemy(z, 600, 360);
  enemy(n, 600, 360);
  advance(z, 20);
  advance(n, 20);
  assert.ok(z.shots.length > 0);
  assert.equal(n.shots.length, 0);
  assert.equal(orbitPositions(n).length, 3);
  const a = orbitPositions(n);
  advance(n, 10);
  assert.notDeepEqual(a, orbitPositions(n));
});
test("Zero dash creates an attracting decoy and a timed rapid-fire window", () => {
  const s = quiet(),
    e = enemy(s, 515, 360, 99);
  step(s, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(s.decoy.live, true);
  assert.equal(s.player.empowerTime, C.zero.empowerDuration);
  assert.ok(s.shots[0].empowered);
  advance(s, 15);
  const before = e.x;
  step(s, idle, DT);
  assert.ok(
    e.x < before,
    "enemy goes back toward the decoy, away from the escaped player",
  );
  advance(s, 120);
  assert.equal(s.decoy.live, false);
  assert.equal(s.player.empowerTime, 0);
});
test("empowered bolts hit exactly two distinct targets and do not hit one target every frame", () => {
  for (const empowered of [false, true]) {
    const s = quiet();
    s.player.x = 200;
    s.player.attackCooldown = 100;
    const a = enemy(s, 340, 360, 3),
      b = enemy(s, 380, 360, 3),
      c = enemy(s, 420, 360, 3);
    s.shots.push({
      id: 1,
      x: 300,
      y: 360,
      vx: 370,
      vy: 0,
      life: 0.6,
      alive: true,
      empowered,
      hits: [],
    });
    advance(s, 25);
    assert.equal(a.hp, 2);
    assert.equal(b.hp, empowered ? 2 : 3);
    assert.equal(c.hp, 3);
  }
});
test("orbit damage respects a per-enemy hit cooldown even with continuous overlap", () => {
  const s = quiet("nicole"),
    e = enemy(s, 527, 360, 99);
  for (let i = 0; i < 12; i++) {
    const p = orbitPositions(s)[0];
    e.x = p.x;
    e.y = p.y;
    step(s, idle, DT);
  }
  assert.equal(e.hp, 99 - C.nicole.orbitDamage);
  advance(s, 35);
  const p = orbitPositions(s)[0];
  e.x = p.x;
  e.y = p.y;
  step(s, idle, DT);
  assert.ok(e.hp <= 99 - C.nicole.orbitDamage * 2);
});
test("Moonfold produces a field and shield, never a decoy or empowered bolts", () => {
  const s = quiet("nicole");
  step(s, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(s.decoy.live, false);
  assert.equal(s.player.empowerTime, 0);
  assert.equal(s.fields.length, 1);
  assert.equal(s.player.shield, C.nicole.shieldCharges);
  assert.equal(s.player.dashCooldown, C.nicole.cooldown);
  advance(s, 300);
  assert.equal(s.fields.length, 0);
  assert.equal(s.player.shield, 0);
});
test("Moonfold field actually slows enemies and the effect expires", () => {
  const slow = quiet("nicole"),
    normal = quiet("nicole");
  for (const s of [slow, normal]) {
    s.player.x = 700;
    s.player.y = 360;
  }
  const a = enemy(slow, 480, 360),
    b = enemy(normal, 480, 360);
  slow.fields.push({ x: 480, y: 360, life: 0.1 });
  step(slow, idle, DT);
  step(normal, idle, DT);
  assert.ok(a.x - 480 < (b.x - 480) * 0.5);
  assert.ok(a.slowTime > 0);
  advance(slow, 30);
  assert.equal(a.slowTime, 0);
  assert.equal(slow.fields.length, 0);
});
test("a shield blocks one hit, consumes a charge, and cannot absorb forever", () => {
  const s = quiet("nicole"),
    e = enemy(s, 490, 360);
  s.player.shield = 1;
  s.player.shieldTime = 3;
  step(s, idle, DT);
  assert.equal(s.player.hp, 6);
  assert.equal(s.player.shield, 0);
  assert.equal(s.stats.shieldBlocks, 1);
  s.player.invuln = 0;
  e.x = s.player.x + 5;
  e.y = s.player.y;
  step(s, idle, DT);
  assert.equal(s.player.hp, 5);
  s.player.invuln = 0;
  s.player.shield = 1;
  s.player.shieldTime = 0.001;
  e.x = s.player.x + 5;
  e.y = s.player.y;
  step(s, idle, DT);
  assert.equal(s.player.hp, 4);
});
test("Nicole emergency protection triggers once per run and does not resurrect a dead cat", () => {
  const s = quiet("nicole"),
    e = enemy(s, 490, 360);
  s.player.hp = 3;
  const collide = () => {
    s.player.invuln = 0;
    e.x = s.player.x + 5;
    e.y = s.player.y;
    step(s, idle, DT);
  };
  collide();
  assert.equal(s.player.hp, 2);
  assert.equal(s.player.rescueUsed, true);
  assert.equal(s.player.shield, 2);
  collide();
  collide();
  assert.equal(s.player.hp, 2);
  assert.equal(s.player.shield, 0);
  collide();
  assert.equal(s.player.hp, 1);
  assert.equal(s.player.shield, 0);
  collide();
  assert.equal(s.ended, "lost");
  assert.equal(s.player.hp, 0);
  const before = snapshot(s);
  advance(s, 30);
  assert.deepEqual(snapshot(s), before);
});
test("repeated ability inputs respect each character cooldown", () => {
  const z = quiet(),
    n = quiet("nicole");
  advance(z, 200, { ax: 0, ay: 0, dash: true });
  advance(n, 200, { ax: 0, ay: 0, dash: true });
  assert.equal(z.stats.skillUses, 2);
  assert.equal(n.stats.skillUses, 1);
});
test("a full night reaches dawn once, with finite state and enemies under the hard cap", () => {
  for (const cat of ["zero", "nicole"]) {
    const s = createSim({ cat, seed: 37 });
    s.player.invuln = 1e6;
    // Level-up cards freeze the night; the bot always takes the first card.
    for (let i = 0; i < 80000 && s.ended === "playing"; i++) {
      step(s, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
      assert.ok(s.enemies.length <= HORDE.hardCap);
      assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.y));
    }
    // An idle, invulnerable cat never wears the Eraser down, so dawn ends the
    // night as the boss-escaped loss whenever the Boss is still on the page.
    const escaped = bossEnemy(s) !== undefined;
    assert.equal(s.ended, escaped ? "lost" : "won");
    assert.equal(s.endReason, escaped ? "boss-escaped" : "dawn");
    assert.equal(s.timeLeft, 0);
    assert.equal(nightPhase(s), 3);
    const before = snapshot(s);
    advance(s, 30);
    assert.deepEqual(snapshot(s), before);
  }
});
