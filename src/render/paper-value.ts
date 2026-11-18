/**
 * Bake-time value passes of the paper ruleset (PAPER_VALUE in paper-rules.ts):
 * a grade that lowers and greys a baked tile or sprite inside its own alpha,
 * and a light cut-edge rim on the moon side of a cached actor part.
 *
 * Both run once per cached canvas (chunk tile, decor sprite, enemy part),
 * never per frame. Blend modes and alpha compositing only: no filters,
 * gradients or pixel reads. Render only.
 */
import { surface, type CanvasContext, type CanvasSurface } from "../engine/surface.js";
import { PAPER_LIGHT, PAPER_VALUE } from "./paper-rules.js";

const canCompose = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
/** A context that can take compositing passes (real canvases; minimal test stubs are skipped). */
function composable(canvas: CanvasSurface | undefined): CanvasContext | null {
  if (!canvas || !canCompose() || !canvas.width || !canvas.height) return null;
  const c = canvas.getContext("2d") as CanvasContext | null;
  return c && typeof c.setTransform === "function" && typeof c.drawImage === "function" ? c : null;
}
/** A fresh scratch canvas the size of `canvas` (one per bake; bakes are rare). */
function scratchFor(canvas: CanvasSurface): { canvas: CanvasSurface; ctx: CanvasContext } | null {
  const tmp = surface(canvas.width, canvas.height),
    ctx = composable(tmp);
  return ctx ? { canvas: tmp, ctx } : null;
}

export interface ValueGrade {
  /** 0..1 share of the colour replaced by its own grey value. */
  readonly desaturate: number;
  /** Multiplied paper tone (lower = darker), as #rrggbb. */
  readonly multiply: string;
}
/** Lowers and greys everything already painted in `canvas`, keeping its alpha. */
export function gradeCanvas(canvas: CanvasSurface | undefined, grade: ValueGrade): void {
  const c = composable(canvas);
  if (!c || !canvas) return;
  const s = scratchFor(canvas);
  if (!s) return;
  const W = canvas.width, H = canvas.height, t = s.ctx;
  t.drawImage(canvas, 0, 0);
  t.globalCompositeOperation = "saturation";
  t.globalAlpha = grade.desaturate;
  t.fillStyle = "#808080";
  t.fillRect(0, 0, W, H);
  t.globalAlpha = 1;
  t.globalCompositeOperation = "multiply";
  t.fillStyle = grade.multiply;
  t.fillRect(0, 0, W, H);
  // Blend fills cover transparent pixels too; keep only the piece's own alpha.
  t.globalCompositeOperation = "destination-in";
  t.drawImage(canvas, 0, 0);
  t.globalCompositeOperation = "source-over";
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "copy";
  c.drawImage(s.canvas, 0, 0);
  c.restore();
}

/**
 * Adds the moon-side cut rim to a cached part: the pixels of the part whose
 * neighbour toward the light (top-right) is empty get a pale band. The mask
 * uses the cube of the part's alpha, so its own translucent cast shadow gets
 * almost no rim. `k` = device pixels per drawing unit.
 */
export function addLitRim(canvas: CanvasSurface | undefined, k: number, rim = PAPER_VALUE.rim): void {
  const c = composable(canvas);
  if (!c || !canvas) return;
  const s = scratchFor(canvas);
  if (!s) return;
  const W = canvas.width, H = canvas.height, t = s.ctx,
    w = rim.width * k;
  t.fillStyle = rim.color;
  t.fillRect(0, 0, W, H);
  t.globalCompositeOperation = "destination-in";
  for (let i = 0; i < 3; i++) t.drawImage(canvas, 0, 0);
  t.globalCompositeOperation = "destination-out";
  t.drawImage(canvas, -PAPER_LIGHT.dirX * w, -PAPER_LIGHT.dirY * w);
  t.globalCompositeOperation = "source-over";
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = rim.alpha;
  c.drawImage(s.canvas, 0, 0);
  c.restore();
}

/**
 * The same rim for a live actor drawn by `paint` (the chosen cat, whose
 * parts flip with its facing, so the rim is taken from the finished pose).
 * Two reused scratch canvases (pose and rim); one actor per frame.
 */
export function drawWithLitRim(
  ctx: CanvasContext,
  x: number,
  y: number,
  box: { l: number; r: number; t: number; b: number },
  paint: (c: CanvasContext) => void,
): void {
  if (!canCompose() || typeof ctx.getTransform !== "function") {
    paint(ctx);
    return;
  }
  const m = ctx.getTransform(),
    scale = typeof m?.a === "number" && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 2,
    // Never rasterise below the live scale (no upscaled, soft head during cue zooms); quarter steps keep sizes few.
    k = Math.max(1, Math.min(4, Math.ceil(scale * 4 - 1e-6) / 4)),
    w = box.r - box.l,
    h = box.b - box.t,
    W = Math.ceil(w * k),
    H = Math.ceil(h * k),
    pose = layer(0, W, H),
    rim = layer(1, W, H);
  if (!pose || !rim) {
    paint(ctx);
    return;
  }
  pose.ctx.setTransform(k, 0, 0, k, -(x + box.l) * k, -(y + box.t) * k);
  paint(pose.ctx);
  pose.ctx.setTransform(1, 0, 0, 1, 0, 0);
  const r = rim.ctx, d = PAPER_VALUE.rim.width * k;
  r.fillStyle = PAPER_VALUE.rim.color;
  r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = "destination-in";
  for (let i = 0; i < 3; i++) r.drawImage(pose.canvas, 0, 0);
  r.globalCompositeOperation = "destination-out";
  r.drawImage(pose.canvas, -PAPER_LIGHT.dirX * d, -PAPER_LIGHT.dirY * d);
  r.globalCompositeOperation = "source-over";
  ctx.drawImage(pose.canvas, x + box.l, y + box.t, w, h);
  ctx.save();
  ctx.globalAlpha *= PAPER_VALUE.rim.alpha;
  ctx.drawImage(rim.canvas, x + box.l, y + box.t, w, h);
  ctx.restore();
}
const layers: Array<{ canvas: CanvasSurface; ctx: CanvasContext } | undefined> = [];
function layer(slot: number, w: number, h: number): { canvas: CanvasSurface; ctx: CanvasContext } | null {
  let l = layers[slot];
  if (!l || l.canvas.width !== w || l.canvas.height !== h) {
    const canvas = surface(w, h),
      ctx = composable(canvas);
    if (!ctx) return null;
    l = layers[slot] = { canvas, ctx };
  }
  const c = l.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, w, h);
  return l;
}
