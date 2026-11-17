import assert from "node:assert/strict";
import { test } from "node:test";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { applyElement, createSim, igniteAt, snapshot, step } from "../dist/game/sim.js";
import { MATERIALS, PROP_DEFS, REACTIONS, reactionFor } from "../dist/defs/index.js";
import { ELEMENTS } from "../dist/defs/types.js";
import { FIRE, PROP_HITS } from "../dist/defs/fire.js";
import { burningCount, propMaxHp, propPhase, standingPropColliders } from "../dist/game/props.js";
import { CHUNK, chunkContent, chunkOf, clearWorldCache, nearColliders, nearStaticColliders } from "../dist/game/world-gen.js";
import { PROP_ART } from "../dist/render/art-index.js";
import { POPUP, popupStep, popupTarget } from "../dist/render/timeline.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys } from "../dist/content/i18n.js";
import { waterAt, waterRegionsNear } from "../dist/game/water.js";

const SEED = 5;
/** No spawns, no waves, no Boss, no treats: just the cat, the town and its props. */
function quiet(seed = SEED, cat = "zero") {
  const s = createSim({ cat, seed, sessionSeconds: 900 });
  s.enemies = [];
  s.spawnTimer = 1e9;
  s.wavesDone = 99;
  s.boss.spawned = true;
  s.treatTimer = 1e9;
  s.elitesDone = 99;
  return s;
}
function run(s, frames, ax = 0, ay = 0) {
  for (let i = 0; i < frames && s.ended === "playing"; i++) {
    s.player.hp = s.player.maxHp;
    if (s.pendingChoice) s.pendingChoice = null;
    step(s, { ax, ay, dash: false }, DT);
  }
}
/** The first prop of `kind` in the world for `seed`, scanning chunks row by row. */
function findProp(kind, seed = SEED, skip = 0) {
  for (let cy = 1; cy <= CHUNK.maxCy; cy++)
    for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++)
      for (const p of chunkContent(seed, cx, cy).props) if (p.kind === kind && skip-- <= 0) return p;
  throw new Error(`no ${kind} for seed ${seed}`);
}
/** Cat parked far from the prop so its own weapons do not touch it. */
function parkAway(s, p) {
  s.player.x = p.x > 0 ? p.x - 1400 : p.x + 1400;
  s.player.y = Math.max(600, p.y);
}

test("cut hits tear a paper fence: durability drops, it looks damaged, then scraps open its collider", () => {
  const s = quiet(),
    fence = findProp("paper-fence"),
    def = PROP_DEFS.get("paper-fence"),
    max = propMaxHp(def);
  parkAway(s, fence);
  const blocking = () => standingPropColliders(s, fence.x, fence.y).some((caps) => caps.some((c) => Math.abs(c.x1 - (fence.x - 39 * fence.s)) < 1e-6 && Math.abs(c.y1 - (fence.y - 3)) < 1e-6));
  assert.ok(blocking(), "an intact fence blocks");
  const seen = new Set();
  let last = max;
  for (let i = 0; i < 60 && propPhase(s, fence.id) < 2; i++) {
    s.elapsed += PROP_HITS.hitInterval + 0.01;
    applyElement(s, fence.x, fence.y - 2, 6, "cut", 1);
    const m = s.props[fence.id];
    assert.ok(m.hp < last || m.phase === 2, "each hit tears off durability");
    last = m.hp;
    seen.add(m.phase);
  }
  assert.ok(seen.has(1), "it passes through the damaged look");
  assert.equal(propPhase(s, fence.id), 2);
  assert.equal(s.stats.propsTorn, 1);
  assert.ok(!blocking(), "scraps no longer block");
  // Hits within the hit interval are ignored, and scraps take no more.
  const before = JSON.stringify(s.props);
  applyElement(s, fence.x, fence.y - 2, 6, "cut", 5);
  assert.equal(JSON.stringify(s.props), before);
});

test("a torn fence lets the cat walk through where it used to stop", () => {
  const fence = findProp("paper-fence");
  const walk = (tear) => {
    const s = quiet();
    // Kill the start weapon so only the scripted hits touch props.
    s.player.attackCooldown = 1e9;
    if (tear) {
      s.props[fence.id] = { hp: 0, phase: 2, hitAt: 0 };
    }
    s.player.x = fence.x;
    s.player.y = fence.y - 30;
    run(s, 50, 0, 1);
    return s.player.y;
  };
  const blocked = walk(false),
    open = walk(true);
  assert.ok(blocked < fence.y, `the intact fence stops the cat (y ${blocked} vs ${fence.y})`);
  assert.ok(open > fence.y + 10, `the torn fence lets it through (y ${open})`);
});

