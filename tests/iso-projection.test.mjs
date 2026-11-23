import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ISO, ISO_PIPELINE, depthKey, isoInput, screenAngle, screenToWorldDir, snap, toScreen, toWorld,
} from "../dist/render/iso/projection.js";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test("iso projection round trips within half a pixel, including negative coordinates", () => {
  for (let x = -4800; x <= 5600; x += 137.25) {
    for (let y = -300; y <= 5600; y += 211.5) {
      const s = toScreen(x, y), w = toWorld(s.x, s.y);
      assert.ok(Math.hypot(w.x - x, w.y - y) < 0.5);
      const back = toScreen(w.x, w.y);
      assert.ok(Math.hypot(back.x - s.x, back.y - s.y) < 0.5);
    }
  }
});

test("world axes map to the documented screen directions", () => {
  const ox = toScreen(1, 0), oy = toScreen(0, 1), d = toScreen(1, 1), up = toScreen(-1, -1);
  assert.ok(ox.x > 0 && ox.y > 0, "+x is down-right");
  assert.ok(oy.x < 0 && oy.y > 0, "+y is down-left");
  near(d.x, 0); assert.ok(d.y > 0, "(1, 1) is straight down");
  near(up.x, 0); assert.ok(up.y < 0, "(-1, -1) is straight up");
});

test("k = 0.5: the Jacobian determinant is 1/4, so a 480 x 270 native frame shows the old 960 x 540 world area", () => {
  const ex = toScreen(1, 0), ey = toScreen(0, 1);
  assert.equal(ISO.k, 0.5);
  near(Math.abs(ex.x * ey.y - ex.y * ey.x), ISO.k * ISO.k);
  near(ISO.k * ISO.k, 0.25);
  // sx = (x - y) * 0.5, sy = (x + y) * 0.25
  assert.deepEqual(toScreen(10, 2), { x: 4, y: 3 });
});

test("a 32-unit tile is a 32 x 16 diamond", () => {
  const t = ISO.tile, c = [toScreen(0, 0), toScreen(t, 0), toScreen(t, t), toScreen(0, t)];
  const xs = c.map((p) => p.x), ys = c.map((p) => p.y);
  assert.equal(Math.max(...xs) - Math.min(...xs), ISO.tileW);
  assert.equal(Math.max(...ys) - Math.min(...ys), ISO.tileH);
  assert.deepEqual([ISO.tileW, ISO.tileH], [32, 16]);
  assert.deepEqual(c, [{ x: 0, y: 0 }, { x: 16, y: 8 }, { x: 0, y: 16 }, { x: -16, y: 8 }]);
});

test("depthKey orders foot points front to back", () => {
  assert.ok(depthKey(10, 10) > depthKey(10, 9));
  assert.equal(depthKey(3, 7), depthKey(7, 3));
});

test("snap is consistent across zero and seamless across block boundaries", () => {
  assert.equal(snap(-0.5), 0);
  assert.equal(snap(-1.5), -1);
  assert.equal(snap(0.5), 1);
  assert.equal(snap(-2.49), -2);
  assert.equal(snap(-2.51), -3);
  for (let v = -200; v <= 200; v += 0.125) {
    // Shifting by a whole block shifts the snapped pixel by exactly that block.
    assert.equal(snap(v + 64), snap(v) + 64);
    assert.equal(snap(v) - snap(v - 1), 1);
    assert.ok(Math.abs(snap(v) - v) <= 0.5);
  }
});

test("screenToWorldDir turns screen-relative keys into world vectors", () => {
  const s = Math.SQRT1_2, close = (got, x, y) => { near(got.x, x, 1e-12); near(got.y, y, 1e-12); };
  close(screenToWorldDir(0, -1), -s, -s); // W / up
  close(screenToWorldDir(0, 1), s, s); // S / down
  close(screenToWorldDir(-1, 0), -s, s); // A / left
  close(screenToWorldDir(1, 0), s, -s); // D / right
  close(screenToWorldDir(s, -s), 0, -1); // up-right
  close(screenToWorldDir(-s, s), 0, 1); // down-left
  close(screenToWorldDir(s, s), 1, 0); // down-right
  close(screenToWorldDir(-s, -s), -1, 0); // up-left
  assert.deepEqual(screenToWorldDir(0, 0), { x: 0, y: 0 });
  const half = screenToWorldDir(0.5, 0);
  near(Math.hypot(half.x, half.y), 0.5, 1e-12);
  const long = screenToWorldDir(3, 4);
  near(Math.hypot(long.x, long.y), 1, 1e-12);
  for (const [dx, dy] of [[1, 0], [0, -1], [0.3, 0.4], [-1, 1]]) {
    const w = screenToWorldDir(dx, dy), on = toScreen(w.x, w.y);
    // The cat moves along the pressed screen direction's side.
    assert.ok(Math.sign(on.x) === Math.sign(dx) || Math.abs(dx) < 1e-12);
    assert.ok(Math.sign(on.y) === Math.sign(dy) || Math.abs(dy) < 1e-12);
  }
});

test("isoInput is a pure conversion of the sampled FrameInput", () => {
  const frame = Object.freeze({ ax: 0, ay: -1, choose: 2 });
  const out = isoInput(frame);
  assert.notEqual(out, frame);
  assert.deepEqual(frame, { ax: 0, ay: -1, choose: 2 });
  near(out.ax, -Math.SQRT1_2); near(out.ay, -Math.SQRT1_2);
  assert.equal(out.choose, 2);
  assert.deepEqual(isoInput({ ax: 0, ay: 0 }), { ax: 0, ay: 0 });
  assert.deepEqual(isoInput({ ax: 0.6, ay: 0.8 }), isoInput({ ax: 0.6, ay: 0.8 }));
  assert.equal(typeof ISO_PIPELINE, "boolean");
});

test("world directions aim along their projected screen heading", () => {
  near(screenAngle(1, 0), Math.atan2(0.5, 1), 1e-12);
  near(screenAngle(0, 1), Math.atan2(0.5, -1), 1e-12);
  near(screenAngle(1, 1), Math.PI / 2, 1e-12);
  near(screenAngle(-1, -1), -Math.PI / 2, 1e-12);
  assert.equal(screenAngle(0, 0), 0);
  // Painters drawn upright at projected feet take headings through the projection, not world atan2.
  const src = (f) => readFileSync(new URL(`../src/render/${f}`, import.meta.url), "utf8");
  const secondary = src("pixel-secondary-weapons.ts"), feedback = src("pixel-combat-feedback.ts");
  assert.doesNotMatch(secondary, /Math\.atan2\(s\.vy/);
  assert.match(secondary, /screenAngle\(s\.vx, s\.vy\)/, "crane and seed headings");
  assert.match(secondary, /screenAngle\(Math\.cos\(e\.angle/, "night claw arc");
  assert.match(feedback, /screenAngle\(hit\.dx, hit\.dy\)/, "ink remnants scatter");
});
