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
import { EN } from "../dist/content/en.js";
import { ZH } from "../dist/content/zh.js";

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
  // The real wardrobe unlocks alongside; this case follows the probes only.
  const probesOf = (ids) => ids.filter((id) => id.startsWith("probe-"));
  let progress = emptyProgress();
  assert.deepEqual(progress, { nights: 0, wins: 0, unlocked: [] }, "nothing is unlocked at the start");
  // Night 1: 9 kills, level 4, fallen.
  let r = unlocksAfter(progress, night({ kills: 9 }, 4));
  assert.deepEqual(probesOf(r.newly), []);
  assert.deepEqual({ ...r.progress, unlocked: probesOf(r.progress.unlocked) }, { nights: 1, wins: 0, unlocked: [] });
  assert.deepEqual(progress, emptyProgress(), "the input progress is not changed");
  // Night 2: 10 kills, level 5, a dawn win with the Boss defeated.
  r = unlocksAfter(r.progress, night({ kills: 10, bossDefeated: true }, 5, "dawn"));
  assert.deepEqual(probesOf(r.newly), UNLOCK_PROBES, "every condition met exactly at its threshold, wardrobe order");
  assert.deepEqual(probesOf(r.progress.unlocked), UNLOCK_PROBES);
  assert.deepEqual([r.progress.nights, r.progress.wins], [2, 1]);
  assert.ok(isUnlocked(r.progress, "probe-kills"));
  assert.ok(!isUnlocked(r.progress, "probe-ticker"));
  // Night 3: everything met again, but nothing is reported twice.
  r = unlocksAfter(r.progress, night({ kills: 99, bossDefeated: true }, 9, "boss-escaped"));
  assert.deepEqual(probesOf(r.newly), []);
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

// ---- The real wardrobe (FEAT-003): the fourteen costumes ----

const WARDROBE = [
  "tibo", "poteto", "musk", "jensen", "karpathy", "linus", "guido",
  "eich", "jobs", "gates", "zuckerberg", "hassabis", "levels", "dario",
];
const realIds = () => COSTUME_DEFS.ids().filter((id) => !id.startsWith("probe-"));
const BOSS = ENEMY_DEFS.all().find((d) => d.boss);

function getCtx() {
  if (capturedCtx) return capturedCtx;
  const s = createSim({ seed: 1, costume: "probe-ticker" });
  while (!capturedCtx) step(s, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
  return capturedCtx;
}
/** A worn costume on a cleared page: no ink, shots or shards. */
function bench(id, cat = CATS.ids()[0]) {
  const state = createSim({ cat, seed: 21, costume: id });
  state.enemies = [];
  state.shots = [];
  state.enemyShots = [];
  state.pickups = [];
  return { state, def: COSTUME_DEFS.get(id), ctx: getCtx() };
}
let nextEnemyId = 5000;
function ink(state, dx, dy, kind = "ink-blob") {
  const boss = kind === BOSS.id,
    e = {
      id: nextEnemyId++, kind, x: state.player.x + dx, y: state.player.y + dy,
      hp: boss ? BOSS.stats.hp : 50, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0,
    };
  state.enemies.push(e);
  return e;
}
const fire = ({ state, def, ctx }) => def.activate(state, playerStats(state), ctx);
/** Runs the worn costume's lingering step for `seconds` (zones expire, buffs run down; ink stands still). */
function linger({ state, def, ctx }, seconds) {
  const c = state.costume;
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    state.elapsed += DT;
    if (c.buff > 0) c.buff = Math.max(0, c.buff - DT);
    c.zones = c.zones.filter((z) => z.until > state.elapsed);
    def.step?.(state, playerStats(state), DT, ctx);
  }
}
const away = (state, e) => Math.hypot(e.x - state.player.x, e.y - state.player.y);

