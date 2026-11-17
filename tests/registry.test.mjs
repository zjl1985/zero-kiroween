import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  BEHAVIOURS,
  CATS,
  ENEMY_DEFS,
  EVOLUTION_DEFS,
  PASSIVE_DEFS,
  WEAPON_DEFS,
} from "../dist/defs/index.js";
import { ELITE, FILLER_KIND, KIND_CAP, SPAWN_TABLE, WAVES } from "../dist/defs/horde.js";
import { createRegistry } from "../dist/engine/registry.js";
import { createEventBus } from "../dist/engine/events.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys } from "../dist/content/i18n.js";

const upgradeIds = () => [...WEAPON_DEFS.ids(), ...PASSIVE_DEFS.ids()];
const poolOf = (id) => (WEAPON_DEFS.find(id) ?? PASSIVE_DEFS.find(id))?.pool;
const hasKey = (key) => MESSAGE_KEYS.includes(key);

test("every cat starts with a registered weapon from its own pool", () => {
  assert.ok(CATS.all().length >= 2);
  for (const cat of CATS.all()) {
    const w = WEAPON_DEFS.find(cat.startWeapon);
    assert.ok(w, `${cat.id} start weapon ${cat.startWeapon} is registered`);
    assert.equal(w.kind, "weapon");
    assert.ok(["any", cat.id].includes(w.pool), `${cat.startWeapon} is in ${cat.id}'s pool`);
    assert.ok(["male", "female"].includes(cat.gender));
  }
});

test("every evolution pairs a max-level weapon and a passive of the same cat", () => {
  assert.ok(EVOLUTION_DEFS.all().length > 0);
  for (const evo of EVOLUTION_DEFS.all()) {
    assert.ok(CATS.has(evo.cat), `${evo.id} cat ${evo.cat} is registered`);
    const weapon = WEAPON_DEFS.find(evo.weapon),
      passive = PASSIVE_DEFS.find(evo.passive),
      evolved = WEAPON_DEFS.find(evo.id);
    assert.ok(weapon, `${evo.id} weapon ${evo.weapon} is registered`);
    assert.ok(passive, `${evo.id} passive ${evo.passive} is registered`);
    assert.ok(evolved && evolved.kind === "evolution", `${evo.id} has an evolved weapon def`);
    assert.ok(weapon.steps && weapon.steps.length > 0, `${evo.weapon} has a max level`);
    assert.ok(["any", evo.cat].includes(weapon.pool));
    assert.ok(["any", evo.cat].includes(passive.pool));
    assert.equal(evolved.pool, evo.cat);
    assert.ok(WEAPON_DEFS.has(evo.replaces));
    assert.ok(CATS.get(evo.cat).evolutions.includes(evo.id), `${evo.cat} lists ${evo.id}`);
  }
  for (const cat of CATS.all())
    for (const id of cat.evolutions) assert.ok(EVOLUTION_DEFS.has(id), `${cat.id} evolution ${id}`);
});

test("every exclusive upgrade is registered in its cat's own pool", () => {
  const all = upgradeIds();
  for (const cat of CATS.all()) {
    assert.ok(cat.exclusives.length > 0);
    for (const id of cat.exclusives) {
      assert.ok(all.includes(id), `${cat.id} exclusive ${id} is registered`);
      assert.equal(poolOf(id), cat.id);
    }
  }
  // Both cats keep distinct kits: no exclusive is shared.
  const seen = CATS.all().flatMap((c) => c.exclusives);
  assert.equal(new Set(seen).size, seen.length);
});

