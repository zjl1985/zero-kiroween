import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CAT_ART } from "../dist/render/art-index.js";
import { officialVariant } from "../dist/cats/official.js";
import { ISO_CAT } from "../dist/render/iso/cat-sheet.js";
import {
  ISO_ANIMS, ISO_DIRS, bakeIsoFrame, clearIsoDirections, frameCount, isoDirectionMemorySize, isoSpriteCacheKeys,
  isoSpriteCacheSize, isoSpriteFrame,
} from "../dist/render/iso/sprite-sheet.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { clearWorldRenderCache } from "../dist/render/craft-world.js";
import { createSim } from "../dist/game/sim.js";
import { drawWorld } from "../dist/render/world.js";
import { createIsoCamera } from "../dist/render/iso/iso-camera.js";
import { COSTUME_DEFS } from "../dist/defs/registries.js";

// Pixel and dispatch contracts only; the iso cats were not viewed in a browser.
const cats = CAT_ART.all();
const frames = (sheet) => ISO_DIRS.flatMap((dir) => ISO_ANIMS.flatMap((anim) =>
  Array.from({ length: frameCount(anim, sheet.walkFrames) }, (_, f) => ({ dir, anim, f }))));
const hex = (r, i) => "#" + [0, 1, 2].map((k) => r.pixels[i + k].toString(16).padStart(2, "0")).join("");
function colours(r) {
  const set = new Set();
  for (let i = 0; i < r.pixels.length; i += 4) if (r.pixels[i + 3]) set.add(hex(r, i));
  return set;
}
function opaqueRows(r) {
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < r.height; y++)
    for (let x = 0; x < r.width; x++)
      if (r.pixels[(y * r.width + x) * 4 + 3]) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return { lo, hi, height: hi - lo + 1 };
}

test("every registered cat has an iso sheet whose frames stay in bounds and stand 44 to 52 px", () => {
  assert.ok(cats.length >= 2);
  for (const art of cats) {
    const sheet = art.iso;
    assert.ok(sheet, `${art.id} registers an iso sheet`);
    assert.equal(sheet.width, ISO_CAT.width);
    assert.equal(sheet.height, ISO_CAT.height);
    for (const { dir, anim, f } of frames(sheet)) {
      const r = bakeIsoFrame(sheet, dir, anim, f);
      assert.equal(r.clipped, 0, r.key);
      for (let i = 3; i < r.pixels.length; i += 4) assert.ok(r.pixels[i] === 0 || r.pixels[i] === 255, "binary alpha");
      const rows = opaqueRows(r);
      assert.ok(rows.height >= 44 && rows.height <= 52, `${r.key}: ${rows.height} px tall`);
      assert.equal(rows.hi, sheet.foot.y, `${r.key}: soles end on the foot row`);
    }
    const idle = opaqueRows(bakeIsoFrame(sheet, "se", "idle", 0));
    assert.equal(idle.height, ISO_CAT.stand);
  }
});

test("SE and NE are painted differently, SW and NW are their exact mirrors, and frames animate", () => {
  for (const art of cats) {
    const sheet = art.iso;
    for (const anim of ISO_ANIMS) for (let f = 0; f < frameCount(anim, sheet.walkFrames); f++) {
      const se = bakeIsoFrame(sheet, "se", anim, f), ne = bakeIsoFrame(sheet, "ne", anim, f);
      assert.notDeepEqual(se.pixels, ne.pixels, `${art.id} ${anim} ${f}: front and back differ`);
      for (const [a, b] of [["se", "sw"], ["ne", "nw"]]) {
        const p = bakeIsoFrame(sheet, a, anim, f), m = bakeIsoFrame(sheet, b, anim, f);
        for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++)
          for (let k = 0; k < 4; k++)
            assert.equal(m.pixels[(y * p.width + (p.width - 1 - x)) * 4 + k], p.pixels[(y * p.width + x) * 4 + k]);
      }
    }
    const walk = Array.from({ length: frameCount("walk", sheet.walkFrames) }, (_, f) => bakeIsoFrame(sheet, "se", "walk", f).pixels.join());
    assert.equal(new Set(walk).size, walk.length, `${art.id}: every walk frame is distinct`);
    assert.notDeepEqual(bakeIsoFrame(sheet, "se", "idle", 0).pixels, bakeIsoFrame(sheet, "se", "idle", 1).pixels);
    assert.notDeepEqual(bakeIsoFrame(sheet, "se", "idle", 0).pixels, bakeIsoFrame(sheet, "se", "hurt", 0).pixels);
  }
});

