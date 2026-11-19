import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { playerStats } from "../dist/game/stats.js";
import { CATS, COSTUME_DEFS, ENEMY_DEFS, registerCostume } from "../dist/defs/index.js";
import { COSTUME } from "../dist/defs/costumes/tuning.js";
import {
  addZone,
  burst,
  clearEnemyShots,
  insideCircle,
  insideLane,
  pullShards,
  pushRing,
  stunNormals,
} from "../dist/defs/costumes/skills.js";
import { emptyProgress, isUnlocked, sanitizeProgress, unlocksAfter } from "../dist/game/costumes.js";

// Test-only costumes. Each suite runs in its own process, so these never reach
// other suites. Ids start with "probe-" so suites over the real wardrobe can filter them.
const before = [...COSTUME_DEFS.ids()];
const hookCalls = {};
let capturedCtx = null;
function probe(id, extra = {}) {
  return registerCostume({
    id,
    i18n: `costume.${id}`,
    art: id,
    skill: { cooldown: 5, firstAt: 2, notice: `costume-${id}` },
    unlock: { stat: "kills", at: 1e9 },
    activate(state, _ps, ctx) {
      capturedCtx = ctx;
      state.costume.buff = 1.5;
    },
    stats(s, q) {
      if (q.state.costume.buff > 0) s.speed *= 2;
    },
    hooks: {
      tick: () => {
        hookCalls[id] = (hookCalls[id] ?? 0) + 1;
      },
    },
    ...extra,
  });
}
probe("probe-ticker");
probe("probe-other", { unlock: { stat: "nights", at: 2 } });
probe("probe-kills", { unlock: { stat: "kills", at: 10 } });
probe("probe-win", { unlock: { stat: "wins", at: 1 } });
probe("probe-level", { unlock: { stat: "level", at: 5 } });
probe("probe-boss", { unlock: { stat: "bossDefeated", at: 1 } });
const PROBES = ["probe-ticker", "probe-other", "probe-kills", "probe-win", "probe-level", "probe-boss"];
const UNLOCK_PROBES = PROBES.slice(1);

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function run(config, seconds) {
  const state = createSim(config),
    frames = Math.round(seconds / DT),
    side = Math.round(4 / DT),
    skill = Math.round(3 / DT);
  for (let i = 0; i < frames; i++) {
    if (state.pendingChoice) step(state, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
    const [ax, ay] = DIRS[Math.floor(i / side) % 4];
    step(state, { ax, ay, dash: i > 0 && i % skill === 0 }, DT);
    if (state.ended !== "playing") break;
  }
  return state;
}
const night = (stats, level = 1, endReason = "fallen") => ({
  stats: { kills: 0, bossDefeated: false, ...stats },
  level,
  endReason,
});

test("costumes register in append order and duplicate ids are refused", () => {
  assert.deepEqual([...COSTUME_DEFS.ids()], [...before, ...PROBES]);
  assert.throws(() => probe("probe-ticker"), /Duplicate costume id "probe-ticker"/);
});

test("a plain night is the same with no costume field or costume: null", () => {
  for (const cat of CATS.ids()) {
    const a = run({ cat, seed: 7 }, 60),
      b = run({ cat, seed: 7, costume: null }, 60);
    assert.equal("costume" in a, false, "a plain run has no costume field");
    assert.deepEqual(snapshot(b), snapshot(a));
  }
});

test("a night with a costume is deterministic", () => {
  const a = run({ seed: 11, costume: "probe-ticker" }, 30),
    b = run({ seed: 11, costume: "probe-ticker" }, 30);
  assert.ok(a.costume.uses >= 5);
  assert.deepEqual(snapshot(a), snapshot(b));
});

test("an unknown costume id throws a clear registry error", () => {
  assert.throws(() => createSim({ costume: "no-such-coat" }), /Unknown costume id "no-such-coat"/);
});

test("the skill fires at firstAt and then every cooldown, with its notice", () => {
  const state = createSim({ seed: 3, costume: "probe-ticker" });
  assert.deepEqual(
    { ...state.costume },
    { id: "probe-ticker", timer: 2, uses: 0, buff: 0, vars: {}, zones: [] },
  );
  let noticed = 0;
  for (let t = 0; t < 20 - 1e-9; t += DT) {
    const uses = state.costume.uses;
    step(state, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
    if (state.costume.uses > uses && state.notice?.kind === "costume-probe-ticker") noticed++;
    if (state.elapsed < 2 - 1e-6) assert.equal(state.costume.uses, 0, "not before firstAt");
  }
  // Triggers at 2, 7, 12 and 17 s.
  assert.equal(state.costume.uses, 4);
  assert.ok(noticed >= 1, "the notice is shown when the skill fires");
});

test("costume hooks only run while that costume is worn", () => {
  for (const k of Object.keys(hookCalls)) delete hookCalls[k];
  run({ seed: 5 }, 3);
  assert.deepEqual(hookCalls, {}, "a plain night calls no costume hook");
  run({ seed: 5, costume: "probe-other" }, 3);
  assert.ok(hookCalls["probe-other"] > 0);
  assert.equal(hookCalls["probe-ticker"], undefined);
});

test("a costume stat buff applies only while its buff timer runs", () => {
  const plain = createSim({ seed: 2 }),
    state = createSim({ seed: 2, costume: "probe-ticker" });
  assert.equal(playerStats(state).speed, playerStats(plain).speed, "no buff before the skill");
  state.costume.buff = 1;
  assert.equal(playerStats(state).speed, playerStats(plain).speed * 2);
  // The buff runs down with the night.
  for (let t = 0; t < 1.2; t += DT) step(state, { ax: 0, ay: 0, dash: false }, DT);
  assert.equal(state.costume.buff, 0);
  assert.equal(playerStats(state).speed, playerStats(plain).speed);
});

test("zones are capped at COSTUME.maxZones (oldest dropped) and expire", () => {
  const state = createSim({ seed: 4, costume: "probe-other" });
  for (let i = 0; i < COSTUME.maxZones + 4; i++)
    addZone(state, { kind: "circle", x: i, y: 0, radius: 10, until: 100 + i, power: 1 });
  assert.equal(state.costume.zones.length, COSTUME.maxZones);
  assert.equal(state.costume.zones[0].x, 4, "the oldest zones went first");
  state.costume.zones = [{ kind: "lane", x: 0, y: 0, x2: 100, y2: 0, radius: 8, until: 0.5, power: 1 }];
  assert.ok(insideLane(state.costume.zones[0], 50, 6));
  assert.ok(!insideLane(state.costume.zones[0], 50, 12));
  assert.ok(insideCircle({ x: 0, y: 0, radius: 10 }, 6, 8));
  for (let t = 0; t < 1; t += DT) step(state, { ax: 0, ay: 0, dash: false }, DT);
  assert.equal(state.costume.zones.length, 0, "spent zones are removed");
  const plain = createSim({ seed: 4 });
  addZone(plain, { kind: "pad", x: 0, y: 0, radius: 4, until: 9, power: 1 });
  assert.equal("costume" in plain, false, "no zone without a costume");
});

test("shared skill primitives never push or freeze the Boss", () => {
  const state = createSim({ seed: 9, costume: "probe-ticker" });
  while (!capturedCtx) step(state, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
  const ctx = capturedCtx,
    { x, y } = state.player,
    boss = ENEMY_DEFS.all().find((d) => d.boss);
  const mk = (kind, dx, hp = 50) => ({
    id: 900 + state.enemies.length, kind, x: x + dx, y, hp, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0,
  });
  state.enemies = [mk("ink-blob", 30), mk(boss.id, -30, boss.stats.hp)];
  const [blob, eraser] = state.enemies;
  assert.equal(pushRing(state, ctx, x, y, 100, 200), 1);
  assert.ok(Math.hypot(blob.x - x, blob.y - y) > 150, "ordinary ink is pushed out");
  assert.equal(eraser.x, x - 30, "the Boss stays put");
  blob.x = x + 20;
  blob.y = y;
  assert.equal(stunNormals(state, x, y, 100, 4), 1);
  assert.equal(blob.stun, 4);
  assert.equal(eraser.stun, undefined, "the Boss is never frozen");
  const hp = eraser.hp;
  assert.equal(burst(state, ctx, x, y, 60, 3), 2, "a burst hurts ordinary ink and the Boss");
  assert.ok(eraser.hp < hp);
  state.enemyShots = [
    { id: 1, x0: x, y0: y, tx: x + 20, ty: y, t: 0.5, flight: 1, alive: true },
    { id: 2, x0: x + 400, y0: y, tx: x + 500, ty: y, t: 0, flight: 1, alive: true },
  ];
  assert.equal(clearEnemyShots(state, x, y, 50), 1);
  assert.deepEqual(state.enemyShots.map((s) => s.alive), [false, true]);
  state.pickups = [
    { id: 1, x: x + 120, y, value: 1, alive: true, age: 0 },
    { id: 2, x: x + 500, y, value: 1, alive: true, age: 0 },
  ];
  assert.equal(pullShards(state, ctx, x, y, 200), 1);
  assert.deepEqual([state.pickups[0].x, state.pickups[1].x], [x, x + 500]);
});

test("unlocksAfter unlocks at the threshold, counts lifetime nights and wins, never repeats", () => {
  let progress = emptyProgress();
  assert.deepEqual(progress, { nights: 0, wins: 0, unlocked: [] }, "nothing is unlocked at the start");
  // Night 1: 9 kills, level 4, fallen.
  let r = unlocksAfter(progress, night({ kills: 9 }, 4));
  assert.deepEqual(r.newly, []);
  assert.deepEqual(r.progress, { nights: 1, wins: 0, unlocked: [] });
  assert.deepEqual(progress, emptyProgress(), "the input progress is not changed");
  // Night 2: 10 kills, level 5, a dawn win with the Boss defeated.
  r = unlocksAfter(r.progress, night({ kills: 10, bossDefeated: true }, 5, "dawn"));
  assert.deepEqual(r.newly, UNLOCK_PROBES, "every condition met exactly at its threshold, wardrobe order");
  assert.deepEqual(r.progress.unlocked, UNLOCK_PROBES);
  assert.deepEqual([r.progress.nights, r.progress.wins], [2, 1]);
  assert.ok(isUnlocked(r.progress, "probe-kills"));
  assert.ok(!isUnlocked(r.progress, "probe-ticker"));
  // Night 3: everything met again, but nothing is reported twice.
  r = unlocksAfter(r.progress, night({ kills: 99, bossDefeated: true }, 9, "boss-escaped"));
  assert.deepEqual(r.newly, []);
  assert.deepEqual([r.progress.nights, r.progress.wins], [3, 1], "boss-escaped is not a win");
});

test("lifetime nights unlock across several plain nights", () => {
  let p = emptyProgress();
  p = unlocksAfter(p, night({})).progress;
  const r = unlocksAfter(p, night({}));
  assert.deepEqual(r.newly, ["probe-other"]);
});

test("sanitizeProgress drops junk and keeps wardrobe order", () => {
  assert.deepEqual(sanitizeProgress(null), emptyProgress());
  assert.deepEqual(sanitizeProgress("x"), emptyProgress());
  assert.deepEqual(
    sanitizeProgress({ nights: 3.7, wins: 9, unlocked: ["probe-level", "nope", 4, "probe-other", "probe-level"] }),
    { nights: 3, wins: 3, unlocked: ["probe-other", "probe-level"] },
  );
  assert.deepEqual(sanitizeProgress({ nights: -2, wins: NaN, unlocked: "probe-other" }), emptyProgress());
  assert.deepEqual(sanitizeProgress({ nights: Infinity, wins: 1 }), emptyProgress());
});
