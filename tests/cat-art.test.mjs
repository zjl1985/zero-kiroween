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
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, filter: "none", transform: identity(), dash: [] };
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
  drawCraftCat(ctx, p, look);
  assert.equal(ctx.depth, 0);
  assert.equal(ctx.globalAlpha, alpha, "caller opacity restored");
  assert.deepEqual(ctx.getTransform().m, identity(), "caller transform restored");
  return ctx;
}
const torso = (ctx, look) => images(ctx).find((image) => fills(paint(image), look.body).some((c) => /M -1[01] -29/.test(pathText(c))));

test("registered outfits render either a split coat or a white tee with separate denim legs", (t) => {
  environment(t);
  const shapes = [];
  for (const art of CAT_ART.all()) {
    const ctx = draw(art), look = art.body, body = torso(ctx, look);
    assert.ok(body, `${art.id}: a tailored torso`);
    shapes.push(fills(paint(body), look.body)[0].args[0].ops);
    assert.ok(paint(images(ctx)[3]).some((c) => c.op === "stroke" && c.strokeStyle === look.pawEdge), "toes/sole stay separate from the leg");
    if (look.tailoring === "split-coat") {
      const capes = images(ctx).filter((im) => fills(paint(im), look.lining).some((c) => /M 1 -2/.test(pathText(c))));
      assert.equal(capes.length, 2, "separate cape panels");
      for (const cape of capes) {
        const calls = paint(cape);
        assert.ok(fills(calls, look.cape).length > 0, "outer paper covers the lining");
        assert.ok(fills(calls, look.fold).length > 0, "pleat has a shaded face");
        assert.ok(calls.some((c) => c.op === "stroke" && c.dash.length > 0 && c.strokeStyle === look.trim), "stitched hem");
        assert.ok(calls.some((c) => c.op === "fill" && c.shadowBlur > 0), "baked contact shadows");
      }
      assert.ok(fills(paint(body), look.lining).length >= 2, "folded collar leaves");
      assert.ok(paint(body).some((c) => c.op === "stroke" && /M -6 -17 Q 0 -11 6 -17/.test(pathText(c))), "draped pocket-watch chain");
      assert.equal(images(ctx).length, 15);
    } else {
      assert.ok(fills(paint(body), look.denim).length, "the trouser waist overlaps the leg cuts");
      for (const index of [2, 4]) assert.ok(fills(paint(images(ctx)[index]), look.denim).length, "each leg is denim");
      for (const index of [6, 9]) assert.ok(fills(paint(images(ctx)[index]), look.body).length, "the tee has short cloth sleeves");
      assert.equal(images(ctx).length, 13);
    }
  }
  assert.equal(shapes.length, 2);
  assert.notDeepEqual(shapes[0], shapes[1], "not merely recolours of one body");
});

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

test("layered face cuts retain a narrow rim, old head placement and shared paper portraits", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const ctx = draw(art), [edge, head] = images(ctx).slice(-2);
    assert.deepEqual(head.args.slice(1), [-35, -71, 70, 55]);
    assert.deepEqual(edge.args.slice(1), [-37, -73, 74, 59]);
    const palette = officialVariant(art.id).palette;
    for (const role of ["head", "headDark", "headLight", "earInner", "ink", "blush", "nose", "white"])
      assert.ok(fills(paint(head), palette[role]).length, `original identity colour: ${role}`);
    assert.equal(fills(paint(head), palette.white).length, 2, "pure white is reserved for the two reference eye glints");
    assert.ok(paint(head).some(c => c.op === "fill" && c.args[0]?.ops.some(op => op[0] === "path" && op[1] === art.face.outline)), "renderer uses the authored silhouette");
    assert.ok(!paint(head).some((c) => c.op === "fillRect" && c.globalCompositeOperation === "source-over"), "no raw rectangle print");
    assert.ok(paint(head).some((c) => c.op === "stroke"), "clipped sheet lips and thickness");
    assert.match(art.face.outline, /Q/, "cheeks and chin use authored curves");
    assert.ok((art.face.outline.match(/[ML]/g) ?? []).length < 24, "silhouette is not a dense grid staircase");
    const rim = paint(edge).find((c) => c.op === "stroke" && c.strokeStyle === art.body.rim);
    assert.equal(rim.lineWidth / 2, PAPER_FACE_RIM);
    assert.equal(PAPER_FACE_RIM, 0.625);
    assert.equal(ctx.calls.at(-1), head);
    const portrait = canvas().getContext("2d");
    art.portrait(portrait, pose(art.id), 0.1);
    assert.equal(images(portrait).at(-1).args[0], head.args[0], "world and portrait share the exact face cut");
  }
});