test("identity colours come from the official head data and the cat's clothing", () => {
  const lower = (c) => c.toLowerCase();
  const zero = CAT_ART.get("zero"), nicole = CAT_ART.get("nicole");
  const zp = officialVariant("zero").palette, np = officialVariant("nicole").palette;
  for (const dir of ["se", "ne"]) {
    const z = colours(bakeIsoFrame(zero.iso, dir, "idle", 0));
    assert.ok(z.has(lower(zp.mark)), `Zero ${dir}: gold hair`);
    assert.ok(z.has(lower(zero.body.body)), `Zero ${dir}: dark coat`);
    const n = colours(bakeIsoFrame(nicole.iso, dir, "idle", 0));
    assert.ok(n.has(lower(np.headDark)), `Nicole ${dir}: dark hair`);
    assert.ok(n.has(lower(nicole.body.denim)), `Nicole ${dir}: jeans`);
    assert.ok(!n.has(lower(zp.mark)), "Nicole has no gold hair");
  }
  const zf = colours(bakeIsoFrame(zero.iso, "se", "idle", 0)), nf = colours(bakeIsoFrame(nicole.iso, "se", "idle", 0));
  assert.ok(zf.has(lower(zp.ink)), "Zero: sunglasses");
  assert.ok(zf.has(lower(zp.headLight)) && nf.has(lower(np.headLight)), "light muzzles");
  assert.ok(nf.has(lower(nicole.body.body)), "Nicole: white T-shirt");
  assert.ok(nf.has(lower(np.ink)), "Nicole: glasses frames");
  // The worn costume recolours the garments only; the hair stays.
  const costume = COSTUME_DEFS.ids().find((id) => bakeIsoFrame(nicole.iso, "se", "idle", 0, id).pixels.join() !== bakeIsoFrame(nicole.iso, "se", "idle", 0).pixels.join());
  assert.ok(costume, "some costume recolours the clothing");
  assert.ok(colours(bakeIsoFrame(nicole.iso, "se", "idle", 0, costume)).has(lower(np.headDark)));
});

test("the shared cat painter names no cat and uses no randomness", () => {
  const src = readFileSync(new URL("../src/render/iso/cat-sheet.ts", import.meta.url), "utf8");
  for (const id of CAT_ART.ids()) assert.doesNotMatch(src, new RegExp(`["'\`]${id}["'\`]`));
  assert.doesNotMatch(src, /Math\.random/);
  const world = readFileSync(new URL("../src/render/world.ts", import.meta.url), "utf8");
  assert.match(world, /art\.iso/);
});

// ------------------------------------------------------------- world dispatch
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
function catDraws(calls, art) {
  const prefix = `iso-sprite:${art.iso.identity}:`;
  const byCanvas = new Map(isoSpriteCacheKeys().filter((k) => k.startsWith(prefix)).map((k) => {
    const [, , dir, anim, frame, palette] = k.split(":");
    return [isoSpriteFrame(art.iso, dir, anim, Number(frame), palette).canvas, k];
  }));
  return calls.flatMap((c, i) => c.op === "drawImage" && byCanvas.has(c.args[0]) ? [{ i, key: byCanvas.get(c.args[0]), alpha: c.globalAlpha }] : []);
}
function frame(t, id, setup = () => {}, view = {}, config = {}) {
  environment(t);
  const sim = createSim({ cat: id, seed: 2026, ...config });
  setup(sim);
  const before = structuredClone(sim);
  const ctx = canvas().getContext("2d");
  drawWorld(ctx, sim, { time: 0.35, camera: createIsoCamera(960, 540, sim.player), reducedMotion: true, ...view });
  assert.deepEqual(sim, before, "drawing leaves SimState untouched");
  return catDraws(ctx.calls, CAT_ART.get(id));
}

test("world.ts draws the chosen cat's iso frame, never the other cat's", (t) => {
  for (const art of cats) {
    const draws = frame(t, art.id);
    assert.equal(draws.length, 1, art.id);
    assert.match(draws[0].key, new RegExp(`^iso-sprite:${art.iso.identity}:se:idle:0:$`));
    assert.equal(draws[0].alpha, 1);
    for (const other of cats) if (other !== art) assert.ok(!isoSpriteCacheKeys().some((k) => k.startsWith(`iso-sprite:${other.iso.identity}:`)));
  }
});

test("the direction follows the projected velocity; walking animates unless motion is reduced", (t) => {
  const art = cats[0];
  const move = (vx, vy) => (sim) => Object.assign(sim.player, { vx, vy, facing: vx < 0 ? -1 : 1 });
  // World (0, -1) projects up-right on screen: north-east, the back view.
  assert.match(frame(t, art.id, move(0, -120))[0].key, /:ne:walk:0:/);
  assert.match(frame(t, art.id, move(-120, 0))[0].key, /:nw:walk:0:/);
  assert.match(frame(t, art.id, move(120, 0))[0].key, /:se:walk:0:/);
  assert.match(frame(t, art.id, move(0, 120))[0].key, /:sw:walk:0:/);
  const live = frame(t, art.id, move(120, 0), { reducedMotion: false });
  assert.match(live[0].key, /:se:walk:3:/, "0.35 s at 10 fps is walk frame 3");
  assert.ok(isoDirectionMemorySize() > 0);
  clearWorldRenderCache();
  assert.equal(isoSpriteCacheSize(), 0, "leaving a run releases the iso cat frames");
  assert.equal(isoDirectionMemorySize(), 0);
  clearIsoDirections();
});

test("hurt, decoy and costume frames still draw through the iso cat", (t) => {
  const art = cats[0];
  const hurt = frame(t, art.id, (sim) => sim.impacts.push({ kind: "hurt", x: sim.player.x, y: sim.player.y, life: 0.3 }), { time: 0 });
  assert.match(hurt[0].key, /:hurt:0:/);
  const decoy = frame(t, art.id, (sim) => Object.assign(sim.decoy, { live: true, x: sim.player.x + 40, y: sim.player.y }));
  assert.equal(decoy.length, 2, "the decoy and the cat");
  assert.deepEqual(decoy.map((d) => d.alpha).sort(), [0.35, 1]);
  const costume = COSTUME_DEFS.ids()[0];
  const worn = frame(t, art.id, undefined, {}, { costume });
  assert.ok(worn.length === 1 && !worn[0].key.endsWith(":"), "the costume palette is part of the frame key");
});
