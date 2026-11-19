import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim, enemyRadius, snapshot, step } from "../dist/game/sim.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { CATS, WEAPON_DEFS } from "../dist/defs/index.js";
import { closeLoop, insidePolygon, reflectAcross } from "../dist/defs/weapons/paper-geometry.js";
import { PAPER_CUT } from "../dist/defs/weapons/paper-cut.js";
import { FOLD_BRIDGE, PAGE_FOLD, PAPER_WALL } from "../dist/defs/weapons/page-fold.js";
import { bridgePath, drawFoldBridge } from "../dist/defs/weapons/page-fold.art.js";
import { WORLD } from "../dist/game/world-gen.js";
import { deepWaterBlocks, waterAt, waterRegionsNear } from "../dist/game/water.js";
import { inWaterPolygon, waterBounds } from "../dist/defs/water.js";
import { STATS } from "../dist/game/types.js";
import { paperTouchesWater } from "../dist/game/paper-status.js";
import { isEligible, UPGRADES } from "../dist/game/upgrades.js";
import { washAt, washCellOf, washKey } from "../dist/game/wash.js";
import { WASH } from "../dist/defs/wash.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys, t } from "../dist/content/i18n.js";
import { WEAPON_ART } from "../dist/render/art-registry.js";
import "../dist/render/art-index.js";
import { CAT_WEAR } from "../dist/render/timeline.js";
import { catWear } from "../dist/render/cat-detail.js";
import { clearWashRender, washFrame } from "../dist/render/wash-art.js";

const idle = { ax: 0, ay: 0, dash: false };
function quiet(cat, weapon, level = 1, seed = 5) {
  const s = createSim({ cat, seed, sessionSeconds: 600 });
  s.enemies = [];
  s.spawnTimer = s.treatTimer = 1e9;
  s.wavesDone = s.elitesDone = 99;
  s.boss.spawned = true;
  s.build.weapons = [weapon];
  s.build.passives = [];
  s.upgrades = { [weapon]: level };
  s.weaponTimers = {};
  s.interactables = [];
  s.decoy.live = false;
  s.player.x = 700;
  s.player.y = 420;
  s.player.invuln = 1e9;
  return s;
}
function blob(s, x, y, extra = {}) {
  const e = { id: s.nextEnemyId++, kind: "ink-blob", x, y, hp: 100, maxHp: 100, alive: true,
    spawnTime: 0, slowTime: 0, orbitCooldown: 0, stun: 1e9, ...extra };
  s.enemies.push(e);
  return e;
}
/** Walks the cat along the given corners in small steps (positions set directly, one sim step each). */
function walk(s, corners, spacing = 5) {
  let [px, py] = [s.player.x, s.player.y];
  for (const [x, y] of corners) {
    const n = Math.max(1, Math.round(Math.hypot(x - px, y - py) / spacing));
    for (let i = 1; i <= n; i++) {
      s.player.x = px + ((x - px) * i) / n;
      s.player.y = py + ((y - py) * i) / n;
      s.player.vx = s.player.vy = 0;
      step(s, idle, DT);
    }
    [px, py] = [x, y];
  }
}

test("a cut line closes on a square path and never on a straight line", () => {
  const square = [];
  for (let i = 0; i <= 40; i++) {
    const k = i / 10, side = Math.floor(k), f = k - side;
    const c = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]];
    const a = c[Math.min(side, 3)], b = c[Math.min(side, 3) + 1];
    square.push({ x: a[0] + (b[0] - a[0]) * (side > 3 ? 1 : f), y: a[1] + (b[1] - a[1]) * (side > 3 ? 1 : f) });
  }
  let loop = null;
  for (let n = 4; n <= square.length && !loop; n++) loop = closeLoop(square.slice(0, n), 24, 1800);
  assert.ok(loop, "the square closes");
  assert.ok(insidePolygon(loop, 50, 50) && !insidePolygon(loop, 150, 50));
  const straight = Array.from({ length: 40 }, (_, i) => ({ x: i * 12, y: 3 * Math.sin(i / 3) }));
  for (let n = 4; n <= straight.length; n++) assert.equal(closeLoop(straight.slice(0, n), 24, 1800), null);
  const m = reflectAcross(140, 0, 100, 0, 1, 0);
  assert.deepEqual([m.x, m.y], [60, 0]);
});

