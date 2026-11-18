import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyElement, createSim, igniteAt, livingEnemies, snapshot, spillWater, startBossAttack, step,
} from "../dist/game/sim.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { STATS } from "../dist/game/types.js";
import { WASH } from "../dist/defs/wash.js";
import { HORDE, KIND_CAP, SPAWN_TABLE } from "../dist/defs/horde.js";
import { ELEMENTS } from "../dist/defs/types.js";
import { ENEMY_DEFS, PROP_DEFS, REACTIONS, WEAPON_DEFS } from "../dist/defs/index.js";
import { WASH_DRIP } from "../dist/defs/enemies/wash/def.js";
import { CRANE_FOLD } from "../dist/defs/weapons/paper-crane.js";
import {
  blankWhere, colourKept, isColourless, washAt, washBlankAt, washCellAt, washLevelAt, washWetAt,
} from "../dist/game/wash.js";
import { burningCount, damageProp, propMaxHp, propPhase } from "../dist/game/props.js";
import { paperTouchesWater } from "../dist/game/paper-status.js";
import { CHUNK, chunkContent } from "../dist/game/world-gen.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys, t } from "../dist/content/i18n.js";

const idle = { ax: 0, ay: 0, dash: false };
function quiet(cat = "zero", seed = 5) {
  const s = createSim({ cat, seed, sessionSeconds: 600 });
  s.enemies = [];
  s.spawnTimer = s.treatTimer = 1e9;
  s.wavesDone = s.elitesDone = 99;
  s.boss.spawned = true;
  s.build.weapons = [];
  s.build.passives = [];
  s.upgrades = {};
  s.interactables = [];
  s.player.x = 700;
  s.player.y = 420;
  s.player.invuln = 1e9;
  return s;
}
function run(s, seconds, input = idle) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (s.pendingChoice) s.pendingChoice = null;
    step(s, input, DT);
  }
}
function blob(s, x, y, extra = {}) {
  const e = { id: s.nextEnemyId++, kind: "ink-blob", x, y, hp: 100, maxHp: 100, alive: true,
    spawnTime: 0, slowTime: 0, orbitCooldown: 0, stun: 1e9, ...extra };
  s.enemies.push(e);
  return e;
}
function cellCount(s) {
  return Object.keys(s.wash.cells).length;
}
/** A dry prop of a kind somewhere in the world (pure world-gen lookup). */
function findProp(kind, seed = 5) {
  for (let cy = 1; cy <= CHUNK.maxCy; cy++) for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) {
    const p = chunkContent(seed, cx, cy).props.find((p) => p.kind === kind && !paperTouchesWater(seed, p.x, p.y, 40));
    if (p) return p;
  }
  throw new Error(`no ${kind}`);
}

test("the wash grid is deterministic, uses no step RNG and stays capped", () => {
  const runOnce = () => {
    const s = createSim({ cat: "nicole", seed: 9, sessionSeconds: 600 });
    for (let i = 0; i < 600; i++) {
      if (s.pendingChoice) s.pendingChoice = null;
      if (i % 60 === 0) spillWater(s, s.player.x + 60, s.player.y + (i % 120 ? 30 : -30), 48, 0.7);
      step(s, { ax: Math.cos(i / 50), ay: Math.sin(i / 70), dash: i % 200 === 10 }, DT);
    }
    return s;
  };
  const a = runOnce(), b = runOnce();
  assert.deepEqual(snapshot(a.wash), snapshot(b.wash));
  assert.ok(a.wash.touched > 0);
  const s = quiet(), rng = s.rngState;
  for (let i = 0; i < 400; i++) spillWater(s, 200 + (i % 40) * 70, 300 + Math.floor(i / 40) * 70, 40, 1, false);
  assert.equal(s.rngState, rng, "washing never touches the step RNG");
  assert.ok(s.wash.size <= WASH.maxCells, `${s.wash.size} cells`);
  assert.equal(s.wash.size, cellCount(s));
  assert.ok(s.wash.lost > 0, "forgotten washed cells count as lost colour");
});

