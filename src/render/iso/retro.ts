/**
 * Retro CRT / VHS post layer (docs/iso-art-spec.md section 8), drawn on the
 * upscaled presentation canvas after the native 480 x 270 frame was enlarged
 * with nearest neighbour. Kept light so cats, enemies and danger read:
 *
 * 1. Colour split: this frame's additive light buffer is copied once into a
 *    red-only and a blue-only native scratch canvas and added again, offset
 *    by one display pixel to either side (only light pools fringe; the art
 *    itself stays registered).
 * 2. Scanlines: every second display row darkened (`RETRO.scanline`), one
 *    pattern fill.
 * 3. Vignette and a slight barrel-style corner fall-off: one cached
 *    display-size image, rebuilt only when the display size changes.
 * 4. Film grain: four cached noise tiles cycled at `RETRO.grain.fps`, one
 *    pattern fill with a hashed offset; reduced motion holds tile 0 still.
 *
 * Draw calls per frame: at most 2 x 3 scratch operations + 2 drawImage for
 * the split, 1 fillRect for scanlines, 1 drawImage for the vignette, 1
 * fillRect for grain. Every pattern and mask is cached; no canvas filter is
 * set and nothing reads pixels per frame. Noise comes from the render hash
 * (visHash), never from unseeded randomness or the sim RNG.
 */
import { surface, type CanvasSurface } from "../../engine/surface.js";
import { visHash } from "../hash.js";

type Ctx = CanvasRenderingContext2D;

export const RETRO = {
  /** Alpha of the dark scanline row (every second display row). */
  scanline: 0.10,
  /** Display rows per scanline period. */
  scanPeriod: 2,
  /** Vignette darkness at the far corners, and where it starts (share of the half-diagonal). */
  vignette: { alpha: 0.42, from: 0.55, colour: [6, 8, 20] as const },
  /** Barrel-style corner: extra darkening inside this share of the shorter side from each corner. */
  corner: { radius: 0.07, alpha: 0.55 },
  /** Grain: tile size (display px), noise cell (display px), tile count, cycle rate, strength. */
  grain: { tile: 96, cell: 1, tiles: 4, fps: 12, alpha: 0.03 },
  /** Colour split: offset in display pixels and alpha of each fringe copy. */
  split: { offset: 1, alpha: 0.25 },
} as const;

export interface RetroOptions {
  /** Presentation time (seconds) for the grain cycle. */
  time: number;
  reduced: boolean;
  /** This frame's native additive light buffer (lighting.ts), for the colour split. */
  light?: CanvasImageSource & { width: number; height: number };
}

const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
const ctx2d = (c: CanvasSurface) => c.getContext("2d") as Ctx | null;

// ---------------------------------------------------------------- grain
let grainTiles: CanvasSurface[] | null = null;
/** Pixels of grain tile `index`: grey speckles in alpha, pure of the index. */
export function grainPixels(index: number): { size: number; data: Uint8ClampedArray } {
  const { tile, cell } = RETRO.grain, data = new Uint8ClampedArray(tile * tile * 4);
  for (let y = 0; y < tile; y++)
    for (let x = 0; x < tile; x++) {
      const h = visHash(Math.imul(Math.floor(x / cell) + 1, 73856093) ^ Math.imul(Math.floor(y / cell) + 1, 19349663) ^ Math.imul(index + 1, 83492791));
      const o = (y * tile + x) * 4, light = h > 0.5, a = Math.abs(h - 0.5) * 2;
      data[o] = data[o + 1] = data[o + 2] = light ? 255 : 0;
      data[o + 3] = Math.round(255 * a * a);
    }
  return { size: tile, data };
}
function grain(index: number): CanvasSurface | undefined {
  if (!grainTiles) {
    if (!canMake()) return undefined;
    grainTiles = Array.from({ length: RETRO.grain.tiles }, (_, i) => {
      const p = grainPixels(i), c = surface(p.size, p.size), g = ctx2d(c);
      if (g && typeof g.createImageData === "function") {
        const img = g.createImageData(p.size, p.size);
        img.data.set(p.data);
        g.putImageData(img, 0, 0);
      }
      return c;
    });
  }
  return grainTiles[index];
}
/** The grain tile shown at `time` (frozen at 0 under reduced motion). */
export function grainFrame(time: number, reduced: boolean): number {
  if (reduced || !Number.isFinite(time)) return 0;
  const n = RETRO.grain.tiles, f = Math.floor(time * RETRO.grain.fps) % n;
  return f < 0 ? f + n : f;
}