test("the fourteen costumes are registered in wardrobe order", () => {
  assert.deepEqual(realIds(), WARDROBE);
  assert.deepEqual(before, WARDROBE, "the real wardrobe comes before any test-only costume");
  for (const def of COSTUME_DEFS.all().filter((d) => !d.id.startsWith("probe-"))) {
    assert.equal(def.i18n, `costume.${def.id}`);
    assert.equal(def.skill.notice, `costume-${def.id}`);
    assert.ok(def.skill.firstAt >= 20 && def.skill.firstAt <= 40, `${def.id} firstAt`);
    assert.ok(def.skill.cooldown >= 20, `${def.id} cooldown`);
    assert.ok(def.unlock.at > 0, `${def.id} unlock`);
  }
});

test("every costume skill fires on schedule over 120 s for both cats", () => {
  for (const cat of CATS.ids())
    for (const id of WARDROBE) {
      const def = COSTUME_DEFS.get(id),
        state = createSim({ cat, seed: 7, costume: id }),
        frames = Math.round(119.5 / DT),
        want = Math.floor((119.5 - def.skill.firstAt) / def.skill.cooldown) + 1;
      for (let i = 0; i < frames; i++) {
        if (state.pendingChoice) step(state, { ax: 0, ay: 0, dash: false, choose: 0 }, DT);
        const [ax, ay] = DIRS[Math.floor(i / Math.round(4 / DT)) % 4];
        // The schedule is under test, not survival: keep the cat on watch.
        state.player.hp = state.player.maxHp;
        step(state, { ax, ay, dash: i > 0 && i % Math.round(3 / DT) === 0 }, DT);
      }
      assert.equal(state.ended, "playing", `${cat} ${id} still on watch`);
      assert.equal(state.costume.uses, want, `${cat} ${id} uses`);
    }
});

test("costume nights are deterministic", () => {
  for (const id of WARDROBE) {
    const a = run({ seed: 13, costume: id }, 45),
      b = run({ seed: 13, costume: id }, 45);
    assert.deepEqual(snapshot(a), snapshot(b), id);
  }
});

test("no costume pushes, slows or freezes the Boss; zones stay capped", () => {
  for (const id of WARDROBE) {
    const b = bench(id),
      { state } = b,
      boss = ink(state, 40, 0, BOSS.id);
    ink(state, -40, 0);
    for (let i = 0; i < 10; i++) {
      fire(b);
      linger(b, 0.5);
      assert.ok(state.costume.zones.length <= COSTUME.maxZones, `${id} zone cap`);
    }
    linger(b, 6);
    assert.equal(boss.x, state.player.x + 40, `${id} never moves the Boss`);
    assert.equal(boss.y, state.player.y, `${id} never moves the Boss`);
    assert.ok(!(boss.stun > 0), `${id} never freezes the Boss`);
    assert.equal(boss.costumeSlow, undefined, `${id} never slows the Boss`);
  }
});

test("tibo pushes ordinary ink beyond its ring and clears shots, but not the Boss", () => {
  const b = bench("tibo"),
    { state } = b,
    blob = ink(state, 60, 0),
    boss = ink(state, -60, 0, BOSS.id),
    { x, y } = state.player;
  state.enemyShots = [{ id: 1, x0: x, y0: y, tx: x + 100, ty: y, t: 0.5, flight: 1, alive: true }];
  fire(b);
  assert.ok(away(state, blob) > 200, "ordinary ink is pushed out");
  assert.equal(away(state, boss), 60, "the Boss stays");
  assert.equal(state.enemyShots[0].alive, false);
});

test("poteto warms the cat and pulls shards in; gates pulls shards from farther", () => {
  const b = bench("poteto"),
    { state } = b,
    { x, y } = state.player,
    plain = playerStats(state);
  state.pickups = [
    { id: 1, x: x + 150, y, value: 1, alive: true, age: 0 },
    { id: 2, x: x + 250, y, value: 1, alive: true, age: 0 },
  ];
  fire(b);
  assert.deepEqual(state.pickups.map((s) => s.x), [x, x + 250]);
  const warm = playerStats(state);
  assert.ok(warm.speed > plain.speed);
  assert.equal(warm.pickupRadius, plain.pickupRadius + 40);
  linger(b, 4.1);
  assert.equal(playerStats(state).speed, plain.speed, "the warmth wears off");
  const g = bench("gates");
  g.state.pickups = [{ id: 1, x: g.state.player.x + 250, y: g.state.player.y, value: 1, alive: true, age: 0 }];
  fire(g);
  assert.equal(g.state.pickups[0].x, g.state.player.x);
});