test("water is an element: paper rows soak props, put out their fire, and washed cells block fire", () => {
  assert.ok(ELEMENTS.includes("water"));
  assert.equal(ELEMENTS.at(-1), "water", "appended so element order is kept");
  for (const m of ["thin-paper", "card", "cloth", "straw"])
    assert.ok(REACTIONS.all().some((r) => r.material === m && r.element === "water"), `${m} reacts to water`);
  const s = quiet(), grass = findProp("paper-grass");
  igniteAt(s, grass.x, grass.y, 10);
  assert.ok(burningCount(s) > 0, "dry grass burns");
  applyElement(s, grass.x, grass.y, 30, "water", 1);
  assert.equal(burningCount(s), 0, "water puts the burning prop out");
  const m = s.props[grass.id];
  assert.ok(m.soakedUntil > s.elapsed);
  assert.equal(m.phase, 0);
  assert.equal(m.hp, propMaxHp(PROP_DEFS.get("paper-grass")), "soaking costs no durability");
  // A dry neighbour cell in a washed patch cannot catch.
  const t2 = quiet(), g2 = findProp("paper-grass");
  washAt(t2, g2.x, g2.y, 60, 1);
  assert.ok(washWetAt(t2, g2.x, g2.y));
  igniteAt(t2, g2.x, g2.y, 30);
  assert.equal(burningCount(t2), 0, "wet washed paper cannot hold fire");
  // Fire already burning goes out once the cell is washed.
  const u = quiet(), g3 = findProp("paper-grass");
  igniteAt(u, g3.x, g3.y, 10);
  const lit = Object.keys(u.fire.cells).length;
  assert.ok(lit > 0);
  washAt(u, g3.x, g3.y, 60, 1);
  run(u, DT * 2);
  assert.equal(burningCount(u), 0, "washed cells drop their fire");
});

test("soaked props and props on wet washed paper tear more easily", () => {
  const dry = quiet(), wet = quiet(), p = findProp("paper-grass");
  applyElement(dry, p.x, p.y, 20, "cut", 1);
  washAt(wet, p.x, p.y, 40, 1);
  applyElement(wet, p.x, p.y, 20, "cut", 1);
  const max = propMaxHp(PROP_DEFS.get("paper-grass"));
  assert.ok(max - wet.props[p.id].hp > (max - dry.props[p.id].hp) * 1.4, "the cut bites deeper on wet paper");
});

test("sources: a torn water bucket, a wash drip's spit, smudge stains, paper rain and the Eraser's sweep", () => {
  // Bucket.
  const s = quiet(), b = findProp("water-bucket");
  damageProp(s, b, 99, { ...ctxOf(s) });
  assert.equal(propPhase(s, b.id), 2);
  assert.ok(isColourless(washCellAt(s, b.x, b.y)), "the spill washes the ground");
  assert.ok(s.wash.splashes > 0);
  // Wash drip spit lands on the cat: washed, soaked and hurt once.
  const w = quiet(), p = w.player;
  p.invuln = 0;
  w.enemyShots.push({ id: 1, x0: p.x - 100, y0: p.y, tx: p.x, ty: p.y, t: 0, flight: 0.5, alive: true, kind: "water" });
  run(w, 0.6);
  assert.ok(washLevelAt(w, p.x, p.y) >= WASH.colourless);
  assert.ok(p.wetTime > 0, "the cat is soaked");
  assert.equal(w.stats.damageTaken, WASH_DRIP.splashDamage);
  assert.equal(w.hazards.length, 0, "water spit leaves no ink puddle");
  // Smudge ink drops leave a stain as well as their puddle.
  const m = quiet();
  m.enemyShots.push({ id: 1, x0: 600, y0: 400, tx: 760, ty: 520, t: 0, flight: 0.3, alive: true });
  run(m, 0.4);
  assert.equal(m.hazards.length, 1);
  assert.ok(washLevelAt(m, 760, 520) >= WASH.smudgeStain - 1e-9);
  // Paper rain: once, mid-night, announced, around the cat.
  const r = quiet();
  r.elapsed = WASH.rain.at * r.sessionSeconds - DT / 2;
  r.timeLeft = r.sessionSeconds - r.elapsed;
  run(r, 0.5);
  assert.equal(r.wash.rainPulses, 1);
  assert.equal(r.notice.kind, "paper-rain");
  assert.ok(r.wash.touched > 10, `${r.wash.touched} cells rained on`);
  run(r, (WASH.rain.until - WASH.rain.at) * r.sessionSeconds + 4);
  assert.equal(r.wash.rainPulses, Math.floor(((WASH.rain.until - WASH.rain.at) * r.sessionSeconds - 1e-6) / WASH.rain.every) + 1);
  // Eraser sweep rubs the page blank.
  const e = quiet(), boss = blob(e, e.player.x - 120, e.player.y, { kind: "eraser-boss", hp: 420, maxHp: 420, radius: 26, stun: 0 });
  e.boss = { spawned: true, defeated: false, id: boss.id };
  startBossAttack(e, boss, "sweep");
  run(e, 1.2);
  assert.equal(e.wash.wipes, 1);
  assert.ok(Object.values(e.wash.cells).filter((c) => c.blank).length > 5);
});

