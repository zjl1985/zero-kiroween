import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { CHUNK, chunkContent, roads } from "../dist/game/world-gen.js";
import { BASE_DECOR } from "../dist/defs/biomes/districts.js";
import "../dist/defs/world-index.js";
import { BIOME_DEFS } from "../dist/defs/registries.js";
import { PAPER_VALUE } from "../dist/render/paper-rules.js";

// Source and data checks only: they say which rules the code follows, not how the pixels look.
const render = new URL("../src/render/", import.meta.url);
const source = (name) => readFileSync(new URL(name, render), "utf8");

test("no render module sets a canvas filter except the one-off gallery value check", () => {
  for (const name of readdirSync(render).filter((n) => n.endsWith(".ts"))) {
    const text = source(name);
    if (name === "gallery.ts") {
      assert.deepEqual(text.match(/\.filter\s*=\s*"[^"]*"/g), ['.filter = "grayscale(1)"']);
      continue;
    }
    assert.doesNotMatch(text, /\.filter\s*=/, `${name} sets no canvas filter`);
  }
  // The shared ground shadow is the flat down-right ruleset, not a blur.
  assert.match(source("paper-material.ts"), /export function shadow[\s\S]*?PAPER_SHADOW\.dx[\s\S]*?\n}/);
});

test("the value hierarchy is data: ground below decor, a moon-side rim and dark shot outlines", () => {
  const tone = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  assert.ok(tone(PAPER_VALUE.ground.multiply) < tone(PAPER_VALUE.decor.multiply), "ground sits lower than plain decor");
  assert.ok(PAPER_VALUE.ground.desaturate > PAPER_VALUE.decor.desaturate);
  assert.ok(tone(PAPER_VALUE.rim.color) > 600, "rim is pale");
  assert.ok(tone(PAPER_VALUE.shotOutline.color) < 150, "shot outline is dark paper");
  // Ground tiles, decor sprites and props are graded at bake time; cats and enemies get the rim.
  assert.match(source("craft-world.ts"), /gradeCanvas\(canvas, PAPER_VALUE\.ground\)/);
  assert.match(source("craft-world.ts"), /if \(own\) gradeCanvas\(canvas, PAPER_VALUE\.decor\)/);
  assert.match(source("craft-props.ts"), /gradeCanvas\(canvas, PAPER_VALUE\.decor\)/);
  assert.match(source("craft-enemies.ts"), /if \(rim\) addLitRim\(canvas, 2\)/);
  assert.match(source("world.ts"), /drawWithLitRim\(ctx, pose\.x, pose\.y, CAT_BOX, paintCat\)/);
  assert.doesNotMatch(source("craft-combat.ts").match(/export function drawCraftShot[\s\S]*?\n}/)[0], /glow\(|globalAlpha/);
});

test("lamps are half as likely and stand only beside roads", () => {
  assert.equal(BASE_DECOR.lampChance, 0.22);
  for (const b of BIOME_DEFS.all()) assert.ok((b.decor.lampChance ?? BASE_DECOR.lampChance) <= 0.4, b.id);
  let lamps = 0;
  const seed = 7, rs = roads(seed);
  const near = (x, y) => rs.some((r) => r.points.some((p, i) => {
    const q = r.points[Math.min(i + 1, r.points.length - 1)], dx = q.x - p.x, dy = q.y - p.y, d = dx * dx + dy * dy || 1,
      t = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / d));
    return Math.hypot(x - p.x - dx * t, y - p.y - dy * t) < r.width + 120;
  }));
  for (let cy = CHUNK.minCy; cy <= CHUNK.maxCy; cy++) for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) {
    const c = chunkContent(seed, cx, cy);
    if (c.landmark) continue;
    for (const d of c.decor) if (d.kind === "lamp") {
      lamps++;
      assert.ok(near(d.x, d.y), `lamp at ${d.x},${d.y} stands by a road`);
    }
  }
  assert.ok(lamps > 15 && lamps < 75, `about half the old ~110 lamps (${lamps})`);
});
