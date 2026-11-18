/**
 * Pencil versions of paper pieces standing on colourless paper. The colour
 * of the cut is lifted to raw cream with soft graphite shading kept from its
 * own values (so eyes, markings and openings stay readable), a hand-drawn
 * graphite outline is traced around its alpha with a few gaps left, and
 * diagonal hatching fills only its shadow side (away from the moon).
 *
 * Cached pieces (decor, props, landmark bodies) get one cached variant per
 * sprite and quantised amount (SKETCH_STEPS), so keys stay finite. Live
 * actors are composed through a small pool of reused scratch canvases, only
 * while they stand on colourless cells. Composition uses blend modes on
 * offscreen canvases: no ctx.filter, no getImageData, no gradients.
 * Render only: reads SimState, never mutates it; no randomness.
 */
import { WASH } from "../defs/wash.js";
import { cachedSprite, type CanvasSprite } from "../engine/sprite.js";
import { surface, type CanvasContext, type CanvasSurface } from "../engine/surface.js";
import type { SimState } from "../game/types.js";
import { washCellAt, washEmpty } from "../game/wash.js";
import { visHash } from "./hash.js";
import { PENCIL } from "./pencil.js";
import { PAPER_LIGHT } from "./paper-rules.js";
import type { Ctx } from "./paper-material.js";

/** Quantised sketch amounts: half-washed pieces show a partial pencil look. */
export const SKETCH_STEPS = [0, 0.5, 1] as const;
/** How much graphite tone survives from the piece's own values (0 = flat cream, 1 = full). */
const TONE = 0.62;
/** At most this many live actors are composed in pencil per frame; the rest stay painted. */
export const SKETCH_ACTORS_PER_FRAME = 32;

/** Snap an amount to SKETCH_STEPS. */
export function sketchStep(amount: number): number {
  if (!(amount > 0.25)) return 0;
  return amount >= 0.75 ? 1 : 0.5;
}
/** Pencil amount for a piece whose base stands at (x, y): 0 painted, 0.5 fading, 1 colourless or blank. */
export function sketchAmount(sim: SimState, x: number, y: number): number {
  if (washEmpty(sim)) return 0;
  const c = washCellAt(sim, x, y);
  if (!c) return 0;
  if (c.blank || c.level >= WASH.colourless) return 1;
  return c.level >= WASH.colourless * 0.5 ? 0.5 : 0;
}

type Layer = { canvas: CanvasSurface; ctx: CanvasContext };
const pool = new Map<string, Layer>();
/** A reused scratch canvas of exactly W x H pixels for one composition slot. */
function scratch(w: number, h: number, slot: number): Layer {
  const key = `${w}x${h}:${slot}`;
  let layer = pool.get(key);
  if (!layer) {
    if (pool.size > 40) pool.clear();
    const canvas = surface(w, h);
    layer = { canvas, ctx: canvas.getContext("2d") as CanvasContext };
    pool.set(key, layer);
  }
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.globalAlpha = 1;
  layer.ctx.globalCompositeOperation = "source-over";
  layer.ctx.clearRect(0, 0, w, h);
  return layer;
}
/** Graphite tone of a 0..1 value, as a hex grey. */
const grey = (v: number) => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return `#${n}${n}${n}`;
};
/**
 * Draws the pencil version of `src` (W x H device pixels covering w x h
 * units at k pixels per unit) into `ctx` at (0, 0) in units, mixed by `q`.
 */