/** A context that routes through the sim's spill helper, for direct damageProp calls. */
function ctxOf(s) {
  return {
    effect(st, x, y, kind, life, extra) { st.impacts.push({ x, y, kind, life, ...extra }); },
    dropShard() {}, dropTreat() {},
    wash: (st, x, y, r, amount, soak) => spillWater(st, x, y, r, amount, soak),
  };
}

test("wet washed paper slows the cat once, never stacked with shallow water", () => {
  const dry = quiet(), wet = quiet();
  washAt(wet, wet.player.x, wet.player.y, 200, 1);
  run(dry, 0.5, { ax: 1, ay: 0, dash: false });
  run(wet, 0.5, { ax: 1, ay: 0, dash: false });
  const ddry = dry.player.x - 700, dwet = wet.player.x - 700;
  assert.ok(Math.abs(dwet / ddry - WASH.wetSlow) < 0.03, `${dwet} vs ${ddry}`);
  assert.ok(wet.player.wetTime > 0, "standing on wet paper uses the normal wet protection path");
});

test("restoration: pigment from kills, lantern and pumpkin light, and dawn", () => {
  const s = quiet(), x = 900, y = 480;
  washAt(s, x, y, 60, 1);
  const before = washLevelAt(s, x, y);
  blob(s, x, y, { hp: 0.5, maxHp: 0.5, stun: 0 });
  s.shots.push({ id: s.nextShotId++, x: x - 6, y, vx: 200, vy: 0, life: 0.2, alive: true, damage: 5, pierce: 1, hits: [] });
  run(s, DT * 3);
  assert.equal(livingEnemies(s), 0);
  assert.ok(washLevelAt(s, x, y) < before, "the blot's own colour splashes back");
  assert.equal(washCellAt(s, x, y)?.hint ?? ENEMY_DEFS.get("ink-blob").pigment, ENEMY_DEFS.get("ink-blob").pigment);
  assert.ok(s.wash.pigments >= 1);
  // A charged moon-lantern and a lit pumpkin repaint their light over time.
  for (const kind of ["lantern", "pumpkin"]) {
    const l = quiet(), lx = 1100, ly = 600;
    l.interactables.push({ id: 9, kind, x: lx, y: ly, lit: kind === "pumpkin" ? 100 : 0, cooldown: 0, charge: 1, tick: 1e9 });
    washAt(l, lx + 30, ly, 30, 1);
    const was = washLevelAt(l, lx + 30, ly);
    run(l, 1);
    const now = washLevelAt(l, lx + 30, ly);
    assert.ok(now < was, `${kind} repaints`);
    run(l, 3);
    assert.ok(washLevelAt(l, lx + 30, ly) < now);
  }
  // Dawn paints everything back; the colour-kept stat is frozen when dawn starts.
  const d = quiet();
  washAt(d, 300, 300, 120, 1);
  d.elapsed = d.sessionSeconds - STATS.dawnSeconds - 1;
  d.timeLeft = STATS.dawnSeconds + 1;
  run(d, 1.5);
  const kept = d.stats.colourKept;
  assert.equal(kept, colourKept(d));
  assert.ok(kept < 100);
  run(d, STATS.dawnSeconds * WASH.dawnShare + 1);
  assert.equal(washLevelAt(d, 300, 300), 0, "dawn restores the colour");
  assert.equal(d.stats.colourKept, kept, "the night's result is not rewritten by dawn");
  assert.equal(quiet().stats.colourKept, 100, "nothing washed: all colour kept");
});

