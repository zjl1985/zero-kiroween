import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OFF_MAP, blockOffMap, blockTrees, drawOffMap, offMapAt, outsideDistance } from "../dist/render/iso/off-map.js";
import { toScreen } from "../dist/render/iso/projection.js";
import { WORLD } from "../dist/game/world-gen.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";

// Command contracts only; the tree wall and fog were not viewed in a browser.
function canvas() {
  const c = { width: 0, height: 0 }, calls = [], stack = [];
  let state = { globalAlpha: 1, fillStyle: "#000" };
  const methods = { save() { stack.push({ ...state }); }, restore() { state = stack.pop(); } };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  const old = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: { createElement: () => canvas() } });
  t.after(() => old ? Object.defineProperty(globalThis, "document", old) : delete globalThis.document);
  t.mock.method(Math, "random", () => assert.fail("off-map art consumes no random numbers"));
  t.after(clearSpriteCache);
}

test("off-map tests follow the projected WORLD diamond", () => {
  const top = toScreen(WORLD.minX, WORLD.minY), mid = toScreen((WORLD.minX + WORLD.maxX) / 2, WORLD.maxY / 2);
  assert.equal(offMapAt(top.x, top.y - 4), true);
  assert.equal(offMapAt(mid.x, mid.y), false);
  assert.equal(outsideDistance(WORLD.minX + 10, 10), 0);
  assert.equal(outsideDistance(WORLD.maxX + 30, WORLD.maxY + 40), 50);
  const B = OFF_MAP.block;
  assert.equal(blockOffMap(Math.floor(mid.x / B), Math.floor(mid.y / B)), false, "blocks inside the world are skipped");
  assert.equal(blockOffMap(Math.floor(top.x / B), Math.floor((top.y - 8) / B)), true);
});

test("the tree wall is a pure function of the block and never stands on the map", (t) => {
  t.mock.method(Math, "random", () => assert.fail("no Math.random"));
  const B = OFF_MAP.block, bottom = toScreen(WORLD.maxX, WORLD.maxY);
  const bx = Math.floor(bottom.x / B), by = Math.floor(bottom.y / B) + 1;
  const trees = blockTrees(bx, by);
  assert.ok(trees.length > 0, "the band south of the world grows trees");
  assert.deepEqual(blockTrees(bx, by), trees, "same block, same trees");
  for (const tr of trees) {
    for (const [x, y] of [[tr.sx - tr.r, tr.sy - tr.h], [tr.sx + tr.r, tr.sy - tr.h], [tr.sx, tr.sy]])
      assert.ok(offMapAt(x, y), "the whole crown stays off the map");
  }
});

test("drawOffMap stamps one cached image per off-map block and adds a dawn tint only at dawn", (t) => {
  environment(t);
  const top = toScreen(WORLD.minX, WORLD.minY), x0 = top.x - 480, y0 = top.y - 300, x1 = top.x + 480, y1 = top.y + 240;
  const ctx = canvas().getContext("2d");
  drawOffMap(ctx, x0, y0, x1, y1, 0);
  const images = ctx.calls.filter((c) => c.op === "drawImage");
  assert.ok(images.length > 0);
  assert.ok(!ctx.calls.some((c) => c.op === "fillRect"), "no dawn bands at night");
  for (const c of images) assert.ok(Number.isInteger(c.args[1]) && Number.isInteger(c.args[2]), "blocks sit on whole pixels");
  const again = canvas().getContext("2d");
  drawOffMap(again, x0, y0, x1, y1, 0.5);
  assert.deepEqual(again.calls.filter((c) => c.op === "drawImage").map((c) => c.args[0]), images.map((c) => c.args[0]), "blocks are cached");
  const bands = again.calls.filter((c) => c.op === "fillRect");
  assert.equal(bands.length, OFF_MAP.dawn.length);
  assert.ok(bands.every((c) => c.globalAlpha > 0 && c.globalAlpha < 1));
});

test("the live frame draws the off-map band instead of the flat placeholder", () => {
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /drawOffMap\(/);
  assert.match(world, /drawNorthVeil\(/);
  assert.doesNotMatch(world, /#0b1322/);
  const art = readFileSync(new URL("../src/render/iso/off-map.ts", import.meta.url), "utf8");
  assert.doesNotMatch(art, /Math\.random|createLinearGradient|createRadialGradient|\.filter\s*=|shadowBlur/);
});