test("musk clears its lane sideways, then the rocket lands at the end", () => {
  const b = bench("musk"),
    { state } = b;
  state.player.vx = 100;
  state.player.vy = 0;
  const inLane = ink(state, 80, 5),
    boss = ink(state, 170, 0, BOSS.id),
    hp = boss.hp,
    { y } = state.player;
  fire(b);
  assert.ok(Math.abs(inLane.y - y) > 34, "ink in the lane is pushed out sideways");
  linger(b, 0.9);
  assert.equal(boss.hp, hp, "no damage before the rocket lands");
  linger(b, 0.2);
  assert.ok(boss.hp < hp, "the rocket hurts the Boss");
  assert.equal(away(state, boss), 170, "the Boss is never moved");
});

test("jensen copies new shots once, never copies a copy and respects its cap", () => {
  const b = bench("jensen"),
    { state, ctx } = b,
    { x, y } = state.player;
  state.shots = [];
  const shot = () => ctx.spawnShot(state, { x, y, vx: 300, vy: 0, life: 1, alive: true, damage: 2, hits: [] });
  shot();
  linger(b, DT);
  assert.equal(state.shots.length, 1, "shots from before the skill are not copied");
  fire(b);
  shot();
  linger(b, DT);
  assert.equal(state.shots.length, 3);
  assert.equal(state.shots[2].damage, 1, "a copy hits for half");
  linger(b, DT * 5);
  assert.equal(state.shots.length, 3, "copies are never copied");
  for (let i = 0; i < 20; i++) shot();
  linger(b, DT);
  assert.equal(state.costume.vars.copies, 12);
  assert.equal(state.shots.length, 3 + 20 + 11);
  linger(b, 6);
  shot();
  linger(b, DT);
  assert.equal(state.costume.vars.copies, 12, "nothing is copied after the skill ends");
});

test("karpathy draws its lane away from the ink and speeds the cat on it", () => {
  const b = bench("karpathy"),
    { state } = b,
    plain = playerStats(state).speed;
  ink(state, 100, 0);
  ink(state, 120, 20);
  fire(b);
  const lane = state.costume.zones[0];
  assert.ok(lane.x2 < lane.x - 150, "the lane points away from the ink");
  assert.ok(playerStats(state).speed > plain);
  state.player.y += 60;
  assert.equal(playerStats(state).speed, plain, "off the lane, no boost");
});

test("linus keeps ordinary ink out of the merge point, not the Boss", () => {
  const b = bench("linus"),
    { state } = b;
  state.player.vx = 0;
  state.player.vy = -100;
  fire(b);
  const merge = state.costume.zones.find((z) => z.kind === "circle");
  assert.equal(state.costume.zones.filter((z) => z.kind === "lane").length, 2);
  const blob = ink(state, merge.x - state.player.x + 10, merge.y - state.player.y),
    boss = ink(state, merge.x - state.player.x - 10, merge.y - state.player.y, BOSS.id);
  linger(b, DT);
  assert.ok(Math.hypot(blob.x - merge.x, blob.y - merge.y) > merge.radius, "ordinary ink is kept out");
  assert.ok(Math.abs(Math.hypot(boss.x - merge.x, boss.y - merge.y) - 10) < 1e-9, "the Boss stays");
});

