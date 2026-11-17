import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim, enemyRadius, snapshot, step } from "../dist/game/sim.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { STATS } from "../dist/game/types.js";
import { FIRE } from "../dist/defs/fire.js";
import { ECOLOGY } from "../dist/defs/ecology.js";
import { PROP_DEFS } from "../dist/defs/index.js";

import { waterAt, waterRegionsNear } from "../dist/game/water.js";
import { paperTouchesFire, paperTouchesWater, stepPaperStatus } from "../dist/game/paper-status.js";
import {
  burningCount, cellKey, cellOf, damageProp, elementHit, foldProp, ignite, inkProp, inFootprint,
  propBlocks, propMaxHp, propPhase, standingPropColliders, stepFire, stepPropLifecycle,
} from "../dist/game/props.js";
import { CHUNK, chunkContent, chunkOf, clearWorldCache, hash2 } from "../dist/game/world-gen.js";

const SEED = 5, idle = { ax: 0, ay: 0, dash: false };
function quiet(cat = "zero") {
  const s = createSim({ cat, seed: SEED, sessionSeconds: 900 });
  s.enemies = [];
  s.spawnTimer = s.treatTimer = 1e9;
  s.wavesDone = s.elitesDone = 99;
  s.boss.spawned = true;
  s.build.weapons = [];
  s.build.passives = [];
  s.upgrades = {};
  s.player.x = 480;
  s.player.y = 360;
  s.player.invuln = 0;
  return s;
}
function run(s, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, idle, DT);
}
function blob(s, x, y, extra = {}) {
  const e = { id: s.nextEnemyId++, kind: "ink-blob", x, y, hp: 100, alive: true,
    spawnTime: 0, slowTime: 0, orbitCooldown: 0, stun: 1e9, ...extra };
  s.enemies.push(e);
  return e;
}
function flame(s, x = s.player.x, y = s.player.y, life = FIRE.burnTime) {
  const key = cellKey(...cellOf(x, y));
  s.fire.cells[key] = life;
  return key;
}
function context() {
  const calls = { ignite: 0, player: 0, enemy: 0 };
  const ctx = {
    calls, enemyRadius,
    effect(s, x, y, kind, life, extra) { s.impacts.push({ x, y, kind, life, ...extra }); },
    notify(s, kind) { s.notice = { kind, life: 2 }; },
    hurtPlayer(s, amount) {
      calls.player++;
      s.player.hp = Math.max(0, s.player.hp - amount);
      if (s.player.hp === 0) s.ended = "lost";
      return true;
    },
    hurtEnemy(_s, e, amount) { calls.enemy++; e.hp = Math.max(0, e.hp - amount); e.alive = e.hp > 0; },
    ignite(s, x, y, r) { calls.ignite++; ignite(s, x, y, r, ctx); },
    damageProp(s, p, amount, burnt) { damageProp(s, p, amount, ctx, burnt); },
    dropShard(s, x, y, value) { s.pickups.push({ id: s.nextPickupId++, x, y, value, alive: true, age: 0 }); },
    dropTreat(s, x, y) { s.treats.push({ id: s.nextTreatId++, x, y, alive: true, life: 10 }); },
  };
  return ctx;
}
function advanceFire(s, ctx, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    s.elapsed += DT;
    stepFire(s, DT, ctx);
  }
}
let props;
function findProp(kind, accept = () => true) {
  props ??= Array.from({ length: CHUNK.maxCy - CHUNK.minCy + 1 }, (_, j) =>
    Array.from({ length: CHUNK.maxCx - CHUNK.minCx + 1 }, (_, i) =>
      chunkContent(SEED, CHUNK.minCx + i, CHUNK.minCy + j).props)).flat(2);
  const p = props.find((p) => p.kind === kind && accept(p));
  assert.ok(p, `a ${kind} fixture exists`);
  return p;
}
const waterPoints = new Map();
function waterPoint(kind) {
  if (waterPoints.has(kind)) return waterPoints.get(kind);
  const regions = waterRegionsNear(SEED, 480, 2700, 12000);
  for (const r of regions) {
    if (kind === "bridge") {
      for (const c of r.crossings) {
        if (!c.id.endsWith(":deck")) continue;
        const x = c.polygon.reduce((n, p) => n + p.x, 0) / c.polygon.length,
          y = c.polygon.reduce((n, p) => n + p.y, 0) / c.polygon.length;
        if (waterAt(SEED, x, y) === kind) { waterPoints.set(kind, { x, y }); return { x, y }; }
      }
    } else {
      for (let y = r.bounds.minY; y <= r.bounds.maxY; y += 8)
        for (let x = r.bounds.minX; x <= r.bounds.maxX; x += 8)
          if (waterAt(SEED, x, y) === kind) { waterPoints.set(kind, { x, y }); return { x, y }; }
    }
  }
  assert.fail(`a ${kind} water fixture exists`);
}

