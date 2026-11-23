import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { box, cylinder, gableRoof, groundExtent, hipRoof, isoModel, prism } from "../dist/render/iso/model.js";
import {
  ISO_VOLUME, clearIsoVolumeCache, faceStep, faceVisible, isoVolume, isoVolumeCacheSize, project3, rasterizeModel,
} from "../dist/render/iso/rasterize.js";
import { ISO_FACE, luminance, rampColour, rampRgb } from "../dist/render/iso/palette.js";
// Volumes still bake at the k = 1 pixel scale and draw through the half upright scale (rasterize.ts).
const toScreen = (x, y) => ({ x: x - y, y: (x + y) / 2 });

const window = (p) => p.rect(4, 6, 6, 8, "wax", 4);
const shingles = (p) => { for (let v = 0; v < p.height; v += 4) for (let u = 0; u < p.width; u++) p.set(u, v, "redTile", 2); };

function barn() {
  return isoModel(
    { x: 0, y: 0, w: 96, d: 64 },
    box(0, 0, 0, 96, 64, 40, { top: "wood", right: { ramp: "wood", detail: window }, left: { ramp: "wood", detail: window } }),
    gableRoof(-4, -4, 40, 104, 72, 30, "x", { roof: { ramp: "redTile", detail: shingles }, gable: "wood" }),
  );
}
const MODELS = {
  barn,
  hut: () => isoModel({ x: 0, y: 0, w: 40, d: 40 }, box(0, 0, 0, 40, 40, 24, "stone"), hipRoof(-2, -2, 24, 44, 44, 18, "greyTile")),
  long: () => isoModel({ x: 0, y: 0, w: 30, d: 70 }, box(0, 0, 0, 30, 70, 16, "cloth"), hipRoof(0, 0, 16, 30, 70, 12, "redTile"), gableRoof(0, 0, 30, 30, 10, 4, "y", "wood")),
  barrel: () => isoModel({ x: -8, y: -8, w: 16, d: 16 }, cylinder(0, 0, 0, 8, 14, { side: "wood", top: "dirt" })),
  stall: () => isoModel({ x: 0, y: 0, w: 20, d: 20 }, prism([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }], 0, 10, { side: "wax", top: "cloth" })),
};

const alpha = (r, x, y) => r.pixels[((y + r.anchor.y) * r.width + x + r.anchor.x) * 4 + 3];
const rgb = (r, x, y) => {
  const i = ((y + r.anchor.y) * r.width + x + r.anchor.x) * 4;
  return [r.pixels[i], r.pixels[i + 1], r.pixels[i + 2]];
};

test("the same model always bakes to identical pixels", () => {
  for (const [name, make] of Object.entries(MODELS)) {
    const a = rasterizeModel(make()), b = rasterizeModel(make());
    assert.equal(a.width, b.width, name);
    assert.equal(a.height, b.height, name);
    assert.deepEqual(a.anchor, b.anchor, name);
    assert.ok(Buffer.from(a.pixels.buffer).equals(Buffer.from(b.pixels.buffer)), `${name} volume`);
    assert.ok(Buffer.from(a.shadow.buffer).equals(Buffer.from(b.shadow.buffer)), `${name} shadow`);
    assert.ok(a.pixels.some((v, i) => (i & 3) === 3 && v === 255), `${name} draws something`);
  }
});

test("only alpha 0 and 255, and the shadow never sits under the volume", () => {
  for (const [name, make] of Object.entries(MODELS)) {
    const r = rasterizeModel(make());
    for (let i = 3; i < r.pixels.length; i += 4) {
      assert.ok(r.pixels[i] === 0 || r.pixels[i] === 255, `${name} volume alpha ${r.pixels[i]}`);
      assert.ok(r.shadow[i] === 0 || r.shadow[i] === 255, `${name} shadow alpha ${r.shadow[i]}`);
      assert.ok(!(r.pixels[i] && r.shadow[i]), `${name} shadow under volume`);
    }
  }
});

test("a box's bounds follow the projection plus a 1 px sel-out ring", () => {
  for (const [w, d, h] of [[32, 32, 20], [48, 16, 30], [10, 40, 7]]) {
    const r = rasterizeModel(isoModel({ x: 0, y: 0, w, d }, box(0, 0, 0, w, d, h, "wood")));
    // Covered pixel centres lie strictly inside the projected silhouette; the outline adds one pixel.
    assert.deepEqual(r.volume, { x: -d - 1, y: -h * ISO_VOLUME.height - 1, w: w + d + 2, h: h * ISO_VOLUME.height + (w + d) / 2 + 2 }, `${w}x${d}x${h}`);
    // The buffer holds the volume and the shadow, which falls to the screen lower-left.
    assert.ok(r.bounds.x <= r.volume.x && r.bounds.y <= r.volume.y);
    assert.ok(r.bounds.x + r.bounds.w >= r.volume.x + r.volume.w && r.bounds.y + r.bounds.h >= r.volume.y + r.volume.h);
    assert.ok(r.bounds.x < r.volume.x, "shadow reaches further left");
    assert.equal(r.width, r.bounds.w);
    assert.deepEqual(r.anchor, { x: -r.bounds.x, y: -r.bounds.y });
    assert.ok(Number.isInteger(r.anchor.x) && Number.isInteger(r.anchor.y));
  }
});

