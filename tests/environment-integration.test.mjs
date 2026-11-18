import assert from "node:assert/strict";
import { test } from "node:test";
import { t } from "../dist/content/i18n.js";
import { FIRE } from "../dist/defs/fire.js";
import { BOSS } from "../dist/defs/enemies/eraser-boss/def.js";
import { SMUDGE } from "../dist/defs/enemies/smudge/def.js";
import { WASH } from "../dist/defs/wash.js";
import { WATER } from "../dist/defs/water.js";
import { LANDMARK_DEFS } from "../dist/defs/index.js";
import { landmarkActivityPoint } from "../dist/defs/landmark-activities.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { applyElement, createSim, snapshot, spillWater, step } from "../dist/game/sim.js";
import { playerStats } from "../dist/game/stats.js";
import { landmarks } from "../dist/game/world-gen.js";
import { waterAt } from "../dist/game/water.js";
import { environmentCopy } from "../dist/ui/environment-copy.js";

const idle = { ax: 0, ay: 0, dash: false };
function quiet(cat = "zero") {
  const s = createSim({ cat, seed: 7 });
  s.enemies = [];
  s.spawnTimer = s.treatTimer = 1e9;
  s.wavesDone = s.elitesDone = 99;
  s.boss.spawned = true;
  s.build.weapons = [];
  s.build.passives = [];
  s.upgrades = {};
  s.player.x = 480;
  s.player.y = 420;
  return s;
}

for (const cat of ["zero", "nicole"]) test(`${cat}: the main step slows in shallow water and extinguishes before a due damage tick`, () => {
  const s = quiet(cat), hp = s.player.hp;
  Object.assign(s.player, { x: WATER.startBasin.x, y: WATER.startBasin.y, burnTime: FIRE.actorBurnTime, burnClock: FIRE.playerInterval - DT / 2 });
  assert.equal(waterAt(s.seed, s.player.x, s.player.y), "shallow");
  const speed = playerStats(s).speed;
  step(s, { ax: 1, ay: 0, dash: false }, DT);
  assert.equal(s.player.hp, hp);
  assert.equal(s.player.burnTime, 0);
  assert.equal(s.player.burnClock, 0);
  assert.equal(s.player.wetTime, FIRE.wetTime);
  assert.ok(Math.abs(s.player.vx - speed * WATER.shallowSlow) < 1e-8);
  assert.equal(s.notice.kind, "extinguished");
});

test("wet paper applies only its own slow outside the ink puddle's ellipse", () => {
  const halfHeight = SMUDGE.puddleRadius / SMUDGE.puddleAspect;
  for (const [distance, slow] of [[halfHeight - 0.1, SMUDGE.puddleSlow], [halfHeight + 0.1, WASH.wetSlow]]) {
    const s = quiet(), { x, y } = s.player, speed = playerStats(s).speed;
    assert.equal(waterAt(s.seed, x, y), "dry");
    spillWater(s, x, y, WASH.cell, 1, false);
    s.hazards = [{ id: 1, kind: "puddle", x, y: y + distance, radius: SMUDGE.puddleRadius, life: 3, maxLife: 3 }];
    step(s, { ax: 1, ay: 0, dash: false }, DT);
    assert.ok(Math.abs(s.player.vx - speed * slow) < 1e-8);
  }
});

test("water contact survives same-step knockback, even when that contact hit is fatal", () => {
  for (const hp of [1, 3]) {
    const s = quiet();
    Object.assign(s.player, { hp, invuln: 0, x: WATER.startBasin.x, y: WATER.startBasin.y + WATER.startBasin.ry - 4, burnTime: 2, burnClock: FIRE.playerInterval - DT / 2 });
    assert.equal(waterAt(s.seed, s.player.x, s.player.y), "shallow");
    s.enemies = [{ id: 900, kind: "ink-blob", x: s.player.x, y: s.player.y - 2, hp: 10, alive: true, spawnTime: 0, orbitCooldown: 0, slowTime: 0 }];
    step(s, idle, DT);
    assert.equal(waterAt(s.seed, s.player.x, s.player.y), "dry", "enemy knocked the cat back off the wet shelf");
    assert.equal(s.player.burnTime, 0, "the earlier water contact must not be lost");
    assert.equal(s.player.burnClock, 0);
    assert.ok(s.player.wetTime > 0);
    assert.equal(s.player.hp, hp - 1, "only contact damage, no extra fire tick");
    assert.equal(s.ended, hp === 1 ? "lost" : "playing");
  }
});