test("closing the loop cuts the ink inside, spares ink outside and leaves white cut cells inside only", () => {
  // On painted, never-washed ground the loop stores no wash cells (its own polygon hole shows the cut).
  const p = quiet("zero", "paper-cut");
  walk(p, [[820, 420], [820, 540], [700, 540], [700, 420], [710, 412]]);
  assert.equal(p.cut.cuts, 1);
  assert.equal(p.wash.size, 0, "cutting painted paper marks no wash cells");
  const s = quiet("zero", "paper-cut");
  washAt(s, 760, 480, 200, 1);
  const inside = blob(s, 760, 480), outside = blob(s, 1000, 480);
  walk(s, [[820, 420], [820, 540], [700, 540], [700, 420], [710, 412]]);
  assert.equal(s.cut.cuts, 1, "one loop closed");
  assert.equal(s.cut.outs.length, 1);
  assert.ok(inside.hp <= 100 - 7 + 1e-9, `inside cut: ${inside.hp}`);
  assert.equal(outside.hp, 100, "outside untouched");
  const live = (x, y) => (s.wash.cells[washKey(...washCellOf(x, y))]?.cutUntil ?? 0) > s.elapsed;
  assert.ok(live(760, 480), "the hole is a white cut cell");
  assert.ok(!live(700 - WASH.cell * 3, 480), "cells outside the loop stay uncut");
  // The cut is spent: a fresh line started where the loop closed (only the last few steps since).
  assert.ok(s.cut.points.length <= 4, `fresh line: ${s.cut.points.length}`);
});

test("the Boss is only partly cut and the open slit closes up after its life", () => {
  const square = [[820, 420], [820, 540], [700, 540], [700, 420], [710, 412]];
  const lost = (kind, hp) => {
    const s = quiet("zero", "paper-cut");
    const e = blob(s, 760, 480, { kind, hp, maxHp: hp });
    walk(s, square);
    return { s, lost: hp - e.hp };
  };
  const ink = lost("ink-blob", 100).lost, { s, lost: boss } = lost("eraser-boss", 500);
  assert.ok(boss > 0 && boss < ink, `boss damage reduced: ${boss} < ${ink}`);
  assert.ok(PAPER_CUT.bossFactor < 1);
  s.enemies = [];
  for (let i = 0; i < Math.round(3 / DT); i++) step(s, idle, DT);
  assert.ok(s.cut.points.length <= 1, "the slit heals behind the cat");
});

test("the page fold flips ink inside the band across the crease and pins it; ink beyond stays", () => {
  const s = quiet("nicole", "page-fold");
  const near = blob(s, 740, 420, { stun: 0 }), far = blob(s, 1000, 420, { stun: 0 });
  step(s, idle, DT);
  assert.equal(s.fold.folds, 1);
  assert.ok(near.x < s.player.x, `flipped to the other side: ${near.x}`);
  // Mirrored across the crease (660), then nudged a little by the hit's knockback.
  assert.ok(near.x > 620 && near.x < 672, `mirrored across the crease: ${near.x}`);
  assert.ok(near.stun >= 1.2, "pinned");
  assert.ok(far.x > s.player.x && !(far.stun > 0), "beyond the band: untouched");
  assert.ok(s.wash.folds.some((f) => f.until > s.elapsed), "the flap protects the page");
  assert.equal(s.wash.size, 0, "folding painted ground stores no wash cells");
  assert.equal(s.walls.length, 0, "no wall below level 3");
});

test("from level 3 the crease raises a paper wall that blocks and is removed after its life", () => {
  const s = quiet("nicole", "page-fold", PAPER_WALL.fromLevel);
  blob(s, 740, 420, { stun: 0 });
  step(s, idle, DT);
  assert.equal(s.walls.length, 1);
  const w = s.walls[0];
  assert.ok(w.x1 > s.player.x && Math.abs(w.x1 - w.x2) < 1e-6, "wall stands ahead of the crease, across the fold");
  s.enemies = [];
  for (let i = 0; i < Math.round((w.maxLife + 0.1) / DT); i++) step(s, idle, DT);
  assert.equal(s.walls.length, 0, "the wall folds away");
  assert.ok(PAGE_FOLD.flapLife > 0);
});