test("fire next to paper grass spreads, stays under the cap, scorches ink standing in it and burns out", () => {
  const s = quiet(),
    grass = findProp("paper-grass");
  parkAway(s, grass);
  s.enemies.push({ id: 999, kind: "ink-blob", x: grass.x, y: grass.y - 4, hp: 500, maxHp: 500, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, stun: 1e9 });
  igniteAt(s, grass.x, grass.y - 4, 2);
  assert.equal(burningCount(s), 1, "one cell catches");
  let most = 0,
    spreadAt = -1;
  for (let i = 0; i < 60 * 30; i++) {
    run(s, 1);
    const n = burningCount(s);
    most = Math.max(most, n);
    assert.ok(n <= FIRE.maxCells, `${n} cells burning`);
    if (spreadAt < 0 && n + s.stats.cellsBurnt > 1) spreadAt = i * DT;
    if (n === 0) break;
  }
  assert.ok(spreadAt >= 0 && spreadAt < 3, `spread after ${spreadAt}s`);
  assert.ok(most > 1);
  assert.equal(burningCount(s), 0, "the fire burns out");
  assert.ok(s.stats.cellsBurnt > 1);
  assert.ok(Object.keys(s.fire.ash).length > 1, "burnt cells are ash");
  assert.equal(propPhase(s, grass.id), 2, "the grass is used up");
  assert.ok(s.props[grass.id].burnt, "as ash, not torn");
  assert.equal(s.stats.propsTorn, 0);
  const e = s.enemies.find((x) => x.id === 999);
  assert.ok(!e || e.hp < 500, "ink in the fire took damage");
  // Spent fuel stays ash until its natural regrowth deadline (not permanent fireproofing).
  assert.ok(s.props[grass.id].regrowAt > s.elapsed);
  const cell = `${Math.floor(grass.x / FIRE.cell)},${Math.floor((grass.y - 4) / FIRE.cell)}`;
  assert.ok(cell in s.fire.ash);
  igniteAt(s, grass.x, grass.y - 4, 2);
  assert.equal(burningCount(s), 0);
});

test("a big fire is capped at FIRE.maxCells", () => {
  const s = quiet();
  parkAway(s, findProp("paper-grass"));
  for (let k = 0; k < 6; k++) {
    const g = findProp("paper-grass", SEED, k);
    igniteAt(s, g.x, g.y - 4, 200);
  }
  assert.ok(burningCount(s) <= FIRE.maxCells);
  for (let i = 0; i < 60 * 4; i++) {
    run(s, 1);
    assert.ok(burningCount(s) <= FIRE.maxCells);
  }
});

/** Isolate one real prop definition at a chosen cell centre, without changing world generation. */
function withPropFixture(kind, x, y, check) {
  const s = quiet(), def = PROP_DEFS.get(kind);
  s.build.weapons = [];
  clearWorldCache();
  const { cx, cy } = chunkOf(x, y), chunk = chunkContent(s.seed, cx, cy),
    p = { id: `${cx},${cy}#0`, kind, x, y: y + def.size.d * 0.25, s: 1, seed: 0 };
  chunk.props.splice(0, chunk.props.length, p);
  try { check(s, p, def); }
  finally { clearWorldCache(); }
}

test("ink is nonflammable; fire does not consume an isolated ink vat", () => {
  assert.equal(MATERIALS.get("ink").flammability, 0);
  assert.equal(reactionFor("ink", "fire"), undefined);
  withPropFixture("ink-vat", 492, 372, (s, p) => {
    igniteAt(s, p.x, p.y, 30);
    applyElement(s, p.x, p.y, 30, "fire", 10);
    run(s, 30);
    assert.equal(burningCount(s), 0);
    assert.equal(propPhase(s, p.id), 0);
    assert.equal(s.props[p.id], undefined);
  });
});

test("all card and cloth props accept fire, with lower flammability and higher durability than thin paper", () => {
  const thin = MATERIALS.get("thin-paper");
  for (const [id, expected] of [["card", 0.45], ["cloth", 0.65]]) {
    const material = MATERIALS.get(id);
    assert.equal(material.flammability, expected);
    assert.ok(material.flammability < thin.flammability);
    assert.ok(material.durability > thin.durability);
    assert.equal(reactionFor(id, "fire")?.id, `burn-${id}`, "parent registers the new burn row");
    for (const def of PROP_DEFS.all().filter((p) => p.material === id))
      assert.ok(def.accepts.includes("fire"), `${def.id} accepts fire`);
  }
});

