import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { FIXED_DT as DT } from "../dist/game/clock.js";
import { CATS, WEAPON_DEFS } from "../dist/defs/index.js";
import { closeLoop, insidePolygon, reflectAcross } from "../dist/defs/weapons/paper-geometry.js";
import { PAPER_CUT } from "../dist/defs/weapons/paper-cut.js";
import { PAGE_FOLD, PAPER_WALL } from "../dist/defs/weapons/page-fold.js";
import { isEligible, UPGRADES } from "../dist/game/upgrades.js";
import { washAt, washCellOf, washKey } from "../dist/game/wash.js";
import { WASH } from "../dist/defs/wash.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys, t } from "../dist/content/i18n.js";
import { WEAPON_ART } from "../dist/render/art-registry.js";
import "../dist/render/art-index.js";
import { CAT_WEAR } from "../dist/render/timeline.js";
import { catWear } from "../dist/render/cat-detail.js";

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
