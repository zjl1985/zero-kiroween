import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { officialRects } from "../dist/cats/official.js";
import { clearSpriteCache, spriteCacheSize } from "../dist/engine/sprite.js";
import { CAT_ART } from "../dist/render/art-index.js";
import { CAT_DETAIL_BOUNDS, catDetailPose } from "../dist/render/cat-detail.js";
import { drawCraftCat } from "../dist/render/craft-cat.js";

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

test("registered tailoring changes silhouettes, layered hems, collars and accessories", (t) => {
  environment(t);
  const shapes = [];
  for (const art of CAT_ART.all()) {
    const ctx = draw(art), look = art.body, body = torso(ctx, look);
    assert.ok(body, `${art.id}: a tailored torso`);
    shapes.push(fills(paint(body), look.body)[0].args[0].ops);
    const capes = images(ctx).filter((im) => fills(paint(im), look.lining).some((c) => /M 1 -2/.test(pathText(c))));
    assert.equal(capes.length, 2, "separate cape panels");
    for (const cape of capes) {
      const calls = paint(cape);
      assert.ok(fills(calls, look.cape).length > 0, "outer paper covers the lining");
      assert.ok(fills(calls, look.capeFold).length > 0, "pleat has a shaded face, not just a line");
      assert.ok(calls.some((c) => c.op === "stroke" && c.dash.length > 0 && c.strokeStyle === look.trim), "stitched hem");
      assert.ok(calls.some((c) => c.op === "fill" && c.shadowBlur > 0), "baked contact shadows");
    }
    assert.ok(fills(paint(body), look.lining).length >= 2, "folded collar leaves");
    assert.ok(images(ctx).length === 16, "articulated legs/boots and sleeve/forearm layers, plus the face");
    assert.ok(paint(images(ctx)[3]).some((c) => c.op === "stroke" && c.strokeStyle === look.pawEdge), "toes/sole stay separate from the leg");
    if (look.accessory === "watch-chain")
      assert.ok(paint(body).some((c) => c.op === "stroke" && /M -6 -17 Q 0 -11 6 -17/.test(pathText(c))), "draped pocket-watch chain");
    else assert.ok(paint(body).some((c) => c.op === "fill" && /M -14 -16/.test(pathText(c))), "layered moon satchel");
  }
  assert.equal(shapes.length, 2);
  assert.notDeepEqual(shapes[0], shapes[1], "not merely recolours of one body");
});

test("official face print, narrow silhouette rim, head position and portraits remain intact", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const ctx = draw(art), [edge, head] = images(ctx).slice(-2);
    assert.deepEqual(head.args.slice(1), [-35, -71, 70, 55]);
    assert.deepEqual(edge.args.slice(1), [-37, -73, 74, 59]);
    const printed = paint(head).filter((c) => c.op === "fillRect" && c.globalCompositeOperation === "source-over");
    const expected = officialRects(art.id).map((r) => {
      const n = parseInt(r.fill.slice(1), 16), color = n >> 16 < 44 && ((n >> 8) & 255) < 44 && (n & 255) < 44 ? "#30252f" : r.fill;
      const x = Math.round((4 + r.x * 0.16) * 2) / 2, y = Math.round((4 + r.y * 0.16) * 2) / 2;
      return { color, rect: [x, y, Math.max(0.5, Math.round((4 + (r.x + r.w) * 0.16) * 2) / 2 - x), Math.max(0.5, Math.round((4 + (r.y + r.h) * 0.16) * 2) / 2 - y)] };
    });
    assert.deepEqual(printed.map((c) => ({ color: c.fillStyle, rect: c.args })), expected);
    const rim = paint(edge).filter((c) => c.op === "drawImage")[1];
    const stamps = paint(rim).filter((c) => c.op === "drawImage");
    assert.equal(stamps.length, 12);
    for (const stamp of stamps) assert.ok(Math.abs(Math.hypot(stamp.args[1] - 4, stamp.args[2] - 4) - 1.25) < 1e-10, "rim stays .625 drawing units wide");
    assert.equal(ctx.calls.at(-1), head, "nothing paints over the official face");
    const portrait = canvas().getContext("2d");
    art.portrait(portrait, pose(art.id), 0.1);
    assert.deepEqual(portrait.calls.filter((c) => c.op === "fillRect").map((c) => c.fillStyle), officialRects(art.id).map((r) => r.fill));
  }
});