for (const cat of ["zero", "nicole"]) {
  test(`${cat} catches fire across its radius, gets a full damage beat, and keeps burning off-grid`, () => {
    const s = quiet(cat), hp = s.player.hp;
    s.player.x = 479; // The centre is in column 19; the radius overlaps burning column 20.
    flame(s, 490, s.player.y);
    assert.ok(paperTouchesFire(s, s.player.x, s.player.y, STATS.playerRadius));
    run(s, DT);
    assert.ok(s.player.burnTime > 0);
    assert.equal(s.player.hp, hp, "ignition is not an instant hit");
    assert.equal(s.notice.kind, "burning");
    s.fire.cells = {};
    s.player.x = 400;
    run(s, FIRE.playerInterval - 2 * DT);
    assert.equal(s.player.hp, hp, "the first damage beat has not arrived");
    run(s, 2 * DT);
    assert.equal(s.player.hp, hp - FIRE.playerDamage);
    assert.ok(s.player.burnTime > 0, "leaving the flame does not extinguish paper");
  });

  test(`${cat} fire damage uses normal invulnerability, shields and defeat handling`, () => {
    const invulnerable = quiet(cat);
    invulnerable.player.burnTime = FIRE.actorBurnTime;
    invulnerable.player.invuln = 10;
    run(invulnerable, FIRE.playerInterval + DT);
    assert.equal(invulnerable.stats.damageTaken, 0);
    const shielded = quiet(cat), hp = shielded.player.hp;
    shielded.player.burnTime = FIRE.actorBurnTime;
    shielded.player.shield = 1;
    shielded.player.shieldTime = 10;
    run(shielded, FIRE.playerInterval + DT);
    assert.equal(shielded.player.hp, hp);
    assert.equal(shielded.player.shield, 0);
    assert.equal(shielded.stats.shieldBlocks, 1);
    run(shielded, FIRE.playerInterval);
    assert.equal(shielded.player.hp, hp - FIRE.playerDamage);
    const dying = quiet(cat);
    dying.player.hp = FIRE.playerDamage;
    dying.player.burnTime = FIRE.actorBurnTime;
    run(dying, FIRE.playerInterval + DT);
    assert.equal(dying.ended, "lost");
    const stopped = snapshot(dying);
    run(dying, 4);
    assert.deepEqual(snapshot(dying), stopped, "no post-death status or damage updates");
  });
}

test("fire triggers the existing low-health rescue hook, not a bypass damage path", () => {
  const s = quiet("nicole");
  s.player.hp = 3;
  s.player.burnTime = FIRE.actorBurnTime;
  run(s, FIRE.playerInterval + DT);
  assert.equal(s.player.hp, 2);
  assert.ok(s.player.rescueUsed);
  assert.ok(s.player.shield > 0);
  const shield = s.player.shield;
  run(s, FIRE.playerInterval);
  assert.equal(s.player.hp, 2);
  assert.equal(s.player.shield, shield - 1);
});

test("carried burn and damp timers expire with no fire cells, without infinite damage", () => {
  const s = quiet(), ctx = context();
  s.player.hp = 50;
  s.player.burnTime = FIRE.actorBurnTime;
  const e = blob(s, 600, 360, { wetTime: FIRE.wetTime });
  advanceFire(s, ctx, FIRE.actorBurnTime + 1);
  assert.equal(s.player.burnTime, 0);
  assert.equal(s.player.burnClock, 0);
  assert.equal(e.wetTime, 0);
  const damage = ctx.calls.player;
  advanceFire(s, ctx, 3);
  assert.equal(ctx.calls.player, damage);
  assert.equal(burningCount(s), 0);
});

