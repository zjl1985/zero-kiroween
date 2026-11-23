import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ISO_CAMERA, createIsoCamera, followIsoCamera, isoProjection, projectToView, viewWorldPolygon, worldDiamond,
} from "../dist/render/iso/iso-camera.js";
import { isoInView } from "../dist/render/iso/cull.js";
import { toScreen } from "../dist/render/iso/projection.js";
import { boardLayout } from "../dist/render/viewport.js";
import { WORLD } from "../dist/game/world-gen.js";

const sizes = [
  boardLayout(1280, 720, 1, true),
  boardLayout(390, 844, 3, true),
  boardLayout(320, 568, 2, true),
  boardLayout(844, 390, 2, true),
].map((l) => ({ width: l.viewWidth, height: l.viewHeight }));

const onScreen = (cam, p) => {
  const proj = isoProjection(cam), v = projectToView(proj, p.x, p.y);
  return v.x >= 0 && v.x <= cam.width && v.y >= 0 && v.y <= cam.height;
};
const settle = (cam, p, frames = 600) => {
  for (let i = 0; i < frames; i++) cam = followIsoCamera(cam, p, 0.1);
  return cam;
};
const play = {
  x0: WORLD.minX + WORLD.edge + 12, x1: WORLD.maxX - WORLD.edge - 12,
  y0: WORLD.minY + WORLD.playTop + 12, y1: WORLD.maxY - WORLD.edge - 12,
};

test("view sizes include desktop and portrait", () => {
  assert.deepEqual(sizes[0], { width: 480, height: 270 });
  assert.ok(sizes[1].height > sizes[1].width);
});

test("the iso camera keeps the cat on screen while it walks the world", () => {
  for (const { width, height } of sizes) {
    let cam = createIsoCamera(width, height), cat = { x: 480, y: 400 };
    assert.ok(onScreen(cam, cat));
    const route = [[play.x1, cat.y], [play.x1, play.y1], [play.x0, play.y1], [play.x0, play.y0], [480, 400]];
    for (const [tx, ty] of route) {
      for (let i = 0; i < 4000 && Math.hypot(tx - cat.x, ty - cat.y) > 1; i++) {
        const d = Math.hypot(tx - cat.x, ty - cat.y), s = Math.min(d, 260 * (1 / 60));
        cat = { x: cat.x + ((tx - cat.x) / d) * s, y: cat.y + ((ty - cat.y) / d) * s };
        cam = followIsoCamera(cam, cat, 1 / 60);
        assert.ok(onScreen(cam, cat), `${width}x${height} lost the cat at ${cat.x},${cat.y}`);
      }
    }
  }
});

test("every WORLD corner is reachable with the cat on screen", () => {
  for (const { width, height } of sizes) {
    for (const corner of [
      { x: play.x0, y: play.y0 }, { x: play.x1, y: play.y0 },
      { x: play.x1, y: play.y1 }, { x: play.x0, y: play.y1 },
    ]) {
      const cam = settle(createIsoCamera(width, height), corner);
      assert.ok(onScreen(cam, corner), `${width}x${height} corner ${corner.x},${corner.y}`);
      const v = projectToView(isoProjection(cam), corner.x, corner.y);
      assert.ok(v.y >= ISO_CAMERA.keepPad - 1, "room for the sprite above the foot point");
    }
  }
});

test("the view stays inside the world diamond plus its margin in the middle of the world", () => {
  const diamond = worldDiamond();
  assert.deepEqual(diamond[0], toScreen(WORLD.minX, WORLD.minY));
  for (const { width, height } of sizes) {
    const centre = { x: (WORLD.minX + WORLD.maxX) / 2, y: (WORLD.minY + WORLD.maxY) / 2 };
    const cam = settle(createIsoCamera(width, height), centre);
    // Mid-world the clamp is inactive: the camera rests within its deadzone of the cat.
    assert.ok(Math.abs(cam.x - toScreen(centre.x, centre.y).x) <= 60 + 1e-6);
    assert.ok(Math.abs(cam.y - toScreen(centre.x, centre.y).y) <= 40 + 1e-6);
    // At a world edge the view is pulled back toward the world.
    const edge = settle(createIsoCamera(width, height), { x: play.x0, y: (play.y0 + play.y1) / 2 });
    const corners = viewWorldPolygon(edge, 0);
    const margin = ISO_CAMERA.margin + Math.max(width, height);
    for (const c of corners) assert.ok(c.x > WORLD.minX - margin);
  }
});

test("isoProjection mirrors cameraProjection's shape and snaps the camera offset", () => {
  const cam = { x: 100.3, y: 50.7, width: 960, height: 540 };
  const p = isoProjection(cam);
  assert.deepEqual(Object.keys(p).sort(), ["height", "width", "x", "y", "zoom"]);
  assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y));
  const zoomed = isoProjection(cam, { x: 0, y: 0 }, 1.2, { x: 3, y: -2 });
  assert.equal(zoomed.zoom, 1.2);
  // The focus point stays fixed under zoom.
  const f = toScreen(0, 0), plain = isoProjection(cam, { x: 0, y: 0 }, 1, { x: 3, y: -2 });
  assert.ok(Math.abs(zoomed.x + 1.2 * f.x - (plain.x + f.x)) < 1e-9);
});

test("viewWorldPolygon inverse-projects the view corners", () => {
  const cam = { x: 0, y: 270, width: 960, height: 540 };
  const poly = viewWorldPolygon(cam, 0);
  assert.equal(poly.length, 4);
  const tl = toScreen(poly[0].x, poly[0].y), br = toScreen(poly[2].x, poly[2].y);
  assert.ok(Math.abs(tl.x + 480) < 1e-9 && Math.abs(tl.y) < 1e-9);
  assert.ok(Math.abs(br.x - 480) < 1e-9 && Math.abs(br.y - 540) < 1e-9);
  const centre = { x: 270, y: 270 };
  assert.ok(isoInView(poly, centre.x, centre.y));
});
