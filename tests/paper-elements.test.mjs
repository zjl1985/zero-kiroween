import assert from "node:assert/strict";
import { test } from "node:test";
import { MATERIALS, PROP_DEFS, REACTIONS, reactionFor } from "../dist/defs/index.js";
import { NICOLE } from "../dist/defs/cats/nicole/def.js";
import { SMUDGE, SMUDGE_DEF } from "../dist/defs/enemies/smudge/def.js";
import { INK_VAT } from "../dist/defs/props/ink-vat/def.js";
import { WAX_CANDLE } from "../dist/defs/props/wax-candle/def.js";
import { FOLD_CARD } from "../dist/defs/reactions/fold-card.js";
import { FOLD_THIN_PAPER } from "../dist/defs/reactions/fold-thin-paper.js";
import { INK_CARD } from "../dist/defs/reactions/ink-card.js";
import { INK_THIN_PAPER } from "../dist/defs/reactions/ink-thin-paper.js";
import { GUST_INK } from "../dist/defs/reactions/gust-ink.js";
import { MELT_WAX } from "../dist/defs/reactions/melt-wax.js";
import { PAPER_ELEMENTS } from "../dist/defs/reactions/paper-status.js";
import { WASH } from "../dist/defs/wash.js";
import { SPILL_INK } from "../dist/defs/reactions/spill-ink.js";
import { CRANE_FOLD, PAPER_CRANE } from "../dist/defs/weapons/paper-crane.js";
import { damageProp, nearPropColliders, propMaxHp, standingPropColliders, stepPropLifecycle } from "../dist/game/props.js";
import { applyElement, createSim } from "../dist/game/sim.js";
import { playerStats } from "../dist/game/stats.js";
import { CHUNK, chunkContent, clearWorldCache } from "../dist/game/world-gen.js";

function state(cat = "zero") { return createSim({ seed: 7, cat }); }
function context() {
  const calls = { elements: [], damage: [], shards: [], treats: [], hurt: [], wash: [] };
  const ctx = {
    calls,
    effect(s, x, y, kind, life, extra) { s.impacts.push({ x, y, kind, life, ...extra }); },
    notify(s, kind) { s.notice = { kind, life: 2 }; },
    elementHit(_s, x, y, radius, element, power) { calls.elements.push({ x, y, radius, element, power }); },
    damageProp(s, p, amount, burnt = false) { calls.damage.push({ p, amount, burnt }); damageProp(s, p, amount, ctx, burnt); },
    dropShard(_s, x, y, value) { calls.shards.push({ x, y, value }); },
    dropTreat(_s, x, y) { calls.treats.push({ x, y }); },
    hurtPlayer(_s, amount) { calls.hurt.push(amount); return true; },
    enemyRadius: () => 11,
    knockOf: () => 1,
    safePosition: (_s, x, y) => ({ x, y }),
    spawnShot(s, shot) { s.shots.push({ ...shot, id: s.nextShotId++ }); },
    nearestEnemy: () => undefined,
    wash(_s, x, y, radius, amount, soak = true) { calls.wash.push({ x, y, radius, amount, soak }); },
    paint() {},
  };
  return ctx;
}
function hit(def, element, power = 1, prop = { id: "1,1#999", kind: def.id, x: 100, y: 100, s: 1, seed: 7 }) {
  return { def, prop, element, power, material: MATERIALS.get(def.material) };
}
function findProp(kind, seed = 7) {
  for (let cy = 1; cy <= CHUNK.maxCy; cy++) for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) {
    const p = chunkContent(seed, cx, cy).props.find((p) => p.kind === kind);
    if (p) return p;
  }
  assert.fail(`no ${kind} in seed ${seed}`);
}

test("ink, fold, ink-vat and wax reactions are registered with unique material/element pairs", () => {
  const pairs = new Set();
  for (const row of REACTIONS.all()) {
    const pair = `${row.material}:${row.element}`;
    assert.ok(!pairs.has(pair), pair);
    pairs.add(pair);
  }
  for (const material of ["thin-paper", "card", "cloth", "straw"]) for (const element of ["ink", "fold"])
    assert.ok(reactionFor(material, element), `${material} accepts ${element}`);
  for (const def of [INK_VAT, WAX_CANDLE]) {
    assert.equal(PROP_DEFS.get(def.id), def);
    for (const element of def.accepts) assert.ok(reactionFor(def.material, element));
    assert.equal(def.regrow, undefined, "handmade supplies never regrow for repeat loot");
  }
  assert.ok(reactionFor("wax", "fire"));
  assert.ok(reactionFor("wax", "cut"));
  assert.ok(reactionFor("ink", "cut"));
  assert.ok(reactionFor("ink", "wind"));
});