test("enemies catch at their radius, carry DOT, respect arrival immunity, and stop damage on death", () => {
  const s = quiet(), ctx = context();
  const live = blob(s, 609, 360, { radius: 20 }),
    arriving = blob(s, 609, 360, { radius: 20, spawnTime: 1 });
  flame(s, 625, 360);
  stepPaperStatus(s, DT, ctx);
  assert.ok(live.burnTime > 0);
  assert.equal(arriving.burnTime, undefined);
  assert.equal(live.hp, 100);
  s.fire.cells = {};
  stepPaperStatus(s, FIRE.enemyInterval, ctx);
  assert.equal(live.hp, 100 - FIRE.enemyDamage);
  assert.equal(arriving.hp, 100);
  live.hp = FIRE.enemyDamage;
  stepPaperStatus(s, FIRE.actorBurnTime, ctx);
  assert.equal(live.alive, false);
  const hits = ctx.calls.enemy;
  stepPaperStatus(s, 1, ctx);
  assert.equal(ctx.calls.enemy, hits);
});

for (const kind of ["shallow", "deep"]) {
  test(`${kind} water extinguishes both actors before due damage, contact and carried spread`, () => {
    const s = quiet(), ctx = context(), pos = waterPoint(kind);
    Object.assign(s.player, pos, { burnTime: 2, burnClock: FIRE.playerInterval });
    const e = blob(s, pos.x, pos.y, { burnTime: 2, burnClock: FIRE.enemyInterval });
    flame(s, pos.x, pos.y);
    const hp = s.player.hp, rng = s.rngState;
    stepFire(s, FIRE.tick, ctx);
    assert.equal(s.player.hp, hp);
    assert.equal(e.hp, 100);
    assert.equal(s.player.burnTime, 0);
    assert.equal(e.burnTime, 0);
    assert.equal(s.player.wetTime, FIRE.wetTime);
    assert.equal(e.wetTime, FIRE.wetTime);
    assert.equal(ctx.calls.ignite, 0);
    assert.equal(burningCount(s), 0);
    assert.equal(Object.keys(s.fire.ash).length, 0, "extinguishing is not burning out");
    assert.equal(s.stats.cellsBurnt, 0);
    assert.equal(s.notice.kind, "extinguished");
    assert.equal(s.rngState, rng);
    ignite(s, pos.x, pos.y, 0, ctx);
    assert.equal(burningCount(s), 0);
  });
}

test("water contact includes the actor's edge, but a dry bridge never applies wetness", () => {
  const s = quiet(), ctx = context();
  const edge = waterRegionsNear(SEED, 480, 2700, 12000).flatMap((r) => r.shore.map((a, i) => {
    const b = r.shore[(i + 1) % r.shore.length], len = Math.hypot(b.x - a.x, b.y - a.y),
      nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len,
      x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    const reach = STATS.playerRadius - 0.001;
    return { x: x + nx * reach, y: y + ny * reach, inside: waterAt(SEED, x - nx, y - ny) };
  })).find((q) => waterAt(SEED, q.x, q.y) === "dry" && ["shallow", "deep"].includes(q.inside));
  assert.ok(edge, "a dry bank with water less than one actor radius away exists");
  s.player.x = edge.x;
  s.player.y = edge.y;
  assert.equal(waterAt(s.seed, s.player.x, s.player.y), "dry");
  s.player.burnTime = 2;
  stepPaperStatus(s, DT, ctx);
  assert.equal(s.player.burnTime, 0);
  assert.equal(s.player.wetTime, FIRE.wetTime);
  const dry = quiet(), deck = waterPoint("bridge"), [ix, iy] = cellOf(deck.x, deck.y);
  const centre = Array.from({ length: 9 }, (_, i) => ({
    x: (ix + i % 3 - 0.5) * FIRE.cell, y: (iy + Math.floor(i / 3) - 0.5) * FIRE.cell,
  })).find((q) => waterAt(SEED, q.x, q.y) === "bridge");
  assert.ok(centre, "a bridge contains a fire-grid centre");
  Object.assign(dry.player, centre, { burnTime: 2 });
  const key = flame(dry);
  assert.equal(paperTouchesWater(dry.seed, centre.x, centre.y, FIRE.cell * Math.SQRT1_2), false,
    "a footprint wholly on the deck stays dry");
  stepFire(dry, DT, ctx);
  assert.ok(dry.player.burnTime > 0);
  assert.equal(dry.player.wetTime ?? 0, 0);
  assert.ok(key in dry.fire.cells, "a dry bridge cell is not extinguished by water below it");
});

