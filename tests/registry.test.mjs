import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  BEHAVIOURS,
  CATS,
  COSTUME_DEFS,
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
    for (const costume of COSTUME_DEFS.ids())
      assert.ok(!text.includes(`"${costume}"`), `game/${file} names costume "${costume}"`);
  }
});

// ---- Art layer (render side; imported without a DOM) ----
import { CAT_ART, ENEMY_ART, PASSIVE_ART, WEAPON_ART, upgradeIcon } from "../dist/render/art-index.js";
import { SPRITE_CACHE_LIMIT, cachedSprite, clearSpriteCache, spriteCacheSize } from "../dist/engine/sprite.js";

test("every registered cat and enemy has registered art, and no art is orphaned", () => {
  for (const id of CATS.ids()) {
    const art = CAT_ART.find(id);
    assert.ok(art, `cat ${id} has art`);
    for (const fn of ["draw", "portrait", "heroAura", "skillIcon"])
      assert.equal(typeof art[fn], "function", `cat ${id} art.${fn}`);
    const cat = CATS.get(id);
    for (const key of [`${cat.i18n}.name`, `cat.${id}.choice`]) {
      assert.ok(hasKey(key), `${key} is a message key`);
      for (const locale of ["zh", "en"]) assert.ok(!missingKeys(locale).includes(key), `${key} in ${locale}`);
    }
  }
  for (const id of ENEMY_DEFS.ids()) {
    const art = ENEMY_ART.find(id);
    assert.ok(art, `enemy ${id} has art`);
    assert.equal(typeof art.draw, "function");
    assert.ok(art.dissolve.flakes.length > 0 && art.dissolve.count > 0, `enemy ${id} dissolve`);
  }
  assert.deepEqual([...CAT_ART.ids()], [...CATS.ids()], "cat art follows cat registration order");
  for (const id of ENEMY_ART.ids()) assert.ok(ENEMY_DEFS.has(id), `enemy art ${id} has a def`);
  for (const id of WEAPON_ART.ids()) assert.ok(WEAPON_DEFS.has(id), `weapon art ${id} has a def`);
  for (const id of PASSIVE_ART.ids()) assert.ok(PASSIVE_DEFS.has(id), `passive art ${id} has a def`);
});

test("every weapon, passive and evolution has a card icon painter", () => {
  const ids = [...WEAPON_DEFS.ids(), ...PASSIVE_DEFS.ids(), ...EVOLUTION_DEFS.ids()];
  for (const id of ids) assert.equal(typeof upgradeIcon(id), "function", `${id} has an icon`);
  // Shots tagged by a weapon are drawn by exactly one weapon art.
  const tags = WEAPON_ART.all().filter((w) => w.shotTag).map((w) => w.shotTag);
  assert.equal(new Set(tags).size, tags.length);
});

test("cached sprites are keyed, capped and import-safe without a DOM", () => {
  clearSpriteCache();
  let painted = 0;
  const a = cachedSprite("probe:a", 10, 6, 2, () => painted++, { x: 0.5, y: 1 });
  assert.equal(cachedSprite("probe:a", 10, 6, 2, () => painted++), a, "same key, same sprite");
  assert.equal(a.canvas, undefined, "no canvas without a DOM");
  // Without a canvas, draw runs the painter directly at the anchored spot.
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => (...args) => calls.push([k, ...args]) });
  a.draw(ctx, { x: 20, y: 30 });
  assert.equal(painted, 1);
  assert.deepEqual(calls.find((c) => c[0] === "translate"), ["translate", 15, 24]);
  for (let i = 0; i < SPRITE_CACHE_LIMIT + 5; i++) cachedSprite(`probe:${i}`, 1, 1, 1, () => {});
  assert.equal(spriteCacheSize(), SPRITE_CACHE_LIMIT);
  assert.notEqual(cachedSprite("probe:a", 10, 6, 2, () => {}), a, "least recently used entry was evicted");
  clearSpriteCache();
});

test("render, UI and main draw cats and enemies through registries, not literals", () => {
  const src = new URL("../src/", import.meta.url);
  // Legacy pixel-era helpers kept as code dependencies (see .kiro/steering/structure.md).
  const legacy = new Set(["scene.ts", "layout.ts", "pixel.ts", "pixel-art.ts", "cast.ts"]);
  const files = [
    ...readdirSync(new URL("render/", src)).filter((f) => f.endsWith(".ts") && !legacy.has(f)).map((f) => `render/${f}`),
    ...readdirSync(new URL("ui/", src)).filter((f) => f.endsWith(".ts")).map((f) => `ui/${f}`),
    "main.ts",
  ];
  for (const file of files) {
    const text = readFileSync(new URL(file, src), "utf8");
    for (const cat of CATS.ids()) assert.ok(!text.includes(`"${cat}"`), `${file} names "${cat}"`);
    for (const costume of COSTUME_DEFS.ids())
      assert.ok(!text.includes(`"${costume}"`), `${file} names costume "${costume}"`);
  }
  const enemies = readFileSync(new URL("render/craft-enemies.ts", src), "utf8");
  assert.doesNotMatch(enemies, /switch \(/, "craft-enemies.ts has no switch over kinds");
  for (const kind of ENEMY_DEFS.ids()) assert.ok(!enemies.includes(`"${kind}"`), `craft-enemies.ts names "${kind}"`);
});

// ---------------------------------------------------------------- landmarks and biomes (FEAT-006)
import { BIOME_DEFS, LANDMARK_DEFS, PROP_DEFS as PROPS } from "../dist/defs/index.js";
import { BIOME_ART, LANDMARK_ART, PROP_ART, decorPiece } from "../dist/render/art-index.js";
import { landmarkParts } from "../dist/game/world-gen.js";

test("every landmark and biome has registered art, names in every pack, and no art is orphaned", () => {
  assert.deepEqual(LANDMARK_ART.ids(), LANDMARK_DEFS.ids());
  assert.deepEqual(BIOME_ART.ids(), BIOME_DEFS.ids());
  const keys = [
    ...LANDMARK_DEFS.ids().flatMap((id) => [`landmark.${id}`, `notice.found-${id}`]),
    ...BIOME_DEFS.ids().map((id) => `biome.${id}.name`),
  ];
  for (const k of keys) assert.ok(MESSAGE_KEYS.includes(k), k);
  assert.deepEqual(missingKeys("en"), []);
  assert.deepEqual(missingKeys("zh"), []);
});

test("landmark layouts only place generic decor or pieces their art registers", () => {
  const generic = new Set(["tree", "cottage", "bush", "fence", "stone", "lamp", "candles", "pumpkin", "flowers", "tuft", "leaves"]);
  for (const def of LANDMARK_DEFS.all()) {
    const parts = landmarkParts({ id: "t", kind: def.id, x: 0, y: 0, radius: def.radius, seed: 3, span: 200 });
    for (const d of parts.decor) assert.ok(generic.has(d.kind) || decorPiece(d.kind), `${def.id}: ${d.kind}`);
  }
});

test("biome prop mixes name registered props with art and reaction rows for what they accept", () => {
  for (const b of BIOME_DEFS.all())
    for (const bp of b.props) {
      const def = PROPS.get(bp.prop);
      assert.ok(PROP_ART.find(def.art), def.art);
      assert.ok((bp.count ?? def.spawn.count) !== undefined, `${b.id}: ${bp.prop} has a count`);
    }
  assert.ok(PROPS.ids().length >= 13, "at least 10 props beyond the first three");
});
