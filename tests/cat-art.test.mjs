import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { officialVariant, officialRects } from "../dist/cats/official.js";
import { clearSpriteCache, spriteCacheSize } from "../dist/engine/sprite.js";
import { CAT_ART } from "../dist/render/art-index.js";
import { CAT_BOX, CAT_DETAIL_BOUNDS, catDetailPose, catWear } from "../dist/render/cat-detail.js";
import { drawCraftCat } from "../dist/render/craft-cat.js";
import { drawWithLitRim } from "../dist/render/paper-value.js";
import { ZOOM } from "../dist/render/timeline.js";
import { officialFaceContours, traceFaceRects, scissorContour, PAPER_FACE_RIM } from "../dist/render/paper-face.js";

// Static Canvas-command contracts, not pixel comparisons or an animation/capture loop.
class RecordingPath {
  constructor(source) { this.ops = source instanceof RecordingPath ? [...source.ops] : source ? [["path", source]] : []; }
}
for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath", "rect", "arc", "ellipse"])
  RecordingPath.prototype[name] = function (...args) { this.ops.push([name, ...args]); };
const identity = () => [1, 0, 0, 1, 0, 0];
function multiply(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}
class RecordingMatrix {
  constructor(m = identity()) { this.m = m; }
  get a() { return this.m[0]; }
  get b() { return this.m[1]; }
  scale(k) { return new RecordingMatrix(multiply(this.m, [k, 0, 0, k, 0, 0])); }
  inverse() {
    const [a, b, c, d, e, f] = this.m, det = a * d - b * c;
    return new RecordingMatrix([d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]);
  }
  transformPoint({ x, y }) {
    const [a, b, c, d, e, f] = this.m;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  }
}
let canvasId = 0;
function canvas() {
  const c = { width: 200, height: 200, id: ++canvasId }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, filter: "none", imageSmoothingEnabled: true, transform: identity(), dash: [] };
  const record = (op, args) => calls.push({ op, args, ...state });
  const transform = (m) => { state.transform = multiply(state.transform, m); };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced Canvas saves"); },
    scale(x, y) { transform([x, 0, 0, y, 0, 0]); },
    translate(x, y) { transform([1, 0, 0, 1, x, y]); },
    rotate(a) { transform([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    setTransform(...m) { state.transform = m; },
    getTransform() { return new RecordingMatrix(state.transform); },
    setLineDash(dash) { state.dash = [...dash]; },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { kind: "paper", setTransform() {} }; },
    createRadialGradient(...args) {
      const stops = [];
      return { kind: "radial", args, stops, addColorStop(...stop) { stops.push(stop); } };
    },
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key === "depth" ? stack.length : key in state ? state[key] : methods[key] ?? ((...args) => record(key, args)),
    set: (_, key, value) => { state[key] = value; if (key === "filter") record("filter", [value]); return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function environment(t) {
  clearSpriteCache();
  for (const [key, value] of Object.entries({
    document: { createElement: (name) => { assert.equal(name, "canvas"); return canvas(); } },
    Path2D: RecordingPath, DOMMatrix: RecordingMatrix,
    requestAnimationFrame: () => assert.fail("cat rendering started a loop"),
    AudioContext: class { constructor() { assert.fail("cat rendering started audio"); } },
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("cat rendering consumed random"));
  t.mock.method(Date, "now", () => assert.fail("cat rendering read wall time"));
  t.mock.method(performance, "now", () => assert.fail("cat rendering read wall time"));
  t.after(clearSpriteCache);
}
const pose = (id, changes = {}) => Object.freeze({ id, x: 0, y: 0, facing: 1, moving: false, dashing: false, hurt: false, time: 0, ...changes });
const images = (ctx) => ctx.calls.filter((c) => c.op === "drawImage");
const paint = (image) => image.args[0].getContext("2d").calls;
const fills = (calls, color) => calls.filter((c) => c.op === "fill" && c.fillStyle === color && c.args[0] instanceof RecordingPath);
const pathText = (call) => JSON.stringify(call.args[0].ops);
function normalized(value) {
  if (value instanceof RecordingPath) return value.ops;
  if (value?.getContext) return { canvas: value.id };
  if (value?.kind === "radial") return { kind: value.kind, args: value.args, stops: value.stops };
  if (value?.kind === "paper") return { kind: value.kind };
  return value;
}
function signature(ctx) {
  return ctx.calls.map((c) => ({ ...c, args: c.args.map(normalized), fillStyle: normalized(c.fillStyle) }));
}
function draw(art, p = pose(art.id), look = art.body, alpha = 1) {
  const ctx = canvas().getContext("2d");
  ctx.globalAlpha = alpha;
  art.draw(ctx, p);
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, alpha, "caller opacity restored");
  assert.deepEqual(ctx.getTransform().m, identity(), "caller transform restored");
  return ctx;
}

import { CATS, COSTUME_DEFS } from "../dist/defs/index.js";
import { COSTUME_ART } from "../dist/render/art-index.js";
import { HEAD_ACCESSORIES } from "../dist/render/costume-accessories.js";
import { SPRITE_CACHE_LIMIT } from "../dist/engine/sprite.js";
import { withPaperMotion } from "../dist/render/paper-motion.js";
const pixels = calls => calls.filter(c => c.op === "fillRect");
const bodyImage = ctx => images(ctx)[0];
const headImage = ctx => images(ctx).at(-1);
function inside(contours, x, y) {
  let hit = false;
  for (const loop of contours) for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
function assertCoverage(rects, face) {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  const areas = new Map();
  for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
    const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
    const source = rects.findLast((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    const layers = face.layers.filter((layer) => inside(layer.contours, x, y));
    assert.deepEqual(layers.map((l) => l.color), source ? [source.fill] : [], `visible official colour at ${x},${y}`);
    assert.equal(inside(face.silhouette, x, y), !!source);
    if (source) areas.set(source.fill, (areas.get(source.fill) ?? 0) + (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]));
  }
  for (const layer of face.layers) assert.equal(layer.area, areas.get(layer.color));
}

test("paper colour contours preserve official source coverage, palette, markings and overlap order", () => {
  for (const art of CAT_ART.all()) {
    const source = officialRects(art.id), snapshot = structuredClone(source);
    const face = officialFaceContours(art.id);
    assertCoverage(source, face);
    assert.deepEqual(source, snapshot, "official rectangles remain unchanged");
    assert.equal(officialFaceContours(art.id), face, "one finite contour set per official identity");
    assert.ok(face.layers.length < source.length / 3, "regions are grouped by colour, not rectangular print commands");
  }
  const synthetic = [
    { x: 0, y: 0, w: 8, h: 8, fill: "#111111" },
    { x: 2, y: 2, w: 4, h: 4, fill: "#eeeeee" },
    { x: 8, y: 8, w: 2, h: 2, fill: "#111111" },
  ];
  assertCoverage(synthetic, traceFaceRects(synthetic));
});

test("scissor cuts simplify staircase edges without mutating small face details", () => {
  const small = Object.freeze([[0, 0], [2, 0], [2, 1], [0, 1]]);
  assert.equal(scissorContour(small), small);
  const stair = [[0, -20], [10, -20], [10, 10]];
  for (let i = 9; i >= 0; i--) stair.push([i, i + 1], [i, i]);
  stair.pop();
  const before = structuredClone(stair), cut = scissorContour(stair);
  assert.deepEqual(stair, before);
  assert.ok(cut.length < stair.length, "large staircase becomes a scissor edge");
  assert.ok(cut.length >= 4);
  assert.ok(cut.flat().every(Number.isFinite));
  for (const p of cut) assert.ok(stair.some(q => q[0] === p[0] && q[1] === p[1]), "no invented outward points");
});


test("registered native bodies distinguish split coat and white tee with denim", t => {
  environment(t);
  const silhouettes = [];
  for (const art of CAT_ART.all()) {
    const ctx = draw(art), body = bodyImage(ctx), p = pixels(paint(body));
    assert.equal(images(ctx).length, 2, "complete native body and head are separately cached");
    assert.ok(p.some(c => c.fillStyle === art.body.body));
    assert.ok(p.some(c => c.fillStyle === art.body.paw), "paws retain their identity palette");
    if (art.body.tailoring === "split-coat") {
      assert.ok(p.some(c => c.fillStyle === art.body.belt), "coat has its own belt");
      assert.ok(p.some(c => c.fillStyle === art.body.metal), "gold metal remains visible");
    } else assert.ok(p.some(c => c.fillStyle === art.body.denim), "tee uses the registered denim colour");
    silhouettes.push(p.map(c => c.args));
    assert.ok(p.every(c => c.args.every(Number.isInteger)), "authored native grid, not a curved paper raster");
  }
  assert.notDeepEqual(silhouettes[0], silhouettes[1]);
});

test("native heads preserve official palette/rectangle ordering and share world/portrait caches", t => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const source = officialRects(art.id), original = structuredClone(source), ctx = draw(art), head = headImage(ctx);
    const p = pixels(paint(head));
    assert.deepEqual(p.map(c => c.fillStyle), source.map(r => r.fill), "official colours and overlap order are retained");
    assert.ok(p.every(c => c.args.every(Number.isInteger)));
    assert.equal(p.length, source.length, "each official native rectangle is represented");
    assert.ok(!paint(head).some(c => c.op === "fill" || c.op === "stroke" || c.op === "filter"), "no paper path/rim/filter pass");
    const portrait = canvas().getContext("2d");
    art.portrait(portrait, pose(art.id, { facing: -1, x: 50, y: 60 }), 0.32);
    assert.equal(headImage(portrait).args[0], head.args[0]);
    assert.deepEqual(headImage(portrait).transform, [-2, 0, 0, 2, 50, 60]);
    assert.equal(portrait.depth, 0);
    assert.deepEqual(officialRects(art.id), original);
  }
});

test("body and head caches isolate identity and costume appearance", t => {
  environment(t);
  const cats = CAT_ART.all(), costumes = COSTUME_DEFS.ids();
  const first = draw(cats[0]), second = draw(cats[1]);
  assert.notEqual(bodyImage(first).args[0], bodyImage(second).args[0]);
  assert.notEqual(headImage(first).args[0], headImage(second).args[0]);
  for (const art of cats) {
    const a = draw(art, pose(art.id, { costume: costumes[0] })), b = draw(art, pose(art.id, { costume: costumes[1] }));
    assert.notEqual(bodyImage(a).args[0], bodyImage(b).args[0]);
    assert.notEqual(headImage(a).args[0], headImage(b).args[0]);
    assert.equal(bodyImage(draw(art, pose(art.id, { costume: costumes[0], x: 200 }))).args[0], bodyImage(a).args[0]);
  }
});

test("pixel poses are deterministic, mirrored/scaled and restore caller state", t => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const p = pose(art.id, { moving: true, time: 0.31 }), before = structuredClone(p), a = draw(art, p), b = draw(art, p);
    assert.deepEqual(signature(a), signature(b));
    assert.deepEqual(p, before);
    const later = draw(art, pose(art.id, { moving: true, time: 0.6 }));
    assert.notEqual(bodyImage(a).args[0], bodyImage(later).args[0], "walk uses discrete authored frames");
    assert.equal(headImage(a).args[0], headImage(later).args[0]);
    const idle = draw(art), dash = draw(art, pose(art.id, { dashing: true }));
    assert.notEqual(bodyImage(idle).args[0], bodyImage(dash).args[0]);
    const mirrored = draw(art, pose(art.id, { ...p, facing: -1, scale: 0.32, x: 100, y: 80 }));
    images(a).forEach((im, i) => assert.deepEqual(images(mirrored)[i].transform, multiply([-2, 0, 0, 2, 100, 80], im.transform)));
    for (const [flag, opacity] of [["hurt", 0.7], ["decoy", 0.35]]) {
      const faded = draw(art, pose(art.id, { [flag]: true }), art.body, 0.5);
      assert.ok(images(faded).every(c => c.globalAlpha === opacity * 0.5));
      assert.equal(faded.imageSmoothingEnabled, true);
    }
  }
});

function warm(art, costume) {
  for (const dashing of [false, true]) for (const frame of [0, 1, 2, 3])
    draw(art, pose(art.id, { costume, moving: true, dashing, time: (frame + 0.25) / 9 }));
}
test("finite native frame caches exclude placement, continuous time, alpha and scale", t => {
  environment(t);
  for (const art of CAT_ART.all()) warm(art);
  const count = spriteCacheSize();
  assert.ok(count <= CAT_ART.all().length * 9, "four walk frames for two actions plus one head per cat");
  for (const art of CAT_ART.all()) for (const time of [0.125, 0.7, 10, 10000]) {
    draw(art, pose(art.id, { time, moving: true, dashing: time === 10, facing: -1, x: 123, y: -456, scale: 0.27, hurt: true }));
    assert.equal(spriteCacheSize(), count);
  }
});

function rectanglePoints(call) {
  const [, x, y, w, h] = call.args;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([x, y]) => new RecordingMatrix(call.transform).transformPoint({ x, y }));
}
const poses = id => [pose(id), ...[0.05, 0.13, 0.26, 0.39, 0.52].map(time => pose(id, { time, moving: true })), pose(id, { dashing: true }), pose(id, { facing: -1, hurt: true }), pose(id, { wear: catWear(0.1, 9, 10) })];
test("native body sheets fit the fixed envelope and head placement stays anchored", t => {
  environment(t);
  for (const art of CAT_ART.all()) for (const p of poses(art.id)) {
    const ctx = draw(art, p);
    for (const pt of rectanglePoints(bodyImage(ctx))) {
      assert.ok(pt.x >= CAT_DETAIL_BOUNDS.l && pt.x <= CAT_DETAIL_BOUNDS.r);
      assert.ok(pt.y >= CAT_DETAIL_BOUNDS.t && pt.y <= CAT_DETAIL_BOUNDS.b);
    }
    const head = headImage(ctx);
    assert.equal(head.args[3], 84); assert.equal(head.args[4], 72);
    assert.ok(head.args[2] >= -79 && head.args[2] <= -78, "at most one pixel walk bob");
    assert.ok(head.args[1] >= -42 && head.args[1] <= -40, "dash shifts head by two native pixels only");
  }
});

