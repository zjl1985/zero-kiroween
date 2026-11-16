import assert from "node:assert/strict";
import { test } from "node:test";
import { viewport, VIEW_WIDTH, VIEW_HEIGHT } from "../dist/render/viewport.js";
test("pixel viewport fits 28 size / DPR combinations without stretching or wasting half the screen", () => {
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1273, 799],
    [390, 844],
    [844, 390],
    [320, 568],
    [120, 80],
  ]) {
    for (const dpr of [1, 1.25, 2, 3]) {
      const v = viewport(width, height, dpr);
      assert.ok(v.cssX >= 0 && v.cssY >= 0);
      assert.ok(
        v.cssX + v.cssW <= width + 0.001 && v.cssY + v.cssH <= height + 0.001,
      );
      assert.ok(Math.abs(v.w / v.h - VIEW_WIDTH / VIEW_HEIGHT) < 1e-10);
      const fit = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT);
      assert.ok(v.cssW >= VIEW_WIDTH * fit * 0.895);
      assert.equal(v.cssW * dpr, v.w);
      assert.equal(v.cssY * dpr, v.y);
    }
  }
});
test("integer physical pixels are preferred when the size penalty is small", () => {
  assert.equal(viewport(1440, 900, 2).scale, 3);
  assert.equal(viewport(1280, 720, 1).scale, 1280 / 960);
  assert.equal(viewport(390, 844, 3).scale, (390 * 3) / 960);
});