test("guido and dario stun ordinary ink but never the Boss", () => {
  const g = bench("guido"),
    blob = ink(g.state, 50, 0),
    boss = ink(g.state, -50, 0, BOSS.id),
    { x, y } = g.state.player;
  g.state.enemyShots = [{ id: 1, x0: x, y0: y, tx: x + 40, ty: y, t: 0.5, flight: 2, alive: true }];
  fire(g);
  assert.equal(blob.stun, 1.5);
  assert.equal(boss.stun, undefined);
  linger(g, 0.5);
  assert.ok(Math.abs(g.state.enemyShots[0].t - 0.25) < 1e-6, "shots in range fly at half speed");
  const d = bench("dario"),
    sealed = ink(d.state, 60, 0),
    eraser = ink(d.state, -60, 0, BOSS.id);
  fire(d);
  linger(d, 0.7);
  assert.equal(sealed.stun, undefined, "nothing is frozen during the warning");
  linger(d, 0.2);
  assert.equal(sealed.stun, 4);
  assert.equal(eraser.stun, undefined);
  linger(d, 1);
  assert.equal(sealed.stun, 4, "the seal comes down once");
});

test("eich keeps at most one turret, which shoots and folds away when left", () => {
  const b = bench("eich"),
    { state } = b;
  const target = ink(state, 120, 0);
  fire(b);
  fire(b);
  assert.equal(state.costume.zones.filter((z) => z.kind === "turret").length, 1);
  linger(b, 0.65);
  assert.equal(state.shots.length, 1);
  assert.equal(state.shots[0].damage, 1);
  assert.ok(state.shots[0].vx > 0, "aimed at the nearest ink");
  target.alive = false;
  state.player.x += 500;
  linger(b, 2 * DT);
  assert.equal(state.costume.zones.length, 0, "the turret folds away when the cat leaves");
});

test("jobs bursts only after its telegraph", () => {
  const b = bench("jobs"),
    { state } = b,
    blob = ink(state, 100, 0);
  fire(b);
  linger(b, 1.1);
  assert.equal(blob.hp, 50, "nothing before the star lands");
  linger(b, 0.2);
  assert.equal(blob.hp, 47);
  linger(b, 1);
  assert.equal(blob.hp, 47, "one star per trigger");
});

test("zuckerberg's trail slows ordinary ink on it and speeds the cat", () => {
  const b = bench("zuckerberg"),
    { state } = b,
    plain = playerStats(state).speed,
    start = { x: state.player.x, y: state.player.y };
  fire(b);
  state.player.x += 100;
  const onTrail = ink(state, -50, 0),
    off = ink(state, -50, 80),
    boss = ink(state, -30, 0, BOSS.id);
  linger(b, DT);
  const lane = state.costume.zones[0];
  assert.deepEqual([lane.x, lane.y, lane.x2], [start.x, start.y, state.player.x]);
  assert.equal(onTrail.costumeSlow, 0.6);
  assert.equal(off.costumeSlow, undefined);
  assert.equal(boss.costumeSlow, undefined);
  assert.ok(playerStats(state).speed > plain);
});

test("hassabis leaves one gap, then slows ordinary ink inside its ring", () => {
  const b = bench("hassabis"),
    { state } = b;
  state.player.vx = 100;
  state.player.vy = 0;
  fire(b);
  const stones = state.costume.zones.filter((z) => z.power === 0);
  assert.equal(stones.length, 3);
  assert.ok(stones.every((s) => s.x <= state.player.x + 1e-6), "the side ahead stays open");
  const blob = ink(state, 50, 0),
    boss = ink(state, -50, 0, BOSS.id);
  linger(b, 0.5);
  assert.equal(blob.costumeSlow, undefined, "no slow before the ring forms");
  linger(b, 0.4);
  assert.equal(blob.costumeSlow, 0.5);
  assert.equal(boss.costumeSlow, undefined);
});

test("levels drops three one-shot pads; a step gives a short burst that never stacks", () => {
  const b = bench("levels"),
    { state } = b,
    plain = playerStats(state).speed;
  state.player.vx = 0;
  state.player.vy = 0;
  fire(b);
  linger(b, 6);
  const pads = state.costume.zones.filter((z) => z.kind === "pad");
  assert.equal(pads.length, 3);
  assert.equal(playerStats(state).speed, plain);
  // Stand on two pads at once: one burst, not a doubled one.
  pads[1].x = pads[0].x = state.player.x;
  pads[1].y = pads[0].y = state.player.y;
  linger(b, DT);
  assert.ok(Math.abs(playerStats(state).speed - plain * 1.2) < 1e-9);
  assert.equal(state.costume.buff > 0, true);
  linger(b, DT);
  assert.equal(state.costume.zones.filter((z) => z.kind === "pad").length, 1, "used pads are spent");
  linger(b, 1.6);
  assert.equal(playerStats(state).speed, plain);
});