test("a bridge-centred actor is extinguished when its radius reaches exposed water beside the deck", () => {
  const s = quiet(), ctx = context();
  const edge = waterRegionsNear(SEED, 480, 2700, 12000).flatMap((r) => r.crossings.flatMap((c) =>
    c.polygon.map((a, i) => {
      const b = c.polygon[(i + 1) % c.polygon.length], len = Math.hypot(b.x - a.x, b.y - a.y),
        nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len,
        x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      return { x: x - nx * STATS.playerRadius / 2, y: y - ny * STATS.playerRadius / 2,
        outside: waterAt(SEED, x + nx, y + ny) };
    }))
  ).find((q) => waterAt(SEED, q.x, q.y) === "bridge" && ["shallow", "deep"].includes(q.outside));
  assert.ok(edge, "a deck edge adjoins exposed water");
  Object.assign(s.player, { x: edge.x, y: edge.y, burnTime: 2, burnClock: FIRE.playerInterval });
  const e = blob(s, edge.x, edge.y, { radius: STATS.playerRadius, burnTime: 2, burnClock: FIRE.enemyInterval });
  assert.equal(paperTouchesWater(SEED, edge.x, edge.y), false, "the centre is on a dry deck");
  assert.equal(paperTouchesWater(SEED, edge.x, edge.y, STATS.playerRadius), true);
  stepPaperStatus(s, DT, ctx);
  assert.equal(s.player.burnTime, 0);
  assert.equal(e.burnTime, 0);
  assert.equal(s.player.wetTime, FIRE.wetTime);
  assert.equal(e.wetTime, FIRE.wetTime);
  assert.equal(ctx.calls.player + ctx.calls.enemy, 0, "edge contact wins over due burn damage");
});

test("finished runs freeze exported prop mutations, lifecycle, fire and actor status", () => {
  for (const ended of ["lost", "won"]) {
    const s = quiet(), ctx = context(), grass = findProp("paper-grass"), fence = findProp("paper-fence"),
      crate = findProp("paper-crate");
    damageProp(s, grass, 100, ctx);
    s.elapsed = s.props[grass.id].regrowAt;
    s.player.burnTime = 2;
    s.player.burnClock = FIRE.playerInterval;
    blob(s, 600, 360, { burnTime: 2, burnClock: FIRE.enemyInterval });
    flame(s);
    s.ended = ended;
    const before = snapshot(s), calls = { ...ctx.calls };
    stepFire(s, FIRE.tick, ctx);
    stepPaperStatus(s, FIRE.tick, ctx);
    stepPropLifecycle(s, ctx);
    damageProp(s, crate, 100, ctx);
    foldProp(s, fence, 2);
    inkProp(s, fence, 2);
    elementHit(s, fence.x, fence.y, 10, "cut", 100, ctx);
    ignite(s, grass.x, grass.y, 50, ctx);
    assert.deepEqual(snapshot(s), before, `${ended} freezes simulation-bearing prop/status fields`);
    assert.deepEqual(ctx.calls, calls);
  }
});

test("leaving water grants short wet immunity even while touching a new dry flame", () => {
  const s = quiet(), ctx = context(), pos = waterPoint("shallow");
  Object.assign(s.player, pos, { burnTime: 2 });
  stepFire(s, DT, ctx);
  s.player.x = 480;
  s.player.y = 360;
  flame(s, s.player.x, s.player.y, 10);
  advanceFire(s, ctx, FIRE.wetTime - 0.25);
  assert.equal(s.player.burnTime, 0);
  assert.equal(ctx.calls.player, 0);
  assert.equal(ctx.calls.ignite, 0);
  advanceFire(s, ctx, 0.5);
  assert.ok(s.player.burnTime > 0, "dry paper can eventually ignite again");
});

