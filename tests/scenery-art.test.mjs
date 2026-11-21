import { OPENING_BUILDINGS } from "../dist/render/craft-scene.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { OLD_TOWN_ART } from "../dist/defs/biomes/old-town.art.js";
import { PUMPKIN_FARM_ART } from "../dist/defs/biomes/pumpkin-farm.art.js";
import { GRAVEYARD_WOODS_ART } from "../dist/defs/biomes/graveyard-woods.art.js";
import { LANTERN_CANAL_ART } from "../dist/defs/biomes/lantern-canal.art.js";
import { MOON_MEADOW_ART } from "../dist/defs/biomes/moon-meadow.art.js";
import { clearSpriteCache } from "../dist/engine/sprite.js";
import { WORLD, chunkContent, chunkOf } from "../dist/game/world-gen.js";
import { drawPixelDecor } from "../dist/render/pixel-scene-art.js";
import { PIXEL_DECOR_BOUNDS } from "../dist/render/pixel-decor-bounds.js";
import { worldSprites } from "../dist/render/craft-world.js";
import { pixelBiomeArt, TERRAIN_PALETTE } from "../dist/render/pixel-terrain.js";
import { spriteCacheSize, SPRITE_CACHE_LIMIT } from "../dist/engine/sprite.js";

const districts = [OLD_TOWN_ART, PUMPKIN_FARM_ART, GRAVEYARD_WOODS_ART, LANTERN_CANAL_ART, MOON_MEADOW_ART].map(pixelBiomeArt);
const identity = [1, 0, 0, 1, 0, 0];
const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
class Matrix {
  constructor(m = identity) { this.m = [...m]; }
  scale(s) { return new Matrix(multiply(this.m, [s, 0, 0, s, 0, 0])); }
  inverse() {
    const [a, b, c, d, e, f] = this.m, det = a * d - b * c;
    return new Matrix([d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]);
  }
  transformPoint({ x, y }) {
    const [a, b, c, d, e, f] = this.m;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  }
}

// Conservative control-point bounds, not rasterization. All SVG commands used by
// these painters are absolute M/L/Q/C/Z; fail explicitly if new syntax is added.
class RecordingPath {
  constructor(source) {
    this.ops = source instanceof RecordingPath ? [...source.ops] : [];
    if (typeof source === "string") {
      const tokens = source.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) ?? [];
      const commands = { M: ["moveTo", 2], L: ["lineTo", 2], Q: ["quadraticCurveTo", 4], C: ["bezierCurveTo", 6], Z: ["closePath", 0] };
      for (let i = 0; i < tokens.length;) {
        const command = tokens[i++], spec = commands[command];
        assert.ok(spec, `unsupported path command: ${command}`);
        this[spec[0]](...tokens.slice(i, i + spec[1]).map(Number));
        i += spec[1];
      }
    }
  }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
}
for (const op of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "closePath"])
  RecordingPath.prototype[op] = function (...args) { this.ops.push([op, ...args]); };