test("first ink/fold touches use actual material-scaled max HP, preserve damage and only refresh deadlines", () => {
  const s = state(), ctx = context(), def = PROP_DEFS.get("paper-fence"), h = hit(def, "fold");
  s.elapsed = 10;
  FOLD_CARD.effect(s, h, ctx);
  const m = s.props[h.prop.id];
  assert.equal(m.hp, propMaxHp(def));
  assert.equal(m.hp, def.durability * MATERIALS.get("card").durability);
  assert.equal(m.phase, 0);
  assert.equal(m.foldedUntil, 10 + PAPER_ELEMENTS.foldSeconds);
  assert.equal(ctx.calls.damage.length, 0);
  assert.equal(s.stats.propsTorn, 0);
  assert.equal(ctx.calls.shards.length + ctx.calls.treats.length, 0);

  m.hp = 2; m.phase = 1; m.hitAt = 9; m.dropsClaimed = true;
  INK_CARD.effect(s, hit(def, "ink"), ctx);
  assert.equal(m.inkedUntil, 10 + PAPER_ELEMENTS.inkSeconds);
  s.elapsed = 11;
  for (let i = 0; i < 10; i++) {
    FOLD_CARD.effect(s, h, ctx);
    INK_CARD.effect(s, hit(def, "ink"), ctx);
  }
  assert.equal(m.hp, 2);
  assert.equal(m.phase, 1);
  assert.equal(m.hitAt, 9);
  assert.equal(m.dropsClaimed, true);
  assert.equal(m.foldedUntil, 11 + PAPER_ELEMENTS.foldSeconds, "no additive folding stack");
  assert.equal(m.inkedUntil, 11 + PAPER_ELEMENTS.inkSeconds, "no additive coating stack");
  m.phase = 2; m.hp = 0;
  const saved = structuredClone(m);
  s.elapsed += 10;
  FOLD_CARD.effect(s, h, ctx);
  INK_CARD.effect(s, hit(def, "ink"), ctx);
  assert.deepEqual(m, saved, "scraps cannot be restored by ink or fold");
});

test("invalid statuses and folding flat flora do not create touched state", () => {
  const s = state(), ctx = context(), fence = PROP_DEFS.get("paper-fence");
  for (const power of [0, -1, Infinity, NaN]) {
    FOLD_CARD.effect(s, hit(fence, "fold", power), ctx);
    INK_CARD.effect(s, hit(fence, "ink", power), ctx);
  }
  assert.deepEqual(s.props, {});
  const grass = PROP_DEFS.get("paper-grass");
  FOLD_THIN_PAPER.effect(s, hit(grass, "fold"), ctx);
  assert.deepEqual(s.props, {}, "no obstacle to fold in flat grass");
});

test("registered fold opens a fence without loot; expiry waits for an occupying cat before restoring collision", () => {
  const s = state(), ctx = context(), p = findProp("paper-fence"), def = PROP_DEFS.get(p.kind);
  const caps = nearPropColliders(s.seed, p.x, p.y).find((entry) => entry.id === p.id).caps;
  assert.ok(standingPropColliders(s, p.x, p.y).includes(caps));
  applyElement(s, p.x, p.y - 3, 2, "fold", 2);
  assert.ok(!standingPropColliders(s, p.x, p.y).includes(caps));
  assert.equal(s.props[p.id].hp, propMaxHp(def));
  assert.equal(s.props[p.id].phase, 0);
  assert.equal(s.stats.propsTorn, 0);
  assert.equal(s.pickups.length, 0);
  assert.equal(s.treats.length, 0);
  clearWorldCache();
  s.elapsed = s.props[p.id].foldedUntil + 0.01;
  s.player.x = p.x; s.player.y = p.y - 3;
  stepPropLifecycle(s, ctx);
  assert.ok(s.props[p.id].foldedUntil > s.elapsed, "never unfold a fence through the cat");
  s.player.x = 480; s.player.y = 360;
  s.elapsed = s.props[p.id].foldedUntil + 0.01;
  stepPropLifecycle(s, ctx);
  assert.equal(s.props[p.id].foldedUntil, undefined);
  assert.ok(standingPropColliders(s, p.x, p.y).some((group) => group.some((c) => c.x1 === caps[0].x1 && c.y1 === caps[0].y1)));
});