test("carried fire lights new dry fuel only on bounded fire ticks and never when wet", () => {
  const p = findProp("paper-grass"), s = quiet(), ctx = context();
  Object.assign(s.player, { x: p.x, y: p.y - 4, burnTime: 2 });
  assert.equal(paperTouchesWater(s.seed, s.player.x, s.player.y, STATS.playerRadius), false);
  advanceFire(s, ctx, FIRE.tick - DT);
  assert.equal(ctx.calls.ignite, 0);
  advanceFire(s, ctx, DT);
  assert.equal(ctx.calls.ignite, 1);
  assert.ok(burningCount(s) > 0);
  advanceFire(s, ctx, FIRE.tick);
  assert.equal(ctx.calls.ignite, 2);
  const damp = quiet(), dampCtx = context();
  Object.assign(damp.player, { x: p.x, y: p.y - 4, burnTime: 2, wetTime: 1 });
  advanceFire(damp, dampCtx, FIRE.tick);
  assert.equal(dampCtx.calls.ignite, 0);
  assert.equal(burningCount(damp), 0);
});

test("a many-cell prop loses durability once per tick, not once per footprint cell", () => {
  const p = findProp("paper-grass"), s = quiet(), ctx = context(), def = PROP_DEFS.get(p.kind);
  ignite(s, p.x, p.y - 4, 60, ctx);
  assert.ok(burningCount(s) > 1);
  advanceFire(s, ctx, FIRE.tick);
  assert.equal(s.props[p.id].hp, propMaxHp(def) - FIRE.propBurn);
  assert.equal(s.props[p.id].phase < 2, true);
  s.fire.cells = {};
  advanceFire(s, ctx, 1);
  assert.equal(s.props[p.id].hp, propMaxHp(def) - FIRE.propBurn, "extinguishing does not heal scorched durability");
});

test("renewable flora regrows offscreen on its deadline and never rolls a second drop", () => {
  const p = findProp("paper-bush", (p) => {
    const [cx, cy] = p.id.split("#")[0].split(",").map(Number), index = Number(p.id.split("#")[1]);
    return hash2(SEED, cx * 64 + index, cy, 71) < PROP_DEFS.get(p.kind).drops.shard;
  });
  const s = quiet(), ctx = context(), def = PROP_DEFS.get(p.kind);
  damageProp(s, p, 100, ctx);
  const m = s.props[p.id], drops = s.pickups.length + s.treats.length;
  assert.ok(drops > 0, "fixture actually exercises a lifetime drop");
  assert.equal(m.destroyedAt, s.elapsed);
  assert.equal(m.regrowAt, s.elapsed + def.regrow.seconds);
  assert.equal(m.dropsClaimed, true);
  s.player.x = 480;
  s.player.y = 360;
  run(s, DT);
  const chunk = chunkOf(p.x, p.y);
  assert.ok(!s.loadedChunks.includes(`${chunk.cx},${chunk.cy}`));
  s.elapsed = m.regrowAt - DT;
  run(s, DT);
  assert.equal(m.phase, 0, "unloaded chunks do not pause the deadline");
  clearWorldCache();
  const revisited = chunkContent(s.seed, chunk.cx, chunk.cy).props.find((q) => q.id === p.id);
  assert.equal(propPhase(s, revisited.id), 0);
  assert.equal(m.hp, propMaxHp(def));
  assert.ok(m.dropsClaimed);
  for (let cycle = 0; cycle < 3; cycle++) {
    damageProp(s, revisited, 100, ctx);
    s.elapsed = m.regrowAt;
    stepPropLifecycle(s, ctx);
  }
  assert.equal(s.pickups.length + s.treats.length, drops);
});

