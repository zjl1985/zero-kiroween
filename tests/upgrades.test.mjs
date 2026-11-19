import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSim,
  step,
  chooseUpgrade,
  openChest,
  orbitPositions,
  snapshot,
} from "../dist/game/sim.js";
import {
  BUILD,
  EVOLUTIONS,
  START_WEAPON,
  UPGRADES,
  UPGRADE_VALUES,
  WEAPON_STEPS,
  XP,
  evolutionFor,
  isEligible,
  isEvolved,
  playerStats,
  readyEvolution,
  rollChoices,
  upgradeDef,
  xpForLevel,
} from "../dist/game/upgrades.js";
import { CHEST } from "../dist/game/interactions.js";
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

test("a shard collected this step is never folded into a new one at the cap", () => {
  const s = quiet("zero");
  const far = (i) => ({ id: s.nextPickupId++, x: 60 + i, y: 60, value: 1, alive: true, age: 0 });
  s.pickups.push({ ...far(0), value: 100, alive: false });
  for (let i = 0; i < XP.maxPickups; i++) s.pickups.push(far(i));
  const e = enemy(s, 300, 330, 1);
  s.shots.push({ id: 99, x: e.x, y: e.y, vx: 0, vy: 0, life: 1, alive: true });
  step(s, idle, DT);
  assert.equal(e.alive, false);
  assert.equal(s.pickups.filter((p) => p.alive).length, XP.maxPickups);
  assert.equal(s.pickups.at(-1).value, XP.shardValue + 1);
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
  n.pendingChoice = { options: ["moon-stars"] };
  assert.equal(chooseUpgrade(n, 0), true);
  assert.equal(n.upgrades["moon-stars"], 2);
  assert.equal(orbitPositions(n).length, C.nicole.orbitCount + WEAPON_STEPS["moon-stars"][0].count);

  const z = quiet("zero");
  z.upgrades["meow-bolt"] = 2;
  z.pendingChoice = { options: ["meow-bolt"] };
  chooseUpgrade(z, 0);
  enemy(z, 560, 360);
  z.player.attackCooldown = 0;
  step(z, idle, DT);
  assert.ok(z.shots.length >= 1);
  const expected = C.zero.attackInterval * (1 - WEAPON_STEPS["meow-bolt"][1].rate);
  assert.ok(Math.abs(z.player.attackCooldown - expected) < 1e-9);

  const v = quiet("zero");
  v.pendingChoice = { options: ["vitality"] };
  chooseUpgrade(v, 0);
  assert.equal(v.player.maxHp, C.zero.maxHp + 1);
  assert.deepEqual(v.build.passives, ["vitality"]);
});

test("each cat starts with its own weapon in the first weapon slot", () => {
  for (const cat of ["zero", "nicole"]) {
    const s = createSim({ cat, seed: 3 });
    assert.deepEqual(s.build, { weapons: [START_WEAPON[cat]], passives: [] });
    assert.equal(s.upgrades[START_WEAPON[cat]], 1);
    assert.equal(upgradeDef(START_WEAPON[cat]).cat, cat);
    assert.equal(upgradeDef(START_WEAPON[cat]).slot, "weapon");
  }
  assert.notEqual(START_WEAPON.zero, START_WEAPON.nicole);
});

test("weapon max levels come from their step tables and evolutions are data", () => {
  for (const u of UPGRADES) {
    assert.ok(["weapon", "passive", "evolution", "filler"].includes(u.slot));
    if (u.slot === "weapon") assert.equal(u.maxLevel, WEAPON_STEPS[u.id].length + 1);
  }
  assert.ok(BUILD.weaponSlots >= 2 && BUILD.passiveSlots >= 2);
  for (const e of EVOLUTIONS) {
    assert.equal(upgradeDef(e.id).slot, "evolution");
    assert.equal(upgradeDef(e.id).cat, e.cat);
    assert.equal(e.weapon, START_WEAPON[e.cat]);
    assert.equal(upgradeDef(e.passive).slot, "passive");
    assert.ok(["any", e.cat].includes(upgradeDef(e.passive).cat));
  }
  assert.equal(evolutionFor("zero"), "echo-legion");
  assert.equal(evolutionFor("nicole"), "full-moon");
});

/** Grows a build through real level-up cards, choosing by `pick`. */
function grow(cat, seed, rolls, pick = (opts, i) => i % opts.length) {
  const s = quiet(cat, seed),
    rng = createRng(seed),
    seen = [];
  for (let i = 0; i < rolls; i++) {
    const opts = rollChoices(s, rng);
    if (!opts.length) break;
    seen.push(opts);
    s.pendingChoice = { options: opts };
    chooseUpgrade(s, pick(opts, i));
  }
  return { s, seen };
}