test("outfits share cached cuts by appearance metadata across face identities", (t) => {
  environment(t);
  const [a, b] = CAT_ART.all();
  const first = draw(a, pose(a.id), b.body), second = draw(b);
  assert.deepEqual(images(first).slice(0, -2).map((c) => c.args[0]), images(second).slice(0, -2).map((c) => c.args[0]), "same registered look shares every body part across identities");
  const recoloured = { ...b.body, denim: "#40617e" }, recolour = draw(b, pose(b.id), recoloured);
  assert.notEqual(torso(second, b.body).args[0], torso(recolour, recoloured).args[0], "the denim colour participates in caching");
  assert.ok(fills(paint(torso(recolour, recoloured)), recoloured.denim).length > 0);
});

test("static poses are deterministic, articulated, mirrored/scaled and do not mutate caller data", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const p = pose(art.id, { moving: true, time: 0.31 }), look = Object.freeze({ ...art.body });
    const a = draw(art, p, look), b = draw(art, p, look);
    assert.deepEqual(signature(a), signature(b));
    assert.deepEqual(look, art.body);
    const idle = draw(art), later = draw(art, pose(art.id, { moving: true, time: 0.6 }));
    const hasCape = look.tailoring === "split-coat", arms = hasCape ? [9, 12] : [7, 10];
    for (const index of [1, ...arms])
      assert.notDeepEqual(images(a)[index].transform, images(later)[index].transform, "tail and forearms swing with the pose");
    for (const index of arms) assert.ok(images(idle)[index].transform[1] > 0, "each paw hangs below its elbow");
    const dash = draw(art, pose(art.id, { dashing: true }));
    if (hasCape) assert.notEqual(images(idle)[6].args[0], images(dash)[6].args[0], "dash uses a swept cape cut");
    assert.equal(torso(idle, look).args[0], torso(dash, look).args[0], "static torso is shared across poses");
    const reflected = draw(art, pose(art.id, { moving: true, time: 0.31, facing: -1, scale: 0.32, x: 100, y: 80 }));
    images(a).forEach((image, i) => {
      const expected = multiply([-2, 0, 0, 2, 100, 80], image.transform);
      images(reflected)[i].transform.forEach((v, j) => assert.ok(Math.abs(v - expected[j]) < 1e-10));
    });
    for (const [flag, opacity] of [["hurt", 0.65], ["decoy", 0.3]]) {
      const faded = draw(art, pose(art.id, { [flag]: true }), art.body, 0.5);
      for (const image of images(faded)) assert.equal(image.globalAlpha, 0.5 * opacity, "fade applies once to each complete cached part");
    }
  }
});

test("finite cached parts exclude time, facing, opacity, placement and display scale", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    draw(art);
    draw(art, pose(art.id, { dashing: true }));
  }
  assert.equal(spriteCacheSize(), 21, "ten coat body cuts, six tee body cuts, four face cuts and the ground shadow");
  // Independent fixed inputs, not elapsed frames or a live animation test.
  for (const art of CAT_ART.all()) for (const time of [0.125, 0.7, 10, 10000]) for (const moving of [false, true]) {
    const ctx = draw(art, pose(art.id, { time, moving, dashing: time === 10, facing: -1, x: 123, y: -456, scale: 0.27, hurt: true }));
    assert.equal(spriteCacheSize(), 21);
    assert.equal(images(ctx).length, art.body.tailoring === "split-coat" ? 15 : 13);
    assert.ok(!ctx.calls.some((c) => c.op === "filter" || c.op === "fill" || c.op === "fillRect" || c.op === "stroke"), "texturing, stitching and shadows are cached");
  }
});