test("each verb is only offered to its own cat, appended at the end with art and copy", () => {
  const ids = WEAPON_DEFS.ids();
  assert.deepEqual(ids.slice(-2), ["paper-cut", "page-fold"]);
  assert.deepEqual(WEAPON_ART.ids().slice(-2), ["paper-cut", "page-fold"]);
  assert.ok(CATS.get("zero").exclusives.includes("paper-cut"));
  assert.ok(CATS.get("nicole").exclusives.includes("page-fold"));
  const def = (id) => UPGRADES.find((u) => u.id === id);
  const zero = quiet("zero", "meow-bolt"), nicole = quiet("nicole", "moon-stars");
  assert.ok(isEligible(zero, def("paper-cut")) && !isEligible(zero, def("page-fold")));
  assert.ok(isEligible(nicole, def("page-fold")) && !isEligible(nicole, def("paper-cut")));
  // Starting kits and evolutions are unchanged.
  assert.equal(CATS.get("zero").startWeapon, "meow-bolt");
  assert.equal(CATS.get("nicole").startWeapon, "moon-stars");
  assert.deepEqual(CATS.get("zero").evolutions, ["echo-legion"]);
  assert.deepEqual(CATS.get("nicole").evolutions, ["full-moon"]);
  for (const id of ["paper-cut", "page-fold"])
    for (const k of [`upgrade.${id}.name`, `upgrade.${id}.desc`]) {
      assert.ok(MESSAGE_KEYS.includes(k), k);
      for (const loc of ["en", "zh"]) assert.notEqual(t(loc, k, {}), k);
    }
  assert.deepEqual(missingKeys("en"), []);
  assert.deepEqual(missingKeys("zh"), []);
});

test("four Paper Cut loops inside WASH.cut.seconds keep every hole under its own piece", () => {
  const s = quiet("zero", "paper-cut");
  washAt(s, 960, 480, 330, 1);
  const squares = [0, 1, 2, 3].map((k) => 700 + k * 160);
  for (const x0 of squares) {
    if (x0 !== 700) walk(s, [[x0, 420]], 20);
    walk(s, [[x0 + 120, 420], [x0 + 120, 540], [x0, 540], [x0, 420], [x0 + 10, 412]], 20);
  }
  assert.equal(s.cut.cuts, 4, "four loops closed");
  assert.ok(s.elapsed - s.cut.outs[0].at < WASH.cut.seconds, "all inside the cut-hole time");
  assert.equal(s.cut.outs.length, 4, "the oldest piece is still kept while its cells stay cut");
  const cutCell = (x, y) => (s.wash.cells[washKey(...washCellOf(x, y))]?.cutUntil ?? 0) > s.elapsed;
  for (const x0 of squares) assert.ok(cutCell(x0 + 60, 480), `square at ${x0} cut its cells`);
  // An uncovered cut cell (outside every piece) still draws its own cell hole.
  const [ox, oy] = washCellOf(960, 700), loose = s.wash.cells[washKey(ox, oy)];
  assert.ok(loose && loose.level >= WASH.colourless);
  loose.cutUntil = s.elapsed + 1;
  clearWashRender();
  const frame = washFrame(s), marks = new Map();
  for (const b of frame.buckets.values()) for (const m of b.marks) marks.set(`${m.ix},${m.iy}`, m.code);
  for (const x0 of squares) {
    const [ix, iy] = washCellOf(x0 + 60, 480);
    assert.ok(!((marks.get(`${ix},${iy}`) ?? 0) & 16), `no cell hole flashes back under the piece at ${x0}`);
  }
  assert.ok(marks.get(`${ox},${oy}`) & 16, "a cut cell outside every piece keeps its cell hole");
  // Pieces older than the cut time are pruned at the next loop.
  for (let i = 0; i < Math.round(WASH.cut.seconds / DT); i++) step(s, idle, DT);
  walk(s, [[700, 420]], 20);
  walk(s, [[820, 420], [820, 540], [700, 540], [700, 420], [710, 412]], 20);
  assert.equal(s.cut.cuts, 5);
  assert.equal(s.cut.outs.length, 1, "only the fresh piece is kept");
  assert.ok(PAPER_CUT.maxOuts >= 4);
});

