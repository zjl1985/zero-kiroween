import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ENEMY_ART } from "../dist/render/art-index.js";
import { INK_BLOB_ISO, ISO_INK_BLOB } from "../dist/render/iso/ink-blob-sheet.js";
import { INK_BLOB_PALETTES } from "../dist/render/pixel-ink-blob.js";
import {
  ISO_ANIMS, ISO_DIRS, ISO_SPRITE, bakeIsoFrame, clearIsoDirections, frameCount, isoMotion, isoMotionMemorySize,
  isoSpriteCacheKeys, isoSpriteFrame, isoWashPalette,
} from "../dist/render/iso/sprite-sheet.js";
import { drawSketchedParts } from "../dist/render/sprite-sketch.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { createSim } from "../dist/game/sim.js";
import { drawWorld } from "../dist/render/world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";

// Pixel and dispatch contracts only; the iso ink blob was not viewed in a browser.
const sheet = INK_BLOB_ISO;
const all = ISO_DIRS.flatMap((dir) => ISO_ANIMS.flatMap((anim) =>
  Array.from({ length: frameCount(anim, sheet.walkFrames) }, (_, f) => ({ dir, anim, f }))));
const palettes = [0, 0.5, 1].flatMap((w) => [isoWashPalette(w, false), isoWashPalette(w, true)]);
function opaqueRows(r) {
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < r.height; y++)
    for (let x = 0; x < r.width; x++)
      if (r.pixels[(y * r.width + x) * 4 + 3]) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return { lo, hi, height: hi - lo + 1 };
}
const hex = (r, i) => "#" + [0, 1, 2].map((k) => r.pixels[i + k].toString(16).padStart(2, "0")).join("");
function colours(r) {
  const set = new Set();
  for (let i = 0; i < r.pixels.length; i += 4) if (r.pixels[i + 3]) set.add(hex(r, i));
  return set;
}

test("ink-blob frames stay in bounds, binary, grounded and 28 to 48 px tall in every palette", () => {
  assert.equal(sheet.walkFrames, 4, "normal enemies walk in 4 frames (spec)");
  for (const palette of palettes) for (const { dir, anim, f } of all) {
    const r = bakeIsoFrame(sheet, dir, anim, f, palette);
    assert.equal(r.clipped, 0, r.key);
    for (let i = 3; i < r.pixels.length; i += 4) assert.ok(r.pixels[i] === 0 || r.pixels[i] === 255, "binary alpha");
    const rows = opaqueRows(r);
    assert.ok(rows.height >= 28 && rows.height <= 48, `${r.key}: ${rows.height} px tall`);
    assert.ok(rows.hi > sheet.foot.y && rows.hi <= sheet.foot.y + 6, `${r.key}: the puddle lies on the foot`);
    assert.ok(rows.lo < sheet.foot.y + ISO_INK_BLOB.crownY + 10, `${r.key}: the crown seat sits on the dome top`);
  }
});

test("SW / NW mirror SE / NE exactly; front, back, move and hurt frames differ", () => {
  for (const anim of ISO_ANIMS) for (let f = 0; f < frameCount(anim, sheet.walkFrames); f++) {
    const se = bakeIsoFrame(sheet, "se", anim, f), ne = bakeIsoFrame(sheet, "ne", anim, f);
    assert.notDeepEqual(se.pixels, ne.pixels, `${anim} ${f}: face and back differ`);
    for (const [a, b] of [["se", "sw"], ["ne", "nw"]]) {
      const p = bakeIsoFrame(sheet, a, anim, f), m = bakeIsoFrame(sheet, b, anim, f);
      for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++)
        for (let k = 0; k < 4; k++) assert.equal(m.pixels[(y * p.width + (p.width - 1 - x)) * 4 + k], p.pixels[(y * p.width + x) * 4 + k]);
    }
  }
  const walk = Array.from({ length: 4 }, (_, f) => bakeIsoFrame(sheet, "se", "walk", f).pixels.join());
  assert.equal(new Set(walk).size, 4, "every move frame is distinct");
  assert.notDeepEqual(bakeIsoFrame(sheet, "se", "idle", 0).pixels, bakeIsoFrame(sheet, "se", "idle", 1).pixels);
  assert.notDeepEqual(bakeIsoFrame(sheet, "se", "idle", 0).pixels, bakeIsoFrame(sheet, "se", "hurt", 0).pixels);
  assert.notDeepEqual(bakeIsoFrame(sheet, "se", "idle", 0, "0").pixels, bakeIsoFrame(sheet, "se", "idle", 0, "0a").pixels, "attack squints");
});

test("the three wash palettes (0 / 0.5 / 1) come from pixel-ink-blob.ts and differ", () => {
  assert.deepEqual([0, 0.25, 0.5, 0.99, 1].map((w) => isoWashPalette(w, false)), ["0", "1", "1", "1", "2"]);
  const sets = [0, 1, 2].map((i) => colours(bakeIsoFrame(sheet, "se", "idle", 0, String(i))));
  for (let i = 0; i < 3; i++) {
    const p = INK_BLOB_PALETTES[i];
    for (const c of [p.edge, p.body, p.eye]) assert.ok(sets[i].has(c), `wash ${i} uses ${c}`);
    for (let j = 0; j < 3; j++) if (i !== j) assert.ok(!sets[i].has(INK_BLOB_PALETTES[j].body), `wash ${i} != ${j}`);
  }
});

