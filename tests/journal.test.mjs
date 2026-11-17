import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arcHeight,
  chunkCoords,
  mapPoint,
  moonArc,
  paces,
  SEAM_STITCHES,
  seamStitches,
  viewChunks,
  wickCharge,
} from "../dist/ui/journal-geometry.js";
import { STATS } from "../dist/game/types.js";
import { CHUNK, WORLD, chunkIndex, chunkOf } from "../dist/game/world-gen.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { missingKeys } from "../dist/content/i18n.js";

test("the moon walks the arc across the night and turns into the sun for the dawn window", () => {
  const s = STATS.sessionSeconds;
  const start = moonArc(0, s),
    mid = moonArc(s * 0.4, s),
    end = moonArc(s, s);
  assert.equal(start.x, 0);
  assert.equal(end.x, 1);
  assert.ok(mid.y < start.y, "the moon climbs before it sets");
  assert.ok(end.y > 0.99, "the night ends on the horizon");
  assert.ok(start.y < 1 && start.y > 0);
  assert.equal(moonArc(s - STATS.dawnSeconds - 0.1, s).dawn, false);
  assert.equal(moonArc(s - STATS.dawnSeconds, s).dawn, true);
  assert.equal(moonArc(s * 2, s).t, 1);
  for (let t = 0; t <= 1; t += 0.05) {
    const h = arcHeight(t);
    assert.ok(h >= 0 && h <= 1);
  }
});

test("the XP seam sews whole stitches and the wick fills with the cooldown", () => {
  assert.equal(seamStitches(0, 10), 0);
  assert.equal(seamStitches(9.99, 10), SEAM_STITCHES - 1);
  assert.equal(seamStitches(10, 10), SEAM_STITCHES);
  assert.equal(seamStitches(50, 10), SEAM_STITCHES);
  assert.equal(seamStitches(5, 0), 0);
  assert.equal(seamStitches(5, 10), SEAM_STITCHES / 2);
  assert.equal(wickCharge(0, 6), 1);
  assert.equal(wickCharge(6, 6), 0);
  assert.equal(wickCharge(3, 6), 0.5);
  assert.equal(wickCharge(9, 6), 0);
});

test("the minimap projects the bounded town and clamps outside points", () => {
  assert.deepEqual(mapPoint(WORLD.minX, WORLD.minY, 132, 74), { x: 0, y: 0 });
  assert.deepEqual(mapPoint(WORLD.maxX, WORLD.maxY, 132, 74), { x: 132, y: 74 });
  assert.deepEqual(mapPoint(WORLD.minX - 500, WORLD.maxY + 500, 132, 74), { x: 0, y: 74 });
  const centre = mapPoint((WORLD.minX + WORLD.maxX) / 2, WORLD.maxY / 2, 100, 50);
  assert.ok(Math.abs(centre.x - 50) < 1e-9 && Math.abs(centre.y - 25) < 1e-9);
});

test("explored chunks are the ones the camera view overlaps, with stable indices", () => {
  const seen = viewChunks(480, 270);
  // The start view covers the two start-yard chunks exactly.
  assert.deepEqual(seen.sort((a, b) => a - b), [chunkIndex(0, 0), chunkIndex(1, 0)]);
  const mid = viewChunks(1000, 1000);
  assert.ok(mid.length >= 2 && mid.length <= 6);
  assert.ok(mid.includes(chunkIndex(chunkOf(1000, 1000).cx, chunkOf(1000, 1000).cy)));
  for (const i of viewChunks(WORLD.maxX + 999, WORLD.maxY + 999)) {
    const { cx, cy } = chunkCoords(i);
    assert.ok(cx >= CHUNK.minCx && cx <= CHUNK.maxCx && cy >= CHUNK.minCy && cy <= CHUNK.maxCy);
    assert.equal(chunkIndex(cx, cy), i);
  }
});

test("distance is logged in cat paces and the journal strings exist in both packs", () => {
  assert.equal(paces(0), 0);
  assert.equal(paces(STATS.playerRadius * 2 * 10), 10);
  for (const k of [
    "hud.dawn",
    "hud.map",
    "result.date",
    "result.distance",
    "result.paces",
    "result.landmarks",
    "result.landmarks_line",
    "result.landmarks_none",
    "result.sep",
    "result.elites",
    "result.chests",
    "result.paw",
  ])
    assert.ok(MESSAGE_KEYS.includes(k), k);
  assert.deepEqual(missingKeys("en"), []);
  assert.deepEqual(missingKeys("zh"), []);
});
