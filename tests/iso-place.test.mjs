import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { atFoot, depthSort, onGround } from "../dist/render/iso/place.js";
import { ISO_PIPELINE, depthKey, snap, toScreen } from "../dist/render/iso/projection.js";
import { createIsoCamera, isoWorldCamera, viewWorldPolygon } from "../dist/render/iso/iso-camera.js";

function recorder() {
  const calls = [];
  return { calls, ctx: new Proxy({}, { get: (_, key) => (...args) => calls.push([key, ...args]) }) };
}

test("atFoot moves an upright painter to its projected foot by whole pixels only", () => {
  for (const [x, y] of [[0, 0], [480, 270], [-311.4, 902.7], [5279.5, 0.5]]) {
    const { ctx, calls } = recorder();
    let painted = false;
    atFoot(ctx, x, y, () => { painted = true; });
    assert.ok(painted);
    const ops = calls.map((c) => c[0]);
    assert.deepEqual(ops, ["save", "translate", "restore"], "no skew, rotation or scale");
    const [, dx, dy] = calls[1];
    assert.ok(Number.isInteger(dx) && Number.isInteger(dy), "the pixel lattice is kept");
    const s = toScreen(x, y);
    assert.equal(snap(x) + dx, snap(s.x));
    assert.equal(snap(y) + dy, snap(s.y));
  }
});

test("onGround applies exactly the projection's affine to ground painters", () => {
  const { ctx, calls } = recorder();
  onGround(ctx, () => {});
  const t = calls.find((c) => c[0] === "transform");
  const [, a, b, c, d, e, f] = t;
  for (const [x, y] of [[1, 0], [0, 1], [32, 32], [-50, 17]]) {
    const s = toScreen(x, y);
    assert.equal(a * x + c * y + e, s.x);
    assert.equal(b * x + d * y + f, s.y);
  }
});

test("depthSort orders by depthKey with a stable insertion tiebreak", () => {
  const items = [
    { id: "far", key: depthKey(10, 10) },
    { id: "tieA", key: depthKey(40, 0) },
    { id: "near", key: depthKey(100, 80) },
    { id: "tieB", key: depthKey(0, 40) },
    { id: "front-row", key: depthKey(-20, 30) },
  ];
  assert.deepEqual(depthSort(items).map((i) => i.id), ["front-row", "far", "tieA", "tieB", "near"]);
});

test("the isometric pipeline drives both the view and the controls", () => {
  assert.equal(ISO_PIPELINE, true);
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /isoProjection\(camera, focus, zoom, shake\)/);
  assert.match(world, /depthSort\(/);
  assert.doesNotMatch(world, /cameraProjection|sprites\.sort\(/, "no top-down projection or y sort remains in the live frame");
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(main, /followIsoCamera\(camera, sim\.player/);
  assert.doesNotMatch(main, /followCamera\(|createCamera\(/);
});

test("isoWorldCamera boxes the whole view polygon", () => {
  const cam = createIsoCamera(960, 540, { x: 1200, y: 900 });
  const box = isoWorldCamera(cam);
  for (const p of viewWorldPolygon(cam)) {
    assert.ok(p.x >= box.x - box.width / 2 - 1e-9 && p.x <= box.x + box.width / 2 + 1e-9);
    assert.ok(p.y >= box.y - box.height / 2 - 1e-9 && p.y <= box.y + box.height / 2 + 1e-9);
  }
});