test("custom Boss charge steering obeys shallow-water movement speed", () => {
  const s = quiet(), x = WATER.startBasin.x, y = WATER.startBasin.y;
  const boss = { id: 900, kind: "eraser-boss", x, y, hp: 420, alive: true, spawnTime: 0, orbitCooldown: 0, slowTime: 0, timer: 10,
    act: { kind: "charge", t: 0, run: 1, x, y, dx: 1, dy: 0 } };
  s.enemies = [boss];
  s.boss.id = boss.id;
  step(s, idle, DT);
  assert.ok(Math.abs(boss.x - x - BOSS.charge.speed * DT * WATER.shallowSlow) < 1e-7);
  assert.equal(boss.y, y);
  assert.ok(boss.wetTime > 0);
});

test("element dispatch powers real landmark actions and integrates the wind rotor without spending RNG", () => {
  const s = quiet(), l = landmarks(s.seed).find((l) => l.kind === "paper-windmill"), p = landmarkActivityPoint(l);
  const rng = s.rngState;
  applyElement(s, p.x, p.y, 1, "wind", 2);
  applyElement(s, p.x, p.y, 1, "wind", 2);
  const event = s.landmarkEvents[l.id];
  assert.equal(event.activations, 1);
  assert.ok(event.cooldown > 0 && event.wind > 0);
  assert.equal(s.rngState, rng);
  const angle = event.turn;
  step(s, idle, DT);
  assert.ok(event.turn > angle, "motion comes from simulation state, not a cache key");
  s.pendingChoice = { options: [] };
  const paused = snapshot(s);
  step(s, idle, 1);
  assert.deepEqual(snapshot(s), paused, "upgrading pauses fire, regrowth, activities and the rotor");
});

test("localized hazard copy takes priority, and nearby courts explain their actual actions", () => {
  const s = quiet();
  for (const locale of ["zh", "en"]) {
    s.player.burnTime = 2.1;
    s.player.wetTime = 0;
    assert.deepEqual(environmentCopy(locale, s), {
      status: t(locale, "hud.burning", { seconds: 3 }), hint: t(locale, "hint.burning"), danger: true,
    });
    s.player.burnTime = 0;
    s.player.wetTime = 1;
    assert.equal(environmentCopy(locale, s).status, t(locale, "hud.wet", { seconds: 1 }));
    s.player.wetTime = 0;
    for (const l of landmarks(s.seed)) {
      const activity = LANDMARK_DEFS.get(l.kind).activity;
      if (!activity) continue;
      Object.assign(s.player, landmarkActivityPoint(l));
      assert.equal(environmentCopy(locale, s).hint, t(locale, `activity.${activity.notice}`));
      s.landmarkEvents[l.id] = { progress: 0, cooldown: 2.5, activations: 1, wind: 0 };
      assert.equal(environmentCopy(locale, s).hint, t(locale, "activity.cooldown", { name: t(locale, `landmark.${l.kind}`), seconds: 3 }));
      delete s.landmarkEvents[l.id];
    }
    Object.assign(s.player, { x: 480, y: 420 });
  }
});

test("death from contact cannot collect an overlapping shard and open an upgrade afterwards", () => {
  const s = quiet();
  s.player.hp = 1;
  s.player.invuln = 0;
  s.xp = s.xpToNext - 1;
  s.enemies = [{ id: 900, kind: "ink-blob", x: s.player.x, y: s.player.y, hp: 10, alive: true, spawnTime: 0, orbitCooldown: 0, slowTime: 0 }];
  s.pickups = [{ id: 901, x: s.player.x, y: s.player.y, value: 100, alive: true, age: 0 }];
  step(s, idle, DT);
  assert.equal(s.ended, "lost");
  assert.equal(s.pendingChoice, null);
  assert.equal(s.pickups[0].alive, true);
  assert.equal(s.stats.shardsCollected, 0);
});