for (const kind of ["paper-crate", "laundry-line"]) {
  test(`${kind} catches from its fire reaction and burns down over paced ticks without loot`, () => {
    withPropFixture(kind, 492, 372, (s, p, def) => {
      applyElement(s, 492, 372, 0, "fire", 1);
      assert.ok(burningCount(s) > 0);
      const ticks = Math.ceil(propMaxHp(def) / FIRE.propBurn);
      assert.ok(ticks > Math.ceil(propMaxHp(PROP_DEFS.get("paper-grass")) / FIRE.propBurn));
      run(s, Math.round((ticks - 1) * FIRE.tick / DT));
      assert.ok(propPhase(s, p.id) < 2, "thicker paper does not disappear in one tick");
      run(s, Math.round(FIRE.tick / DT) + 1);
      assert.equal(propPhase(s, p.id), 2);
      assert.equal(s.props[p.id].burnt, true);
      assert.equal(s.stats.propsTorn, 0);
      assert.equal(s.pickups.length + s.treats.length, 0);
    });
  });
}

test("actual thin-paper, card and cloth fuel cannot ignite in water or spread from an extinguished cell", () => {
  const regions = waterRegionsNear(SEED, 480, 2700, 12000);
  let wet;
  for (const r of regions) {
    for (let iy = Math.floor(r.bounds.minY / FIRE.cell); iy <= Math.floor(r.bounds.maxY / FIRE.cell) && !wet; iy++)
      for (let ix = Math.floor(r.bounds.minX / FIRE.cell); ix <= Math.floor(r.bounds.maxX / FIRE.cell); ix++) {
        const x = (ix + 0.5) * FIRE.cell, y = (iy + 0.5) * FIRE.cell;
        if (["shallow", "deep"].includes(waterAt(SEED, x, y))) { wet = { x, y, key: `${ix},${iy}` }; break; }
      }
    if (wet) break;
  }
  assert.ok(wet, "a real water cell exists");
  for (const kind of ["paper-grass", "paper-crate", "laundry-line"]) {
    withPropFixture(kind, 492, 372, (s) => {
      igniteAt(s, 492, 372, 0);
      assert.equal(burningCount(s), 1, `${kind} is genuine fuel on dry ground`);
    });
    withPropFixture(kind, wet.x, wet.y, (s, p) => {
      igniteAt(s, wet.x, wet.y, 0);
      assert.equal(burningCount(s), 0, `${kind} cannot ignite in water`);
      s.fire.cells[wet.key] = FIRE.burnTime;
      s.fire.clock = FIRE.tick - DT;
      run(s, 1);
      assert.equal(burningCount(s), 0, "water removes the source before this tick can spread");
      assert.equal(s.props[p.id], undefined, "extinguished fire does not consume wet fuel");
      assert.equal(s.stats.cellsBurnt, 0);
      assert.deepEqual(s.fire.ash, {});
    });
  }
});

test("the same seed and inputs give identical snapshots, props and fire included", () => {
  const grass = findProp("paper-grass"),
    fence = findProp("paper-fence");
  const go = () => {
    const s = createSim({ cat: "zero", seed: SEED, sessionSeconds: 300 });
    for (let i = 0; i < 60 * 40 && s.ended === "playing"; i++) {
      s.player.hp = s.player.maxHp;
      if (i === 30) igniteAt(s, grass.x, grass.y - 4, 30);
      if (i % 15 === 0) applyElement(s, fence.x, fence.y - 2, 8, "cut", 1);
      step(s, { ax: Math.cos(i / 200), ay: 0.6, dash: i % 300 === 0, choose: 0 }, DT);
    }
    assert.ok(Object.keys(s.props).length > 0);
    assert.ok(s.stats.cellsBurnt > 0);
    return snapshot(s);
  };
  const a = go();
  clearWorldCache();
  assert.deepEqual(go(), a);
});

test("prop mutations survive their chunk unloading and loading again", () => {
  const s = quiet(),
    fence = findProp("paper-fence"),
    home = chunkOf(fence.x, fence.y),
    key = `${home.cx},${home.cy}`;
  s.props[fence.id] = { hp: 0, phase: 2, hitAt: 0 };
  s.player.x = fence.x;
  s.player.y = fence.y - 40;
  run(s, 2);
  assert.ok(s.loadedChunks.includes(key));
  s.player.x = fence.x > 0 ? fence.x - 3000 : fence.x + 3000;
  s.player.y = fence.y < 2700 ? fence.y + 2000 : fence.y - 2000;
  run(s, 2);
  assert.ok(!s.loadedChunks.includes(key), "the chunk unloaded");
  s.player.x = fence.x;
  s.player.y = fence.y - 40;
  run(s, 2);
  assert.ok(s.loadedChunks.includes(key));
  assert.equal(propPhase(s, fence.id), 2, "still torn");
  assert.equal(standingPropColliders(s, fence.x, fence.y).length, standingPropColliders(quiet(), fence.x, fence.y).length - 1);
});