const intersect = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
function bounds(path, matrix) {
  const points = path.ops.flatMap(([, ...args]) => Array.from({ length: args.length / 2 }, (_, i) => new Matrix(matrix).transformPoint({ x: args[i * 2], y: args[i * 2 + 1] })));
  return [Math.min(...points.map((p) => p.x)), Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.x)), Math.max(...points.map((p) => p.y))];
}
// A tiny nearest-neighbour alpha sampler. It resolves the actual occupied
// pixels through cropped atlas drawImage calls, rather than treating transparent
// cache padding as scenery. Rectangles and rectangular clips are exact; vector
// control bounds remain conservative (the active pixel painters use rectangles).
const pixelKey = (x, y) => (y + 16384) * 32768 + x + 16384;
function recordingCanvas() {
  const canvas = { width: 480, height: 540 }, calls = [], stack = [], coverage = new Set();
  let state = { matrix: identity, clip: [-Infinity, -Infinity, Infinity, Infinity], globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, filter: "none", imageSmoothingEnabled: true };
  let current = new RecordingPath();
  const sample = (extent, contains, erase = false) => {
    const clipped = intersect(extent, state.clip), occupied = [Infinity, Infinity, -Infinity, -Infinity];
    if (!clipped.every(Number.isFinite)) return null;
    for (let y = Math.floor(clipped[1]); y < Math.ceil(clipped[3]); y++)
      for (let x = Math.floor(clipped[0]); x < Math.ceil(clipped[2]); x++) {
        if (x + .5 < clipped[0] || x + .5 >= clipped[2] || y + .5 < clipped[1] || y + .5 >= clipped[3] || !contains(x + .5, y + .5)) continue;
        const key = pixelKey(x, y);
        if (erase) coverage.delete(key); else coverage.add(key);
        occupied[0] = Math.min(occupied[0], x); occupied[1] = Math.min(occupied[1], y);
        occupied[2] = Math.max(occupied[2], x + 1); occupied[3] = Math.max(occupied[3], y + 1);
      }
    return occupied.every(Number.isFinite) ? occupied : null;
  };
  const record = (op, p, localRect) => {
    const raw = bounds(p, state.matrix), half = op === "stroke" ? state.lineWidth * Math.max(Math.hypot(...state.matrix.slice(0, 2)), Math.hypot(...state.matrix.slice(2, 4))) / 2 : 0,
      extent = intersect([raw[0] - half, raw[1] - half, raw[2] + half, raw[3] + half], state.clip);
    if (extent[0] >= extent[2] || extent[1] >= extent[3]) return;
    if (state.globalAlpha > 0) {
      const inv = new Matrix(state.matrix).inverse();
      sample(extent, (x, y) => {
        if (!localRect) return true;
        const p = inv.transformPoint({ x, y });
        return p.x >= localRect[0] && p.x < localRect[2] && p.y >= localRect[1] && p.y < localRect[3];
      });
    }
    calls.push({ op, path: p.ops, matrix: [...state.matrix], bounds: extent, color: op === "stroke" ? state.strokeStyle : state.fillStyle,
      alpha: state.globalAlpha, composite: state.globalCompositeOperation, smoothing: state.imageSmoothingEnabled });
  };
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced save/restore"); },
    translate(x, y) { state.matrix = multiply(state.matrix, [1, 0, 0, 1, x, y]); },
    scale(x, y) { state.matrix = multiply(state.matrix, [x, 0, 0, y, 0, 0]); },
    rotate(a) { state.matrix = multiply(state.matrix, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    getTransform() { return new Matrix(state.matrix); },
    clip(p = current) { state.clip = intersect(state.clip, bounds(p, state.matrix)); },
    fill(p = current) { record("fill", p); },
    stroke(p = current) { record("stroke", p); },
    fillRect(x, y, w, h) { const p = new RecordingPath(); p.rect(x, y, w, h); record("fillRect", p, [x, y, x + w, y + h]); },
    clearRect(x, y, w, h) {
      const p = new RecordingPath(); p.rect(x, y, w, h);
      sample(bounds(p, state.matrix), () => true, true);
    },
    beginPath() { current = new RecordingPath(); },
    rect(...args) { current.rect(...args); },
    moveTo(...args) { current.moveTo(...args); },
    lineTo(...args) { current.lineTo(...args); },
    setLineDash() {},
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData() {},
    createPattern() { return { kind: "paper-fibre", setTransform() {} }; },
    drawImage(image, ...args) {
      const [sx, sy, sw, sh, dx, dy, dw, dh] = args.length === 8 ? args
        : args.length === 4 ? [0, 0, image.width, image.height, ...args]
        : [0, 0, image.width, image.height, args[0], args[1], image.width, image.height];
      const imageCtx = image.getContext("2d"), p = new RecordingPath(); p.rect(dx, dy, dw, dh);
      const inv = new Matrix(state.matrix).inverse();
      const occupied = sample(bounds(p, state.matrix), (x, y) => {
        const q = inv.transformPoint({ x, y }), u = (q.x - dx) / dw, v = (q.y - dy) / dh;
        return u >= 0 && u < 1 && v >= 0 && v < 1 && imageCtx.coverage.has(pixelKey(Math.floor(sx + u * sw), Math.floor(sy + v * sh)));
      });
      calls.push({ op: "drawImage", image, args, bounds: occupied, smoothing: state.imageSmoothingEnabled });
    },
  };
  for (const name of ["createLinearGradient", "createRadialGradient"])
    methods[name] = () => assert.fail(`native pixel scenery used ${name}`);
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? canvas : key === "coverage" ? coverage : key === "calls" ? calls : key === "stackDepth" ? stack.length : key === "state" ? state : key in methods ? methods[key] : state[key],
    set: (_, key, value) => { state[key] = value; return true; },
  });
  canvas.getContext = () => ctx;
  return canvas;
}
function environment(t) {
  clearSpriteCache();
  const created = [];
  for (const [name, value] of Object.entries({
    Path2D: RecordingPath, DOMMatrix: Matrix,
    document: { createElement(name) { assert.equal(name, "canvas"); const c = recordingCanvas(); created.push(c); return c; } },
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, name, old) : delete globalThis[name]);
  }
  t.mock.method(Math, "random", () => assert.fail("scenery consumed random state"));
  t.after(clearSpriteCache);
  return created;
}
function paint(painter, ...args) {
  const ctx = recordingCanvas().getContext("2d");
  painter(ctx, ...args);
  assert.equal(ctx.stackDepth, 0);
  assert.deepEqual(ctx.state.matrix, identity, "painter restores placement transform");
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, "source-over");
  assert.equal(ctx.filter, "none");
  return ctx.calls;
}
function fits(calls, [l, t, r, b], label) {
  for (const call of calls) {
    // An atlas slice can legitimately be fully transparent (e.g. above a branch).
    if (call.op === "drawImage" && call.bounds === null) continue;
    assert.ok(call.bounds.every(Number.isFinite), `${label}: finite geometry`);
    const [x0, y0, x1, y1] = call.bounds;
    assert.ok(x0 >= l - 1e-6 && x1 <= r + 1e-6 && y0 >= t - 1e-6 && y1 <= b + 1e-6,
      `${label}: ${call.op} ${JSON.stringify(call.color)} [${call.bounds}] outside [${l},${t},${r},${b}]`);
  }
}