function composeSketch(ctx: Ctx, src: CanvasSurface, w: number, h: number, k: number, q: number, salt: number): void {
  const W = src.width, H = src.height;
  // Body: the cut's own values as soft graphite on raw cream.
  const body = scratch(W, H, 1), b = body.ctx;
  b.drawImage(src, 0, 0);
  b.globalCompositeOperation = "saturation";
  b.fillStyle = "#808080";
  b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = "screen";
  b.fillStyle = grey(1 - TONE);
  b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = "multiply";
  b.fillStyle = PENCIL.paper;
  b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = "destination-in";
  b.drawImage(src, 0, 0);
  // Outline: a graphite silhouette with a few erased gaps (unfinished line).
  const sil = scratch(W, H, 2), s = sil.ctx;
  s.drawImage(src, 0, 0);
  s.globalCompositeOperation = "source-in";
  s.fillStyle = PENCIL.graphite;
  s.fillRect(0, 0, W, H);
  s.globalCompositeOperation = "destination-out";
  s.lineWidth = 2.2 * k;
  s.lineCap = "round";
  const gaps = new Path2D();
  for (let i = 0; i < 5; i++) {
    const gx = visHash(salt * 13 + i * 7) * W, gy = visHash(salt * 17 + i * 11) * H;
    gaps.moveTo(gx - 3 * k, gy - 2 * k);
    gaps.lineTo(gx + 3 * k, gy + 2 * k);
  }
  s.stroke(gaps);
  // Hatching: "/" strokes inside the cut, minus the cut moved toward the light.
  const hat = scratch(W, H, 3), t = hat.ctx;
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = "source-in";
  const lines = new Path2D(), gap = 3.2 * k;
  for (let d = -H; d < W + H; d += gap) {
    lines.moveTo(d, H);
    lines.lineTo(d + H, 0);
  }
  t.strokeStyle = PENCIL.graphite;
  t.lineWidth = 0.55 * k;
  t.stroke(lines);
  t.globalCompositeOperation = "destination-out";
  const shift = Math.max(3, Math.min(w, h) * 0.18) * k;
  t.drawImage(src, PAPER_LIGHT.dirX * shift, PAPER_LIGHT.dirY * shift);
  // Into the target: outline under, the painted cut, then the pencil body and hatching.
  ctx.save();
  ctx.globalAlpha *= 0.5 * q;
  for (const [ox, oy] of [[-0.8, 0.25], [0.8, -0.25], [0.25, 0.8], [-0.25, -0.8]] as const)
    ctx.drawImage(sil.canvas, ox, oy, w, h);
  ctx.restore();
  ctx.drawImage(src, 0, 0, w, h);
  ctx.save();
  ctx.globalAlpha *= q;
  ctx.drawImage(body.canvas, 0, 0, w, h);
  ctx.globalAlpha *= 0.72;
  ctx.drawImage(hat.canvas, 0, 0, w, h);
  ctx.restore();
}
function idSalt(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) | 0;
  return n;
}
/** The cached pencil variant of a cached sprite (same size and anchor). */
export function sketchedSprite(sprite: CanvasSprite, amount: number): CanvasSprite {
  const q = sketchStep(amount);
  if (q === 0 || !sprite.canvas) return sprite;
  const src = sprite.canvas;
  return cachedSprite(
    `sketch:${sprite.id}:${q}`,
    sprite.width,
    sprite.height,
    sprite.scale,
    (ctx) => composeSketch(ctx, src, sprite.width, sprite.height, sprite.scale, q, idSalt(sprite.id)),
    sprite.anchor,
  );
}

let actorsThisFrame = 0;
/** Start of a world frame: resets the live actor budget. */
export function beginSketchFrame(): void {
  actorsThisFrame = 0;
}
/** Box around an actor's base point (units): left, right, top, bottom. */
export interface SketchBox {
  readonly l: number;
  readonly r: number;
  readonly t: number;
  readonly b: number;
}
/**
 * Draws a live actor (cat, enemy, rotor) through `paint`, in pencil when it
 * stands on colourless paper. `paint` draws in world units at its own
 * position. Painted actors (amount 0) are drawn directly, with no extra work.
 */
export function drawSketched(ctx: Ctx, amount: number, x: number, y: number, box: SketchBox, paint: (c: Ctx) => void): void {
  const q = sketchStep(amount);
  if (q === 0 || actorsThisFrame >= SKETCH_ACTORS_PER_FRAME || (typeof document === "undefined" && typeof OffscreenCanvas === "undefined")) {
    paint(ctx);
    return;
  }
  actorsThisFrame++;
  const m = typeof ctx.getTransform === "function" ? ctx.getTransform() : undefined,
    scale = typeof m?.a === "number" && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 2,
    k = Math.max(1, Math.min(4, Math.round(scale * 2) / 2)),
    // Snap boxes to 8-unit steps so the scratch pool reuses a few sizes.
    l = Math.floor(box.l / 8) * 8, t = Math.floor(box.t / 8) * 8,
    w = Math.ceil((box.r - l) / 8) * 8, h = Math.ceil((box.b - t) / 8) * 8,
    src = scratch(Math.ceil(w * k), Math.ceil(h * k), 0);
  src.ctx.setTransform(k, 0, 0, k, -(x + l) * k, -(y + t) * k);
  paint(src.ctx);
  src.ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save();
  ctx.translate(x + l, y + t);
  composeSketch(ctx, src.canvas, w, h, k, q, Math.round(w * 7 + h));
  ctx.restore();
}