test("native sheets fit CAT_BOX and display zoom changes transforms, not source resolution", t => {
  environment(t);
  for (const art of CAT_ART.all()) for (const p of poses(art.id)) {
    const ctx = draw(art, p);
    for (const im of images(ctx)) {
      assert.equal(im.args[0].width, im.args[3], "native 1x source");
      assert.equal(im.args[0].height, im.args[4]);
      for (const pt of rectanglePoints(im)) {
        assert.ok(pt.x >= CAT_BOX.l && pt.x <= CAT_BOX.r);
        assert.ok(pt.y >= CAT_BOX.t && pt.y <= CAT_BOX.b);
      }
    }
  }
  const art = CAT_ART.all()[0], peak = Math.max(...Object.values(ZOOM).flatMap(z => Object.values(z)));
  const a = draw(art), b = canvas().getContext("2d"); b.scale(peak, peak); art.draw(b, pose(art.id));
  images(a).forEach((im, i) => {
    assert.equal(images(b)[i].args[0], im.args[0], "zoom reuses exact pixel source");
    assert.equal(images(b)[i].imageSmoothingEnabled, false);
  });
});

test("native actor adapter contains no cat literals, wall clock, RNG or image assets", () => {
  const text = readFileSync(new URL("../src/render/pixel-actors.ts", import.meta.url), "utf8");
  for (const id of CATS.ids()) assert.ok(!text.includes(`"${id}"`));
  assert.doesNotMatch(text, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b/);
});