test("two identical runs with the verbs stay identical", () => {
  for (const [cat, weapon] of [["zero", "paper-cut"], ["nicole", "page-fold"]]) {
    const runOnce = () => {
      const s = createSim({ cat, seed: 77, sessionSeconds: 600 });
      s.upgrades[weapon] = 3;
      s.build.weapons.push(weapon);
      s.player.invuln = 1e9;
      for (let i = 0; i < Math.round(25 / DT); i++) {
        if (s.pendingChoice) s.pendingChoice = null;
        const a = i * DT * 2.4;
        step(s, { ax: Math.cos(a), ay: Math.sin(a), dash: i % 240 === 0 }, DT);
      }
      return JSON.stringify(snapshot(s));
    };
    const a = runOnce();
    assert.equal(a, runOnce(), `${weapon} deterministic`);
    assert.ok(JSON.parse(a).cut !== undefined);
  }
});

test("cat wear: creases and tears follow lost hp, tape follows a heal and fades", () => {
  assert.equal(catWear(1, undefined, 10).marks, 0);
  assert.equal(catWear(CAT_WEAR.crease - 0.01, undefined, 10).marks, 1);
  assert.equal(catWear(CAT_WEAR.tear - 0.01, undefined, 10).marks, 2);
  assert.equal(catWear(CAT_WEAR.tear2 - 0.01, undefined, 10).marks, 3);
  assert.equal(catWear(1, 9, 10).tape, 1);
  assert.equal(catWear(1, 10 - CAT_WEAR.tapeSeconds - 0.1, 10).tape, 0);
  const fading = catWear(1, 10 - CAT_WEAR.tapeSeconds + CAT_WEAR.tapeFade / 2, 10).tape;
  assert.ok(fading > 0 && fading < 1);
  // A heal stamp is recorded when the fish treat or a heal passive restores hp.
  const s = quiet("zero", "meow-bolt");
  s.player.hp = 1;
  s.treats = [{ id: 1, x: s.player.x, y: s.player.y, alive: true, life: 10 }];
  step(s, idle, DT);
  assert.ok(s.player.hp > 1 && Math.abs(s.player.healAt - s.elapsed) < 1e-6);
});

/** A generated canal with a deep core and no road crossings, and its core centre. */
function canal(seed) {
  const r = waterRegionsNear(seed, (WORLD.minX + WORLD.maxX) / 2, WORLD.maxY / 2, WORLD.width)
    .find((r) => r.id.startsWith("canal:") && r.crossings.length === 0 && r.core.length);
  const c = { x: r.core.reduce((s, p) => s + p.x, 0) / r.core.length, y: r.core.reduce((s, p) => s + p.y, 0) / r.core.length };
  return { r, c, b: waterBounds(r.core) };
}
/** Nicole with Page Fold at `level` on the west bank of the canal, walking east. */
function atCanal(level, seed = 5) {
  const s = quiet("nicole", "page-fold", level, seed), { c, b } = canal(seed);
  s.player.x = b.minX - 40;
  s.player.y = c.y;
  return { s, c, b };
}
const east = { ax: 1, ay: 0, dash: false };

test("Page Fold at the bridge level lays a dry deck across deep water and Nicole walks over it", () => {
  const { s, c, b } = atCanal(FOLD_BRIDGE.level);
  assert.equal(waterAt(s.seed, c.x, c.y), "deep");
  let deep = 0, dry = 0;
  for (let i = 0; i < Math.round(5 / DT) && s.player.x < b.maxX + 40; i++) {
    step(s, east, DT);
    if (waterAt(s.seed, s.player.x, s.player.y) === "deep") {
      deep++;
      const decks = s.fold.bridges?.map((x) => x.polygon);
      assert.equal(waterAt(s.seed, s.player.x, s.player.y, decks), "bridge");
      // In the middle of the deck the water beside it is out of reach: dry contact, no wading.
      if (Math.abs(s.player.x - c.x) < 40 && !paperTouchesWater(s.seed, s.player.x, s.player.y, STATS.playerRadius, decks)) dry++;
    }
    assert.ok(!deepWaterBlocks(s.seed, s.player.x, s.player.y, STATS.playerRadius, s.fold.bridges?.map((x) => x.polygon)),
      "the cat never stands in uncovered deep water");
  }
  assert.equal(s.fold.bridges?.length, 1, "one bridge laid");
  const deck = s.fold.bridges[0].polygon;
  assert.ok(inWaterPolygon(c, deck), "the deck covers the core");
  // It spans from the near bank to past the far end of the deep water.
  const xs = deck.map((v) => v.x);
  assert.ok(Math.min(...xs) < b.minX && Math.max(...xs) > b.maxX, `deck spans the core: ${Math.min(...xs)}..${Math.max(...xs)}`);
  assert.equal(waterAt(s.seed, Math.max(...xs) - 1, c.y, [deck]), "bridge");
  assert.notEqual(waterAt(s.seed, Math.max(...xs) + 2, c.y), "deep", "the far end lands on the bank");
  assert.ok(s.player.x > b.maxX + 40, `Nicole reached the far bank: ${s.player.x}`);
  assert.ok(deep > 10, "she walked over the deep part");
  assert.ok(s.fold.folds >= 1, "the fold cue fires");
  assert.ok(dry > 5, `a deck keeps her dry over the core: ${dry}`);
});

