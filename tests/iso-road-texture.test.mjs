import assert from "node:assert/strict";
import { test } from "node:test";
import { materialAt } from "../dist/render/iso/terrain-field.js";
import { ROAD_TEXTURE, roadAxis, roadCoords, roadStep, roadSurface } from "../dist/render/iso/road-texture.js";
import { roads } from "../dist/game/world-gen.js";

const SEED = 7;

test("road samples carry the unit tangent of their road and paved branches are stone", () => {
  let paved = 0, dirt = 0;
  for (const [k, road] of roads(SEED).entries())
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const s = materialAt(SEED, (a.x + b.x) / 2, (a.y + b.y) / 2);
      if (s.material !== "road") continue;
      assert.ok(Math.abs(Math.hypot(...s.tangent) - 1) < 1e-9);
      // Crossings of two roads may report the other road; on a lone segment the tangent is the segment's own.
      const dot = Math.abs(s.tangent[0] * (b.x - a.x) + s.tangent[1] * (b.y - a.y)) / len;
      if (dot > 0.999) assert.equal(roadAxis(s.tangent), Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? "x" : "y");
      if (k === 0) assert.equal(s.paved, false, "the spine is a dirt track");
      if (s.paved) { assert.equal(roadSurface(s), "stone"); paved++; } else { assert.equal(roadSurface(s), "dirt"); dirt++; }
    }
  assert.ok(paved > 0 && dirt > 0, `${paved} paved and ${dirt} dirt segments`);
  assert.equal(materialAt(SEED, -3000, 4000).tangent, undefined, "grass has no tangent");
});

test("road axes pick the closest lattice diagonal", () => {
  assert.equal(roadAxis([1, 0]), "x");
  assert.equal(roadAxis([0.6, -0.8]), "y");
  assert.equal(roadAxis([-0.9, 0.3]), "x");
  assert.equal(roadAxis(undefined), "x");
  // `across` is constant along the axis diagonal: world +x runs screen (2, 1), world +y screen (-2, 1).
  for (const [axis, dx] of [["x", 2], ["y", -2]])
    for (let i = 0; i < 50; i++) {
      const px = i * 7 - 100, py = i * 3 - 40, c = roadCoords(axis, px, py), n = roadCoords(axis, px + dx, py + 1);
      assert.equal(n.across, c.across);
      assert.ok(n.along > c.along);
    }
});

test("stone joints and dirt dashes run along the chosen diagonal", () => {
  for (const [axis, dx] of [["x", 2], ["y", -2]]) {
    let lines = 0;
    for (let py = 0; py < 64; py++) for (let px = -64; px < 64; px++) {
      const { across } = roadCoords(axis, px, py);
      if (((across % ROAD_TEXTURE.course) + ROAD_TEXTURE.course) % ROAD_TEXTURE.course !== 0) continue;
      // A course line continues along the diagonal ...
      for (let k = 1; k < 6; k++) assert.equal(roadStep(SEED, "stone", axis, px + dx * k, py + k, 20), 1, `${axis} course line`);
      lines++;
    }
    assert.ok(lines > 100);
    // ... and does not along the other diagonal.
    const other = axis === "x" ? "y" : "x";
    let broken = 0;
    for (let py = 0; py < 32; py++) for (let px = 0; px < 32; px++) {
      const { across } = roadCoords(axis, px, py);
      if (across % ROAD_TEXTURE.course !== 0 || across < 0) continue;
      if (roadStep(SEED, "stone", other, px, py, 20) !== roadStep(SEED, "stone", axis, px, py, 20)) broken++;
      if (roadStep(SEED, "stone", axis, px - dx * 3, py + 3, 20) !== 1) broken++;
    }
    assert.ok(broken > 0, "course lines are not drawn along both diagonals");
  }
});

test("dirt roads carry two ruts that follow the edge distance", () => {
  const R = ROAD_TEXTURE;
  for (let px = 0; px < 40; px++) for (const axis of ["x", "y"]) {
    assert.equal(roadStep(SEED, "dirt", axis, px, 5, R.rutFrom + 0.5), 1, "rut floor");
    assert.equal(roadStep(SEED, "dirt", axis, px, 5, R.rutFrom + R.rutWidth + 0.5), 3, "lit rut lip");
  }
  // Away from the ruts the pattern comes from the dirt texture and dashes: same pixel, same step.
  const a = [], b = [];
  for (let px = 0; px < 200; px++) { a.push(roadStep(SEED, "dirt", "x", px, 9, 20)); b.push(roadStep(SEED, "dirt", "x", px, 9, 20)); }
  assert.deepEqual(a, b);
  assert.ok(new Set(a).size >= 2);
});