test("kit interplay through element hits: a large fold protects, a dash cut leaves a white hole", () => {
  const n = quiet("nicole");
  run(n, DT, { ax: 0, ay: 0, dash: true });
  assert.equal(n.fields.length, 1);
  assert.equal(cellCount(n), 0, "Nicole's skill on painted ground stores no wash cells");
  spillWater(n, n.player.x, n.player.y, 40, 1);
  assert.ok(!isColourless(washCellAt(n, n.player.x, n.player.y)), "the fold field keeps the paint dry");
  // Small fold hits (crane shots in flight) never mark the page.
  const f = quiet();
  applyElement(f, 600, 300, 5, "fold", 1);
  assert.equal(cellCount(f), 0);
  assert.equal(f.wash.folds.length, 0);
  // A crane volley's large fold keeps the grid empty but still protects the page from water.
  applyElement(f, 600, 300, CRANE_FOLD.radius, "fold", CRANE_FOLD.power);
  assert.equal(cellCount(f), 0, "a crane fold on painted ground stores no wash cells");
  assert.equal(f.wash.folds.length, 1);
  washAt(f, 600, 300, 30, 1);
  assert.ok(!isColourless(washCellAt(f, 600, 300)), "the fold circle keeps the paint dry");
  run(f, WASH.fold.seconds + 0.5);
  assert.equal(f.wash.folds.length, 0, "fold circles expire");
  // Zero's mirror dash on painted, never-washed ground leaves no mark at all.
  const p = quiet("zero");
  run(p, DT * 4, { ax: 1, ay: 0, dash: true });
  assert.equal(cellCount(p), 0, "a dash over painted ground stores no wash cells");
  // Through colourless paper the dash cuts a white hole.
  const z = quiet("zero"), x0 = z.player.x;
  washAt(z, x0 + 60, z.player.y, 120, 1);
  const keptBefore = colourKept(z);
  run(z, DT * 4, { ax: 1, ay: 0, dash: true });
  assert.ok(z.player.x > x0 + 20);
  assert.ok(washBlankAt(z, (x0 + z.player.x) / 2, z.player.y), "a cut hole along the dash");
  assert.equal(colourKept(z), keptBefore, "a cut hole is not lost colour");
  run(z, WASH.cut.seconds + 1);
  assert.ok(!washBlankAt(z, (x0 + z.player.x) / 2, z.player.y), "the cut closes again");
});

test("pencil sketches wake only on colourless, unblank cells near the cat and respect the caps", () => {
  assert.ok(!SPAWN_TABLE.flat().some(([k]) => ENEMY_DEFS.get(k).wakesOn), "never from the spawn table");
  assert.ok(SPAWN_TABLE[2].some(([k]) => k === "wash") && SPAWN_TABLE[3].some(([k]) => k === "wash"), "wash drips from mid-night");
  assert.ok(!SPAWN_TABLE[0].some(([k]) => k === "wash"));
  const s = quiet();
  let spawned = 0;
  for (let i = 0; i < Math.round(20 / DT); i++) {
    if (i % 60 === 0) washAt(s, s.player.x, s.player.y, 280, 1);
    const seen = s.nextEnemyId;
    step(s, idle, DT);
    for (const e of s.enemies)
      if (e.id >= seen && e.kind === "sketch") {
        spawned++;
        assert.ok(washLevelAt(s, e.x, e.y) >= WASH.colourless && !washBlankAt(s, e.x, e.y), "woke on colourless paper");
        assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) <= WASH.sketch.radius + WASH.cell);
      }
    assert.ok(s.enemies.filter((e) => e.alive && e.kind === "sketch").length <= KIND_CAP.sketch);
  }
  assert.ok(spawned > 0);
  // Blank paper has no pencil left to wake.
  const b = quiet();
  washAt(b, b.player.x, b.player.y, 280, 1);
  blankWhere(b, { x0: 0, y0: 0, x1: 2000, y1: 2000 }, () => true);
  run(b, 10);
  assert.equal(b.enemies.filter((e) => e.kind === "sketch").length, 0);
  // A full page wakes nothing.
  const c = quiet();
  for (let i = 0; i < HORDE.hardCap; i++) blob(c, 100 + (i % 10) * 4, 100 + Math.floor(i / 10) * 4);
  washAt(c, c.player.x, c.player.y, 280, 1);
  run(c, 6);
  assert.equal(c.enemies.filter((e) => e.kind === "sketch").length, 0);
  assert.ok(livingEnemies(c) <= HORDE.hardCap);
});