test("each costume unlocks exactly at its threshold", () => {
  const value = (unlock, v) => {
    if (unlock.stat === "nights") return [{ ...emptyProgress(), nights: v - 1 }, night({})];
    if (unlock.stat === "wins") return [{ ...emptyProgress(), nights: v, wins: v - 1 }, night({}, 1, "dawn")];
    if (unlock.stat === "dawn") return [emptyProgress(), night({}, 1, v >= 1 ? "boss-escaped" : "fallen")];
    if (unlock.stat === "level") return [emptyProgress(), night({}, v)];
    return [emptyProgress(), night({ [unlock.stat]: v })];
  };
  for (const id of WARDROBE) {
    const { unlock } = COSTUME_DEFS.get(id);
    const below = unlock.stat === "wins" ? [{ ...emptyProgress(), nights: 5, wins: unlock.at - 1 }, night({})] : value(unlock, unlock.at - 1);
    assert.ok(!unlocksAfter(...below).newly.includes(id), `${id} stays locked below ${unlock.at}`);
    assert.ok(unlocksAfter(...value(unlock, unlock.at)).newly.includes(id), `${id} unlocks at ${unlock.at}`);
  }
  // Nothing is unlocked at the very start, and a fallen first night unlocks only the first costume.
  const first = unlocksAfter(emptyProgress(), night({}));
  assert.deepEqual(first.newly, ["tibo"]);
});

const COPY_FIELDS = ["name", "skill", "desc", "line", "unlock"];
const costumeKeys = () => [
  "selector.wardrobe", "costume.none.name", "costume.locked", "result.unlocked",
  ...WARDROBE.flatMap((id) => [...COPY_FIELDS.map((f) => `costume.${id}.${f}`), `notice.costume-${id}`]),
];
const holes = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every costume string is in both packs with the same placeholders", () => {
  for (const key of costumeKeys())
    for (const [name, pack] of [["en", EN], ["zh", ZH]])
      assert.ok(typeof pack[key] === "string" && pack[key].length > 0, `${name} ${key}`);
  for (const key of costumeKeys()) assert.deepEqual(holes(ZH[key]), holes(EN[key]), key);
  for (const id of WARDROBE) {
    const params = COSTUME_DEFS.get(id).copyParams?.() ?? {};
    for (const h of holes(EN[`costume.${id}.desc`])) assert.ok(h in params, `${id} desc {${h}}`);
    const unlock = EN[`costume.${id}.unlock`];
    assert.ok(COSTUME_DEFS.get(id).unlock.stat === "dawn" || unlock.includes("{at}"), `${id} unlock {at}`);
  }
});

test("no costume string names a real person or brand", () => {
  const BLOCK = [
    "huang", "jensen", "karpathy", "andrej", "torvalds", "linus", "rossum", "guido", "eich", "brendan",
    "jobs", "steve", "gates", "zuckerberg", "hassabis", "demis", "levels", "pieter", "amodei", "dario",
    "musk", "elon", "tibo", "poteto", "tesla", "spacex", "nvidia", "apple", "meta", "facebook",
    "anthropic", "claude", "openai", "deepmind", "alphago", "google", "microsoft", "python", "javascript",
    "linux", "git", "tux", "monty", "黄仁勋", "马斯克", "乔布斯", "盖茨", "扎克伯格", "林纳斯", "特斯拉",
  ];
  const keys = Object.keys(EN).filter((k) => k.startsWith("costume.") || k.startsWith("notice.costume-") || k === "result.unlocked");
  assert.ok(keys.length >= WARDROBE.length * 6);
  for (const key of keys)
    for (const pack of [EN, ZH]) {
      const text = pack[key].toLowerCase();
      for (const word of BLOCK)
        assert.ok(!new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(text), `${key} names "${word}": ${pack[key]}`);
    }
});