test("below the bridge level, or with no far bank in reach, no bridge is laid", () => {
  const { s, b } = atCanal(FOLD_BRIDGE.level - 1);
  for (let i = 0; i < Math.round(4 / DT); i++) step(s, east, DT);
  assert.equal(s.fold.bridges, undefined);
  assert.ok(s.player.x < b.minX + 20, `the core blocks: ${s.player.x}`);
  assert.ok(FOLD_BRIDGE.length < 2 * WORLD.width, "the march is bounded");
});

test("bridge expiry waits while Nicole stands over deep water and never strands her", () => {
  const { s, c, b } = atCanal(FOLD_BRIDGE.level);
  for (let i = 0; i < Math.round(5 / DT) && s.player.x < c.x; i++) step(s, east, DT);
  assert.equal(s.fold.bridges?.length, 1);
  const bridge = s.fold.bridges[0], planned = bridge.until;
  // Stand still in the middle of the deck past the planned removal.
  const washed = s.wash.size;
  while (s.elapsed < planned + 1) step(s, idle, DT);
  assert.equal(s.fold.bridges?.length, 1, "kept while she stands over the deep part");
  assert.ok(s.wash.size <= washed, "standing on the deck splashes no wash cells");
  assert.ok(s.fold.bridges[0].until <= bridge.hold);
  while (s.elapsed < bridge.hold + 0.1) step(s, idle, DT);
  assert.equal(s.fold.bridges, undefined, "removed after the hold");
  assert.ok(!deepWaterBlocks(s.seed, s.player.x, s.player.y, STATS.playerRadius), `set on a bank: ${s.player.x},${s.player.y}`);
  assert.ok(s.player.x < b.minX + 40 || s.player.x > b.maxX - 40 || Math.abs(s.player.y - c.y) > 20);
  // Walked off: removal comes on time.
  const w = atCanal(FOLD_BRIDGE.level).s;
  for (let i = 0; i < Math.round(5 / DT) && w.player.x < b.maxX + 40; i++) step(w, east, DT);
  const until = w.fold.bridges[0].until;
  while (w.elapsed < until + DT * 2) step(w, idle, DT);
  assert.equal(w.fold.bridges, undefined, "removed on time once nobody is over the water");
});

test("contact knockback on a bridge keeps both actors on the deck", () => {
  const { s, c } = atCanal(FOLD_BRIDGE.level);
  for (let i = 0; i < Math.round(5 / DT) && s.player.x < c.x; i++) step(s, east, DT);
  assert.equal(s.fold.bridges?.length, 1);
  assert.equal(waterAt(s.seed, s.player.x, s.player.y), "deep", "she stands over the core");
  s.weaponTimers["page-fold"] = 1e9;
  s.player.invuln = 0;
  const e = blob(s, s.player.x + 10, s.player.y, { stun: 0 });
  const before = { x: s.player.x, y: s.player.y }, hp = s.player.hp;
  step(s, idle, DT);
  assert.ok(s.player.hp < hp, "the blob touched her");
  const decks = s.fold.bridges.map((x) => x.polygon);
  assert.ok(Math.abs(s.player.y - before.y) < 5 && Math.abs(s.player.x - before.x) < 30,
    `pushed along the deck, not off it: ${before.x},${before.y} -> ${s.player.x},${s.player.y}`);
  assert.equal(waterAt(s.seed, s.player.x, s.player.y, decks), "bridge", "the cat is still on the deck");
  assert.ok(!deepWaterBlocks(s.seed, s.player.x, s.player.y, STATS.playerRadius, decks));
  assert.equal(waterAt(s.seed, e.x, e.y, decks), "bridge", "the blob is still on the deck");
  assert.ok(Math.abs(e.y - before.y) < 5, `the blob is pushed along the deck: ${e.y}`);
});

