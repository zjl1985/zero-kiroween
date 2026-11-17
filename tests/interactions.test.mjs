import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { FISH, MOON_LANTERN, PUMPKIN, PUMPKIN_SPOTS } from "../dist/game/interactions.js";
import { STATS } from "../dist/game/types.js";
import { LAMPS, YARD_PROPS } from "../dist/render/scene.js";
import { chunkContent, chunkOf, landmarks } from "../dist/game/world-gen.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
const idle = { ax: 0, ay: 0, dash: false, choose: 0 };

/** A quiet page: no regular spawns, no waves, no treats unless a test adds them. */
function quiet(cat = "nicole", seed = 4) {
  const s = createSim({ cat, seed, sessionSeconds: 300 });
  s.enemies = [];
  s.spawnTimer = 1e6;
  s.wavesDone = 99;
  s.treatTimer = 1e6;
  s.player.x = 480;
  s.player.y = 420;
  return s;
}
function addEnemy(s, x, y, hp = 10, kind = "ink-blob") {
  const e = {
    id: s.nextEnemyId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    alive: true,
    spawnTime: 0,
    slowTime: 0,
    orbitCooldown: 0,
  };
  s.enemies.push(e);
  return e;
}

test("interactive objects sit on the drawn pumpkins and lamps, in the yard and at landmarks", () => {
  for (const spot of PUMPKIN_SPOTS)
    assert.ok(
      YARD_PROPS.some(
        (p) => p.kind === "pumpkin" && p.x === spot.x && p.y === spot.y && p.s === spot.s,
      ),
    );
  assert.ok(LAMPS.some((l) => l.x === MOON_LANTERN.x && l.y === MOON_LANTERN.y));
  const s = createSim();
  const yard = (o) => o.x >= 0 && o.x <= 960 && o.y <= 540;
  assert.equal(s.interactables.filter((o) => o.kind === "pumpkin" && yard(o)).length, PUMPKIN_SPOTS.length);
  assert.equal(s.interactables.filter((o) => o.kind === "lantern" && yard(o)).length, 1);
  // Away from the yard, pumpkins come from pumpkin fields and windmills and
  // lanterns from moon hills, lantern markets, puppet theatres and wells,
  // each drawn by a matching decor prop.
  const pumpkinKinds = ["pumpkin-field", "paper-windmill"],
    lanternKinds = ["moon-hill", "lantern-market", "puppet-theatre", "wishing-well"];
  for (const seed of [1, 7, 20261116]) {
    let pumpkins = 0,
      lanterns = 0;
    for (const l of landmarks(seed)) {
      const { cx, cy } = chunkOf(l.x, l.y);
      const c = chunkContent(seed, cx, cy);
      for (const spot of c.spots) {
        assert.ok(Math.hypot(spot.x - l.x, spot.y - l.y) < l.radius);
        const prop = spot.kind === "pumpkin" ? "pumpkin" : "lamp";
        assert.ok(c.decor.some((d) => d.kind === prop && d.x === spot.x && d.y === spot.y && d.s === spot.s));
        if (spot.kind === "pumpkin") {
          pumpkins++;
          assert.ok(pumpkinKinds.includes(l.kind), l.kind);
        } else {
          lanterns++;
          assert.ok(lanternKinds.includes(l.kind), l.kind);
        }
      }
    }
    assert.ok(pumpkins >= 3 && lanterns >= 2, `seed ${seed}: ${pumpkins} pumpkins, ${lanterns} lanterns`);
  }
});

test("touching a pumpkin lights it and scorches a nearby enemy over time", () => {
  const s = quiet("nicole");
  const pumpkin = s.interactables.find((o) => o.kind === "pumpkin");
  // Keep Nicole's stars out of the way: stand on the pumpkin, enemy at aura edge.
  const e = addEnemy(s, pumpkin.x + PUMPKIN.auraRadius - 4, pumpkin.y, 50);
  s.player.x = pumpkin.x;
  s.player.y = pumpkin.y;
  step(s, idle, DT);
  assert.ok(pumpkin.lit > 0);
  assert.equal(s.stats.pumpkinsLit, 1);
  assert.equal(s.notice.kind, "pumpkin-lit");
  const hp0 = e.hp;
  s.player.x = 480;
  s.player.y = 470;
  for (let i = 0; i < 90; i++) {
    e.x = pumpkin.x + PUMPKIN.auraRadius - 4;
    e.y = pumpkin.y;
    step(s, idle, DT);
  }
  assert.ok(e.hp <= hp0 - 2 * PUMPKIN.damage, `hp ${e.hp}`);
  // It burns out and recharges before it can be lit again.
  for (let i = 0; i < Math.ceil(PUMPKIN.litTime / DT) + 2; i++) step(s, idle, DT);
  assert.equal(pumpkin.lit, 0);
  assert.ok(pumpkin.cooldown > 0);
});

