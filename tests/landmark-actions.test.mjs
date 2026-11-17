import assert from "node:assert/strict";
import { test } from "node:test";
import { LANDMARK_DEFS, PROP_DEFS } from "../dist/defs/index.js";
import {
  GREENHOUSE, LANDMARK_ACTIONS, LANDMARK_ACTIVITY_SITES, OBSERVATORY, TEA, WINDMILL, landmarkActivityPoint,
} from "../dist/defs/landmark-activities.js";
import { pointSegDist } from "../dist/game/collision.js";
import { hitLandmarkActions, stepLandmarkActions } from "../dist/game/landmark-actions.js";
import { createSim, step } from "../dist/game/sim.js";
import { damageProp, propMaxHp, stepPropLifecycle } from "../dist/game/props.js";
import { STATS } from "../dist/game/types.js";
import { clearWorldCache, landmarkParts, landmarks, nearProps } from "../dist/game/world-gen.js";

function quiet(seed = 7) {
  const s = createSim({ seed, cat: "zero" });
  s.spawnTimer = s.treatTimer = s.player.attackCooldown = 1e9;
  s.wavesDone = s.elitesDone = 99;
  s.boss.spawned = true;
  return s;
}
function context() {
  return {
    effect(s, x, y, kind, life, extra) { s.impacts.push({ x, y, kind, life, ...extra }); },
    notify(s, kind) { s.notice = { kind, life: 2 }; },
    dropShard(s, x, y, value) { s.pickups.push({ id: s.nextPickupId++, x, y, value, alive: true, age: 0 }); },
    dropTreat(s, x, y) { s.treats.push({ id: s.nextTreatId++, x, y, alive: true, life: 20 }); },
    hurtEnemy(_s, e, amount) { e.hp -= amount; if (e.hp <= 0) e.alive = false; },
  };
}
function place(s, kind) {
  const l = landmarks(s.seed).find((l) => l.kind === kind);
  assert.ok(l, `${kind} is placed`);
  return l;
}
function stand(s, l) { Object.assign(s.player, landmarkActivityPoint(l)); }
function away(s) { s.player.x = 480; s.player.y = 360; }
function advance(s, dt, ctx) { s.elapsed += dt; stepLandmarkActions(s, dt, ctx); }
function hit(s, l, element, power, ctx) {
  const p = landmarkActivityPoint(l);
  hitLandmarkActions(s, p.x, p.y, 1, element, power, ctx);
}
function enemy(id, x, y, extra = {}) {
  return { id, kind: "ink-blob", x, y, hp: 20, alive: true, spawnTime: 0, orbitCooldown: 0, slowTime: 0, ...extra };
}

test("activity anchors are visible courts with a walkable approach, never building centres", () => {
  for (const seed of [0, 7, 23]) for (const l of landmarks(seed)) {
    const def = LANDMARK_DEFS.get(l.kind);
    if (!def.activity) continue;
    assert.ok(LANDMARK_ACTIVITY_SITES[l.kind]);
    const p = landmarkActivityPoint(l), walls = landmarkParts(l).colliders;
    for (let y = p.y; y <= l.y + l.radius; y += 4) for (const c of walls) {
      assert.ok(pointSegDist(p.x, y, c.x1, c.y1, c.x2, c.y2) > c.radius + STATS.playerRadius,
        `${l.kind}: a cat can approach the activity from the road`);
    }
  }
});

test("tea charges only nearby, preserves partial progress away and heals once per cooldown", () => {
  const s = quiet(), ctx = context(), l = place(s, "paper-teahouse");
  s.player.hp = 1;
  advance(s, 10, ctx);
  assert.equal(s.landmarkEvents[l.id], undefined, "unvisited sites do not allocate state");
  stand(s, l);
  advance(s, TEA.seconds / 2, ctx);
  assert.equal(s.player.hp, 1);
  const event = s.landmarkEvents[l.id];
  assert.equal(event.progress, TEA.seconds / 2);
  away(s);
  advance(s, 10, ctx);
  assert.equal(event.progress, TEA.seconds / 2, "offscreen time does not charge tea");
  stand(s, l);
  advance(s, TEA.seconds / 2, ctx);
  assert.equal(s.player.hp, 1 + TEA.heal);
  assert.equal(event.activations, 1);
  assert.equal(event.cooldown, TEA.cooldown);
  assert.equal(s.notice.kind, "landmark-tea");
  assert.ok(s.impacts.some((e) => e.kind === "steam"));
  advance(s, TEA.cooldown, ctx);
  assert.equal(event.activations, 1, "cooldown time itself earns no charge");
  advance(s, TEA.seconds, ctx);
  assert.equal(event.activations, 2);
  s.player.hp = s.player.maxHp;
  advance(s, TEA.cooldown + TEA.seconds, ctx);
  assert.equal(s.player.hp, s.player.maxHp, "healing is capped");
});

