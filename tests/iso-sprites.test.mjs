import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  ISO_ANIMS, ISO_DIRS, ISO_SPRITE, bakeIsoFrame, clampFrame, clearIsoDirections, clearIsoSpriteCache, dirFromScreen,
  forgetIsoDirection, frameCount, frameFor, isEastDir, isSouthDir, isoDirection, isoDirectionMemorySize,
  isoSpriteCacheKeys, isoSpriteCacheSize, isoSpriteFrame, isoSpriteKey, paintedDir,
} from "../dist/render/iso/sprite-sheet.js";
import { toScreen } from "../dist/render/iso/projection.js";

const INK = [40, 30, 60], GOLD = [220, 180, 60], RED = [200, 60, 60];

// An asymmetric test figure that changes with every painted direction, animation and frame.
function figure(walkFrames) {
  return {
    identity: `test-figure-${walkFrames ?? 6}`,
    width: 21,
    height: 30,
    foot: { x: 10, y: 28 },
    walkFrames,
    paint(px, { dir, anim, frame, palette }) {
      const lift = anim === "walk" ? frame % 2 : anim === "idle" ? frame : 0;
      px.rect(6, 10 - lift, 9, 16, palette === "hurt" || anim === "hurt" ? RED : INK);
      px.rect(dir === "se" ? 12 : 4, 4 - lift, 5, 5, GOLD);
      px.set(dir === "se" ? 16 : 3, 6 - lift, INK);
      px.rect(7 + (frame % 3), 26, 3, 2, INK);
      px.set(px.foot.x, px.foot.y, GOLD);
    },
  };
}

const opaque = (r, x, y) => r.pixels[(y * r.width + x) * 4 + 3] === 255;

test("every frame lies inside its declared bounds with binary alpha", () => {
  for (const sheet of [figure(), figure(4), figure(5)]) {
    for (const dir of ISO_DIRS) for (const anim of ISO_ANIMS) {
      for (let f = 0; f < frameCount(anim, sheet.walkFrames); f++) {
        const r = bakeIsoFrame(sheet, dir, anim, f);
        assert.equal(r.clipped, 0, r.key);
        assert.equal(r.width, sheet.width);
        assert.equal(r.height, sheet.height);
        assert.equal(r.pixels.length, sheet.width * sheet.height * 4);
        assert.ok(r.anchor.x >= 0 && r.anchor.x < r.width && r.anchor.y >= 0 && r.anchor.y < r.height, r.key);
        assert.ok(opaque(r, r.anchor.x, r.anchor.y), `${r.key} foot pixel painted`);
        for (let i = 3; i < r.pixels.length; i += 4) assert.ok(r.pixels[i] === 0 || r.pixels[i] === 255);
      }
    }
  }
  const spill = { ...figure(), identity: "spill", paint: (px) => { px.set(-1, 0, INK); px.rect(19, 28, 4, 4, INK); } };
  const r = bakeIsoFrame(spill, "se", "idle", 0);
  assert.equal(r.clipped, 1 + 16 - 4, "writes outside the bounds are dropped and counted");
  assert.throws(() => bakeIsoFrame({ ...figure(), foot: { x: 21, y: 0 } }, "se", "idle", 0), /foot/);
});

test("animation frame counts: idle 2, walk 4 to 6, hurt 1", () => {
  assert.equal(frameCount("idle"), 2);
  assert.equal(frameCount("hurt"), 1);
  assert.equal(frameCount("walk"), ISO_SPRITE.frames.walk);
  assert.ok(ISO_SPRITE.frames.walk >= 4 && ISO_SPRITE.frames.walk <= 6);
  for (const n of [4, 5, 6]) assert.equal(frameCount("walk", n), n);
  assert.equal(clampFrame("walk", -1, 4), 3);
  assert.equal(clampFrame("idle", 7.9), 1);
  assert.equal(clampFrame("hurt", 99), 0);
  assert.equal(clampFrame("walk", NaN), 0);
});

test("reduced motion always picks frame 0, otherwise frames advance and stay in range", () => {
  for (const anim of ISO_ANIMS) {
    const seen = new Set();
    for (let t = 0; t < 20; t += 0.013) {
      assert.equal(frameFor(anim, t, true), 0);
      const f = frameFor(anim, t, false);
      assert.ok(Number.isInteger(f) && f >= 0 && f < frameCount(anim), `${anim} ${t}`);
      seen.add(f);
    }
    assert.equal(seen.size, frameCount(anim), anim);
  }
  assert.equal(frameFor("walk", 1e9 + 0.3, false, 4) < 4, true);
  assert.equal(frameFor("walk", Infinity, false), 0);
  assert.equal(frameFor("walk", -3.2, false) >= 0, true);
});

test("SW and NW are exact horizontal mirrors of SE and NE about the foot column", () => {
  for (const [m, p] of [["sw", "se"], ["nw", "ne"]]) {
    assert.equal(paintedDir(m), p);
    for (const anim of ISO_ANIMS) for (let f = 0; f < frameCount(anim); f++) {
      const a = bakeIsoFrame(figure(), p, anim, f), b = bakeIsoFrame(figure(), m, anim, f);
      assert.equal(b.anchor.x, a.width - 1 - a.anchor.x);
      assert.equal(b.anchor.y, a.anchor.y);
      for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
        const i = (y * a.width + x) * 4, j = (y * a.width + (a.width - 1 - x)) * 4;
        for (let c = 0; c < 4; c++) assert.equal(b.pixels[j + c], a.pixels[i + c], `${m} ${anim} ${f} ${x},${y}`);
      }
      // Relative to the foot the mirror is exact too: a pixel at foot offset d lands at -d.
      const dx = 3, x = a.anchor.x + dx, y = 6;
      assert.equal(opaque(a, x, y), opaque(b, b.anchor.x - dx, y));
    }
  }
  // The painter is asked only for the painted directions and is not symmetric itself.
  const asked = new Set();
  const spy = { ...figure(), identity: "spy", paint: (px, info) => { asked.add(info.dir); figure().paint(px, info); } };
  for (const dir of ISO_DIRS) bakeIsoFrame(spy, dir, "idle", 0);
  assert.deepEqual([...asked].sort(), ["ne", "se"]);
  const se = bakeIsoFrame(figure(), "se", "idle", 0), ne = bakeIsoFrame(figure(), "ne", "idle", 0);
  assert.notDeepEqual(se.pixels, ne.pixels);
});