function rectanglePoints(call) {
  const [, x, y, w, h] = call.args;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([x, y]) => new RecordingMatrix(call.transform).transformPoint({ x, y }));
}
test("cached body subparts fit the fixed local envelope in representative static poses", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) for (const p of [pose(art.id), pose(art.id, { time: 0.13, moving: true }), pose(art.id, { time: 0.39, moving: true }), pose(art.id, { dashing: true })]) {
    const ctx = draw(art, p), body = images(ctx).slice(0, -2);
    for (const command of body) for (const point of rectanglePoints(command)) {
      assert.ok(point.x >= CAT_DETAIL_BOUNDS.l && point.x <= CAT_DETAIL_BOUNDS.r, `x ${point.x} fits body envelope`);
      assert.ok(point.y >= CAT_DETAIL_BOUNDS.t && point.y <= CAT_DETAIL_BOUNDS.b, `y ${point.y} fits body envelope`);
    }
    const head = images(ctx).at(-1);
    assert.deepEqual(head.args.slice(1), [-35, -71, 70, 55], "same head box at every pose");
    const [a, b, c, d, x, y] = head.transform;
    assert.ok(Math.abs(x - c * 38) < 1e-9, "head tilts around the neck, without horizontal drift");
    assert.ok(Math.abs(y - d * 38 - (catDetailPose(p).bob - 38)) < 1e-9, "neck anchor keeps the existing bob");
    assert.ok(Math.abs(a * d - b * c - 1) < 1e-9, "head pose preserves scale");
  }
});

test("every cached part of both cats fits CAT_BOX in representative poses, and cue zoom only raises the raster density", (t) => {
  environment(t);
  const poses = (id) => [
    pose(id), pose(id, { time: 1.7 }),
    ...[0.05, 0.13, 0.26, 0.39, 0.52].map((time) => pose(id, { time, moving: true })),
    pose(id, { dashing: true }), pose(id, { hurt: true }), pose(id, { hurt: true, moving: true, time: 0.13 }),
    pose(id, { facing: -1, moving: true, time: 0.39 }), pose(id, { wear: catWear(0.1, 9, 10), moving: true, time: 0.13 }),
  ];
  let reach = { l: 0, r: 0, t: 0, b: 0 };
  for (const art of CAT_ART.all()) for (const p of poses(art.id)) {
    const ctx = canvas().getContext("2d");
    art.draw(ctx, p);
    const parts = images(ctx);
    assert.ok(parts.length >= 13, "body, head, edge and shadow");
    for (const command of parts) for (const point of rectanglePoints(command)) {
      reach = { l: Math.min(reach.l, point.x), r: Math.max(reach.r, point.x), t: Math.min(reach.t, point.y), b: Math.max(reach.b, point.y) };
      assert.ok(point.x >= CAT_BOX.l && point.x <= CAT_BOX.r, `${art.id}: x ${point.x} inside CAT_BOX`);
      assert.ok(point.y >= CAT_BOX.t && point.y <= CAT_BOX.b, `${art.id}: y ${point.y} inside CAT_BOX`);
    }
  }
  t.diagnostic(`cat part reach ${JSON.stringify(reach)} inside ${JSON.stringify(CAT_BOX)}`);
  // The rim composition rasterises CAT_BOX in world units at the live scale: the largest cue zoom
  // on the 2x back canvas changes the copy's pixel density, never the box it covers.
  const peak = Math.max(...Object.values(ZOOM).flatMap((z) => Object.values(z)));
  assert.ok(peak > 1);
  for (const scale of [2, 2 * peak]) {
    const target = canvas().getContext("2d");
    target.scale(scale, scale);
    const art = CAT_ART.all()[0];
    drawWithLitRim(target, 0, 0, CAT_BOX, (c) => art.draw(c, pose(art.id)));
    const [copy] = images(target);
    assert.deepEqual(copy.args.slice(1), [CAT_BOX.l, CAT_BOX.t, CAT_BOX.r - CAT_BOX.l, CAT_BOX.b - CAT_BOX.t], "same world-unit box at every zoom");
    assert.ok(copy.args[0].width / copy.args[3] >= scale - 1e-9, `copy density keeps up with scale ${scale}`);
    const posed = copy.args[0].getContext("2d").calls.filter((c) => c.op === "drawImage");
    for (const command of posed) for (const point of rectanglePoints(command)) {
      assert.ok(point.x >= 0 && point.x <= copy.args[0].width && point.y >= 0 && point.y <= copy.args[0].height, "every part lands inside the copy");
    }
  }
});