test("level-up cards never offer evolutions and respect slot limits", () => {
  for (const cat of ["zero", "nicole"])
    for (let seed = 1; seed <= 12; seed++) {
      const { s, seen } = grow(cat, seed, 80);
      for (const opts of seen) {
        assert.equal(new Set(opts).size, opts.length);
        for (const id of opts) assert.notEqual(upgradeDef(id).slot, "evolution");
      }
      assert.ok(s.build.weapons.length <= BUILD.weaponSlots);
      assert.ok(s.build.passives.length <= BUILD.passiveSlots);
      // Items outside the build are never offered once its slots are full.
      for (const u of UPGRADES)
        if ((s.upgrades[u.id] ?? 0) > 0 && (u.slot === "weapon" || u.slot === "passive"))
          assert.ok(
            [...s.build.weapons, ...s.build.passives].includes(u.id) ||
              EVOLUTIONS.some((e) => e.weapon === u.id && s.build.weapons.includes(e.id)),
            `${u.id} owned but not slotted`,
          );
      if (s.build.weapons.length === BUILD.weaponSlots)
        for (const id of rollChoices(s, createRng(seed + 99)))
          if (upgradeDef(id).slot === "weapon") assert.ok(s.build.weapons.includes(id));
    }
});

test("evolution only comes from a chest, once the weapon is max and the passive owned", () => {
  for (const cat of ["zero", "nicole"]) {
    const evo = EVOLUTIONS.find((e) => e.cat === cat),
      s = quiet(cat),
      max = upgradeDef(evo.weapon).maxLevel;
    // Max weapon alone: the chest only levels other things.
    s.upgrades[evo.weapon] = max;
    assert.equal(readyEvolution(s), undefined);
    openChest(s, createRng(2), false);
    assert.equal(isEvolved(s), false);
    assert.equal(s.chestReveal.evolved, null);
    // Passive without the max weapon: not ready either.
    const t = quiet(cat);
    t.pendingChoice = { options: [evo.passive] };
    chooseUpgrade(t, 0);
    assert.equal(readyEvolution(t), undefined);
    // Both: level-ups still never offer it, a chest grants it.
    t.upgrades[evo.weapon] = max;
    assert.equal(readyEvolution(t)?.id, evo.id);
    for (let i = 0; i < 30; i++) assert.ok(!rollChoices(t, createRng(i + 1)).includes(evo.id));
    openChest(t, createRng(3), false);
    assert.equal(isEvolved(t), true);
    assert.equal(t.chestReveal.evolved, evo.id);
    assert.equal(t.chestReveal.items.length, CHEST.levels - 1);
    assert.equal(t.notice.kind, cat === "zero" ? "evolve-zero" : "evolve-nicole");
    // The evolution takes the base weapon's slot.
    assert.equal(t.build.weapons[0], evo.id);
    assert.ok(!t.build.weapons.includes(evo.weapon));
    assert.equal(readyEvolution(t), undefined);
  }
});

test("a full passive bar without the partner passive still lets a chest evolve the maxed weapon", () => {
  for (const cat of ["zero", "nicole"]) {
    const evo = EVOLUTIONS.find((e) => e.cat === cat),
      max = upgradeDef(evo.weapon).maxLevel,
      others = UPGRADES.filter(
        (u) => u.slot === "passive" && (u.cat === cat || u.cat === "any") && u.id !== evo.passive,
      ).map((u) => u.id);
    assert.ok(others.length >= BUILD.passiveSlots, `${cat} has ${others.length} other passives`);
    // One short of a full bar, partner missing, weapon max: not ready.
    const s = quiet(cat);
    for (const id of others.slice(0, BUILD.passiveSlots - 1)) {
      s.pendingChoice = { options: [id] };
      chooseUpgrade(s, 0);
    }
    s.upgrades[evo.weapon] = max;
    assert.equal(s.build.passives.length, BUILD.passiveSlots - 1);
    assert.equal(readyEvolution(s), undefined);
    // Fill the bar with a non-partner passive: the partner is locked out for good.
    s.pendingChoice = { options: [others[BUILD.passiveSlots - 1]] };
    chooseUpgrade(s, 0);
    assert.equal(s.build.passives.length, BUILD.passiveSlots);
    assert.ok(!s.build.passives.includes(evo.passive));
    assert.equal(isEligible(s, upgradeDef(evo.passive)), false);
    assert.equal(readyEvolution(s)?.id, evo.id);
    // Still never a level-up card; only a chest grants it.
    for (let i = 0; i < 30; i++) assert.ok(!rollChoices(s, createRng(i + 1)).includes(evo.id));
    assert.equal(isEvolved(s), false);
    openChest(s, createRng(4), false);
    assert.equal(isEvolved(s), true);
    assert.equal(s.chestReveal.evolved, evo.id);
    assert.equal(s.build.weapons[0], evo.id);
    assert.ok(!s.build.weapons.includes(evo.weapon));
    // Once only.
    assert.equal(readyEvolution(s), undefined);
  }
});

