/**
 * Runtime side of the baked voxel scenery (scripts/iso-art/build.py ->
 * gen/scenery-pixels.ts). Decodes the palette-indexed runs into cached
 * native-size canvases (one per sprite id, so the cache is bounded by the
 * finite sprite list), and draws them at a projected world foot point at
 * scale 1: these sprites are authored in native pixels and never go
 * through place.ts atFoot's UPRIGHT_SCALE. Presentation only: reads no
 * SimState and consumes no RNG.
 */
import { surface, type CanvasSurface } from "../../engine/surface.js";
import { SCENERY_PALETTE, SCENERY_SPRITES, type GenLightKind, type GenSprite } from "./gen/scenery-pixels.js";
import type { Bounds, Footprint } from "./depth.js";
import { snap, toScreen } from "./projection.js";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const GEN_SHADOW = {
  /** Colour and alpha of the baked hard ground shadows. */
  colour: "#05070f",
  alpha: 0.42,
} as const;

/** Decodes the run string of a sprite (or shadow) into `length` palette indices. */
export function decodeRuns(data: string, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i < data.length && o < length; ) {
    const v = data.charCodeAt(i++) - 0x100;
    let n = 1;
    if (i < data.length) {
      const c = data.charCodeAt(i);
      if (c >= 0x200) { n = c - 0x200; i++; }
    }
    out.fill(v, o, Math.min(length, o + n));
    o += n;
  }
  return out;
}

export function genSprite(id: string): GenSprite | undefined {
  return SCENERY_SPRITES[id];
}
export function hasGenSprite(id: string): boolean {
  return id in SCENERY_SPRITES;
}

interface Baked { image?: CanvasSurface; shadow?: CanvasSurface }
const cache = new Map<string, Baked>();
const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";

/** Paints index rows as runs of fillRect (works on every 2D context, no ImageData needed). */
function paintRuns(c: Ctx, idx: Uint8Array, w: number, colour: (v: number) => string | null): void {
  for (let y = 0, h = idx.length / w; y < h; y++)
    for (let x = 0; x < w; ) {
      const v = idx[y * w + x]!;
      let e = x + 1;
      while (e < w && idx[y * w + e] === v) e++;
      const css = colour(v);
      if (css) {
        c.fillStyle = css;
        c.fillRect(x, y, e - x, 1);
      }
      x = e;
    }
}

function baked(id: string): Baked | undefined {
  let b = cache.get(id);
  if (b) return b;
  const s = SCENERY_SPRITES[id];
  if (!s) return undefined;
  b = {};
  if (canMake()) {
    const image = surface(s.w, s.h), c = image.getContext("2d") as Ctx | null;
    if (c) {
      paintRuns(c, decodeRuns(s.data, s.w * s.h), s.w, (v) => (v ? SCENERY_PALETTE[v]! : null));
      b.image = image;
    }
    if (s.shadow) {
      const sh = s.shadow, shadow = surface(sh.w, sh.h), d = shadow.getContext("2d") as Ctx | null;
      if (d) {
        paintRuns(d, decodeRuns(sh.data, sh.w * sh.h), sh.w, (v) => (v ? GEN_SHADOW.colour : null));
        b.shadow = shadow;
      }
    }
  }
  cache.set(id, b);
  return b;
}

/** The cached canvas of a sprite (tests and the off-map wall). */
export function genCanvas(id: string): CanvasSurface | undefined {
  return baked(id)?.image;
}
export function genShadowCanvas(id: string): CanvasSurface | undefined {
  return baked(id)?.shadow;
}

/** Draws sprite `id` with its foot on the projected world point (x, y); `ctx` carries the camera transform. */
export function drawGen(ctx: Ctx, id: string, x: number, y: number): void {
  const s = SCENERY_SPRITES[id], img = baked(id)?.image;
  if (!s || !img) return;
  const p = toScreen(x, y);
  ctx.drawImage(img, snap(p.x) - s.ax, snap(p.y) - s.ay);
}

/** Draws the baked ground shadow of sprite `id` under foot (x, y). */
export function drawGenShadow(ctx: Ctx, id: string, x: number, y: number): void {
  const s = SCENERY_SPRITES[id], img = baked(id)?.shadow;
  if (!s?.shadow || !img) return;
  const p = toScreen(x, y);
  ctx.save();
  ctx.globalAlpha *= GEN_SHADOW.alpha;
  ctx.drawImage(img, snap(p.x) + s.shadow.x, snap(p.y) + s.shadow.y);
  ctx.restore();
}

/** Native-pixel art bounds around the foot (for culling and occlusion). */
export function genBounds(id: string): Bounds {
  const s = SCENERY_SPRITES[id];
  if (!s) return { l: 0, r: 0, t: 0, b: 0 };
  return { l: -s.ax, r: s.w - s.ax, t: -s.ay, b: s.h - s.ay };
}

/** World footprint of a sprite's voxels at foot (x, y). */
export function genFootprint(id: string, x: number, y: number): Footprint | null {
  const e = SCENERY_SPRITES[id]?.extent;
  return e ? { x0: x + e.x, y0: y + e.y, x1: x + e.x + e.w, y1: y + e.y + e.d } : null;
}

/** A light anchored on a baked sprite: world foot plus its native-pixel offset from the foot. */
export interface GenGlow {
  readonly kind: GenLightKind;
  readonly x: number;
  readonly y: number;
  /** Native pixels right of the projected foot. */
  readonly dx: number;
  /** Native pixels above the projected foot. */
  readonly lift: number;
}

/** Emissive anchors of sprite `id` standing at (x, y), appended to `out`. */
export function genGlows(id: string, x: number, y: number, out: GenGlow[]): void {
  for (const l of SCENERY_SPRITES[id]?.lights ?? []) out.push({ kind: l.kind, x, y, dx: l.x, lift: -l.y });
}

/** Releases every decoded sprite canvas. */
export function clearGenSprites(): void {
  for (const b of cache.values()) {
    if (b.image) { b.image.width = 0; b.image.height = 0; }
    if (b.shadow) { b.shadow.width = 0; b.shadow.height = 0; }
  }
  cache.clear();
}
export function genSpriteCacheSize(): number {
  return cache.size;
}