test("bridge expiry waits for an enemy over deep water, then sets it on a bank", () => {
  const { s, c, b } = atCanal(FOLD_BRIDGE.level);
  for (let i = 0; i < Math.round(5 / DT) && s.player.x < b.maxX + 40; i++) step(s, east, DT);
  assert.ok(s.player.x > b.maxX + 40, "Nicole crossed");
  s.weaponTimers["page-fold"] = 1e9;
  const bridge = s.fold.bridges[0], planned = bridge.until;
  // A frozen blob in the middle of the deck: it cannot walk off by itself.
  const e = blob(s, c.x, c.y);
  assert.equal(waterAt(s.seed, e.x, e.y), "deep");
  while (s.elapsed < planned + 1) step(s, idle, DT);
  assert.equal(s.fold.bridges?.length, 1, "kept while the blob is over the deep part");
  while (s.elapsed < bridge.hold + 0.1) step(s, idle, DT);
  assert.equal(s.fold.bridges, undefined, "removed after the hold");
  assert.ok(e.alive);
  assert.ok(!deepWaterBlocks(s.seed, e.x, e.y, enemyRadius(e)), `the blob was set on a bank: ${e.x},${e.y}`);
});

test("bridge runs are deterministic and the deck is drawn from its exact vertices", (t) => {
  const run = () => {
    const { s } = atCanal(FOLD_BRIDGE.level);
    for (let i = 0; i < Math.round(9 / DT); i++) step(s, i < 300 ? east : { ax: -1, ay: 0.2, dash: false }, DT);
    return JSON.stringify(snapshot(s));
  };
  assert.equal(run(), run());
  const { s } = atCanal(FOLD_BRIDGE.level);
  for (let i = 0; i < Math.round(2 / DT) && !s.fold.bridges; i++) step(s, east, DT);
  const bridge = s.fold.bridges[0];
  class RecordingPath { constructor() { this.ops = []; } }
  for (const name of ["moveTo", "lineTo", "closePath"])
    RecordingPath.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
  const calls = [], stack = [];
  let st = { globalAlpha: 1, fillStyle: "" };
  const surface = { width: 64, height: 64 };
  const ctx = new Proxy({}, {
    get: (_, k) => k === "canvas" ? surface : k in st ? st[k] : ({
      save() { stack.push({ ...st }); }, restore() { st = stack.pop(); },
      createPattern() { return { setTransform() {} }; }, getTransform() { return new globalThis.DOMMatrix(); },
      createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    })[k] ?? ((...args) => calls.push({ op: k, args, ...st })),
    set: (_, k, v) => { st[k] = v; return true; },
  });
  surface.getContext = () => ctx;
  class Matrix { scale() { return this; } inverse() { return this; } transformPoint(q) { return q; } }
  for (const [key, value] of Object.entries({ Path2D: RecordingPath, DOMMatrix: Matrix, document: { createElement: () => surface } })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("bridge art used RNG"));
  const before = JSON.stringify(bridge);
  drawFoldBridge(ctx, bridge, bridge.at + 1);
  const exact = [["moveTo", bridge.polygon[0].x, bridge.polygon[0].y],
    ...bridge.polygon.slice(1).map((v) => ["lineTo", v.x, v.y]), ["closePath"]];
  assert.deepEqual(bridgePath(bridge.polygon).ops, exact);
  const card = calls.filter((c) => c.op === "fill" && c.fillStyle === "#d8c49a");
  assert.equal(card.length, 1);
  assert.deepEqual(card[0].args[0].ops, exact, "the deck card is the simulation polygon");
  assert.equal(stack.length, 0);
  assert.equal(JSON.stringify(bridge), before, "drawing never mutates the bridge");
});