test("bakes are deterministic and the cache key set is finite over many ids and times", () => {
  assert.deepEqual(bakeIsoFrame(figure(), "nw", "walk", 3).pixels, bakeIsoFrame(figure(), "nw", "walk", 3).pixels);
  clearIsoSpriteCache();
  clearIsoDirections();
  const sheet = figure();
  const keys = new Set();
  for (let id = 0; id < 2000; id++) {
    for (let step = 0; step < 12; step++) {
      const t = id * 0.37 + step * 0.11;
      const vx = Math.sin(id + step), vy = Math.cos(id * 3 - step);
      const dir = isoDirection(id, vx, vy, id % 2 ? 1 : -1);
      const anim = ISO_ANIMS[(id + step) % 3];
      const frame = frameFor(anim, t, id % 7 === 0);
      const palette = ["", "wet", "hurt"][id % 3];
      const f = isoSpriteFrame(sheet, dir, anim, frame, palette);
      keys.add(f.key);
      assert.equal(f.key, isoSpriteKey(sheet.identity, dir, anim, frame, palette));
      assert.match(f.key, /^iso-sprite:test-figure-6:(se|ne|sw|nw):(idle|walk|hurt):\d:(|wet|hurt)$/);
    }
  }
  const total = ISO_DIRS.length * (2 + ISO_SPRITE.frames.walk + 1) * 3;
  assert.ok(keys.size <= total, `${keys.size} keys`);
  assert.ok(isoSpriteCacheSize() <= ISO_SPRITE.cacheLimit);
  assert.ok(isoDirectionMemorySize() <= ISO_SPRITE.memoryLimit);
  assert.ok(isoSpriteCacheKeys().every((k) => keys.has(k)));
  clearIsoSpriteCache();
  clearIsoDirections();
  assert.equal(isoSpriteCacheSize(), 0);
  assert.equal(isoDirectionMemorySize(), 0);
});

test("direction follows the screen direction of the projected velocity", () => {
  clearIsoDirections();
  const screenDir = (sx, sy) => isoDirection("probe", ...worldOf(sx, sy), 1);
  // World vectors whose projection points along each screen diagonal.
  function worldOf(sx, sy) {
    return [sx / 2 + sy, sy - sx / 2];
  }
  assert.equal(screenDir(1, 1), "se");
  assert.equal(screenDir(1, -1), "ne");
  assert.equal(screenDir(-1, 1), "sw");
  assert.equal(screenDir(-1, -1), "nw");
  // Pure screen-right movement faces east, pure screen-left west.
  assert.ok(isEastDir(screenDir(1, 0)));
  assert.ok(!isEastDir(screenDir(-1, 0)));
  // World axes: +x is screen down-right, -y screen up-right, +y down-left, -x up-left.
  assert.equal(isoDirection("w", 1, 0, -1), "se");
  assert.equal(isoDirection("w", 0, -1, -1), "ne");
  assert.equal(isoDirection("w", 0, 1, 1), "sw");
  assert.equal(isoDirection("w", -1, 0, 1), "nw");
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const vx = Math.cos(a), vy = Math.sin(a), s = toScreen(vx, vy);
    const d = isoDirection("sweep", vx, vy, 1);
    if (Math.abs(s.x) > 1e-3) assert.equal(isEastDir(d), s.x > 0, `east ${a}`);
    if (Math.abs(s.y) > 1e-3) assert.equal(isSouthDir(d), s.y > 0, `south ${a}`);
  }
  // A zero screen component keeps that half of the last direction.
  assert.equal(dirFromScreen(0, -1, "sw", 1), "nw");
  assert.equal(dirFromScreen(1, 0, "nw", -1), "ne");
  assert.equal(dirFromScreen(0, 0, "nw", 1), null);
  clearIsoDirections();
});

test("still actors fall back to the remembered direction, then the sim facing", () => {
  clearIsoDirections();
  assert.equal(isoDirection(7, 0, 0, 1), "se", "no memory: facing right");
  assert.equal(isoDirection(8, 0, 0, -1), "sw", "no memory: facing left");
  assert.equal(isoDirection(7, -1, 0, 1), "nw");
  assert.equal(isoDirection(7, 0, 0, 1), "nw", "memory beats facing");
  assert.equal(isoDirection(7, NaN, 0, 1), "nw", "non-finite velocity counts as still");
  forgetIsoDirection(7);
  assert.equal(isoDirection(7, 0, 0, -1), "sw", "forgotten: facing again");
  for (let id = 0; id < ISO_SPRITE.memoryLimit * 3; id++) isoDirection(`m${id}`, 1, 0, 1);
  assert.equal(isoDirectionMemorySize(), ISO_SPRITE.memoryLimit);
  clearIsoDirections();
  assert.equal(isoDirectionMemorySize(), 0);
});

test("the sprite sheet module stays render-only and content-agnostic", () => {
  const src = readFileSync(new URL("../src/render/iso/sprite-sheet.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Math\.random|from "\.\.\/\.\.\/game\/|SimState|\brng\b/);
  assert.doesNotMatch(src, /\b(zero|nicole)\b/i);
});