test("every costume retains registered appearance, skill painters, preview and native ticket", t => {
  environment(t);
  assert.deepEqual(COSTUME_ART.ids(), COSTUME_DEFS.all().map(d => d.art));
  assert.equal(COSTUME_ART.ids().length, 14);
  for (const art of COSTUME_ART.all()) {
    assert.ok(art.makeup.patches?.length || art.makeup.expression || art.makeup.accessories?.length);
    for (const a of art.makeup.accessories ?? []) assert.ok(HEAD_ACCESSORIES[a]);
    assert.ok(art.outfit.parts.length || art.outfit.coat || art.outfit.tee);
    for (const kind of ["costume-burst", "costume-push", "costume-pull"]) assert.equal(typeof art.effects?.[kind], "function");
    for (const key of ["ground", "sprites", "preview", "ticket"]) assert.equal(typeof art[key], "function");
    const c = canvas().getContext("2d"); art.ticket(c);
    assert.ok(images(c).length || pixels(c.calls).length);
    assert.equal(c.depth, 0);
  }
});

test("absent costumes leave the native face unchanged after the whole wardrobe", t => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const plain = draw(art), original = paint(headImage(plain)).map(c => [c.op, c.args, c.fillStyle]);
    assert.equal(headImage(draw(art, pose(art.id, { costume: undefined }))).args[0], headImage(plain).args[0]);
    for (const costume of COSTUME_DEFS.ids()) {
      const worn = draw(art, pose(art.id, { costume }));
      assert.notEqual(headImage(worn).args[0], headImage(plain).args[0]);
      assert.deepEqual(headImage(worn).args.slice(1), headImage(plain).args.slice(1), "costume uses same head anchor and box");
    }
    clearSpriteCache();
    assert.deepEqual(paint(headImage(draw(art))).map(c => [c.op, c.args, c.fillStyle]), original);
  }
});