test("generic fences and bushes became props; static colliders leave prop colliders out", () => {
  const fence = findProp("paper-fence"),
    { cx, cy } = chunkOf(fence.x, fence.y),
    c = chunkContent(SEED, cx, cy);
  assert.ok(!c.decor.some((d) => d.x === fence.x && d.y === fence.y), "no decor copy of the fence");
  const isFence = (o) => Math.abs(o.x1 - (fence.x - 39 * fence.s)) < 1e-6 && Math.abs(o.y1 - (fence.y - 3)) < 1e-6;
  assert.ok(!nearStaticColliders(SEED, fence.x, fence.y).some(isFence));
  assert.ok(nearColliders(SEED, fence.x, fence.y).some(isFence), "the fresh-world view includes standing props");
  findProp("paper-bush");
  // Prop ids are unique and stable.
  const ids = new Set();
  for (let x = -4; x < 5; x++)
    for (const p of chunkContent(SEED, x, 4).props) {
      assert.ok(!ids.has(p.id));
      ids.add(p.id);
    }
});

test("every reaction row references a registered material and element; every prop has art and names", () => {
  assert.ok(REACTIONS.all().length >= 5);
  const rows = new Set();
  for (const r of REACTIONS.all()) {
    assert.ok(MATERIALS.has(r.material), `${r.id} material ${r.material}`);
    assert.ok(ELEMENTS.includes(r.element), `${r.id} element ${r.element}`);
    assert.equal(typeof r.effect, "function");
    const pair = `${r.material}x${r.element}`;
    assert.ok(!rows.has(pair), `one row per pair (${pair})`);
    rows.add(pair);
  }
  for (const p of PROP_DEFS.all()) {
    assert.ok(MATERIALS.has(p.material), `${p.id} material`);
    for (const el of p.accepts) assert.ok(ELEMENTS.includes(el), `${p.id} accepts ${el}`);
    assert.ok(p.accepts.some((el) => reactionFor(p.material, el)), `${p.id} reacts to something`);
    const art = PROP_ART.find(p.art);
    assert.ok(art, `${p.id} has art`);
    assert.equal(typeof art.paint, "function");
    assert.ok(art.scraps.length > 0);
    const key = `prop.${p.id}.name`;
    assert.ok(MESSAGE_KEYS.includes(key), key);
    for (const locale of ["zh", "en"]) assert.ok(!missingKeys(locale).includes(key), `${key} in ${locale}`);
  }
  for (const id of PROP_ART.ids()) assert.ok(PROP_DEFS.all().some((p) => p.art === id), `prop art ${id} has a def`);
});

test("pop-up folding is a pure render function of distance", () => {
  assert.equal(popupTarget(0), 1);
  assert.equal(popupTarget(POPUP.near), 1);
  assert.equal(popupTarget(POPUP.far + 100), POPUP.min);
  const mid = popupTarget((POPUP.near + POPUP.far) / 2);
  assert.ok(mid > POPUP.min && mid < 1);
  assert.equal(popupStep(POPUP.min, 1, 1 / 60, true), 1, "reduced motion snaps");
  const k = popupStep(POPUP.min, 1, 1 / 60, false);
  assert.ok(k > POPUP.min && k < 1, "otherwise it eases");
});

test("a torn scarecrow spills a ring of ink shards; the same prop always spills the same", () => {
  const seed = 20261116;
  const torn = () => {
    const s = quiet(seed),
      p = findProp("scarecrow", seed);
    parkAway(s, p);
    const before = s.pickups.length;
    for (let i = 0; i < 80 && propPhase(s, p.id) < 2; i++) {
      s.elapsed += PROP_HITS.hitInterval + 0.01;
      applyElement(s, p.x, p.y - 2, 6, "cut", 1);
    }
    assert.equal(propPhase(s, p.id), 2);
    return { s, p, drops: s.pickups.slice(before) };
  };
  const a = torn(),
    b = torn(),
    def = PROP_DEFS.get("scarecrow");
  assert.equal(a.drops.length, def.drops.burst);
  for (const d of a.drops) assert.ok(Math.hypot(d.x - a.p.x, d.y - a.p.y) > 5, "spread around the prop");
  assert.deepEqual(JSON.stringify(a.drops), JSON.stringify(b.drops));
});

test("straw burns: fire lights a hay bale and spreads to it", () => {
  const seed = 20261116,
    s = quiet(seed),
    p = findProp("haybale", seed);
  parkAway(s, p);
  applyElement(s, p.x, p.y - 2, 6, "fire", 1);
  assert.ok(burningCount(s) > 0);
  run(s, 300);
  assert.ok(s.stats.cellsBurnt > 0);
  assert.equal(propPhase(s, p.id), 2);
  assert.ok(s.props[p.id].burnt);
});