test("ink coats living paper temporarily without healing it or changing seeded randomness", () => {
  const s = state(), ctx = context(), p = findProp("paper-grass"), def = PROP_DEFS.get(p.kind), rng = s.rngState;
  const h = hit(def, "ink", 1, p);
  INK_THIN_PAPER.effect(s, h, ctx);
  assert.equal(s.props[p.id].hp, propMaxHp(def));
  assert.equal(s.props[p.id].inkedUntil, s.elapsed + PAPER_ELEMENTS.inkSeconds);
  s.props[p.id].hp /= 2;
  const hp = s.props[p.id].hp;
  s.elapsed = 1;
  INK_THIN_PAPER.effect(s, h, ctx);
  assert.equal(s.props[p.id].hp, hp);
  assert.equal(s.props[p.id].inkedUntil, 1 + PAPER_ELEMENTS.inkSeconds);
  s.elapsed = s.props[p.id].inkedUntil;
  stepPropLifecycle(s, ctx);
  assert.equal(s.props[p.id].inkedUntil, undefined);
  assert.equal(s.rngState, rng);
});

test("a struck ink vat splashes ink for cut and wind without recursively reacting to its own splash", () => {
  for (const row of [SPILL_INK, GUST_INK]) {
    const s = state(), ctx = context(), h = hit(INK_VAT, row.element, 1);
    row.effect(s, h, ctx);
    assert.deepEqual(ctx.calls.elements, [{ x: h.prop.x, y: h.prop.y, radius: PAPER_ELEMENTS.inkSpreadRadius, element: "ink", power: 1 }]);
    assert.equal(s.props[h.prop.id].hp, propMaxHp(INK_VAT) - MATERIALS.get("ink").tearability);
    assert.ok(!INK_VAT.accepts.includes("ink"));
    row.effect(s, hit(INK_VAT, row.element, 100), ctx);
    assert.equal(s.props[h.prop.id].phase, 2);
    const count = ctx.calls.elements.length, loot = ctx.calls.shards.length;
    row.effect(s, h, ctx);
    assert.equal(ctx.calls.elements.length, count, "empty scraps do not keep spilling");
    assert.equal(ctx.calls.shards.length, loot);
  }
});

test("heat melts wax as consumed material, without loot or an invented ignition", () => {
  const s = state(), ctx = context(), h = hit(WAX_CANDLE, "fire", 1);
  MELT_WAX.effect(s, h, ctx);
  assert.equal(s.props[h.prop.id].hp, propMaxHp(WAX_CANDLE) - PAPER_ELEMENTS.waxHeatScale);
  assert.equal(ctx.calls.damage[0].burnt, true);
  MELT_WAX.effect(s, hit(WAX_CANDLE, "fire", 100), ctx);
  assert.equal(s.props[h.prop.id].phase, 2);
  assert.equal(s.props[h.prop.id].burnt, true);
  assert.equal(s.props[h.prop.id].dropsClaimed, true);
  assert.equal(ctx.calls.shards.length + ctx.calls.treats.length, 0);
  assert.deepEqual(s.fire.cells, {});
});

test("smudge drops apply ink exactly once on landing while retaining puddle and splash behavior", () => {
  const s = state(), ctx = context(), p = s.player, rng = s.rngState;
  s.enemyShots.push({ id: 1, x0: p.x - 100, y0: p.y, tx: p.x, ty: p.y, t: 0, flight: 1, alive: true });
  SMUDGE_DEF.stepWorld(s, 0.5, ctx);
  assert.equal(ctx.calls.elements.length, 0);
  SMUDGE_DEF.stepWorld(s, 0.5, ctx);
  assert.deepEqual(ctx.calls.elements, [{ x: p.x, y: p.y, radius: SMUDGE.puddleRadius, element: "ink", power: SMUDGE.inkPower }]);
  assert.equal(s.enemyShots[0].alive, false);
  assert.equal(s.hazards.length, 1);
  assert.equal(s.hazards[0].radius, SMUDGE.puddleRadius);
  assert.equal(s.hazards[0].life, SMUDGE.puddleLife);
  assert.deepEqual(ctx.calls.hurt, [SMUDGE.splashDamage]);
  // The wet ink also leaves a wash stain on the ground, without soaking props (the ink coat stays).
  assert.deepEqual(ctx.calls.wash, [{ x: p.x, y: p.y, radius: SMUDGE.puddleRadius, amount: WASH.smudgeStain, soak: false }]);
  SMUDGE_DEF.stepWorld(s, 2, ctx);
  assert.equal(ctx.calls.elements.length, 1);
  assert.equal(s.rngState, rng);
});

