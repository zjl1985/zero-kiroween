import assert from "node:assert/strict";
import { test } from "node:test";
import { boardLayout, viewport, VIEW_WIDTH, VIEW_HEIGHT } from "../dist/render/viewport.js";
import { clampCamera, createCamera, followCamera, viewRect } from "../dist/render/camera.js";
import { createSim } from "../dist/game/sim.js";
import { viewChunks } from "../dist/ui/journal-geometry.js";
import { chunkIndex, chunkOf, WORLD } from "../dist/game/world-gen.js";
test("pixel viewport fits 28 size / DPR combinations without stretching or wasting half the screen", () => {
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1273, 799],
    [390, 844],
    [844, 390],
    [320, 568],
    [120, 80],
  ]) {
    for (const dpr of [1, 1.25, 2, 3]) {
      const v = viewport(width, height, dpr);
      assert.ok(v.cssX >= 0 && v.cssY >= 0);
      assert.ok(
        v.cssX + v.cssW <= width + 0.001 && v.cssY + v.cssH <= height + 0.001,
      );
      assert.ok(Math.abs(v.w / v.h - VIEW_WIDTH / VIEW_HEIGHT) < 1e-10);
      const fit = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT);
      assert.ok(v.cssW >= VIEW_WIDTH * fit * 0.895);
      assert.equal(v.cssW * dpr, v.w);
      assert.equal(v.cssY * dpr, v.y);
    }
  }
});
test("integer physical pixels are preferred when the size penalty is small", () => {
  assert.equal(viewport(1440, 900, 2).scale, 3);
  assert.equal(viewport(1280, 720, 1).scale, 1280 / 960);
  assert.equal(viewport(390, 844, 3).scale, (390 * 3) / 960);
});

test("a portrait run uses the whole app as Safari's bars expand, collapse, or the device rotates", () => {
  for (const [w, h] of [[320, 568], [390, 664], [390, 844], [430, 932], [414, 414], [768, 1024]]) {
    for (const dpr of [1, 2, 3]) {
      const play = boardLayout(w, h, dpr, true);
      assert.deepEqual([play.cssX, play.cssY, play.cssW, play.cssH], [0, 0, w, h]);
      assert.ok(Math.abs(w / play.viewWidth - h / play.viewHeight) < 1e-9, "square world units stay square");
      const title = boardLayout(w, h, dpr, false);
      assert.deepEqual([title.viewWidth, title.viewHeight], [960, 540]);
      assert.ok(play.cssW / play.viewWidth >= title.cssW / title.viewWidth, "portrait detail remains at least as legible as the title");
    }
  }
  assert.deepEqual(boardLayout(844, 390, 3, true), boardLayout(844, 390, 3, false));
});

test("following the cat near the town edges preserves portrait framing and the minimap's visible chunks", () => {
  const { viewWidth, viewHeight } = boardLayout(390, 844, 3, true);
  let cam = clampCamera(480, 270, viewWidth, viewHeight);
  for (const [x, y] of [[WORLD.minX + 36, WORLD.playTop], [WORLD.maxX - 36, WORLD.maxY - 36]]) {
    cam = followCamera(cam, { x, y }, 5);
    const r = viewRect(cam);
    assert.ok(Math.abs(r.x1 - r.x0 - viewWidth) < 1e-9);
    assert.equal(r.y1 - r.y0, viewHeight);
    assert.ok(r.x0 >= WORLD.minX && r.x1 <= WORLD.maxX && r.y0 >= WORLD.minY && r.y1 <= WORLD.maxY);
    assert.ok(x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    const seen = viewChunks(cam.x, cam.y, cam.width, cam.height);
    for (const [cx, cy] of [[r.x0, r.y0], [r.x1 - 0.001, r.y1 - 0.001]]) {
      const corner = chunkOf(cx, cy);
      assert.ok(seen.includes(chunkIndex(corner.cx, corner.cy)));
    }
  }
});

test("the landscape camera keeps the homestead roofs in view while the cat waits at spawn", () => {
  const {player} = createSim({seed:7});
  let cam = createCamera();
  for (let i=0; i<120; i++) cam = followCamera(cam,player,1/60);
  assert.ok(viewRect(cam).y0 <= 12, 'space remains above the roof ridges after settling');
  const south = {x:player.x,y:680};
  for (let i=0; i<120; i++) cam = followCamera(cam,south,1/60);
  assert.ok(Math.abs(cam.y-(south.y-40)) < 1, 'the southern junction uses normal follow framing');
});