test("burnt flora regrows into fuel, clears only its own ash footprint and cannot produce loot", () => {
  const p = findProp("paper-grass"), s = quiet(), ctx = context(), def = PROP_DEFS.get(p.kind);
  ignite(s, p.x, p.y - 4, 60, ctx);
  advanceFire(s, ctx, 5);
  const m = s.props[p.id];
  assert.equal(m.phase, 2);
  assert.equal(m.burnt, true);
  assert.equal(m.regrowAt, m.destroyedAt + def.regrow.burntSeconds);
  assert.ok(Object.keys(s.fire.ash).length > 0);
  s.fire.ash["1000,1000"] = s.fire.ticks;
  const old = Object.keys(s.fire.ash).filter((key) => {
    const [ix, iy] = key.split(",").map(Number);
    return inFootprint(p, def, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell, 0);
  });
  assert.ok(old.length > 0);
  s.elapsed = m.regrowAt;
  stepPropLifecycle(s, ctx);
  assert.equal(m.phase, 0);
  assert.equal(m.burnt, undefined);
  for (const key of old) assert.equal(key in s.fire.ash, false);
  assert.ok("1000,1000" in s.fire.ash);
  ignite(s, p.x, p.y - 4, 60, ctx);
  assert.ok(burningCount(s) > 0, "old ash does not fireproof new fuel");
  damageProp(s, p, 100, ctx);
  assert.equal(s.pickups.length + s.treats.length, 0);
});

test("burning a loot-bearing plant claims its lifetime drop, including after regrowth", () => {
  const p = findProp("paper-bush", (p) => {
    const [cx, cy] = p.id.split("#")[0].split(",").map(Number), index = Number(p.id.split("#")[1]);
    return hash2(SEED, cx * 64 + index, cy, 71) < PROP_DEFS.get(p.kind).drops.shard;
  });
  const control = quiet(), s = quiet(), ctx = context();
  damageProp(control, p, 100, ctx);
  assert.ok(control.pickups.length > 0, "this plant normally yields loot");
  damageProp(s, p, 100, ctx, true);
  assert.equal(s.props[p.id].dropsClaimed, true);
  assert.equal(s.pickups.length + s.treats.length, 0);
  s.elapsed = s.props[p.id].regrowAt;
  stepPropLifecycle(s, ctx);
  damageProp(s, p, 100, ctx);
  assert.equal(s.pickups.length + s.treats.length, 0);
});

test("every renewable flora definition restores full HP after its own tear and burn deadlines", () => {
  for (const def of PROP_DEFS.all().filter((d) => d.regrow)) {
    for (const burnt of def.accepts.includes("fire") ? [false, true] : [false]) {
      const s = quiet(), ctx = context(), p = findProp(def.id);
      damageProp(s, p, 100, ctx, burnt);
      const m = s.props[p.id];
      s.elapsed = m.regrowAt - DT;
      stepPropLifecycle(s, ctx);
      assert.equal(m.phase, 2, `${def.id} must not grow early`);
      s.elapsed = m.regrowAt;
      stepPropLifecycle(s, ctx);
      assert.equal(m.phase, 0, `${def.id} renews after ${burnt ? "burning" : "tearing"}`);
      assert.equal(m.hp, propMaxHp(def));
      assert.equal(m.dropsClaimed, true);
    }
  }
});

test("solid regrowth waits for cat, enemies and nearby flames, then safely retries", () => {
  const p = findProp("paper-bush"), def = PROP_DEFS.get(p.kind), original = def.colliders;
  // Current flora is non-solid; exercise the generic contract for future solid flora.
  def.colliders = (_seed, x, y) => [{ x1: x, y1: y, x2: x, y2: y, radius: 8 }];
  try {
    const s = quiet(), ctx = context();
    damageProp(s, p, 100, ctx);
    const m = s.props[p.id];
    s.elapsed = m.regrowAt;
    Object.assign(s.player, { x: p.x, y: p.y });
    stepPropLifecycle(s, ctx);
    assert.equal(m.phase, 2);
    assert.equal(m.regrowAt, s.elapsed + ECOLOGY.retrySeconds);
    s.player.x = 480;
    s.player.y = 360;
    const e = blob(s, p.x, p.y, { radius: 22 });
    s.elapsed = m.regrowAt;
    stepPropLifecycle(s, ctx);
    assert.equal(m.phase, 2);
    e.alive = false;
    flame(s, p.x, p.y);
    s.elapsed = m.regrowAt;
    stepPropLifecycle(s, ctx);
    assert.equal(m.phase, 2);
    s.fire.cells = {};
    s.elapsed = m.regrowAt;
    stepPropLifecycle(s, ctx);
    assert.equal(m.phase, 0);
  } finally { if (original) def.colliders = original; else delete def.colliders; }
});

