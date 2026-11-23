import assert from "node:assert/strict";
import { test } from "node:test";
import { materialAt, prepareTerrainField } from "../dist/render/iso/terrain-field.js";
import { TRANSITION, borderWidth, neighbourMaterial } from "../dist/render/iso/transitions.js";
import { ISO_BLOCK, bakeBlockPixels, blockWorldBox } from "../dist/render/iso/terrain-bake.js";
import { ISO_RAMPS, hexRgb } from "../dist/render/iso/palette.js";
import { toScreen, toWorld } from "../dist/render/iso/projection.js";
import { WORLD, roads, waterRegionsNear } from "../dist/game/world-gen.js";

const SEED = 7, W = ISO_BLOCK.width, H = ISO_BLOCK.height;
const sample = (x, y) => materialAt(SEED, x, y);
const blockOf = (x, y) => { const s = toScreen(x, y); return { col: Math.floor(s.x / W), row: Math.floor(s.y / H) }; };
const rampOf = (rgb) => {
  const out = new Set();
  for (const [name, steps] of Object.entries(ISO_RAMPS))
    steps.forEach((hex, step) => { if (hexRgb(hex).join() === rgb.join()) out.add(`${name}:${step}`); });
  return out;
};
/** Every in-world pixel of block (col, row) with its sample, neighbour and colour. */
function* blockPixels(seed, col, row) {
  const field = prepareTerrainField(seed, blockWorldBox(col, row)), px = bakeBlockPixels(seed, col, row);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const w = toWorld(col * W + x + 0.5, row * H + y + 0.5);
    if (w.x < WORLD.minX || w.x >= WORLD.maxX || w.y < WORLD.minY || w.y >= WORLD.maxY) continue;
    const s = field(w.x, w.y), k = (y * W + x) * 4;
    yield { s, n: neighbourMaterial(field, w.x, w.y, s), rgb: [px[k], px[k + 1], px[k + 2]], x, y };
  }
}

test("border widths are irregular, smooth, deterministic and stay within 2 to 4 units", () => {
  const seen = new Set();
  let maxJump = 0;
  for (let i = 0; i < 2000; i++) {
    const x = -2000 + i * 1.37, y = 300 + (i % 50) * 3.1, w = borderWidth(SEED, x, y);
    assert.ok(w >= TRANSITION.minWidth && w <= TRANSITION.maxWidth, `${w}`);
    assert.equal(borderWidth(SEED, x, y), w);
    maxJump = Math.max(maxJump, Math.abs(borderWidth(SEED, x + 0.5, y) - w));
    seen.add(Math.round(w * 4));
  }
  assert.ok(seen.size >= 6, "the width varies along an edge");
  assert.ok(maxJump < 0.5, `value noise is smooth (${maxJump})`);
});

test("neighbourMaterial finds the material across the nearest edge and nothing far from edges", () => {
  const road = roads(SEED)[1], a = road.points[1], b = road.points[2],
    len = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const inner = { x: a.x + nx * (road.width - 1.5), y: a.y + ny * (road.width - 1.5) },
    outer = { x: a.x + nx * (road.width + 1.5), y: a.y + ny * (road.width + 1.5) };
  const si = sample(inner.x, inner.y), so = sample(outer.x, outer.y);
  assert.equal(si.material, "road");
  assert.notEqual(neighbourMaterial(sample, inner.x, inner.y, si), undefined);
  assert.equal(neighbourMaterial(sample, outer.x, outer.y, so), "road");
  const far = sample(-3000, 4000);
  assert.ok(far.edge >= TRANSITION.band);
  assert.equal(neighbourMaterial(sample, -3000, 4000, far), undefined);
});

test("grass overhangs road edges with a dark lip; roads keep their texture inside", () => {
  const { col, row } = blockOf(480, 270);
  let overhang = 0, lip = 0, inside = 0;
  for (const { s, n, rgb } of blockPixels(SEED, col, row)) {
    if (s.material !== "road") continue;
    const ramps = [...rampOf(rgb)];
    if (n === "grass" && s.edge < TRANSITION.minWidth) { assert.ok(ramps.some((r) => r.startsWith("grass:")), "overhang is grass"); overhang++; }
    if (n === "grass" && s.edge >= TRANSITION.maxWidth && s.edge < TRANSITION.maxWidth + 1 && ramps.some((r) => r.endsWith(":0"))) lip++;
    if (s.edge > TRANSITION.maxWidth + 1) { assert.ok(!ramps.some((r) => r.startsWith("grass:")), "no grass inside the road"); inside++; }
  }
  assert.ok(overhang > 50 && inside > 1000, `${overhang} overhang, ${inside} inside`);
  assert.ok(lip > 0, "a dark lip follows the overhang");
});

test("land at the shore turns to damp soil with a dark lip; bridge heads show plank ends", () => {
  const { col, row } = blockOf(1040, 420);
  let damp = 0;
  for (const { s, n, rgb } of blockPixels(SEED, col, row)) {
    if (s.material !== "grass" || (n !== "shallow" && n !== "deep") || s.edge >= TRANSITION.minWidth + 1) continue;
    const ramps = [...rampOf(rgb)];
    assert.ok(ramps.some((r) => r.startsWith("soil:")), `shore pixel is soil (${ramps})`);
    if (s.edge < 1) assert.ok(rampOf(rgb).has("soil:0"));
    damp++;
  }
  assert.ok(damp > 50, `${damp} damp shore pixels`);
  // A crossing deck: its land ends get lit plank ends, its water sides a dark lip.
  let crossing;
  for (const r of waterRegionsNear(SEED, 0, 2700, 5000)) if (r.crossings.length) { crossing = r.crossings[0]; break; }
  assert.ok(crossing, "seed 7 has a crossing");
  const p = crossing.polygon, cx = p.reduce((v, q) => v + q.x, 0) / p.length, cy = p.reduce((v, q) => v + q.y, 0) / p.length;
  const blocks = new Map();
  for (const q of [...p, { x: cx, y: cy }]) { const b = blockOf(q.x, q.y); blocks.set(`${b.col},${b.row}`, b); }
  let ends = 0, sides = 0;
  for (const { col: c, row: r } of blocks.values())
    for (const { s, n, rgb } of blockPixels(SEED, c, r)) {
      if (s.material !== "bridge" || !n || s.edge >= TRANSITION.plankEnd) continue;
      const ramps = rampOf(rgb);
      if (n === "shallow" || n === "deep") { if (s.edge < 1) { assert.ok(ramps.has("wood:1")); sides++; } }
      else if (s.edge >= 1) { assert.ok(ramps.has("wood:3") || ramps.has("wood:4"), `plank end ${[...ramps]}`); ends++; }
    }
  assert.ok(ends > 0 && sides > 0, `${ends} plank-end and ${sides} side pixels`);
});