test("scenery coverage sampler follows cropped source alpha through nested transforms", () => {
  const atlas = recordingCanvas(), a = atlas.getContext("2d");
  a.fillRect(20, 20, 1, 1);
  a.fillRect(100, 100, 5, 5); // Unrelated atlas section must never leak into this crop.
  const stage = recordingCanvas(), c = stage.getContext("2d");
  c.translate(10, 20); c.scale(2, 3);
  c.drawImage(atlas, 16, 16, 8, 8, 0, 0, 16, 16);
  assert.deepEqual(c.calls.at(-1).bounds, [26, 44, 30, 50]);
  const final = recordingCanvas().getContext("2d");
  final.drawImage(stage, 20, 40, 20, 20, 100, 200, 20, 20);
  assert.deepEqual(final.calls.at(-1).bounds, [106, 204, 110, 210]);
});

test("district paintings are deterministic, distinct and restore the caller's drawing state", (t) => {
  environment(t);
  const signatures = new Set();
  for (const art of districts) {
    const variants = new Set();
    for (const seed of [0, 1, 2, 7, 23, 97]) {
      const a = paint(art.patch, 0, 0, 70, seed), b = paint(art.patch, 0, 0, 70, seed);
      assert.deepEqual(a, b, `${art.id}: stable seed ${seed}`);
      assert.ok(a.length > 20 && a.length < 250, `${art.id}: bounded grouped detail cost (${a.length})`);
      assert.ok(a.every(c => c.op === "fillRect"), "terrain is authored pixel rectangles");
      for (const c of a) for (const op of c.path) if (op.length > 1)
        assert.ok(op.slice(1).every(n => Number.isInteger(n)), "terrain stays on the native one-unit lattice");
      variants.add(JSON.stringify(a.map(({ path, matrix }) => [path, matrix])));
      signatures.add(JSON.stringify(a));
    }
    assert.ok(variants.size >= 3, `${art.id}: geometry varies, not only the palette`);
  }
  assert.equal(signatures.size, districts.length * 6);
});

test("district details stay inside existing patch reach with quiet space above and below", (t) => {
  environment(t);
  for (const art of districts) for (const r of [46, 70, 84]) for (const seed of [0, 1, 2, 7, 23, 97]) {
    const x = -473, y = 1081;
    const calls = paint(art.patch, x, y, r, seed);
    fits(calls, [x - r, y - r * 0.6, x + r, y + r * 0.6], `${art.id}/${r}/${seed}`);
  }
});

test("canal biome motifs are dry towpaths; only shared world geometry paints water", (t) => {
  environment(t);
  for (const seed of [0, 1, 2, 7, 23, 97]) {
    const calls = paint(districts.find(a => a.id === "lantern-canal").patch, 0, 0, 70, seed);
    assert.ok(!calls.some((c) => ["#5d7775", "#628b87", "#2c4560"].includes(c.color)), "no fake water on dry land");
    assert.ok(calls.some((c) => c.color === TERRAIN_PALETTE.wave[2]), "pixel reed-bank highlights remain");
    assert.ok(!calls.some((c) => c.composite === "screen"), "no decorative glow suggesting an interaction or hazard");
    assert.ok(calls.every(c => c.alpha === 1 && c.op === "fillRect"), "dry reed motifs are opaque native pixels");
  }
});

