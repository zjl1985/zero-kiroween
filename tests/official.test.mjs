import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRects,
  CAT_VARIANTS,
  MASCOT_VIEWBOX_HEIGHT,
  MASCOT_VIEWBOX_WIDTH,
  toSvg,
} from "../dist/cats/meow-wall-art.js";
import { officialRects, officialVariant } from "../dist/cats/official.js";

test("Zero and Nicole preserve the unmodified official source and identity metadata", () => {
  assert.equal(MASCOT_VIEWBOX_WIDTH, 386);
  assert.equal(MASCOT_VIEWBOX_HEIGHT, 288);

  const zero = officialVariant("zero");
  const nicole = officialVariant("nicole");
  assert.deepEqual([...zero.accessories], ["sunglasses", "gold-chain"]);
  assert.deepEqual([...nicole.accessories], ["glasses"]);
  assert.equal(zero.palette.head, "#E3B686");
  assert.equal(zero.palette.mark, "#F0C341");
  assert.equal(nicole.palette.head, "#E8C7AA");
  assert.equal(nicole.palette.earInner, "#D98890");

  const zeroRects = officialRects("zero");
  const nicoleRects = officialRects("nicole");
  assert.ok(zeroRects.length > 80);
  assert.ok(nicoleRects.length > 80);

  const officialZero = buildRects(zero.palette, {
    state: "idle",
    accessories: zero.accessories,
    markings: zero.markings,
  });
  assert.deepEqual(zeroRects, officialZero);

  const zeroSvg = toSvg(zero.palette, {
    ariaLabel: "Zero",
    accessories: zero.accessories,
    markings: zero.markings,
  });
  const nicoleSvg = toSvg(nicole.palette, {
    ariaLabel: "Nicole",
    accessories: nicole.accessories,
    markings: nicole.markings,
  });
  assert.match(zeroSvg, /viewBox="0 0 386 288"/);
  assert.match(nicoleSvg, /viewBox="0 0 386 288"/);
  assert.match(zeroSvg, /#F0C341/);
  assert.match(zeroSvg, /#1A1416|#1B1716|#111111|#1A1418|#191919|#0F0F0F|#1A1A1A/i);
  assert.match(nicoleSvg, /#D98890/);
  assert.match(nicoleSvg, /#FFFFFF|#F7F4F0|#F5F5F5/i);

  // Official sunglasses sit on the reference canvas, not a 32-cell overlay.
  assert.ok(zeroRects.some((r) => r.accessory && r.x === 88 && r.y === 155 && r.w === 62 && r.h === 48));
  // Official glasses frames (left lens box from REFERENCE_ACCESSORIES).
  assert.ok(nicoleRects.some((r) => r.accessory && r.x === 88 && r.y === 152 && r.w === 62 && r.h === 8));
  // Official gold chain.
  assert.ok(zeroRects.some((r) => r.accessory && r.x === 145 && r.y === 245 && r.w === 15 && r.h === 12 && r.fill === "#F0C341"));
});

test("CAT_VARIANTS still includes the locked guests", () => {
  const ids = CAT_VARIANTS.map((v) => v.id);
  assert.ok(ids.includes("zero"));
  assert.ok(ids.includes("nicole"));
});