test("a chest with nothing left to grow hands out a snack", () => {
  const s = quiet("zero");
  s.upgrades["meow-bolt"] = upgradeDef("meow-bolt").maxLevel;
  s.player.hp = 1;
  openChest(s, createRng(4), false);
  assert.deepEqual(s.chestReveal.items, [{ id: "snack", level: 1 }]);
  assert.equal(s.player.hp, 1 + UPGRADE_VALUES.snack.heal);
});

test("the extra weapons hit ink: night claw, star fall, paper crane, pumpkin seed", () => {
  for (const [cat, id] of [
    ["zero", "night-claw"],
    ["nicole", "star-fall"],
    ["zero", "paper-crane"],
    ["nicole", "pumpkin-seed"],
  ]) {
    const s = quiet(cat);
    s.player.attackCooldown = 1e6;
    s.pendingChoice = { options: [id] };
    chooseUpgrade(s, 0);
    assert.ok(s.build.weapons.includes(id));
    // Far enough that Nicole's stars and Zero's bolts would not reach; frozen in place.
    const e = enemy(s, s.player.x + (id === "night-claw" ? 40 : 150), s.player.y, 1000);
    e.stun = 1e6;
    const before = e.hp;
    for (let i = 0; i < 240 && e.hp === before; i++) {
      s.player.attackCooldown = 1e6;
      step(s, idle, DT);
    }
    assert.ok(e.hp < before, `${id} dealt damage`);
    if (cat === "zero") assert.ok(s.shots.every((sh) => sh.weapon), "no meow bolts were fired");
  }
});

test("re-dashing over a live Echo Legion decoy still bursts the old echo", () => {
  const z = quiet("zero");
  z.upgrades["echo-legion"] = 1;
  step(z, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(z.decoy.live, true);
  const first = { x: z.decoy.x, y: z.decoy.y };
  const e = enemy(z, first.x, first.y + 10, 1000);
  z.player.dashCooldown = 0;
  z.player.dashTime = 0;
  z.impacts = [];
  const hp = e.hp;
  step(z, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(z.decoy.live, true, "a fresh decoy replaced the old one");
  assert.ok(z.impacts.some((i) => i.kind === "echo-burst"), "old echo burst");
  assert.ok(e.hp < hp, "burst hurt the enemy next to the old echo");
});

test("the Boss banner survives routine notices such as a skill use", () => {
  const z = quiet("zero");
  z.notice = { kind: "boss-incoming", life: 2.2 };
  step(z, { ax: 1, ay: 0, dash: true }, DT);
  assert.equal(z.notice.kind, "boss-incoming");
  z.notice = { kind: "zero-dash", life: 2.2 };
  z.player.dashCooldown = 0;
  z.player.dashTime = 0;
  z.upgrades["meow-bolt"] = upgradeDef("meow-bolt").maxLevel;
  z.upgrades["long-shadow"] = 1;
  z.build.passives.push("long-shadow");
  openChest(z, createRng(5), false);
  assert.equal(z.notice.kind, "evolve-zero", "major notices still replace routine ones");
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
    for (let seed = 1; seed < 20; seed++) {
      const { seen } = grow(cat, seed, 60, (opts, i) => (i * seed) % opts.length);
      for (const opts of seen) for (const id of opts) assert.notEqual(upgradeDef(id).cat, other);
    }
  }
});

test("every upgrade has a name and description in both language packs", () => {
  for (const u of UPGRADES) {
    assert.ok(MESSAGE_KEYS.includes(`upgrade.${u.id}.name`));
    assert.ok(MESSAGE_KEYS.includes(`upgrade.${u.id}.desc`));
  }
  for (const k of ["damage", "rate", "count", "pierce", "area"])
    assert.ok(MESSAGE_KEYS.includes(`stat.${k}`));
  for (const k of ["evolution.rule", "upgrade.weapon", "upgrade.passive", "hud.weapons", "hud.passives", "chest.level", "chest.evolved"])
    assert.ok(MESSAGE_KEYS.includes(k));
  assert.deepEqual(missingKeys("zh"), []);
  assert.deepEqual(missingKeys("en"), []);
});