// ---------------------------------------------------------------- scanlines and vignette
let scan: CanvasSurface | null = null;
function scanTile(): CanvasSurface | undefined {
  if (!scan && canMake()) {
    scan = surface(1, RETRO.scanPeriod);
    const g = ctx2d(scan);
    if (g) {
      g.fillStyle = `rgba(0,0,0,${RETRO.scanline})`;
      g.fillRect(0, RETRO.scanPeriod - 1, 1, 1);
    }
  }
  return scan ?? undefined;
}

let mask: { w: number; h: number; canvas: CanvasSurface } | null = null;
/** Alpha (0..255) of the vignette and corner mask at display pixel (x, y) of a w x h frame. Pure. */
export function vignetteAlpha(x: number, y: number, w: number, h: number): number {
  const V = RETRO.vignette, C = RETRO.corner;
  const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
  // Elliptical distance with a squared (barrel-like) bias toward the corners.
  const d = Math.hypot(nx, ny) / Math.SQRT2, f = Math.max(0, (d - V.from) / (1 - V.from));
  let a = V.alpha * f * f;
  const r = C.radius * Math.min(w, h), cx = Math.min(x + 0.5, w - x - 0.5), cy = Math.min(y + 0.5, h - y - 0.5);
  if (cx < r && cy < r) {
    // Outside the rounded corner the tube edge darkens quickly (a CRT's curved glass).
    const out = Math.hypot(r - cx, r - cy) - r;
    if (out > 0) a = Math.max(a, Math.min(0.92, C.alpha + (out / r) * 2));
  }
  return Math.round(255 * Math.min(1, a));
}
function vignette(w: number, h: number): CanvasSurface | undefined {
  if (mask && mask.w === w && mask.h === h) return mask.canvas;
  if (!canMake()) return undefined;
  if (mask) { mask.canvas.width = 0; mask.canvas.height = 0; }
  // Built at a quarter of the display size (the fall-off is smooth) and drawn enlarged.
  const qw = Math.max(1, Math.ceil(w / 4)), qh = Math.max(1, Math.ceil(h / 4)), c = surface(qw, qh), g = ctx2d(c);
  if (g && typeof g.createImageData === "function") {
    const img = g.createImageData(qw, qh), [r, gr, b] = RETRO.vignette.colour;
    for (let y = 0; y < qh; y++)
      for (let x = 0; x < qw; x++) {
        const o = (y * qw + x) * 4;
        img.data[o] = r; img.data[o + 1] = gr; img.data[o + 2] = b;
        img.data[o + 3] = vignetteAlpha(x, y, qw, qh);
      }
    g.putImageData(img, 0, 0);
  }
  mask = { w, h, canvas: c };
  return c;
}

// ---------------------------------------------------------------- colour split
let split: { w: number; h: number; red: CanvasSurface; blue: CanvasSurface } | null = null;
function channel(target: CanvasSurface, light: CanvasImageSource, colour: string): void {
  const g = ctx2d(target);
  if (!g) return;
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, target.width, target.height);
  g.drawImage(light, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = colour;
  g.fillRect(0, 0, target.width, target.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(light, 0, 0);
  g.globalCompositeOperation = "source-over";
}

/** Releases every cached retro pattern. */
export function clearRetro(): void {
  for (const c of [...(grainTiles ?? []), scan, mask?.canvas, split?.red, split?.blue]) if (c) { c.width = 0; c.height = 0; }
  grainTiles = null;
  scan = null;
  mask = null;
  split = null;
}

/** Draws the retro layer over a w x h display frame (identity transform). */
export function drawRetro(ctx: Ctx, w: number, h: number, opts: RetroOptions): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const light = opts.light;
  if (light && canMake()) {
    if (!split || split.w !== light.width || split.h !== light.height) {
      split = { w: light.width, h: light.height, red: surface(light.width, light.height), blue: surface(light.width, light.height) };
    }
    channel(split.red, light, "rgb(255,0,0)");
    channel(split.blue, light, "rgb(0,0,255)");
    const o = RETRO.split.offset;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = RETRO.split.alpha;
    ctx.drawImage(split.red, o, 0, w, h);
    ctx.drawImage(split.blue, -o, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const s = scanTile(), pattern = s ? ctx.createPattern(s as CanvasImageSource, "repeat") : null;
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  const frame = grainFrame(opts.time, opts.reduced), tile = grain(frame), grainPattern = tile ? ctx.createPattern(tile as CanvasImageSource, "repeat") : null;
  if (grainPattern) {
    const T = RETRO.grain.tile, ox = Math.floor(visHash(frame * 977 + 13) * T), oy = Math.floor(visHash(frame * 991 + 17) * T);
    ctx.globalAlpha = RETRO.grain.alpha;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(ox, oy, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }
  const v = vignette(w, h);
  if (v) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(v as CanvasImageSource, 0, 0, w, h);
  }
  ctx.restore();
}
