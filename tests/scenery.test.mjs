import assert from "node:assert/strict";
import { test } from "node:test";
import { avoidScenery } from "../dist/game/scenery.js";
import { createSim, step } from "../dist/game/sim.js";
import { FIXED_DT } from "../dist/game/clock.js";
test("a walking or dashing cat cannot pass through the near fence", () => {
  for (const dash of [false, true]) {
    const sim = createSim();
    sim.enemies = [];
    sim.spawnTimer = 10000;
    sim.player.x = 70;
    sim.player.y = 400;
    for (let i = 0; i < 90; i++)
      step(sim, { ax: 0, ay: 1, dash: dash && i === 0 }, FIXED_DT);
    assert.ok(sim.player.y <= 423.001);
  }
});
test("fence endpoints allow a route around them and leave open ground untouched", () => {
  assert.deepEqual(avoidScenery(145, 438, 12), { x: 145, y: 438 });
  assert.deepEqual(avoidScenery(480, 360, 12), { x: 480, y: 360 });
  const position = avoidScenery(114, 438, 12);
  assert.ok(Number.isFinite(position.y));
  assert.ok(Math.hypot(position.x - 114, position.y - 438) >= 15);
});

test("an edge boulder and enemy knockback keep the player inside the world", () => {
  const clear = avoidScenery(938, 371, 12);
  assert.ok(clear.x <= 938);
  assert.ok(Math.hypot(clear.x - 928, clear.y - 371) >= 22);
  const sim = createSim();
  sim.player.x = 938;
  sim.player.y = 400;
  sim.player.attackCooldown = 10;
  sim.enemies[0].x = 930;
  sim.enemies[0].y = 400;
  sim.enemies[0].spawnTime = 0;
  step(sim, { ax: 0, ay: 0, dash: false }, FIXED_DT);
  assert.ok(sim.player.x <= 938);
  assert.equal(sim.player.hp, sim.player.maxHp - 1);
});