test("generic tailoring has no cat literals, wall-clock/RNG dependencies or time-keyed sprites", () => {
  for (const file of ["cat-detail.ts", "craft-cat.ts", "paper-face.ts"]) {
    const text = readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8");
    for (const art of CAT_ART.all()) assert.ok(!text.includes(`"${art.id}"`), `${file} does not dispatch by cat id`);
    assert.doesNotMatch(text, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b/);
  }
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

// ---- Costumes: outfits and head makeup over the untouched approved heads ----
import { CATS, COSTUME_DEFS } from "../dist/defs/index.js";
import { COSTUME_ART } from "../dist/render/art-index.js";
import { HEAD_ACCESSORIES } from "../dist/render/costume-accessories.js";
import { SPRITE_CACHE_LIMIT } from "../dist/engine/sprite.js";

const callSig = (calls) => calls.map((c) => ({ ...c, args: c.args.map(normalized), fillStyle: normalized(c.fillStyle) }));
const wornPoses = (id, costume) => [
  pose(id, { costume }), pose(id, { costume, time: 1.7 }),
  ...[0.05, 0.13, 0.26, 0.39, 0.52].map((time) => pose(id, { costume, time, moving: true })),
  pose(id, { costume, dashing: true }), pose(id, { costume, hurt: true }), pose(id, { costume, hurt: true, moving: true, time: 0.13 }),
  pose(id, { costume, facing: -1, moving: true, time: 0.39 }), pose(id, { costume, wear: catWear(0.1, 9, 10), moving: true, time: 0.13 }),
];

test("every costume has registered art with makeup, outfit, skill painters, preview and ticket", () => {
  assert.deepEqual(COSTUME_ART.ids(), COSTUME_DEFS.all().map((d) => d.art), "costume art follows wardrobe order");
  assert.equal(COSTUME_ART.ids().length, 14);
  for (const art of COSTUME_ART.all()) {
    assert.ok(art.makeup.patches?.length || art.makeup.expression || art.makeup.accessories?.length, `${art.id}: head makeup`);
    for (const a of art.makeup.accessories ?? []) assert.ok(HEAD_ACCESSORIES[a], `${art.id}: accessory ${a} has a painter`);
    assert.ok(art.outfit.parts.length >= 1 || art.outfit.coat || art.outfit.tee, `${art.id}: outfit`);
    for (const kind of ["costume-burst", "costume-push", "costume-pull"]) assert.equal(typeof art.effects?.[kind], "function");
    assert.equal(typeof art.ground, "function");
    assert.equal(typeof art.sprites, "function");
    assert.equal(typeof art.preview, "function");
    assert.equal(typeof art.ticket, "function");
    assert.match(art.colors.tag, /^#[0-9a-f]{6}$/);
    assert.match(art.colors.ink, /^#[0-9a-f]{6}$/);
  }
  // Meow Wall's accessory list is redrawn as paper, besides the costume pieces.
  for (const a of ["headphones", "cap", "scarf", "round-glasses", "bowtie", "crown", "flower", "headband", "leaf", "party-hat", "wizard-hat", "mustache", "eyepatch", "ribbon"])
    assert.equal(typeof HEAD_ACCESSORIES[a], "function", a);
});

test("no costume: the same draw calls and the same paper-face keys; a costume only adds a makeup layer on top", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const plain = draw(art), plainSig = signature(plain), faceCalls = JSON.stringify(callSig(paint(images(plain).at(-1))));
    clearSpriteCache();
    const again = draw(art, pose(art.id, { costume: undefined }));
    assert.deepEqual(signature(again).map((c) => c.op), plainSig.map((c) => c.op), "an absent costume draws exactly like before");
    for (const costume of COSTUME_DEFS.ids()) {
      const worn = draw(art, pose(art.id, { costume })), [edge, head, makeup] = images(worn).slice(-3);
      assert.deepEqual(head.args.slice(1), [-35, -71, 70, 55], "head box unchanged");
      assert.deepEqual(edge.args.slice(1), [-37, -73, 74, 59], "head edge unchanged");
      assert.equal(head.args[0], images(again).at(-1).args[0], `${costume}: the approved face sprite is reused unchanged`);
      assert.equal(edge.args[0], images(again).at(-2).args[0], `${costume}: the approved edge sprite is reused unchanged`);
      assert.deepEqual(makeup.args.slice(1), [-39, -79, 78, 68], "makeup layer box over the head");
      assert.equal(worn.calls.at(-1), makeup, "makeup is drawn last, on top of the head");
    }
    // The face sprite painted after every costume still paints the same commands as before.
    clearSpriteCache();
    for (const costume of COSTUME_DEFS.ids()) draw(art, pose(art.id, { costume }));
    const after = draw(art);
    assert.equal(JSON.stringify(callSig(paint(images(after).at(-1)))), faceCalls);
  }
});

test("makeup is one cached sprite per (cat, costume), keeps identity markings and never touches official data", (t) => {
  environment(t);
  const seen = new Set();
  for (const art of CAT_ART.all()) {
    const before = structuredClone(officialRects(art.id)), palette = officialVariant(art.id).palette;
    for (const costume of COSTUME_DEFS.ids()) {
      const makeup = images(draw(art, pose(art.id, { costume }))).at(-1).args[0];
      assert.ok(!seen.has(makeup), `${art.id}/${costume}: a separate makeup sprite`);
      seen.add(makeup);
      assert.equal(images(draw(art, pose(art.id, { costume, time: 9, moving: true }))).at(-1).args[0], makeup, "makeup does not depend on time or pose");
      const calls = paint({ args: [makeup] });
      assert.ok(!calls.some((c) => c.op === "fill" && c.shadowBlur > 0), "makeup cuts follow the flat ruleset");
      // Clearing the eye area repaints the cat's own fur and identity cuts rather than erasing them.
      const cleared = calls.filter((c) => c.op === "fill" && c.fillStyle === palette.head);
      if (cleared.length) for (const patch of art.face.patches)
        assert.ok(calls.some((c) => c.op === "fill" && c.fillStyle === (palette[patch.color] ?? palette.head)), `${art.id}/${costume}: ${patch.color} kept`);
    }
    assert.deepEqual(officialRects(art.id), before, "official rectangles untouched");
  }
  assert.equal(seen.size, COSTUME_DEFS.ids().length * CATS.ids().length);
});

test("every costume part of both cats stays inside CAT_BOX in representative poses", (t) => {
  environment(t);
  let reach = { l: 0, r: 0, t: 0, b: 0 };
  for (const art of CAT_ART.all()) for (const costume of COSTUME_DEFS.ids()) for (const p of wornPoses(art.id, costume)) {
    const ctx = canvas().getContext("2d");
    art.draw(ctx, p);
    assert.equal(ctx.depth, 0);
    for (const command of images(ctx)) for (const point of rectanglePoints(command)) {
      reach = { l: Math.min(reach.l, point.x), r: Math.max(reach.r, point.x), t: Math.min(reach.t, point.y), b: Math.max(reach.b, point.y) };
      assert.ok(point.x >= CAT_BOX.l && point.x <= CAT_BOX.r, `${art.id}/${costume}: x ${point.x} inside CAT_BOX`);
      assert.ok(point.y >= CAT_BOX.t && point.y <= CAT_BOX.b, `${art.id}/${costume}: y ${point.y} inside CAT_BOX`);
    }
  }
  t.diagnostic(`costume part reach ${JSON.stringify(reach)} inside ${JSON.stringify(CAT_BOX)}`);
});

test("costume parts are finite cached cuts: bounded per night and across the whole wardrobe", (t) => {
  environment(t);
  let most = 0;
  for (const costume of COSTUME_DEFS.ids()) {
    // One night wears one costume on one cat; count both cats to be safe.
    clearSpriteCache();
    for (const art of CAT_ART.all()) for (const p of wornPoses(art.id, costume)) draw(art, p);
    const size = spriteCacheSize();
    most = Math.max(most, size);
    for (const art of CAT_ART.all()) for (const time of [0.125, 10, 10000]) draw(art, pose(art.id, { costume, time, moving: true, x: 77, y: -9, scale: 0.3 }));
    assert.equal(spriteCacheSize(), size, `${costume}: no time, position or scale keys`);
    assert.ok(size <= 44, `${costume}: ${size} sprites for both cats`);
  }
  t.diagnostic(`most sprites for one costume on both cats: ${most}`);
  clearSpriteCache();
  for (const art of CAT_ART.all()) for (const costume of COSTUME_DEFS.ids()) draw(art, pose(art.id, { costume }));
  assert.ok(spriteCacheSize() <= SPRITE_CACHE_LIMIT, "the shared cache stays within its limit");
  t.diagnostic(`whole wardrobe on both cats (one pose): ${spriteCacheSize()} sprites`);
});

test("costume rendering code names no cat or costume ids and reads no clock or randomness", () => {
  for (const file of ["costume-outfit.ts", "costume-accessories.ts", "costume-fx.ts", "craft-cat.ts", "paper-face.ts"]) {
    const text = readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8");
    for (const id of [...CATS.ids(), ...COSTUME_DEFS.ids()]) assert.ok(!text.includes(`"${id}"`), `${file} names "${id}"`);
    assert.doesNotMatch(text, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b|url\(|data:image/);
  }
});