test("the ink-blob art registers the iso sheet; every other enemy keeps its old sprite", () => {
  assert.equal(ENEMY_ART.get("ink-blob").iso, sheet);
  assert.equal(ENEMY_ART.get("ink-blob").crownY, ISO_INK_BLOB.crownY);
  for (const art of ENEMY_ART.all()) if (art.id !== "ink-blob") assert.equal(art.iso, undefined, art.id);
  const src = readFileSync(new URL("../src/render/iso/ink-blob-sheet.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Math\.random/);
});

test("isoMotion is render-only, bounded and reports a step for a short while", () => {
  clearIsoDirections();
  assert.deepEqual(isoMotion("m", 0, 0, 1), { vx: 0, vy: 0, moving: false });
  assert.deepEqual(isoMotion("m", 3, -1, 1.01), { vx: 3, vy: -1, moving: true });
  assert.deepEqual(isoMotion("m", 3, -1, 1.05), { vx: 3, vy: -1, moving: true });
  assert.equal(isoMotion("m", 3, -1, 1.01 + ISO_SPRITE.moving + 0.01).moving, false);
  for (let i = 0; i < ISO_SPRITE.memoryLimit * 2; i++) isoMotion(i, i, 0, 0);
  assert.equal(isoMotionMemorySize(), ISO_SPRITE.memoryLimit);
  clearIsoDirections();
  assert.equal(isoMotionMemorySize(), 0);
});

// ------------------------------------------------------------- drawing
class Path { constructor() { this.ops = []; } }
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse", "addPath", "roundRect"])
  Path.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class Matrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(point) { return point; }
}
function canvas() {
  const c = { width: 400, height: 300 }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", strokeStyle: "#000", filter: "none" };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced saves"); },
    getTransform() { return new Matrix(); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => calls.push({ op: key, args, ...state })),
    set: (_, key, value) => { state[key] = value; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  clearWorldRenderCache();
  for (const [key, value] of Object.entries({ document: { createElement: () => canvas() }, Path2D: Path, DOMMatrix: Matrix })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumes no random numbers"));
  t.after(() => { clearSpriteCache(); clearWorldRenderCache(); });
}
function blobDraws(calls) {
  const byCanvas = new Map(isoSpriteCacheKeys().filter((k) => k.startsWith(`iso-sprite:${sheet.identity}:`)).map((k) => {
    const [, , dir, anim, frame, palette] = k.split(":");
    return [isoSpriteFrame(sheet, dir, anim, Number(frame), palette).canvas, k];
  }));
  return calls.flatMap((c, i) => c.op === "drawImage" && byCanvas.has(c.args[0]) ? [{ i, key: byCanvas.get(c.args[0]), args: c.args }] : []);
}
const blob = (over = {}) => ({ id: 7, kind: "ink-blob", x: 100.4, y: 50.6, hp: 3, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0, ...over });

test("the ink blob stamps its iso frame at its foot; direction from its motion, hurt and wash keys", (t) => {
  environment(t);
  const art = ENEMY_ART.get("ink-blob"), look = { x: 0, y: 200 };
  let ctx = canvas().getContext("2d");
  art.draw(ctx, blob(), 1, look);
  let d = blobDraws(ctx.calls);
  assert.equal(d.length, 1);
  const f = isoSpriteFrame(sheet, "sw", "idle", 0, "0");
  // Still: faces the cat (screen left of the blob, so south-west).
  assert.match(d[0].key, /:sw:idle:\d:0$/);
  const translate = ctx.calls.findLast((c, i) => c.op === "translate" && i < d[0].i);
  assert.deepEqual(translate.args, [100, 51]);
  assert.deepEqual(d[0].args.slice(1), [-f.anchor.x, -f.anchor.y], "the foot pixel lands on the foot point");
  // A step to world (0, -1) is screen up-right: north-east, moving.
  ctx = canvas().getContext("2d");
  art.draw(ctx, blob({ y: 49.6 }), 1.05, look);
  assert.match(blobDraws(ctx.calls)[0].key, /:ne:walk:\d:0$/);
  // Hit flash: hurt frame; pencil step 1: colourless palette; windup: attack squint.
  ctx = canvas().getContext("2d");
  drawSketchedParts(ctx, 1, (c) => art.draw(c, blob({ y: 49.6, hitFlash: 0.1, windup: 0.3 }), 9, look));
  assert.match(blobDraws(ctx.calls)[0].key, /:hurt:0:2a$/);
  // Spawning blobs keep the old ground mark, no iso frame.
  ctx = canvas().getContext("2d");
  art.draw(ctx, blob({ id: 8, spawnTime: 0.4 }), 1, look);
  assert.equal(blobDraws(ctx.calls).length, 0);
});

test("world.ts draws the iso ink blob and the other enemies with their old sprites", (t) => {
  environment(t);
  const sim = createSim({ cat: "zero", seed: 2026 });
  const { x, y } = sim.player;
  sim.enemies.push(
    blob({ id: 900, x: x + 60, y }),
    blob({ id: 901, x: x - 60, y, elite: true, maxHp: 9, hp: 4 }),
    { id: 902, kind: "paper-bat", x, y: y + 60, hp: 3, alive: true, spawnTime: 0, slowTime: 0, orbitCooldown: 0 },
  );
  const before = structuredClone(sim);
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0.35, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true });
  assert.deepEqual(sim, before, "drawing leaves SimState untouched");
  assert.equal(blobDraws(ctx.calls).length, 2, "both ink blobs, elite included");
  const old = ctx.calls.filter((c) => c.op === "drawImage" && c.args.length === 5 && c.args[0].width === 104 && c.args[0].height === 112);
  assert.ok(old.length >= 1, "the paper bat keeps its cached 104 x 112 sprite");
  assert.ok(!isoSpriteCacheKeys().some((k) => /paper-bat/.test(k)));
});