test("spawn tables, elites, waves and kind caps only name registered enemies", () => {
  const kinds = [
    FILLER_KIND,
    ...SPAWN_TABLE.flatMap((row) => row.map(([kind]) => kind)),
    ...ELITE.kinds,
    ...WAVES.map((w) => w.kind),
    ...Object.keys(KIND_CAP),
  ];
  for (const kind of kinds) assert.ok(ENEMY_DEFS.has(kind), `${kind} is a registered enemy`);
  for (const kind of ELITE.kinds) assert.ok(ENEMY_DEFS.get(kind).eliteable, `${kind} may be elite`);
  for (const e of ENEMY_DEFS.all())
    for (const b of e.behaviours) assert.ok(BEHAVIOURS.has(b.id), `${e.id} behaviour ${b.id}`);
  assert.equal(ENEMY_DEFS.all().filter((e) => e.arrival).length, 1, "one scheduled Boss");
});

test("every def has its name (and card description) in every language pack", () => {
  for (const cat of CATS.all()) {
    assert.ok(hasKey(`cat.${cat.id}.choice`), `cat.${cat.id}.choice`);
    for (const part of ["role", "story", "tactic", "attack.name", "attack.desc", "active.name", "active.short", "active.desc", "passive.name", "passive.desc"])
      assert.ok(hasKey(`${cat.i18n}.${part}`), `${cat.i18n}.${part}`);
    assert.ok(hasKey(`notice.${cat.skillNotice}`), `notice.${cat.skillNotice}`);
  }
  for (const id of upgradeIds()) {
    assert.ok(hasKey(`upgrade.${id}.name`), `upgrade.${id}.name`);
    assert.ok(hasKey(`upgrade.${id}.desc`), `upgrade.${id}.desc`);
  }
  for (const evo of EVOLUTION_DEFS.all()) assert.ok(hasKey(`notice.${evo.notice}`), `notice.${evo.notice}`);
  for (const e of ENEMY_DEFS.all()) assert.ok(hasKey(`enemy.${e.id}.name`), `enemy.${e.id}.name`);
  assert.deepEqual(missingKeys("zh"), []);
  assert.deepEqual(missingKeys("en"), []);
});

test("registries reject duplicate ids and name unknown ones", () => {
  const r = createRegistry("thing");
  r.register({ id: "a" });
  r.register({ id: "b" });
  assert.throws(() => r.register({ id: "a" }), /Duplicate thing id "a"/);
  assert.throws(() => r.get("c"), /Unknown thing id "c"/);
  assert.deepEqual(r.ids(), ["a", "b"]);
  assert.equal(r.has("b"), true);
  assert.equal(r.find("c"), undefined);
  assert.throws(() => CATS.register(CATS.all()[0]), /Duplicate cat id/);
  assert.throws(() => WEAPON_DEFS.get("no-such-weapon"), /Unknown weapon id/);
});

test("the event bus runs handlers in registration order and can unsubscribe", () => {
  const bus = createEventBus(),
    seen = [];
  bus.on("tick", (_s, p) => seen.push(["a", p.dt]));
  const off = bus.on("tick", (_s, p) => seen.push(["b", p.dt]));
  bus.on("kill", () => seen.push(["kill"]));
  bus.emit("tick", {}, { dt: 1 }, {});
  off();
  bus.emit("tick", {}, { dt: 2 }, {});
  assert.deepEqual(seen, [["a", 1], ["b", 1], ["a", 2]]);
  assert.equal(bus.count("tick"), 1);
});

test("the engine stays content-free and src/game has no per-cat literals", () => {
  const src = new URL("../src/", import.meta.url);
  for (const file of readdirSync(new URL("engine/", src))) {
    const text = readFileSync(new URL(`engine/${file}`, src), "utf8");
    assert.doesNotMatch(text, /from "\.\.\/(game|defs|render|ui|content)\//, `engine/${file}`);
  }
  for (const file of readdirSync(new URL("game/", src)).filter((f) => f.endsWith(".ts"))) {
    const text = readFileSync(new URL(`game/${file}`, src), "utf8");
    for (const cat of CATS.ids())
      assert.ok(!text.includes(`"${cat}"`), `game/${file} names "${cat}"`);
  }
});