test("a fish treat heals one heart and never exceeds max hp", () => {
  const s = quiet("zero");
  s.player.hp = s.player.maxHp - 1;
  s.treatTimer = DT / 2;
  step(s, idle, DT);
  assert.equal(s.treats.length, 1);
  assert.equal(s.notice.kind, "fish-treat");
  const t = s.treats[0];
  s.player.x = t.x;
  s.player.y = t.y;
  step(s, idle, DT);
  assert.equal(s.player.hp, s.player.maxHp);
  assert.equal(s.stats.treatsEaten, 1);
  assert.equal(s.treats.length, 0);
  // A second treat at full health stays capped.
  s.treats.push({ id: 99, x: s.player.x, y: s.player.y, life: FISH.life, alive: true });
  step(s, idle, DT);
  assert.equal(s.player.hp, s.player.maxHp);
});

test("a moon-lantern only announces it is full when it is near the view", () => {
  const s = quiet("zero");
  const lantern = s.interactables.find((o) => o.kind === "lantern");
  // Far away (two screens off): the lantern fills silently.
  s.player.x = lantern.x + 2000;
  s.player.y = lantern.y;
  s.notice = null;
  lantern.charge = 0.9999;
  step(s, idle, DT);
  assert.equal(lantern.charge, 1);
  assert.notEqual(s.notice?.kind, "moon-ready");
  // Within the view half-size, the same crossing shows the notice.
  s.player.x = lantern.x + 300;
  s.notice = null;
  lantern.charge = 0.9999;
  step(s, idle, DT);
  assert.equal(s.notice?.kind, "moon-ready");
});

test("a charged moon-lantern stuns every enemy when touched", () => {
  const s = quiet("zero");
  const lantern = s.interactables.find((o) => o.kind === "lantern");
  const far = addEnemy(s, 900, 480, 20);
  s.player.x = lantern.x;
  s.player.y = lantern.y;
  lantern.charge = 0.99;
  step(s, idle, DT);
  assert.equal(s.stats.moonPulses, 0, "not yet charged");
  lantern.charge = 1;
  step(s, idle, DT);
  assert.equal(s.stats.moonPulses, 1);
  assert.equal(lantern.charge < 0.01, true);
  assert.ok(far.stun > 0);
  assert.equal(far.hp, 20 - MOON_LANTERN.damage);
  const x = far.x;
  for (let i = 0; i < 30; i++) step(s, idle, DT);
  assert.equal(far.x, x, "stunned ink stays put");
});

test("kill streak counts kills and resets after the timeout", () => {
  const s = quiet("zero");
  s.player.x = 300;
  s.player.y = 470;
  const kill = () => {
    const e = addEnemy(s, s.player.x + 60, s.player.y, 0.5);
    for (let i = 0; i < 60 && e.alive; i++) step(s, idle, DT);
    assert.equal(e.alive, false);
  };
  kill();
  kill();
  kill();
  assert.equal(s.streak.count, 3);
  assert.equal(s.stats.bestStreak, 3);
  for (let i = 0; i < Math.ceil(STATS.streakWindow / DT) + 2; i++) step(s, idle, DT);
  assert.equal(s.streak.count, 0);
  assert.equal(s.streak.best, 3);
});

test("streak milestones grant bonus XP", () => {
  const s = quiet("zero");
  s.streak.count = STATS.streakMilestone - 1;
  s.streak.timer = 1;
  s.xp = 0;
  s.xpToNext = 1e6;
  const e = addEnemy(s, s.player.x + 60, s.player.y, 0.5);
  for (let i = 0; i < 60 && e.alive; i++) step(s, idle, DT);
  assert.equal(s.streak.count, STATS.streakMilestone);
  assert.ok(s.xp >= STATS.streakBonusXp);
  assert.ok(s.impacts.some((i) => i.kind === "streak"));
});

test("hitFlash is set on damage and decays; damage tags carry the amount", () => {
  const s = quiet("zero");
  const e = addEnemy(s, s.player.x + 60, s.player.y, 50);
  for (let i = 0; i < 60 && !e.hitFlash; i++) step(s, idle, DT);
  assert.ok(e.hitFlash > 0 && e.hitFlash <= STATS.hitFlash);
  const tag = s.impacts.find((i) => i.kind === "damage");
  assert.ok(tag && tag.amount > 0);
  s.player.attackCooldown = 1e6;
  for (let i = 0; i < 20; i++) {
    s.player.attackCooldown = 1e6;
    step(s, idle, DT);
  }
  assert.equal(e.hitFlash, 0);
});

test("phase changes raise a ribbon notice once", () => {
  const s = quiet("zero");
  s.elapsed = 0.2 * s.sessionSeconds - DT / 2;
  step(s, idle, DT);
  assert.equal(s.notice.kind, "phase1");
  assert.equal(s.phaseSeen, 1);
});

test("same seed and inputs still give the same snapshot with interactions", () => {
  const run = () => {
    const s = createSim({ cat: "nicole", seed: 77, sessionSeconds: 300 });
    for (let i = 0; i < 60 * 80 && s.ended === "playing"; i++) {
      s.player.hp = s.player.maxHp;
      step(s, { ax: Math.sin(i / 90), ay: Math.cos(i / 70), dash: i % 200 === 0, choose: 0 }, DT);
    }
    return snapshot(s);
  };
  assert.deepEqual(run(), run());
});