test("accessories and lantern shapes are selected by appearance metadata, not the face id", (t) => {
  environment(t);
  const [a, b] = CAT_ART.all();
  const first = draw(a, pose(a.id), b.body), second = draw(b);
  assert.deepEqual(images(first).slice(0, -2).map((c) => c.args[0]), images(second).slice(0, -2).map((c) => c.args[0]), "same registered look shares every body part across identities");
  const alternate = { ...a.body, accessory: b.body.accessory, lantern: b.body.lantern };
  const standard = draw(a), changed = draw(a, pose(a.id), alternate);
  assert.notDeepEqual(paint(torso(standard, a.body)).map(pathText), paint(torso(changed, alternate)).map(pathText));
  assert.notDeepEqual(fills(paint(images(standard)[13]), "#e8b868").map(pathText), fills(paint(images(changed)[13]), "#e8b868").map(pathText), "lantern cut changes without changing cat id");
  const recoloured = { ...a.body, lining: "#b5d8d0" }, recolour = draw(a, pose(a.id), recoloured);
  assert.notEqual(torso(standard, a.body).args[0], torso(recolour, recoloured).args[0], "all appearance inputs participate in caching");
  assert.ok(fills(paint(torso(recolour, recoloured)), recoloured.lining).length > 0);
});

test("static poses are deterministic, articulated, mirrored/scaled and do not mutate caller data", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) {
    const p = pose(art.id, { moving: true, time: 0.31 }), look = Object.freeze({ ...art.body });
    const a = draw(art, p, look), b = draw(art, p, look);
    assert.deepEqual(signature(a), signature(b));
    assert.deepEqual(look, art.body);
    const idle = draw(art), later = draw(art, pose(art.id, { time: 0.6 }));
    for (const index of [1, 6, 7, 13]) assert.notDeepEqual(images(idle)[index].transform, images(later)[index].transform, "tail, cape and lamp have time-derived hinges");
    const dash = draw(art, pose(art.id, { dashing: true }));
    assert.notEqual(images(idle)[6].args[0], images(dash)[6].args[0], "dash uses a swept cape cut");
    assert.equal(images(idle)[10].args[0], images(dash)[10].args[0], "static torso is shared across poses");
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
  assert.equal(spriteCacheSize(), 27, "eleven body cuts and two head sprites per cat, plus one ground shadow");
  // Independent fixed inputs, not elapsed frames or a live animation test.
  for (const art of CAT_ART.all()) for (const time of [0.125, 0.7, 10, 10000]) for (const moving of [false, true]) {
    const ctx = draw(art, pose(art.id, { time, moving, dashing: time === 10, facing: -1, x: 123, y: -456, scale: 0.27, hurt: true }));
    assert.equal(spriteCacheSize(), 27);
    assert.equal(images(ctx).length, 16);
    assert.equal(ctx.calls.filter((c) => c.op === "fillRect").length, 1, "only a low-opacity lamp halo is drawn live");
    assert.ok(!ctx.calls.some((c) => c.op === "filter" || c.op === "fill" || c.op === "stroke"), "texturing, stitching and shadows are cached, not rebuilt per frame");
  }
});

function rectanglePoints(call) {
  const [, x, y, w, h] = call.op === "drawImage" ? call.args : [null, ...call.args];
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([x, y]) => new RecordingMatrix(call.transform).transformPoint({ x, y }));
}
test("cached body subparts and lamp halo fit the fixed local envelope in representative static poses", (t) => {
  environment(t);
  for (const art of CAT_ART.all()) for (const p of [pose(art.id), pose(art.id, { time: 0.13, moving: true }), pose(art.id, { time: 0.39, moving: true }), pose(art.id, { dashing: true })]) {
    const ctx = draw(art, p), body = images(ctx).slice(0, -2), halo = ctx.calls.find((c) => c.op === "fillRect");
    for (const command of [...body, halo]) for (const point of rectanglePoints(command)) {
      assert.ok(point.x >= CAT_DETAIL_BOUNDS.l && point.x <= CAT_DETAIL_BOUNDS.r, `x ${point.x} fits body/halo envelope`);
      assert.ok(point.y >= CAT_DETAIL_BOUNDS.t && point.y <= CAT_DETAIL_BOUNDS.b, `y ${point.y} fits body/halo envelope`);
    }
    if (!p.moving) {
      const bottom = Math.max(...rectanglePoints(halo).map((point) => point.y));
      assert.ok(bottom * 2.1 <= 10, "idle/skill lamp halo fits the gallery's existing ten-unit bottom inset");
    }
    const head = images(ctx).at(-1);
    assert.deepEqual(head.args.slice(1), [-35, -71, 70, 55], "same head box at every pose");
    assert.equal(head.transform[5], catDetailPose(p).bob, "only the existing bob shifts the head");
  }
});

test("generic tailoring has no cat literals, wall-clock/RNG dependencies or time-keyed sprites", () => {
  for (const file of ["cat-detail.ts", "craft-cat.ts"]) {
    const text = readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8");
    for (const art of CAT_ART.all()) assert.ok(!text.includes(`"${art.id}"`), `${file} does not dispatch by cat id`);
    assert.doesNotMatch(text, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Image\b/);
  }
});