test("observatory alignment freezes nearby living enemies and pays a finite shard reward, not a map reveal", () => {
  const s = quiet(), ctx = context(), l = place(s, "star-observatory"), p = landmarkActivityPoint(l);
  stand(s, l);
  s.enemies = [enemy(1, p.x + 20, p.y), enemy(2, p.x, p.y + 10, { stun: 8 }),
    enemy(3, p.x + OBSERVATORY.pulseRadius + 1, p.y), enemy(4, p.x, p.y, { alive: false }),
    enemy(5, p.x, p.y, { spawnTime: 1 })];
  const found = [...s.landmarksFound];
  advance(s, OBSERVATORY.seconds, ctx);
  assert.equal(s.enemies[0].stun, OBSERVATORY.freeze);
  assert.equal(s.enemies[1].stun, 8, "stronger existing stun is preserved");
  for (const e of s.enemies.slice(2)) assert.equal(e.stun, undefined);
  assert.equal(s.pickups.length, 1);
  assert.deepEqual([s.pickups[0].x, s.pickups[0].y, s.pickups[0].value], [p.x, p.y, OBSERVATORY.shardValue]);
  assert.deepEqual(s.landmarksFound, found, "does not pretend to discover or reveal targets");
  advance(s, OBSERVATORY.seconds, ctx);
  assert.equal(s.pickups.length, 1);
  assert.ok(s.impacts.some((e) => e.kind === "moon-stun" && e.radius === OBSERVATORY.pulseRadius));
  assert.equal(s.notice.kind, "landmark-observatory");
});

test("greenhouse and windmill require their elements; wind hits drive a useful pulse only after enough charge", () => {
  const s = quiet(), ctx = context(), greenhouse = place(s, "fold-greenhouse"), mill = place(s, "paper-windmill");
  stand(s, greenhouse);
  advance(s, 20, ctx);
  assert.equal(s.landmarkEvents[greenhouse.id], undefined);
  hit(s, greenhouse, "fire", 100, ctx);
  hit(s, greenhouse, "wind", 100, ctx);
  assert.equal(s.landmarkEvents[greenhouse.id], undefined);
  hit(s, greenhouse, "fold", 1, ctx);
  assert.equal(s.landmarkEvents[greenhouse.id].progress, 1);
  hit(s, greenhouse, "fold", 1, ctx);
  assert.equal(s.treats.length, 1);
  assert.equal(s.landmarkEvents[greenhouse.id].cooldown, GREENHOUSE.cooldown);
  hit(s, greenhouse, "fold", 100, ctx);
  assert.equal(s.treats.length, 1, "repeated folds cannot farm treats in a cooldown");

  const p = landmarkActivityPoint(mill);
  s.enemies = [enemy(1, p.x + 10, p.y), enemy(2, p.x + WINDMILL.pulseRadius + 1, p.y)];
  hit(s, mill, "fold", 100, ctx);
  assert.equal(s.landmarkEvents[mill.id], undefined);
  hit(s, mill, "wind", 100, ctx);
  const event = s.landmarkEvents[mill.id];
  assert.equal(event.progress, LANDMARK_ACTIONS.maxHitCharge, "one overpowered hit is still bounded");
  assert.equal(event.wind, LANDMARK_ACTIONS.windSeconds);
  assert.equal(event.activations, 0);
  hit(s, mill, "wind", 1, ctx);
  assert.equal(event.activations, 1);
  assert.equal(event.cooldown, WINDMILL.cooldown);
  assert.equal(s.enemies[0].hp, 20 - WINDMILL.damage);
  assert.equal(s.enemies[0].stun, WINDMILL.freeze);
  assert.equal(s.enemies[1].hp, 20);
  assert.equal(s.pickups[0].value, WINDMILL.shardValue);
  hit(s, mill, "wind", 100, ctx);
  assert.equal(event.activations, 1);
  assert.equal(s.pickups.length, 1);
  assert.equal(s.notice.kind, "landmark-windmill");
});