test("the projected footprint equals the declared base", () => {
  for (const [name, make] of Object.entries(MODELS)) {
    const m = make(), r = rasterizeModel(m), b = m.base;
    assert.deepEqual(r.footprint, [toScreen(b.x, b.y), toScreen(b.x + b.w, b.y), toScreen(b.x + b.w, b.y + b.d), toScreen(b.x, b.y + b.d)], name);
    if (name === "barrel") continue;
    assert.deepEqual(groundExtent(m), b, `${name} parts stand exactly on the base`);
    // The front corner of the base is the lowest covered row: the outline sits right under it.
    const front = Math.max(...r.footprint.map((p) => p.y));
    assert.equal(r.volume.y + r.volume.h - 1, Math.ceil(front), name);
  }
  // The barrel's ground ring lies inside its square base.
  const g = groundExtent(MODELS.barrel());
  assert.ok(g.x >= -8 && g.y >= -8 && g.x + g.w <= 8 && g.y + g.d <= 8);
});

test("faces shade top > moon-lit right > dark left, with a ground seam and sel-out", () => {
  const r = rasterizeModel(isoModel({ x: 0, y: 0, w: 32, d: 32 }, box(0, 0, 0, 32, 32, 20, "wood")));
  const at = (p) => { const s = project3(p); return rgb(r, Math.floor(s.x), Math.floor(s.y)); };
  const top = at({ x: 16, y: 16, z: 20 }), lit = at({ x: 32, y: 16, z: 10 }), dark = at({ x: 16, y: 32, z: 10 });
  assert.deepEqual(top, [...rampRgb("wood", ISO_FACE.top)]);
  assert.deepEqual(lit, [...rampRgb("wood", ISO_FACE.lit)]);
  assert.deepEqual(dark, [...rampRgb("wood", ISO_FACE.dark)]);
  const lum = ([r0, g0, b0]) => luminance(`#${[r0, g0, b0].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  assert.ok(lum(top) > lum(lit) && lum(lit) > lum(dark));
  // Bottom wall row: seam step; the pixel just above the top diamond's back corner: the top's ramp one step darker.
  assert.deepEqual(rgb(r, 0, 31), [...rampRgb("wood", ISO_FACE.seam)]);
  assert.deepEqual(rgb(r, 0, -21), [...rampRgb("wood", ISO_FACE.top - 1)]);
  assert.equal(alpha(r, 0, -22) ?? 0, 0);
  // Visible-face test: the hidden back faces never draw.
  const faces = box(0, 0, 0, 10, 10, 10, "wood").faces;
  assert.deepEqual(faces.map(faceVisible), [true, true, true, false, false]);
  assert.equal(faceStep({ x: 0, y: 0, z: 1 }), ISO_FACE.top);
  assert.equal(faceStep({ x: 1, y: 0, z: 0 }), ISO_FACE.lit);
  assert.equal(faceStep({ x: 0, y: 1, z: 0 }), ISO_FACE.dark);
  // Only spec ramp colours and the shadow ramp end up in the buffers.
  assert.equal(rampColour(ISO_VOLUME.shadow.ramp, ISO_VOLUME.shadow.step), "#0b0a18");
});

test("face details paint in face-local pixels and map onto the wall with integer shear steps", () => {
  const cell = (p) => p.set(0, 0, "wax", 4);
  const strip = (p) => p.rect(0, 2, p.width, 1, "wax", 4);
  const r = rasterizeModel(isoModel({ x: 0, y: 0, w: 32, d: 32 }, box(0, 0, 0, 32, 32, 20, { top: "wood", right: { ramp: "wood", detail: strip }, left: { ramp: "wood", detail: cell } })));
  const wax = [...rampRgb("wax", 4)];
  const find = () => {
    const out = [];
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
      const i = (y * r.width + x) * 4;
      if (r.pixels[i + 3] && r.pixels[i] === wax[0] && r.pixels[i + 1] === wax[1] && r.pixels[i + 2] === wax[2]) out.push({ x: x - r.anchor.x, y: y - r.anchor.y });
    }
    return out;
  };
  const cells = find();
  // Left (+y) face: local (0, 0) is its leftmost top cell, the column right of the left corner.
  assert.ok(cells.some((c) => c.x === -32 && c.y === 16 - 20), JSON.stringify(cells.slice(0, 4)));
  // Right (+x) face: one cell per column across all 32 columns, rising one row every two columns.
  const right = cells.filter((c) => c.x >= 0).sort((a, b) => a.x - b.x);
  assert.equal(right.length, 32);
  for (let i = 1; i < right.length; i++) {
    assert.equal(right[i].x, right[i - 1].x + 1);
    assert.ok(right[i - 1].y - right[i].y === 0 || right[i - 1].y - right[i].y === 1);
  }
  assert.equal(right[0].y - right[31].y, 16);
});

test("isoVolume caches by key, stays finite, and the iso modules use no random or cat ids", () => {
  clearIsoVolumeCache();
  let builds = 0;
  const make = () => { builds++; return MODELS.hut(); };
  const a = isoVolume("test:hut", make), b = isoVolume("test:hut", make);
  assert.equal(a, b);
  assert.equal(builds, 1);
  assert.deepEqual(a.anchor, rasterizeModel(MODELS.hut()).anchor);
  assert.equal(a.canvas, undefined, "no canvas in Node");
  for (let i = 0; i < ISO_VOLUME.cacheLimit + 5; i++) isoVolume(`test:${i}`, MODELS.stall);
  assert.equal(isoVolumeCacheSize(), ISO_VOLUME.cacheLimit);
  clearIsoVolumeCache();
  assert.equal(isoVolumeCacheSize(), 0);
  for (const file of ["model", "rasterize"]) {
    const src = readFileSync(new URL(`../src/render/iso/${file}.ts`, import.meta.url), "utf8");
    assert.ok(!/Math\.random/.test(src), file);
    assert.ok(!/\b(zero|nicole)\b/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), file);
  }
});
