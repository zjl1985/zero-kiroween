import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MATERIAL_SURFACE, SURFACE_RAMP, SURFACE_TEXTURE, diamondPixel, surfaceRgb, surfaceStep, texelStep, tileVariant,
} from "../dist/render/iso/surface-texture.js";
import { ISO_RAMPS } from "../dist/render/iso/palette.js";
import { hash2 } from "../dist/game/world-gen.js";
import { toScreen } from "../dist/render/iso/projection.js";

const SURFACES = Object.keys(SURFACE_RAMP);

test("diamondPixel maps a pixel to its 32 x 16 diamond", () => {
  for (const [i, j] of [[0, 0], [3, -2], [-5, 7]]) {
    const top = toScreen(i * 32, j * 32), d = diamondPixel(top.x, top.y + 8);
    assert.deepEqual([d.i, d.j, d.lx, d.ly], [i, j, 0, 8]);
    assert.ok(d.edge > 13);
  }
  for (let py = -40; py < 40; py++) for (let px = -80; px < 80; px++) {
    const d = diamondPixel(px, py);
    assert.ok(d.lx >= -16 && d.lx < 16 && d.ly >= 0 && d.ly < 16, `${px},${py}`);
  }
});

test("every surface variant tiles seamlessly up, down, left, right and along the diamond lattice", () => {
  for (const s of SURFACES)
    for (let v = 0; v < SURFACE_TEXTURE.variants; v++)
      for (let py = -32; py < 64; py++) for (let px = -64; px < 128; px++) {
        const c = texelStep(s, v, px, py);
        assert.equal(texelStep(s, v, px + 32, py), c, `${s}/${v} right at ${px},${py}`);
        assert.equal(texelStep(s, v, px - 32, py), c, `${s}/${v} left`);
        assert.equal(texelStep(s, v, px, py + 16), c, `${s}/${v} down`);
        assert.equal(texelStep(s, v, px, py - 16), c, `${s}/${v} up`);
        assert.equal(texelStep(s, v, px + 16, py + 8), c, `${s}/${v} lattice`);
      }
});

test("variants only differ inside the diamond, so mixed variants meet without a seam", () => {
  for (const s of SURFACES) {
    let differs = 0;
    for (let py = 0; py < 16; py++) for (let px = -16; px < 16; px++) {
      const d = diamondPixel(px, py), steps = new Set();
      for (let v = 0; v < SURFACE_TEXTURE.variants; v++) steps.add(texelStep(s, v, px, py));
      if (d.edge < SURFACE_TEXTURE.inset) assert.equal(steps.size, 1, `${s} border pixel ${px},${py}`);
      else if (steps.size > 1) differs++;
    }
    assert.ok(differs > 0, `${s} variants add visible detail`);
  }
});

test("variants come from hash2 per world tile and steps stay inside each ramp", (t) => {
  t.mock.method(Math, "random", () => assert.fail("textures use no random numbers"));
  assert.ok(SURFACE_TEXTURE.variants >= 3 && SURFACE_TEXTURE.variants <= 5);
  assert.deepEqual(new Set(Object.values(MATERIAL_SURFACE)).size, 6);
  for (const s of SURFACES) {
    const seen = new Set(), steps = new Set();
    for (let j = -10; j < 10; j++) for (let i = -10; i < 10; i++) {
      const v = tileVariant(7, s, i, j);
      assert.equal(v, Math.floor(hash2(7, i, j, SURFACE_TEXTURE.salt + SURFACES.indexOf(s) + 1) * SURFACE_TEXTURE.variants));
      seen.add(v);
    }
    assert.equal(seen.size, SURFACE_TEXTURE.variants, `${s} uses every variant`);
    for (let py = 0; py < 64; py++) for (let px = 0; px < 128; px++) {
      const k = surfaceStep(7, s, px, py);
      assert.ok(Number.isInteger(k) && k >= 0 && k < ISO_RAMPS[SURFACE_RAMP[s]].length);
      steps.add(k);
    }
    assert.ok(steps.size >= 2, `${s} is textured`);
    assert.deepEqual(surfaceRgb(7, s, 5, 9), surfaceRgb(7, s, 5, 9));
  }
});
