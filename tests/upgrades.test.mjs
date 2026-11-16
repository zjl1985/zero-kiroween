import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSim,
  step,
  chooseUpgrade,
  orbitPositions,
  snapshot,
} from "../dist/game/sim.js";
import {
  UPGRADES,
  UPGRADE_VALUES,
  XP,
  isEligible,
  playerStats,
  rollChoices,
  upgradeDef,
  xpForLevel,
} from "../dist/game/upgrades.js";
import { createRng } from "../dist/game/rng.js";
import { CHARACTERS as C } from "../dist/game/characters.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys } from "../dist/content/i18n.js";

const idle = { ax: 0, ay: 0, dash: false };
function quiet(cat = "zero", seed = 45) {
  const s = createSim({ cat, seed });
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
function feed(s, value) {
  s.pickups.push({ id: s.nextPickupId++, x: s.player.x, y: s.player.y, value, alive: true, age: 0 });
  step(s, idle, DT);
}

test("defeating an enemy drops an ink shard", () => {
  const s = quiet("zero");
  const e = enemy(s, 300, 330, 1);
  s.shots.push({ id: 99, x: e.x, y: e.y, vx: 0, vy: 0, life: 1, alive: true });
  step(s, idle, DT);
  assert.equal(e.alive, false);
  assert.equal(s.pickups.length, 1);
  assert.equal(s.pickups[0].value, XP.shardValue);
});

test("shards drift to the cat, grant XP and level up into three distinct valid cards", () => {
  const s = quiet("nicole");
  s.pickups.push({ id: 1, x: s.player.x + 40, y: s.player.y, value: xpForLevel(1), alive: true, age: 0 });
  for (let i = 0; i < 60 && !s.pendingChoice; i++) step(s, idle, DT);
  assert.equal(s.pickups.length, 0);
  assert.equal(s.level, 2);
  assert.ok(s.pendingChoice);
  const opts = s.pendingChoice.options;
  assert.equal(opts.length, 3);
  assert.equal(new Set(opts).size, 3);
  for (const id of opts) {
    const def = upgradeDef(id);
    assert.ok(def && (def.cat === "any" || def.cat === "nicole"));
    assert.ok(isEligible(s, def));
  }
});

test("while a choice is pending the night does not advance", () => {
  const s = quiet("zero");
  feed(s, xpForLevel(1));
  assert.ok(s.pendingChoice);
  const before = s.elapsed,
    time = s.timeLeft;
  for (let i = 0; i < 30; i++) step(s, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(s.elapsed, before);
  assert.equal(s.timeLeft, time);
  assert.equal(s.stats.skillUses, 0);
  step(s, { ...idle, choose: 1 }, DT);
  assert.equal(s.pendingChoice, null);
  assert.equal(s.stats.upgradesTaken, 1);
  step(s, idle, DT);
  assert.ok(s.elapsed > before);
});

test("chosen upgrades change real combat numbers", () => {
  const n = quiet("nicole");
  assert.equal(orbitPositions(n).length, C.nicole.orbitCount);
  n.pendingChoice = { options: ["extra-star"] };
  assert.equal(chooseUpgrade(n, 0), true);
  assert.equal(orbitPositions(n).length, C.nicole.orbitCount + 1);

  const z = quiet("zero");
  z.pendingChoice = { options: ["quick-draw"] };
  chooseUpgrade(z, 0);
  enemy(z, 560, 360);
  z.player.attackCooldown = 0;
  step(z, idle, DT);
  assert.ok(z.shots.length >= 1);
  const expected = C.zero.attackInterval * (1 - UPGRADE_VALUES["quick-draw"].interval);
  assert.ok(Math.abs(z.player.attackCooldown - (expected - 0)) < 1e-9);

  const v = quiet("zero");
  v.pendingChoice = { options: ["vitality"] };
  chooseUpgrade(v, 0);
  assert.equal(v.player.maxHp, C.zero.maxHp + 1);
});

test("evolutions are offered only after their prerequisites and always lead the hand", () => {
  for (const [cat, evo] of [["zero", "echo-legion"], ["nicole", "full-moon"]]) {
    const s = quiet(cat);
    const def = upgradeDef(evo);
    assert.equal(isEligible(s, def), false);
    for (let i = 0; i < 20; i++)
      assert.ok(!rollChoices(s, createRng(i + 1)).includes(evo));
    for (const r of def.requires) s.upgrades[r.id] = r.level;
    assert.equal(isEligible(s, def), true);
    assert.equal(rollChoices(s, createRng(7))[0], evo);
    s.pendingChoice = { options: [evo] };
    chooseUpgrade(s, 0);
    assert.equal(s.notice.kind, cat === "zero" ? "evolve-zero" : "evolve-nicole");
    assert.equal(isEligible(s, def), false);
  }
});

test("Echo Legion decoy fires bolts and bursts; Full Moon adds stars and pulses", () => {
  const z = quiet("zero");
  z.upgrades["echo-legion"] = 1;
  enemy(z, 600, 360);
  z.player.x = 700;
  step(z, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(z.decoy.time.toFixed(3), playerStats(z).decoyLife.toFixed(3));
  let echo = 0;
  for (let i = 0; i < 200 && z.decoy.live; i++) {
    step(z, idle, DT);
    echo = Math.max(echo, z.shots.filter((s) => s.echo).length);
  }
  assert.ok(echo > 0, "evolved decoy fired");
  assert.ok(z.impacts.some((e) => e.kind === "echo-burst") || z.stats.damageDealt > 0);

  const n = quiet("nicole");
  n.upgrades["full-moon"] = 1;
  assert.equal(orbitPositions(n).length, C.nicole.orbitCount + UPGRADE_VALUES["full-moon"].stars);
  const e = enemy(n, n.player.x + playerStats(n).orbitRadius + 20, n.player.y);
  n.pulseTimer = DT / 2;
  step(n, idle, DT);
  assert.ok(n.impacts.some((i) => i.kind === "moon-pulse"));
  assert.ok(e.hp < 30);
});

test("choices are deterministic for the same seed and inputs", () => {
  const run = () => {
    const s = createSim({ cat: "zero", seed: 77 });
    s.player.invuln = 1e6;
    const picks = [];
    for (let i = 0; i < 9000; i++) {
      if (s.pendingChoice) picks.push(s.pendingChoice.options.join(","));
      step(s, { ax: Math.sin(i / 90), ay: Math.cos(i / 70), dash: i % 200 === 0, choose: i % 3 }, DT);
    }
    return { picks, snap: snapshot(s) };
  };
  const a = run(),
    b = run();
  assert.ok(a.picks.length > 0, "the bot levelled up");
  assert.deepEqual(a.picks, b.picks);
  assert.deepEqual(a.snap, b.snap);
});

test("each cat is only ever offered its own pool", () => {
  for (const cat of ["zero", "nicole"]) {
    const other = cat === "zero" ? "nicole" : "zero";
    const s = quiet(cat);
    for (let seed = 1; seed < 200; seed++) {
      const opts = rollChoices(s, createRng(seed));
      if (!opts.length) break;
      for (const id of opts) assert.notEqual(upgradeDef(id).cat, other);
      // Grow the build so later rolls see deeper pools and evolutions.
      const pick = upgradeDef(opts[seed % opts.length]);
      s.upgrades[pick.id] = (s.upgrades[pick.id] ?? 0) + 1;
    }
  }
});

test("every upgrade has a name and description in both language packs", () => {
  for (const u of UPGRADES) {
    assert.ok(MESSAGE_KEYS.includes(`upgrade.${u.id}.name`));
    assert.ok(MESSAGE_KEYS.includes(`upgrade.${u.id}.desc`));
  }
  assert.deepEqual(missingKeys("zh"), []);
  assert.deepEqual(missingKeys("en"), []);
});
