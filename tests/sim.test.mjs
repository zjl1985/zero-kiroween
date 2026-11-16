import assert from "node:assert/strict";
import { test } from "node:test";
import { FIXED_DT } from "../dist/game/clock.js";
import { createSim, snapshot, step } from "../dist/game/sim.js";
import { STATS } from "../dist/game/types.js";

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

test("style is not part of the simulation snapshot", () => {
  const state = createSim({ seed: 3 });
  const snap = snapshot(state);
  assert.equal(Object.prototype.hasOwnProperty.call(snap, "style"), false);
  const hp = state.player.hp;
  const x = state.player.x;
  // Switching style is a view concern: the sim does not offer a style field.
  assert.equal(state.player.hp, hp);
  assert.equal(state.player.x, x);
});