test("greenhouse tending advances only nearby renewable scraps and never resets HP or loot claims", () => {
  let fixture;
  for (const seed of [7, 5, 23, 91]) {
    const s = quiet(seed), l = place(s, "fold-greenhouse"), p = landmarkActivityPoint(l);
    const nearby = nearProps(seed, p.x, p.y).filter((q) => Math.hypot(q.x - p.x, q.y - p.y) <= GREENHOUSE.renewal.radius);
    if (nearby.some((q) => PROP_DEFS.get(q.kind).regrow)) { fixture = { s, l, nearby }; break; }
  }
  assert.ok(fixture, "a seeded greenhouse has renewable flora within tending reach");
  const { s, l, nearby } = fixture, ctx = context();
  s.elapsed = 100;
  for (const p of nearby) s.props[p.id] = { hp: 0, phase: 2, hitAt: 1, destroyedAt: 1, regrowAt: 200, dropsClaimed: true, burnt: true };
  s.props["far-away-sentinel"] = { hp: 0, phase: 2, hitAt: 1, destroyedAt: 1, regrowAt: 200, dropsClaimed: true };
  hit(s, l, "fold", GREENHOUSE.seconds, ctx);
  const tended = nearby.filter((p) => s.props[p.id].regrowAt === s.elapsed);
  assert.ok(tended.length > 0 && tended.length <= GREENHOUSE.renewal.maxProps);
  for (const p of nearby) {
    const m = s.props[p.id];
    assert.equal(m.hp, 0);
    assert.equal(m.phase, 2, "ecology must do the eventual collision-safe restoration");
    assert.equal(m.destroyedAt, 1);
    assert.equal(m.dropsClaimed, true);
    if (!PROP_DEFS.get(p.kind).regrow) assert.equal(m.regrowAt, 200, "no handmade prop resurrection");
  }
  assert.equal(s.props["far-away-sentinel"].regrowAt, 200);
  assert.equal(s.pickups.length, 0, "tending does not award prop loot again");
  assert.equal(s.treats.length, 1);
  stepPropLifecycle(s, ctx);
  for (const p of tended) {
    assert.equal(s.props[p.id].hp, propMaxHp(PROP_DEFS.get(p.kind)), "regrowth restores real material-scaled HP");
    assert.equal(s.props[p.id].phase, 0);
    damageProp(s, p, 100, ctx);
    assert.equal(s.props[p.id].phase, 2);
  }
  assert.equal(s.pickups.length, 0, "cutting renewed flora cannot re-roll its shard drops");
  assert.equal(s.treats.length, 1, "cutting renewed flora cannot re-roll its treat drops");
});

test("offscreen cooldowns survive cache reload, invalid inputs cannot create state, and work is bounded by sites", () => {
  const s = quiet(), ctx = context(), l = place(s, "paper-windmill");
  for (const power of [0, -1, NaN, Infinity]) hit(s, l, "wind", power, ctx);
  const p = landmarkActivityPoint(l);
  for (const radius of [-1, NaN, Infinity]) hitLandmarkActions(s, p.x, p.y, radius, "wind", 1, ctx);
  hitLandmarkActions(s, NaN, p.y, 1, "wind", 1, ctx);
  hitLandmarkActions(s, p.x + WINDMILL.radius + 2, p.y, 1, "wind", 1, ctx);
  assert.deepEqual(s.landmarkEvents, {});
  hit(s, l, "wind", 2, ctx);
  hit(s, l, "wind", 1, ctx);
  const event = s.landmarkEvents[l.id];
  away(s);
  clearWorldCache();
  advance(s, 4, ctx);
  assert.equal(s.landmarkEvents[l.id], event);
  assert.equal(event.cooldown, WINDMILL.cooldown - 4);
  assert.equal(event.wind, LANDMARK_ACTIONS.windSeconds - 4);
  advance(s, 1000, ctx);
  assert.equal(event.cooldown, 0);
  assert.equal(event.wind, 0);
  assert.equal(event.activations, 1, "offscreen sites do not repeatedly pay rewards");
  const tea = place(s, "paper-teahouse");
  stand(s, tea);
  stepLandmarkActions(s, 1e8, ctx);
  assert.equal(s.landmarkEvents[tea.id].activations, 1, "large dt never loops unbounded reward catch-up");
  const saved = structuredClone(s.landmarkEvents);
  for (const dt of [0, -1, NaN, Infinity]) stepLandmarkActions(s, dt, ctx);
  assert.deepEqual(s.landmarkEvents, saved);
  assert.ok(Object.keys(s.landmarkEvents).length <= landmarks(s.seed).length);
});

test("landmark actions are deterministic and never consume the simulation RNG", (t) => {
  t.mock.method(Math, "random", () => assert.fail("activity consumed Math.random"));
  function run() {
    const s = quiet(), ctx = context(), rng = s.rngState, mill = place(s, "paper-windmill");
    const tea = place(s, "paper-teahouse");
    s.player.hp = 1;
    stand(s, tea);
    for (let i = 0; i < 8; i++) advance(s, 0.5, ctx);
    hit(s, mill, "wind", 2, ctx);
    advance(s, 2, ctx);
    hit(s, mill, "wind", 1, ctx);
    assert.equal(s.rngState, rng);
    return [s.landmarkEvents, s.player.hp, s.pickups, s.impacts];
  }
  assert.deepEqual(run(), run());
});

test("the parent simulation advances activities during play and freezes them for a pending choice", () => {
  const s = quiet(), tea = place(s, "paper-teahouse");
  stand(s, tea);
  step(s, { ax: 0, ay: 0, dash: false }, 1 / 60);
  assert.ok(s.landmarkEvents[tea.id]?.progress > 0, "step wires in landmark actions");
  s.pendingChoice = { options: ["paper-crane"] };
  const before = structuredClone(s.landmarkEvents), elapsed = s.elapsed;
  step(s, { ax: 0, ay: 0, dash: false }, 1 / 60);
  assert.deepEqual(s.landmarkEvents, before);
  assert.equal(s.elapsed, elapsed);
});
