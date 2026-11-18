import assert from "node:assert/strict";
import { test } from "node:test";
import { PASSIVE_DEFS, WEAPON_DEFS } from "../dist/defs/index.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { PASSIVE_ART, WEAPON_ART } from "../dist/render/art-index.js";
import { paintGallery } from "../dist/render/gallery.js";
import { paperEmblem } from "../dist/render/paper-kit.js";
import { glossy, PAPER_LAYERS, PAPER_LIGHT, PAPER_SHADOW, probeGloss } from "../dist/render/paper-rules.js";
import { paintCardEmblem, paintUpgradeIcon } from "../dist/render/upgrade-icons.js";
import { GALLERY_CHECKS, galleryCheck } from "../dist/ui/gallery-layout.js";

// Command recording only: these tests check which Canvas features painters use, not browser pixels.
class RecordingPath {
  constructor(source) { this.ops = source instanceof RecordingPath ? [...source.ops] : source ? [["path", source]] : []; }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "roundRect", "arc", "ellipse", "addPath"])
  RecordingPath.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
class RecordingMatrix {
  scale() { return this; }
  inverse() { return this; }
  transformPoint(p) { return p; }
}
/** Every canvas created while recording writes into one shared log, so cached sprites are seen too. */
function recorder() {
  const log = [];
  function canvas() {
    const c = { width: 192, height: 192, style: {} }, stack = [];
    let state = { globalAlpha: 1, globalCompositeOperation: "source-over", shadowBlur: 0, filter: "none", fillStyle: "#000000", strokeStyle: "#000000" };
    const methods = {
      save() { stack.push({ ...state }); },
      restore() { state = stack.pop(); assert.ok(state, "balanced canvas save/restore"); },
      createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
      createPattern() { return { setTransform() {} }; },
      getTransform() { return new RecordingMatrix(); },
      measureText(text) { return { width: text.length * 7 }; },
    };
    for (const name of ["createLinearGradient", "createRadialGradient", "createConicGradient"])
      methods[name] = (...args) => { log.push({ op: name }); return { addColorStop() {} }; };
    const ctx = new Proxy({}, {
      get: (_, key) => key === "canvas" ? c : key in state ? state[key] : methods[key] ?? ((...args) => log.push({ op: key, args, ...state })),
      set: (_, key, value) => { state[key] = value; log.push({ op: `set:${String(key)}`, value }); return true; },
    });
    c.getContext = () => ctx;
    return c;
  }
  return { log, canvas };
}
function drawingEnvironment(t) {
  clearSpriteCache();
  const rec = recorder();
  const globals = {
    document: { createElement: (name) => { assert.equal(name, "canvas"); return rec.canvas(); } },
    Path2D: RecordingPath,
    DOMMatrix: RecordingMatrix,
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumed Math.random"));
  t.after(clearSpriteCache);
  return rec;
}
/** Gloss found in a slice of the shared log. */
function glossIn(entries) {
  return entries.filter((e) =>
    e.op.startsWith("create") && e.op.endsWith("Gradient") ||
    e.op === "set:shadowBlur" && e.value > 0 ||
    e.op === "set:globalCompositeOperation" && e.value === "lighter" ||
    e.op === "set:filter" && /blur/.test(String(e.value)));
}

test("the paper ruleset has one moon light from the top-right and one shadow offset down-right", () => {
  assert.ok(PAPER_SHADOW.dx > 0 && PAPER_SHADOW.dy > 0, "shadow falls down-right");
  assert.ok(PAPER_SHADOW.alpha > 0 && PAPER_SHADOW.alpha < 1);
  assert.ok(PAPER_LIGHT.dirX > 0 && PAPER_LIGHT.dirY < 0, "light comes from the top-right");
  assert.ok(Math.abs(Math.hypot(PAPER_LIGHT.dirX, PAPER_LIGHT.dirY) - 1) < 1e-9, "light direction is a unit vector");
  assert.deepEqual([PAPER_LAYERS.min, PAPER_LAYERS.max], [1, 3]);
  assert.ok(Object.isFrozen(PAPER_SHADOW) && Object.isFrozen(PAPER_LIGHT));
});

test("paperEmblem composes 1 to 3 flat layers and refuses more", (t) => {
  const rec = drawingEnvironment(t), ctx = rec.canvas().getContext("2d");
  const layer = { shape: [[0, 0], [10, 0], [10, 10]], color: "#806040" };
  assert.throws(() => paperEmblem(ctx, []), RangeError);
  assert.throws(() => paperEmblem(ctx, [layer, layer, layer, layer]), RangeError);
  for (const n of [1, 2, 3]) assert.equal(paperEmblem(ctx, Array(n).fill(layer)).length, n);
  assert.deepEqual(glossIn(rec.log), [], "flat layers use no gradient, blur or additive light");
  // Every lifted layer casts its hard shadow by translating down-right.
  const shifts = rec.log.filter((e) => e.op === "translate" && e.args[0] === PAPER_SHADOW.dx && e.args[1] === PAPER_SHADOW.dy);
  assert.equal(shifts.length, 6);
});

test("every registered weapon and passive icon is a flat paper cutout: no gradients, shadowBlur or gloss", (t) => {
  const rec = drawingEnvironment(t);
  const arts = [...WEAPON_ART.all(), ...PASSIVE_ART.all()];
  assert.equal(arts.length, WEAPON_DEFS.ids().length + PASSIVE_DEFS.ids().length);
  for (const art of arts) {
    const ctx = rec.canvas().getContext("2d"), from = rec.log.length;
    art.icon(ctx, "#f0dfbf");
    const mine = rec.log.slice(from);
    assert.deepEqual(glossIn(mine).map((e) => e.op), [], `${art.id} icon stays flat paper`);
    assert.ok(mine.filter((e) => e.op === "fill").length >= 2, `${art.id} icon paints paper layers`);
    assert.ok(mine.some((e) => e.op === "translate" && e.args[0] > 0 && Math.abs(e.args[1] / e.args[0] - PAPER_SHADOW.dy / PAPER_SHADOW.dx) < 1e-9),
      `${art.id} icon casts its shadow down-right`);
  }
});

test("upgrade card emblems and HUD slot tags use flat paper mounts without gloss", (t) => {
  const rec = drawingEnvironment(t);
  for (const id of [...WEAPON_DEFS.ids(), ...PASSIVE_DEFS.ids()]) {
    const from = rec.log.length;
    paintCardEmblem(rec.canvas(), id);
    paintUpgradeIcon(rec.canvas(), id);
    paintUpgradeIcon(rec.canvas(), id, true);
    assert.deepEqual(glossIn(rec.log.slice(from)).map((e) => e.op), [], `${id} emblem mount stays flat paper`);
  }
});

test("gallery check views come only from the URL and default to none", () => {
  assert.deepEqual([...GALLERY_CHECKS], ["none", "value", "gloss"]);
  assert.equal(galleryCheck(""), "none");
  assert.equal(galleryCheck("?gallery=1"), "none");
  assert.equal(galleryCheck("?gallery=1&check=value"), "value");
  assert.equal(galleryCheck("?gallery=1&check=gloss"), "gloss");
  assert.equal(galleryCheck("?check=VALUE"), "none");
  assert.equal(galleryCheck("?gallery=1&check=pixel"), "none");
});

test("check views keep the plain gallery layout; the value view reduces the page to luminance", (t) => {
  const rec = drawingEnvironment(t);
  const plain = paintGallery(rec.canvas(), "en", 760, 1);
  let from = rec.log.length;
  assert.equal(paintGallery(rec.canvas(), "en", 760, 1, "value"), plain);
  assert.ok(rec.log.slice(from).some((e) => e.op === "set:filter" && e.value === "grayscale(1)"));
  from = rec.log.length;
  assert.equal(paintGallery(rec.canvas(), "en", 760, 1, "gloss"), plain);
  assert.ok(!rec.log.slice(from).some((e) => e.op === "set:filter" && e.value === "grayscale(1)"));
});

test("the gloss probe flags gradients, blurred shadows and additive light, then restores the prototype", () => {
  class FakeContext {
    constructor() { this._blur = 0; this._op = "source-over"; }
    createLinearGradient() { return "linear"; }
    createRadialGradient() { return "radial"; }
    get shadowBlur() { return this._blur; }
    set shadowBlur(v) { this._blur = v; }
    get globalCompositeOperation() { return this._op; }
    set globalCompositeOperation(v) { this._op = v; }
  }
  const before = Object.getOwnPropertyDescriptors(FakeContext.prototype), c = new FakeContext();
  const clean = probeGloss([FakeContext.prototype], () => { c.shadowBlur = 0; c.globalCompositeOperation = "multiply"; });
  assert.equal(glossy(clean), false);
  const report = probeGloss([FakeContext.prototype], () => {
    assert.equal(c.createRadialGradient(), "radial");
    c.createLinearGradient();
    c.shadowBlur = 4;
    c.globalCompositeOperation = "lighter";
  });
  assert.deepEqual(report, { gradient: 2, shadowBlur: 1, lighter: 1 });
  assert.equal(glossy(report), true);
  assert.equal(c.shadowBlur, 4, "setters still reach the real context");
  assert.throws(() => probeGloss([FakeContext.prototype], () => { throw new Error("paint failed"); }), /paint failed/);
  assert.deepEqual(Object.getOwnPropertyDescriptors(FakeContext.prototype), before, "prototype restored");
});
