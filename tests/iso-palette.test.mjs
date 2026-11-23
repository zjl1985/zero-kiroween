import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ISO_COLOUR_CAP, ISO_FACE, ISO_RAMPS, ISO_RAMP_LIST, ISO_RAMP_STEPS, hexRgb, isoPaletteColours, luminance, rampColour, rampRgb,
} from "../dist/render/iso/palette.js";

const MATERIALS = ["grass", "dirt", "stone", "soil", "shallow", "deep", "wood", "greyTile", "redTile", "cloth", "wax", "ink"];

test("every spec material has a ramp of 4 to 6 valid colours", () => {
  assert.deepEqual(ISO_RAMP_LIST.map((r) => r.name), MATERIALS);
  for (const { name, steps } of ISO_RAMP_LIST) {
    assert.ok(steps.length >= ISO_RAMP_STEPS.min && steps.length <= ISO_RAMP_STEPS.max, name);
    for (const c of steps) assert.match(c, /^#[0-9a-f]{6}$/, `${name} ${c}`);
    assert.ok(ISO_FACE.top < steps.length, `${name} has a top-face step`);
  }
});

test("every ramp is strictly ordered by luminance, dark to light", () => {
  for (const { name, steps } of ISO_RAMP_LIST)
    for (let i = 1; i < steps.length; i++)
      assert.ok(luminance(steps[i]) > luminance(steps[i - 1]), `${name} step ${i}`);
});

// Deep water and ink stay cold at both ends in the spec table; every other ramp warms up.
const COLD = new Set(["deep", "ink"]);
test("ramps shift hue, shadows lean cool and highlights lean warm", () => {
  for (const { name, steps } of ISO_RAMP_LIST) {
    const [r0, g0, b0] = hexRgb(steps[0]), [r1, g1, b1] = hexRgb(steps[steps.length - 1]);
    const k = (r1 + g1 + b1) / (r0 + g0 + b0);
    assert.ok(Math.abs(r1 - r0 * k) + Math.abs(g1 - g0 * k) + Math.abs(b1 - b0 * k) > 20, `${name} is not a plain value scale`);
    if (!COLD.has(name)) assert.ok(r1 - b1 > r0 - b0, `${name}: red-minus-blue grows toward the highlight`);
  }
});

test("total distinct colours stay under the spec cap", () => {
  const all = isoPaletteColours();
  assert.ok(all.length <= ISO_COLOUR_CAP, `${all.length} colours`);
  assert.equal(ISO_COLOUR_CAP, 256);
  assert.equal(rampColour("grass", -3), ISO_RAMPS.grass[0]);
  assert.equal(rampColour("grass", 99), ISO_RAMPS.grass[4]);
  assert.deepEqual(rampRgb("wax", 4), [0xf6, 0xe2, 0xa6]);
});