test("folding temporarily removes colliders without damage or loot and unfolds only when safe", () => {
  const p = findProp("paper-fence"), s = quiet(), ctx = context(), def = PROP_DEFS.get(p.kind),
    before = standingPropColliders(s, p.x, p.y).length;
  foldProp(s, p, 1);
  const m = s.props[p.id];
  assert.equal(propBlocks(s, p.id), false);
  assert.equal(standingPropColliders(s, p.x, p.y).length, before - 1);
  assert.equal(m.hp, propMaxHp(def));
  assert.equal(m.phase, 0);
  assert.equal(m.destroyedAt, undefined);
  assert.equal(m.dropsClaimed, undefined);
  assert.equal(s.stats.propsTorn, 0);
  assert.equal(s.pickups.length + s.treats.length, 0);
  s.elapsed = 1;
  s.player.x = p.x;
  s.player.y = p.y;
  assert.equal(propBlocks(s, p.id), false, "deadline alone must not trap an actor before lifecycle runs");
  stepPropLifecycle(s, ctx);
  assert.ok(m.foldedUntil > s.elapsed);
  s.player.x = 480;
  s.player.y = 360;
  s.elapsed = m.foldedUntil;
  stepPropLifecycle(s, ctx);
  assert.equal(propBlocks(s, p.id), true);
  assert.equal(standingPropColliders(s, p.x, p.y).length, before);
});

test("ink temporarily suppresses ignition and fuel damage without restoring damaged HP", () => {
  const p = findProp("paper-grass"), s = quiet(), ctx = context(), def = PROP_DEFS.get(p.kind);
  damageProp(s, p, 0.5, ctx, true);
  const hp = s.props[p.id].hp;
  inkProp(s, p, 1);
  ignite(s, p.x, p.y - 4, 1, ctx);
  assert.equal(burningCount(s), 0);
  flame(s, p.x, p.y - 4);
  advanceFire(s, ctx, FIRE.tick);
  assert.equal(s.props[p.id].hp, hp);
  s.fire.cells = {};
  s.elapsed = 1;
  stepPropLifecycle(s, ctx);
  assert.equal(s.props[p.id].inkedUntil, undefined);
  assert.equal(s.props[p.id].hp, propMaxHp(def) - 0.5);
  ignite(s, p.x, p.y - 4, 20, ctx);
  assert.ok(burningCount(s) > 0);
});

test("handcrafted props stay destroyed, only the five natural flora defs regrow", () => {
  const renewable = PROP_DEFS.all().filter((d) => d.regrow).map((d) => d.id).sort();
  assert.deepEqual(renewable, ["paper-bush", "paper-flowers", "paper-grass", "paper-mushroom", "paper-reeds"]);
  const s = quiet(), ctx = context(), p = findProp("paper-fence");
  damageProp(s, p, 100, ctx);
  s.elapsed = 800;
  stepPropLifecycle(s, ctx);
  assert.equal(s.props[p.id].phase, 2);
  assert.equal(s.props[p.id].regrowAt, undefined);
});

test("status, regrowth and fire snapshots are deterministic, RNG-free and within caps", () => {
  const go = () => {
    const s = quiet(), ctx = context(), rng = s.rngState;
    s.player.hp = 50;
    const p = findProp("paper-grass");
    Object.assign(s.player, { x: p.x, y: p.y - 4, burnTime: 2 });
    for (let cy = 1; cy < 5; cy++) for (let cx = -3; cx < 4; cx++)
      for (const q of chunkContent(s.seed, cx, cy).props) ignite(s, q.x, q.y, 100, ctx);
    for (let i = 0; i < FIRE.maxAsh + 20; i++) s.fire.ash[`${1000 + i},1000`] = i;
    for (let i = 0; i < 180; i++) {
      s.elapsed += DT;
      stepFire(s, DT, ctx);
      assert.ok(burningCount(s) <= FIRE.maxCells);
      if (s.fire.ticks) assert.ok(Object.keys(s.fire.ash).length <= FIRE.maxAsh);
    }
    assert.equal(s.rngState, rng);
    s.player.x = 480;
    s.player.y = 360;
    s.elapsed = 100;
    s.fire.cells = {};
    stepFire(s, DT, ctx);
    return snapshot(s);
  };
  const first = go();
  clearWorldCache();
  assert.deepEqual(go(), first);
});
