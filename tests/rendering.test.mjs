import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CATS, COSTUME_DEFS, LANDMARK_DEFS } from "../dist/defs/index.js";
import { cachedSprite, clearSpriteCache } from "../dist/engine/sprite.js";
import { MOON_LANTERN } from "../dist/game/interactions.js";
import { FLAT_DECOR, landmarkParts, landmarks } from "../dist/game/world-gen.js";
import { CAT_ART, LANDMARK_ART, decorPiece } from "../dist/render/art-index.js";
import { drawInteractable } from "../dist/render/craft-juice.js";
import { drawProp } from "../dist/render/craft-props.js";
import { landmarkPreview, worldSprites } from "../dist/render/craft-world.js";
import { paintGallery } from "../dist/render/gallery.js";
import { tintedSprite } from "../dist/render/sprite-tint.js";
import { POPUP } from "../dist/render/timeline.js";
import { drawWaterShape } from "../dist/render/water-art.js";
import { GEN_SPRITES, genCanvas } from "../dist/render/iso/gen-sprites.js";
import { pieceSprite } from "../dist/render/iso/scenery.js";

// Command recording only: these tests check dispatch/compositing, not browser pixels.
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
function canvas() {
  const c = { width: 400, height: 300, style: {} }, calls = [], stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000000", strokeStyle: "#000000", filter: "none" };
  const record = (op, args) => calls.push({ op, args, ...state });
  const methods = {
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); assert.ok(state, "balanced canvas save/restore"); },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    createPattern() { return { setTransform() {} }; },
    getTransform() { return new RecordingMatrix(); },
    measureText(text) { return { width: text.length * 7 }; },
  };
  for (const name of ["createLinearGradient", "createRadialGradient"])
    methods[name] = (...args) => ({ kind: name, args, addColorStop() {} });
  const ctx = new Proxy({}, {
    get: (_, key) => key === "canvas" ? c : key === "calls" ? calls : key in state ? state[key] : methods[key] ?? ((...args) => record(key, args)),
    set: (_, key, value) => { state[key] = value; if (key === "filter") record("filter", [value]); return true; },
  });
  c.getContext = () => ctx;
  return c;
}
function drawingEnvironment(t) {
  clearSpriteCache();
  const globals = {
    document: { createElement: (name) => { assert.equal(name, "canvas"); return canvas(); } },
    Path2D: RecordingPath,
    DOMMatrix: RecordingMatrix,
    AudioContext: class { constructor() { assert.fail("rendering started audio"); } },
    requestAnimationFrame: () => assert.fail("static rendering started a loop"),
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.mock.method(Math, "random", () => assert.fail("rendering consumed Math.random"));
  t.after(clearSpriteCache);
}
const images = (ctx) => ctx.calls.filter((c) => c.op === "drawImage");
const tints = (ctx) => ctx.calls.filter((c) => c.op === "fillRect" && c.globalCompositeOperation === "source-atop");
const signature = (c) => [c.op, c.fillStyle, c.args.map((a) => a instanceof RecordingPath ? a.ops : a)];

test("gallery draws every cat and wardrobe card from the baked front portraits", (t) => {
  drawingEnvironment(t);
  const sheet = canvas();
  assert.ok(paintGallery(sheet, "en", 760, 1) > 0);
  // Every baked sprite decodes to one canvas per id, so a drawn canvas names its frame.
  const byCanvas = new Map(Object.keys(GEN_SPRITES).filter((k) => k.startsWith("cat-")).map((k) => [genCanvas(k), k]));
  const drawn = images(sheet.getContext()).flatMap((c) => (byCanvas.has(c.args[0]) ? [byCanvas.get(c.args[0])] : []));
  const cats = CATS.ids();
  // Cat cards: the standing front frame of each cat, in registration order.
  assert.deepEqual(drawn.slice(0, cats.length), cats.map((id) => `cat-${id}-select`));
  // The wardrobe shows the full dressed pose for every cat, in wardrobe order.
  assert.deepEqual(drawn.slice(cats.length),
    COSTUME_DEFS.ids().flatMap((c) => cats.map((id) => `cat-${id}@${c}-select`)));
});

test("cat skill previews keep the dash for Zero and use a native moon field for Nicole", (t) => {
  drawingEnvironment(t);
  for (const [id, dashing] of [["zero", true], ["nicole", false]]) {
    const art = CAT_ART.get(id), ctx = canvas().getContext("2d"), poses = [];
    const pose = Object.freeze({ id, x: 10, y: 20, facing: 1, moving: false, dashing: false, hurt: false, time: 0 });
    t.mock.method(art, "draw", (_ctx, p) => poses.push(p));
    art.skillPreview(ctx, pose);
    assert.deepEqual(poses, [{ ...pose, dashing }]);
    if (id === "nicole") {
      const field = ctx.calls.filter((c) => c.op === "fillRect" && c.fillStyle === art.colors.tone);
      assert.ok(field.length >= 16, "moon field retains a visibly separated perimeter");
      assert.ok(field.every((c) => c.args.every(Number.isInteger) && c.globalAlpha === 0.55));
      const xs = field.map((c) => c.args[0]), ys = field.map((c) => c.args[1]);
      assert.equal((Math.min(...xs) + Math.max(...xs)) / 2, pose.x);
      assert.equal((Math.min(...ys) + Math.max(...ys)) / 2, pose.y - 16);
      assert.ok(Math.max(...xs) - Math.min(...xs) > Math.max(...ys) - Math.min(...ys), "field follows the ground plane");
      const moon = ctx.calls.filter((c) => c.op === "fillRect" && c.fillStyle === art.colors.hud);
      assert.ok(moon.length > 8 && moon.every((c) => c.args.every(Number.isInteger)), "native crescent identifies the moon skill");
      assert.equal(images(ctx).length, 0, "mocked registered actor draw is the only face/body dispatch");
      assert.ok(!ctx.calls.some((c) => ["stroke", "ellipse", "createRadialGradient"].includes(c.op)), "preview is authored on a native pixel grid");
    }
  }
});

test("landmark previews draw every interaction marker once, after its existing body, in world depth order", (t) => {
  drawingEnvironment(t);
  let pumpkins = 0, lanterns = 0, livePieces = 0, waters = 0;
  for (const seed of [0, 7, 91]) for (const def of LANDMARK_DEFS.all()) {
    const place = { id: `preview-${def.id}`, kind: def.id, x: 0, y: 0, radius: def.radius, seed, ...(def.span ? { span: 260 } : {}) };
    const { decor, spots } = landmarkParts(place), preview = landmarkPreview(def.id, seed), ctx = canvas().getContext("2d");
    const tall = decor.filter((d) => !FLAT_DECOR.has(d.kind)).sort((a, b) => a.y - b.y);
    let imageCount = 0;
    const offsets = tall.map((d) => {
      const piece = decorPiece(d.kind), live = piece?.live, first = imageCount;
      const expected = canvas().getContext("2d");
      if (live) live.call(piece, expected, d.x, d.y, Math.round(d.s * 20) / 20, Math.abs(d.seed) % (piece.variants ?? 1), 0);
      imageCount += 1 + images(expected).length;
      return { first, last: imageCount - 1, live, expected };
    });
    for (const shape of def.water?.(place) ?? []) {
      const water = canvas().getContext("2d");
      drawWaterShape(water, shape);
      assert.equal(images(water).length, 0, `${def.id}: vector water adds no body images`);
      assert.ok(water.calls.some((c) => c.op === "fill" && c.fillStyle === "#628b87"), "water still draws its shallow paper shelf");
      waters++;
    }
    preview.draw(ctx, 0);
    const bodies = images(ctx);
    assert.equal(bodies.length, imageCount, `${def.id}: exactly one cached body per piece plus registered live sprite layers`);
    for (const [i, d] of tall.entries()) {
      const { first, last, live } = offsets[i];
      if (!live) continue;
      const { expected } = offsets[i];
      const overlay = images(expected);
      assert.ok(expected.calls.length > 0, `${d.kind}: live renderer contributes visible commands`);
      if (overlay.length) assert.notEqual(bodies[first].args[0], bodies[last].args[0], "body and live layer use separate native sprites");
      const start = ctx.calls.indexOf(bodies[first]) + 1;
      assert.deepEqual(ctx.calls.slice(start, start + expected.calls.length).map((c) => [c.op, ...c.args]),
        expected.calls.map((c) => [c.op, ...c.args]), "live overlay follows its own body with the exact placement, scale, variant and time");
      if (overlay.length) assert.equal(bodies[last].args[0], overlay.at(-1).args[0], "preview dispatches the registered live piece, not a duplicate body");
      livePieces++;
    }
    for (const [i, spot] of spots.entries()) {
      if (spot.kind === "pumpkin") pumpkins++; else lanterns++;
      const expected = canvas().getContext("2d");
      drawInteractable(expected, { ...spot, id: i + 1, lit: 0, cooldown: 0, tick: 0, charge: spot.kind === "lantern" ? MOON_LANTERN.startCharge : 0 }, 0);
      assert.ok(expected.calls.length > 0, "interaction painter has visible commands");
      const expectedSignature = expected.calls.map((c) => JSON.stringify(signature(c)));
      const matching = ctx.calls.map((_, index) => index).filter((index) =>
        expectedSignature.every((command, offset) => ctx.calls[index + offset] &&
          JSON.stringify(signature(ctx.calls[index + offset])) === command));
      assert.equal(matching.length, 1, `${def.id}: complete ${spot.kind} marker at ${spot.x},${spot.y} is dispatched once`);
      const body = tall.findIndex((d) => d.x === spot.x && d.y === spot.y && d.kind === (spot.kind === "lantern" ? "lamp" : "pumpkin"));
      assert.ok(body >= 0, "registered spot has an existing scene body");
      assert.ok(ctx.calls.indexOf(bodies[offsets[body].last]) < matching[0], "marker follows its complete body, including any live overlay");
      const front = tall.findIndex((d) => d.y > spot.y + 0.1);
      if (front >= 0) assert.ok(matching[0] < ctx.calls.indexOf(bodies[offsets[front].first]), "foreground decor covers the marker");
      assert.ok(preview.bounds.t <= spot.y - (spot.kind === "lantern" ? 78 : 33 * spot.s + 9), "marker fits preview bounds");
    }
  }
  assert.ok(pumpkins > 0 && lanterns > 0);
  assert.ok(livePieces > 0, "preview coverage includes the live windmill rotor");
  assert.ok(waters > 0, "preview image counts include landmarks with vector water");
});

test("tints composite only on a cached offscreen alpha mask, preserving geometry and cache identity", (t) => {
  drawingEnvironment(t);
  const base = cachedSprite("test:mask", 10.2, 12.4, 2, (ctx) => ctx.fillRect(2, 3, 4, 5), { x: 0.25, y: 0.75 });
  const originalCalls = [...base.canvas.getContext("2d").calls];
  const tinted = tintedSprite(base, "#362417", 0.5), ctx = tinted.canvas.getContext("2d");
  assert.equal(tintedSprite(base, "#362417", 0.5), tinted);
  assert.notEqual(tintedSprite(base, "#000000", 0.5), tinted);
  assert.notEqual(tintedSprite(base, "#362417", 0.25), tinted);
  assert.equal(tintedSprite(base, "#362417", 0), base);
  assert.deepEqual([tinted.width, tinted.height, tinted.scale, tinted.anchor], [base.width, base.height, base.scale, base.anchor]);
  assert.deepEqual([tinted.canvas.width, tinted.canvas.height], [base.canvas.width, base.canvas.height]);
  assert.deepEqual(base.canvas.getContext("2d").calls, originalCalls, "base is never modified");
  assert.deepEqual(images(ctx)[0].args, [base.canvas, 0, 0, 10.5, 12.5], "source is copied without anchor/rounding drift");
  assert.equal(tints(ctx).length, 1);
  assert.deepEqual(tints(ctx)[0].args, [0, 0, 10.5, 12.5]);
  assert.equal(tints(ctx)[0].globalAlpha, 0.5);
  assert.equal(tints(ctx)[0].fillStyle, "#362417");
  assert.equal(ctx.globalCompositeOperation, "source-over");
  const scene = canvas().getContext("2d");
  scene.globalAlpha = 0.4;
  tinted.draw(scene, { x: 30, y: 40 });
  assert.equal(scene.calls.length, 1, "scene receives only a sprite, not a tint rectangle");
  assert.equal(images(scene)[0].globalAlpha, 0.4);
});

test("tint fallback without a DOM never composites over the surrounding scene", () => {
  clearSpriteCache();
  assert.equal(typeof document, "undefined");
  const base = cachedSprite("test:no-dom", 10, 10, 1, (ctx) => ctx.fillRect(2, 2, 4, 4));
  assert.equal(tintedSprite(base, "#000000", 0.5), base);
  const scene = canvas().getContext("2d");
  tintedSprite(base, "#000000", 0.5).draw(scene, { x: 0, y: 0 });
  assert.equal(tints(scene).length, 0);
  clearSpriteCache();
});

test("burning prop damage stays in its cached surface and excludes time/placement from the key", (t) => {
  drawingEnvironment(t);
  const painted = [], art = {
    id: "test-prop", bounds: { l: -12, r: 12, t: -30, b: 4 }, variants: 4, flames: [], scraps: ["#ccbbaa"],
    paint(ctx, x, y, s, v, phase, burnt) { painted.push({ s, v, phase, burnt }); ctx.fillRect(x - 5 * s, y - 20 * s, 10 * s, 20 * s); },
  };
  const spot = Object.freeze({ id: "test-placement", kind: art.id, x: 40, y: 50, s: 1, seed: 1 });
  const draw = (p = spot, phase = 0, burnt = false, burning = true, time = 0) => {
    const ctx = canvas().getContext("2d");
    drawProp(ctx, art, p, phase, burnt, burning, time);
    assert.equal(tints(ctx).length, 0, "no source-atop on the scene");
    assert.ok(!ctx.calls.some((c) => c.globalCompositeOperation === "destination-out"), "burn holes never erase the scene");
    assert.ok(!ctx.calls.some((c) => c.op === "filter"), "no per-frame prop filter");
    return images(ctx)[0].args[0];
  };
  const charred = draw();
  const baked = charred.getContext("2d").calls;
  assert.ok(baked.some((c) => c.globalCompositeOperation === "source-atop"), "char is restricted to the original prop alpha");
  const holes = baked.filter((c) => c.op === "fillRect" && c.globalCompositeOperation === "destination-out");
  assert.ok(holes.length > 0 && holes.every((c) => c.args.every(Number.isInteger) && c.args[2] > 0 && c.args[3] > 0), "native grid burn-throughs are baked into the prop only");
  assert.equal(draw({ ...spot, x: -8, y: 90, s: 1.001, seed: 5 }, 0, false, true, 42), charred);
  assert.equal(painted.length, 1);
  assert.notEqual(draw(spot, 0, false, false), charred);
  assert.equal(painted.length, 1, "plain and charred share the same base painter");
  for (const image of [draw(spot, 1), draw(spot, 2, true), draw({ ...spot, s: 1.05 }), draw({ ...spot, seed: 2 })])
    assert.notEqual(image, charred);
  assert.equal(painted.length, 5);
  assert.deepEqual(painted[0], { s: 1, v: 1, phase: "intact", burnt: false });
});

test("native landmark scenery stays upright at every distance and preserves foreground overlap", (t) => {
  drawingEnvironment(t);
  const art = LANDMARK_ART.all().find((a) => a.pieces?.some((p) => p.popup));
  const piece = art.pieces.find((p) => p.popup), seed = 24681357;
  const place = landmarks(seed).find((l) => l.kind === art.id);
  const decor = landmarkParts(place).decor.find((d) => d.kind === piece.kind);
  // Landmark pieces are baked voxel sprites now: the legacy painter must never run.
  const id = pieceSprite(decor);
  assert.ok(id, `${art.id} ${piece.kind} has a baked piece`);
  let painted = 0;
  t.mock.method(piece, "paint", () => { painted++; });
  const draw = (distance) => {
    const ctx = canvas().getContext("2d");
    const pop = Object.freeze({ cat: Object.freeze({ x: decor.x + distance, y: decor.y }), reduced: true });
    const { sprites } = worldSprites(ctx, seed, { x: decor.x, y: decor.y }, 0, pop);
    const sprite = sprites.find((s) => s.y === decor.y);
    sprite.draw();
    assert.ok(!ctx.calls.some((c) => c.op === "filter"));
    assert.equal(tints(ctx).length, 0);
    return { image: images(ctx)[0].args[0], ctx, occludesPlayer: sprite.occludesPlayer };
  };
  const upright = draw(0), distant = draw(POPUP.far);
  assert.equal(upright.occludesPlayer, true);
  assert.equal(distant.occludesPlayer, false);
  assert.equal(distant.image, upright.image, "distance never creates a flattened or tinted copy");
  assert.ok(!distant.ctx.calls.some(c => c.op === "scale"), "native landmark retains its upright volume");
  assert.ok(!distant.ctx.calls.some(c => c.op === "stroke"), "no detached paper hinge under the building");
  const imagesAtDistance = new Set(Array.from({length:33},(_,i)=>draw(POPUP.near+(POPUP.far-POPUP.near)*i/32).image));
  assert.equal(imagesAtDistance.size, 1, "approach reuses the one cached native shape");
  assert.equal(upright.image, genCanvas(id), "the piece draws its cached baked canvas");
  assert.equal(painted, 0, "moving around the landmark never repaints geometry");
});

test("the two hot paths have no filter assignments or generic cat-id branches", () => {
  for (const file of ["craft-props.ts", "craft-world.ts"])
    assert.doesNotMatch(readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8"), /\.filter\s*=/, file);
  for (const file of ["gallery.ts", "art-registry.ts", "craft-world.ts", "craft-props.ts", "sprite-tint.ts"]) {
    const source = readFileSync(new URL(`../src/render/${file}`, import.meta.url), "utf8");
    for (const id of CATS.ids()) assert.ok(!source.includes(`"${id}"`), `${file} does not name ${id}`);
  }
});
