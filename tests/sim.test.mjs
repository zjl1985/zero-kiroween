import assert from "node:assert/strict";
import { test } from "node:test";
import { FIXED_DT } from "../dist/game/clock.js";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { STATS } from "../dist/game/types.js";
import { SCREEN, WORLD, viewCentre } from "../dist/game/world-gen.js";

function run(seed, frames, input) {
  const state = createSim({ seed, sessionSeconds: 60 });
  for (let i = 0; i < frames; i += 1) step(state, input, FIXED_DT);
  return state;
}

test("same seed and input produce the same simulation", () => {
  const input = { ax: 0.6, ay: -0.2, dash: false };
  const a = run(42, 180, input);
  const b = run(42, 180, input);
  assert.deepEqual(snapshot(a), snapshot(b));
});

test("a different seed or a different stick changes the result", () => {
  const input = { ax: 1, ay: 0, dash: false };
  const a = snapshot(run(1, 200, input));
  const b = snapshot(run(2, 200, input));
  const c = snapshot(run(1, 200, { ax: -1, ay: 0, dash: false }));
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("dash leaves a 1.2s decoy without spending a random roll", () => {
  const state = createSim({ seed: 9, sessionSeconds: 30 });
  const before = state.rngState;
  step(state, { ax: 1, ay: 0, dash: true }, FIXED_DT);
  assert.equal(state.decoy.live, true);
  assert.equal(Number(state.decoy.time.toFixed(4)), STATS.decoyTime);
  assert.ok(state.player.dashCooldown > 2.9);
  assert.equal(state.rngState, before);
  const decoyX = state.decoy.x;
  let frames = 0;
  while (state.decoy.live && frames < 120) {
    step(state, { ax: 1, ay: 0, dash: false }, FIXED_DT);
    frames += 1;
  }
  assert.ok(frames >= 70 && frames <= 80, `decoy lasted ${frames} frames`);
  assert.equal(state.decoy.live, false);
  void decoyX;
});

test("the chosen cat is the only player, with no companion after movement or a dash", () => {
  for (const cat of ["zero", "nicole"]) {
    const sim = createSim({ cat, seed: 22 });
    assert.equal(sim.player.id, cat);
    assert.equal("partner" in sim, false);
    for (let i = 0; i < 180; i++)
      step(sim, { ax: 1, ay: 0, dash: i === 10 }, FIXED_DT);
    assert.equal(sim.player.id, cat);
    assert.equal("partner" in snapshot(sim), false);
    assert.equal(sim.decoy.live, false);
  }
});

test("hit and defeat feedback comes from collisions and expires", () => {
  const state = createSim();
  const enemy = state.enemies[0];
  enemy.x = 400;
  enemy.y = 260;
  enemy.hp = 2;
  enemy.spawnTime = 0;
  const shoot = () =>
    state.shots.push({
      id: 100,
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      life: 1,
      alive: true,
    });
  shoot();
  step(state, { ax: 0, ay: 0, dash: false }, FIXED_DT);
  assert.equal(enemy.hp, 1);
  assert.equal(state.impacts[0].kind, "hit");
  shoot();
  step(state, { ax: 0, ay: 0, dash: false }, FIXED_DT);
  assert.equal(enemy.alive, false);
  assert.ok(state.impacts.some((e) => e.kind === "defeat"));
  const seen = new Set(state.impacts.map((e) => e.seed));
  // Floating damage tags and dissolving flakes outlive the hit spark but still expire.
  for (let i = 0; i < 60; i++)
    step(state, { ax: 0, ay: 0, dash: false }, FIXED_DT);
  assert.equal(state.impacts.filter((e) => seen.has(e.seed)).length, 0);
});

import { makeRoom } from "../dist/game/sim.js";

test("making room rubs out the farthest off-screen commons first and keeps the fight in view", () => {
  const s = createSim({ cat: "zero", seed: 9 });
  const p = s.player,
    base = { hp: 5, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0 };
  // Two commons in view come first in the list (the old code erased them first); three are off screen.
  s.enemies = [
    { ...base, id: 1, kind: "ink-blob", x: p.x + 40, y: p.y },
    { ...base, id: 2, kind: "ink-blob", x: p.x - 60, y: p.y + 20 },
    { ...base, id: 3, kind: "ink-blob", x: p.x + 700, y: p.y },
    { ...base, id: 4, kind: "ink-blob", x: p.x, y: p.y + 1200 },
    { ...base, id: 5, kind: "ink-blob", x: p.x - 900, y: p.y, elite: true, radius: 20 },
    { ...base, id: 6, kind: "ink-blob", x: p.x + 520, y: p.y + 300 },
  ];
  makeRoom(s, 4);
  const gone = s.enemies.filter((e) => !e.alive).map((e) => e.id);
  // Six alive, limit 4: three go (below the limit), farthest off-screen first, never the elite.
  assert.deepEqual(gone, [3, 4, 6]);
  assert.ok(s.enemies.find((e) => e.id === 1).alive && s.enemies.find((e) => e.id === 2).alive);
  assert.ok(s.enemies.find((e) => e.id === 5).alive, "elites are never rubbed out");
});

for (const [edge, x, y] of [
  ["west", WORLD.minX + WORLD.edge + 20, WORLD.height / 2],
  ["east", WORLD.maxX - WORLD.edge - 20, WORLD.height / 2],
  ["south", (WORLD.minX + WORLD.maxX) / 2, WORLD.maxY - WORLD.edge - 20],
]) {
  test(`making room at the ${edge} edge uses the clamped view but ranks distance from the player`, () => {
    const s = createSim({ seed: 9 });
    Object.assign(s.player, { x, y });
    const c = viewCentre(x, y),
      hw = SCREEN.width / 2,
      hh = SCREEN.height / 2,
      south = edge === "south",
      base = { kind: "ink-blob", hp: 5, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0 },
      visible = south
        ? { x: c.x + hw - 20, y: c.y - hh + 20 }
        : { x: c.x + (edge === "west" ? 1 : -1) * (hw - 20), y: c.y },
      near = south ? { x: x + hw + 20, y } : { x, y: y + hh + 20 },
      far = south ? { x: c.x + hw + 20, y: c.y } : { x: c.x, y: c.y + hh + 20 };
    // The visible common is outside the player-centred rectangle and farther
    // from the player than either off-screen common. Camera-distance ranks near first.
    const inView = (e) => Math.abs(e.x - c.x) <= hw && Math.abs(e.y - c.y) <= hh,
      distance = (e, centre) => Math.hypot(e.x - centre.x, e.y - centre.y);
    assert.ok(inView(visible) && !inView(near) && !inView(far));
    assert.ok(distance(visible, s.player) > distance(far, s.player));
    assert.ok(distance(far, s.player) > distance(near, s.player));
    assert.ok(distance(near, c) > distance(far, c));
    s.enemies = [
      { ...base, ...visible, id: 1 },
      { ...base, ...far, id: 2, elite: true, radius: 20 },
      { ...base, ...far, id: 3, kind: "eraser-boss" },
      { ...base, ...near, id: 4 },
      { ...base, ...far, id: 5 },
    ];
    makeRoom(s, 5);
    assert.deepEqual(s.enemies.filter((e) => !e.alive).map((e) => e.id), [5]);
    makeRoom(s, 4);
    assert.deepEqual(s.enemies.filter((e) => !e.alive).map((e) => e.id), [4, 5]);
    assert.ok(s.enemies[0].alive, "the common inside the clamped view stays alive");
    assert.ok(s.enemies[1].alive && s.enemies[2].alive, "elites and the Boss stay alive");
  });
}

test("making room falls back to farthest visible commons, breaking ties by array order", () => {
  const s = createSim({ seed: 9 }),
    p = s.player,
    base = { kind: "ink-blob", hp: 5, alive: true, orbitCooldown: 0, slowTime: 0, spawnTime: 0 };
  s.enemies = [
    { ...base, id: 1, x: p.x + 10, y: p.y },
    { ...base, id: 9, x: p.x + 160, y: p.y },
    { ...base, id: 2, x: p.x - 160, y: p.y },
    { ...base, id: 3, x: p.x + 300, y: p.y, elite: true },
    { ...base, id: 4, x: p.x + 400, y: p.y, kind: "eraser-boss" },
    { ...base, id: 5, x: p.x + 1000, y: p.y, alive: false },
  ];
  makeRoom(s, 6);
  assert.equal(s.enemies.filter((e) => e.alive).length, 5, "nothing erased below the limit");
  assert.equal(s.impacts.length, 0);
  makeRoom(s, 5);
  assert.equal(s.enemies[1].alive, false, "first equal-distance common goes first, not the lowest id");
  assert.ok(s.enemies[0].alive && s.enemies[2].alive);
  makeRoom(s, 4);
  assert.equal(s.enemies[2].alive, false, "the farther common goes before the nearby one");
  assert.ok(s.enemies[0].alive);
  makeRoom(s, 1);
  assert.deepEqual(s.enemies.filter((e) => e.alive).map((e) => e.id), [3, 4]);
  assert.equal(s.impacts.length, 3, "only living commons are erased, even if protected enemies exceed the limit");
});