test("Nicole exposes no manual skill hook; fold is supplied by automatic weapons", () => {
  assert.equal("onSkill" in NICOLE,false);
  const s=state("nicole");
  assert.equal(s.fields.length,0);
  assert.equal(s.player.shield,0);
});

test("both cats' crane volleys add exactly one fold pulse but preserve shot fan, homing, timing and RNG", (t) => {
  t.mock.method(Math, "random", () => assert.fail("crane consumed Math.random"));
  const noRng = new Proxy({}, { get() { assert.fail("crane consumed step RNG"); } });
  for (const cat of ["zero", "nicole"]) for (const level of [1, 3, 5]) {
    const s = state(cat), ctx = context(), rng = s.rngState;
    s.upgrades["paper-crane"] = level;
    const ps = playerStats(s), c = ps.crane, p = s.player;
    ctx.nearestEnemy = () => ({ x: p.x + 80, y: p.y + 20 });
    PAPER_CRANE.step(s, ps, 1 / 60, noRng, ctx);
    assert.deepEqual(ctx.calls.elements, [{ x: p.x, y: p.y, radius: CRANE_FOLD.radius, element: "fold", power: CRANE_FOLD.power }]);
    assert.equal(PAPER_CRANE.elements[0], "wind", "shot impacts remain wind");
    assert.equal(s.shots.length, c.count);
    for (let i = 0; i < c.count; i++) {
      const a = Math.atan2(20, 80) + (i - (c.count - 1) / 2) * 0.9;
      const { id, ...shot } = s.shots[i];
      assert.deepEqual(shot, { x: p.x, y: p.y, vx: Math.cos(a) * c.speed, vy: Math.sin(a) * c.speed,
        life: c.life, alive: true, weapon: "crane", damage: c.damage, pierce: c.pierce, homing: c.turn, hits: [] });
      assert.ok(id > 0);
    }
    assert.equal(s.weaponTimers["paper-crane"], c.interval);
    PAPER_CRANE.step(s, ps, 1 / 60, noRng, ctx);
    assert.equal(ctx.calls.elements.length, 1, "no second pulse during reload");
    s.weaponTimers["paper-crane"] = 0;
    ctx.nearestEnemy = () => undefined;
    PAPER_CRANE.step(s, ps, 1 / 60, noRng, ctx);
    assert.equal(ctx.calls.elements.length, 1, "no phantom launch with no enemy target");
    assert.equal(s.shots.length, c.count);
    assert.equal(s.rngState, rng);
  }
});

test("soakedUntil expires in lifecycle, clears on scraps, and dry water hits splash without steam", () => {
  const s = state(), ctx = context(), fence = findProp("paper-fence"), row = reactionFor("card", "water");
  assert.equal(row.fx, "splash", "water on a dry prop splashes instead of steaming");
  s.elapsed = 12;
  applyElement(s, fence.x, fence.y, 16, "water", 1);
  assert.equal(s.props[fence.id].soakedUntil, 12 + WASH.soakSeconds);
  assert.ok(s.impacts.some((e) => e.kind === "splash"), "dry water hit emits splash");
  assert.ok(!s.impacts.some((e) => e.kind === "steam"), "dry water hit emits no steam");

  // Expiry cleans up soakedUntil.
  s.elapsed = 12 + WASH.soakSeconds + 0.1;
  stepPropLifecycle(s, ctx);
  assert.equal(s.props[fence.id].soakedUntil, undefined, "expired soak is removed");

  // Destruction clears soakedUntil.
  s.elapsed = 30;
  applyElement(s, fence.x, fence.y, 16, "water", 1);
  assert.ok(s.props[fence.id].soakedUntil > 30);
  damageProp(s, fence, 999, ctx, false);
  assert.equal(s.props[fence.id].phase, 2);
  assert.equal(s.props[fence.id].soakedUntil, undefined, "scraps clear soakedUntil");
});
