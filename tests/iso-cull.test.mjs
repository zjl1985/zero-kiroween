import assert from "node:assert/strict";
import { test } from "node:test";
import { viewWorldPolygon } from "../dist/render/iso/iso-camera.js";
import { isoInView, polygonBounds } from "../dist/render/iso/cull.js";
import { toScreen, toWorld } from "../dist/render/iso/projection.js";

const cam = { x: 200, y: 900, width: 960, height: 540 };
const poly = viewWorldPolygon(cam, 0);
const fromView = (vx, vy) => toWorld(cam.x - cam.width / 2 + vx, cam.y - cam.height / 2 + vy);

test("entities inside the view are kept", () => {
  for (const [vx, vy] of [[480, 270], [5, 5], [955, 535], [10, 530], [950, 10]]) {
    const w = fromView(vx, vy);
    assert.ok(isoInView(poly, w.x, w.y), `${vx},${vy}`);
  }
});

test("entities just outside are kept by the margin and far ones are culled", () => {
  const just = fromView(-20, 270), far = fromView(-600, 270);
  assert.equal(isoInView(poly, just.x, just.y), false);
  assert.ok(isoInView(poly, just.x, just.y, 40));
  assert.ok(isoInView(viewWorldPolygon(cam, 40), just.x, just.y));
  assert.equal(isoInView(poly, far.x, far.y, 40), false);
  const b = polygonBounds(poly);
  assert.equal(isoInView(poly, b.x1 + 500, b.y1 + 500, 40), false, "AABB reject");
});

test("a tall sprite whose foot is just below the bottom edge is kept with its pad", () => {
  const foot = fromView(480, 540 + 24);
  assert.equal(isoInView(poly, foot.x, foot.y), false);
  // A 52 px sprite reaches back into the view; 52 screen px down is at most 52 world units.
  assert.ok(isoInView(poly, foot.x, foot.y, 52));
  const s = toScreen(foot.x, foot.y);
  assert.ok(s.y - 52 < cam.y + cam.height / 2);
});

test("the polygon test works for either winding", () => {
  const reversed = [...poly].reverse(), mid = fromView(300, 200), out = fromView(1200, 200);
  assert.ok(isoInView(reversed, mid.x, mid.y));
  assert.equal(isoInView(reversed, out.x, out.y), false);
});