test("costume head caches preserve official identity colours and never modify source data", t => {
  environment(t);
  const seen = new Set();
  for (const art of CAT_ART.all()) {
    const before = structuredClone(officialRects(art.id)), palette = officialVariant(art.id).palette;
    for (const costume of COSTUME_DEFS.ids()) {
      const head = headImage(draw(art, pose(art.id, { costume }))).args[0];
      assert.ok(!seen.has(head)); seen.add(head);
      assert.equal(headImage(draw(art, pose(art.id, { costume, time: 9, moving: true }))).args[0], head);
      const colors = pixels(head.getContext("2d").calls).map(c => c.fillStyle);
      for (const role of ["head", "headDark", "headLight", "ink"]) assert.ok(colors.includes(palette[role]), `${art.id}/${costume}: ${role}`);
    }
    assert.deepEqual(officialRects(art.id), before);
  }
  assert.equal(seen.size, CATS.ids().length * COSTUME_DEFS.ids().length);
});

test("all costume sheets and every pixel written into their cache stay within bounds", t => {
  environment(t);
  for (const art of CAT_ART.all()) for (const costume of COSTUME_DEFS.ids()) for (const base of poses(art.id)) {
    const c = draw(art, pose(art.id, { ...base, costume }));
    for (const im of images(c)) {
      for (const pt of rectanglePoints(im)) assert.ok(pt.x >= CAT_BOX.l && pt.x <= CAT_BOX.r && pt.y >= CAT_BOX.t && pt.y <= CAT_BOX.b);
      for (const p of pixels(paint(im))) {
        const [x, y, w, h] = p.args, m = new RecordingMatrix(p.transform);
        for (const pt of [m.transformPoint({ x, y }), m.transformPoint({ x: x + w, y: y + h })])
          assert.ok(pt.x >= 0 && pt.y >= 0 && pt.x <= im.args[0].width && pt.y <= im.args[0].height, `${costume}: native pixel inside cache`);
      }
    }
  }
});

