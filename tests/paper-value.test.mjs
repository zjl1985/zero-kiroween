import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { CHUNK, chunkContent, roads } from "../dist/game/world-gen.js";
import { BASE_DECOR } from "../dist/defs/biomes/districts.js";
import "../dist/defs/world-index.js";
import { BIOME_DEFS } from "../dist/defs/registries.js";
import { PAPER_VALUE } from "../dist/render/paper-rules.js";
import { TERRAIN_PALETTE } from "../dist/render/pixel-terrain.js";
import { relativeLuminance } from "../dist/render/paper-value.js";
import { FX } from "../dist/render/pixel-vfx.js";
import { drawCraftShot } from "../dist/render/craft-combat.js";
import { pixelBacking } from "../dist/render/pixel-resolution.js";

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

test("legacy paper value constants remain ordered for retained fallback and pencil helpers", () => {
  const tone = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  assert.ok(tone(PAPER_VALUE.ground.multiply) < tone(PAPER_VALUE.decor.multiply));
  assert.ok(PAPER_VALUE.ground.desaturate > PAPER_VALUE.decor.desaturate);
  assert.ok(tone(PAPER_VALUE.rim.color) > 600);
  assert.ok(tone(PAPER_VALUE.shotOutline.color) < 150);
});

test("native terrain ramps preserve value separation from opaque player shots without a paper grade", () => {
  assert.equal(Object.keys(TERRAIN_PALETTE).length, 5, "all five district palettes are covered");
  for (const [kind, colours] of Object.entries(TERRAIN_PALETTE)) {
    assert.equal(new Set(colours).size, 3, `${kind}: three distinct material tones`);
    const [dark, mid, light] = colours.map(relativeLuminance);
    assert.ok(dark < mid && mid < light, `${kind}: shadow, face and top highlight remain ordered`);
    assert.ok(relativeLuminance(FX.dark) < dark, `${kind}: dark outlines remain distinguishable`);
    assert.ok(relativeLuminance(FX.gold) > light && relativeLuminance(FX.cream) > light,
      `${kind}: player shots and their highlight remain above ground details`);
  }
  const lightestTerrain = Math.max(...Object.values(TERRAIN_PALETTE).flat().map(relativeLuminance));
  const cells = [], ctx = {
    fillStyle: "", globalAlpha: 1, globalCompositeOperation: "source-over",
    fillRect(...args) { cells.push({ args, color: this.fillStyle, alpha: this.globalAlpha, composite: this.globalCompositeOperation }); },
    save() {}, restore() {}, scale() {},
    translate(x, y) { assert.ok(Number.isInteger(x) && Number.isInteger(y), "shot anchors snap to the pixel grid"); },
  };
  for (const empowered of [false, true]) for (const echo of [false, true]) {
    cells.length = 0;
    drawCraftShot(ctx, 100.25, 75.75, -3, 4, empowered, echo);
    assert.ok(cells.length > 1 && cells.every(c => c.args.every(Number.isInteger)), "shot is authored with integer cells");
    assert.ok(new Set(cells.map(c => c.color)).size >= 3, "the pulse has a separate cut edge and face highlights");
    assert.ok(cells.some(c => relativeLuminance(c.color) > lightestTerrain), "pulse highlights stand out against the brightest terrain");
    assert.ok(cells.every(c => c.alpha === 1 && c.composite === "source-over"), "the pulse is solid and has no additive glow");
  }
  assert.deepEqual(pixelBacking(960, 540), { width: 960, height: 540 }, "native world resolution is explicit");
  assert.match(source("world.ts"), /imageSmoothingEnabled = false/, "world retains nearest sampling");
  assert.doesNotMatch(source("craft-world.ts"), /gradeCanvas\(canvas, PAPER_VALUE\.(?:ground|decor)\)/,
    "coloured pixel palettes are not multiplied through the old paper grade");
  assert.doesNotMatch(source("craft-props.ts"), /gradeCanvas\(canvas, PAPER_VALUE\.decor\)/);
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