test("the watercolour brush, offered to both cats, paints a trail and rubs out sketches", () => {
  const brush = WEAPON_DEFS.get("watercolour-brush");
  assert.equal(brush.pool, "any");
  // Appended after the earlier weapons; the paper verbs (paper-cut, page-fold) come after it.
  const ids = WEAPON_DEFS.ids();
  assert.ok(ids.indexOf("watercolour-brush") > ids.indexOf("pumpkin-seed"), "appended to the weapon list");
  for (const cat of ["zero", "nicole"]) {
    const s = quiet(cat);
    s.upgrades["watercolour-brush"] = 1;
    s.build.weapons = ["watercolour-brush"];
    washAt(s, 700, 420, 260, 1);
    const sk = blob(s, s.player.x + 20, s.player.y, { kind: "sketch", hp: 1, maxHp: 1, stun: 1e9 }),
      ink = blob(s, s.player.x - 20, s.player.y, { hp: 100, maxHp: 100, stun: 1e9 });
    run(s, 2, { ax: 1, ay: 0, dash: false });
    assert.equal(sk.alive, false, `${cat}: the sketch is rubbed out`);
    assert.ok(ink.hp < 100 && ink.hp > 90, `${cat}: ink only grazed (${ink.hp})`);
    assert.ok(washLevelAt(s, 700, 420) < 1, `${cat}: the start is repainted`);
    assert.ok(washLevelAt(s, (700 + s.player.x) / 2, s.player.y) < 1, `${cat}: the trail follows the cat`);
    assert.ok(washLevelAt(s, s.player.x, s.player.y + 120) === 1, `${cat}: only where the brush went`);
  }
});

test("every new string exists in both packs", () => {
  const keys = [
    "enemy.wash.name", "enemy.sketch.name", "prop.water-bucket.name",
    "upgrade.watercolour-brush.name", "upgrade.watercolour-brush.desc",
    "notice.paper-rain", "notice.eraser-wipe", "result.colour_kept", "result.colour_value", "hint.washed",
  ];
  for (const k of keys) assert.ok(MESSAGE_KEYS.includes(k), k);
  assert.deepEqual(missingKeys("en"), []);
  assert.deepEqual(missingKeys("zh"), []);
  assert.equal(t("en", "result.colour_value", { n: 72 }), "72%");
  for (const k of keys) if (k !== "result.colour_value") assert.notEqual(t("zh", k), t("en", k), k);
});

test("no wash means no new state: the page starts fully painted", () => {
  const s = createSim({ cat: "zero", seed: 7 });
  run(s, 3);
  assert.equal(s.wash.touched, 0);
  assert.equal(s.stats.colourKept, 100);
  assert.equal(s.wash.size, 0);
});

test("the washed hint speaks of wet paper only while it is wet; dry colourless paper gets its own line", async () => {
  const { environmentCopy } = await import("../dist/ui/environment-copy.js");
  for (const locale of ["en", "zh"]) {
    const s = quiet();
    s.elapsed = 60;
    washAt(s, s.player.x, s.player.y, 60, 1);
    assert.equal(environmentCopy(locale, s).hint, t(locale, "hint.washed"), "fresh wash: wet paper");
    for (const c of Object.values(s.wash.cells)) c.wetUntil = s.elapsed - 1;
    assert.ok(!washWetAt(s, s.player.x, s.player.y));
    assert.equal(environmentCopy(locale, s).hint, t(locale, "hint.colourless"), "dried: colourless, not wet");
  }
  assert.ok(WASH.smudgeStain < WASH.colourless, "one smudge drop fades the page but wakes no pencil");
});

test("over the sketch budget the same (oldest) enemies keep the pencil look", async () => {
  const { sketchEnemyPick, SKETCH_ENEMIES_PER_FRAME, SKETCH_ACTORS_PER_FRAME } = await import("../dist/render/sprite-sketch.js");
  assert.ok(SKETCH_ENEMIES_PER_FRAME < SKETCH_ACTORS_PER_FRAME, "the cat and decoy keep budget");
  const ids = Array.from({ length: SKETCH_ENEMIES_PER_FRAME }, (_, i) => i * 3);
  assert.equal(sketchEnemyPick(ids), null, "all fit: no pick");
  const many = Array.from({ length: SKETCH_ENEMIES_PER_FRAME + 10 }, (_, i) => 100 - i);
  const a = sketchEnemyPick(many), b = sketchEnemyPick([...many].reverse());
  assert.equal(a.size, SKETCH_ENEMIES_PER_FRAME);
  assert.deepEqual([...a].sort((x, y) => x - y), [...b].sort((x, y) => x - y), "independent of draw order");
  assert.ok(a.has(Math.min(...many)) && !a.has(Math.max(...many)));
});