test("costume frame caches remain bounded per night and across the wardrobe", t => {
  environment(t);
  for (const costume of COSTUME_DEFS.ids()) {
    clearSpriteCache(); for (const art of CAT_ART.all()) warm(art, costume);
    const size = spriteCacheSize();
    for (const art of CAT_ART.all()) for (const time of [0.125, 10, 10000]) draw(art, pose(art.id, { costume, time, moving: true, x: 77, y: -9, scale: 0.3 }));
    assert.equal(spriteCacheSize(), size); assert.ok(size <= 18);
  }
  clearSpriteCache();
  for (const art of CAT_ART.all()) for (const costume of COSTUME_DEFS.ids()) warm(art, costume);
  assert.ok(spriteCacheSize() <= SPRITE_CACHE_LIMIT);
});

test("reduced motion holds the native frame while caller position and opacity still apply", t => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const first = withPaperMotion(true, () => draw(art, pose(art.id, { moving: true, time: 0.2 })));
    const later = withPaperMotion(true, () => draw(art, pose(art.id, { moving: true, time: 9, x: 100, y: 20 })));
    assert.equal(bodyImage(first).args[0], bodyImage(later).args[0]);
    assert.deepEqual(bodyImage(later).transform, [1, 0, 0, 1, 100, 20]);
  }
});

test("costume adapters name no costume identities and read no clock or randomness", () => {
  const text = readFileSync(new URL("../src/render/pixel-actors.ts", import.meta.url), "utf8");
  for (const id of [...CATS.ids(), ...COSTUME_DEFS.ids()]) assert.ok(!text.includes(`"${id}"`));
  assert.doesNotMatch(text, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b|url\(|data:image/);
});