test("every scenery variant fits shared cache and culling bounds at world scales", (t) => {
  environment(t);
  const failures = [];
  // Occupied pixels propagate through native slice-atlas crops and projections.
  // The allocated transparent sprite margins are deliberately not counted as ink.
  for (const [kind, b] of Object.entries(PIXEL_DECOR_BOUNDS))
    for (let seed = 0; seed < 6; seed++) for (const s of [0.65, 1, 1.4]) {
    const bounds = [b.l,b.t,b.r,b.b];
    const painter = (ctx,x,y,scale,v) => drawPixelDecor(ctx,kind,x,y,scale,v);
    const x = -180, y = 367;
    const calls = paint(painter, x, y, s, seed);
    assert.ok(calls.some(c => c.op === "drawImage" && c.bounds !== null), `${kind}: projected sprite contains real occupied pixels`);
    try { fits(calls, [x + bounds[0] * s, y + bounds[1] * s, x + bounds[2] * s, y + bounds[3] * s], `${kind}/${seed}/${s}`); }
    catch (error) { failures.push(error.message); }
    assert.deepEqual(calls, paint(painter, x, y, s, seed), `${kind}: pure cached painter`);
  }
  assert.deepEqual(failures, [], "all variants remain inside the declared bounds");
});

test("world scenery reuses bounded native-resolution caches without repainting details", (t) => {
  const created = environment(t), seed = 7, wanted = new Map();
  const a = chunkOf(WORLD.minX, WORLD.minY), b = chunkOf(WORLD.maxX - 1, WORLD.maxY - 1);
  for (let cy = a.cy; cy <= b.cy && wanted.size < 2; cy++) for (let cx = a.cx; cx <= b.cx && wanted.size < 2; cx++)
    for (const d of chunkContent(seed, cx, cy).decor)
      if ((d.kind === "tree" || d.kind === "cottage") && !wanted.has(d.kind)) wanted.set(d.kind, d);
  assert.equal(wanted.size, 2);
  for (const [kind, decor] of wanted) {
    const before = JSON.stringify(decor), ctx = recordingCanvas().getContext("2d"), cam = { x: decor.x, y: decor.y };
    const draw = () => {
      const sprite = worldSprites(ctx, seed, cam, 0).sprites.find((s) => s.y === decor.y);
      assert.ok(sprite, `${kind} is visible`);
      sprite.draw();
      return ctx.calls.at(-1);
    };
    const first = draw();
    assert.equal(first.op, "drawImage");
    if (kind === "cottage") {
      for (const [distance, reduced] of [[0,false],[900,false],[900,true],[0,true]]) {
        const start = ctx.calls.length;
        const sprite = worldSprites(ctx, seed, cam, distance + 1, {
          cat: {x:decor.x + distance,y:decor.y}, reduced,
        }).sprites.find(s => s.y === decor.y);
        assert.ok(sprite);
        sprite.draw();
        const calls = ctx.calls.slice(start);
        assert.equal(calls.length, 1, "cottage never draws a leftover paper hinge");
        assert.equal(calls[0].op, "drawImage");
        assert.deepEqual(calls[0].bounds, first.bounds, "approach and reduced motion never lift or squash the house");
        assert.equal(calls[0].image, first.image, "grounded cottage keeps its cached shape");
      }
    }

    const b = PIXEL_DECOR_BOUNDS[kind], size = [b.r-b.l,b.b-b.t], s = Math.round(decor.s * 20) / 20;
    assert.deepEqual([first.image.width, first.image.height], size.map((n) => Math.ceil(n * s + 16)), "same world BOUNDS/PAD, baked at one pixel per world unit");
    const paints = first.image.getContext("2d").calls.length, allocated = created.length;
    assert.equal(draw().image, first.image, "same sprite identity");
    assert.equal(created.length, allocated, "no new offscreen canvas on a cache hit");
    assert.equal(first.image.getContext("2d").calls.length, paints, "details are not repainted on a cache hit");
    assert.ok(ctx.calls.every((c) => c.op === "drawImage"), "live pass only stamps the cached sprite");
    const sections = created.flatMap(c => c.getContext("2d").calls.filter(call => call.op === "drawImage" && call.args.length === 8));
    assert.ok(sections.length > 20, "many native XY sections are cropped into a real stacked volume");
    assert.ok(sections.every(call => call.smoothing === false), "section projections use nearest-neighbour sampling");
    assert.ok(spriteCacheSize() <= SPRITE_CACHE_LIMIT, "stack and decor sprites share the bounded LRU");
    assert.equal(JSON.stringify(decor), before, "rendering does not mutate decor");
  }
});


test("opening architecture stays behind the playable boundary without changing collision", t => {
  environment(t);
  for(const building of OPENING_BUILDINGS){
    const calls=paint((ctx,x,y,s,seed)=>drawPixelDecor(ctx,building.kind,x,y,s,seed),building.x,building.y,building.s,building.seed);
    const ink=calls.filter(c=>c.op==="drawImage"&&c.bounds);
    assert.ok(ink.length);
    for(const c of ink)assert.ok(c.bounds[3]<=WORLD.playTop,`${building.kind} footing intrudes into the walking area: ${c.bounds[3]}`);
  }
});
