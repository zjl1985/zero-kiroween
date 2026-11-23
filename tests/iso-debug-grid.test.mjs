import assert from "node:assert/strict";
import { test } from "node:test";
import { createSim } from "../dist/game/sim.js";
import { drawIsoDebugGrid, isoGridRequested } from "../dist/render/iso/debug-grid.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";

test("?iso=grid is the only switch for the debug grid", () => {
  assert.equal(isoGridRequested("?iso=grid"), true);
  assert.equal(isoGridRequested("?start=1&iso=grid&seed=4"), true);
  assert.equal(isoGridRequested(""), false);
  assert.equal(isoGridRequested("?iso=1"), false);
});

test("the debug grid draws without text and leaves the sim untouched", () => {
  const sim = createSim({ seed: 7 }), before = JSON.stringify(sim);
  const calls = { stroke: 0, ellipse: 0, text: 0 }, noop = () => {};
  const ctx = new Proxy({}, {
    get: (_, key) => {
      if (key === "stroke") return () => { calls.stroke++; };
      if (key === "ellipse") return () => { calls.ellipse++; };
      if (key === "fillText" || key === "strokeText") return () => { calls.text++; };
      return noop;
    },
    set: () => true,
  });
  drawIsoDebugGrid(ctx, sim, createIsoCamera(960, 540, sim.player));
  assert.ok(calls.stroke > 0);
  assert.ok(calls.ellipse >= 1, "player footprint at least");
  assert.equal(calls.text, 0);
  assert.equal(JSON.stringify(sim), before);
});
