/**
 * Sprites: anything the renderer can stamp at a point, with a size and an
 * anchor. Shipped art is drawn by code; `cachedSprite` pre-renders such code
 * into an offscreen canvas once and reuses it (LRU, capped). An image-backed
 * sprite is only an interface capability (`imageSprite`); nothing shipped
 * uses images.
 *
 * Import-safe in Node: without a browser canvas the sprite just draws its
 * code each time. Workers use the same painters on offscreen surfaces.
 */
import { surface, type CanvasContext, type CanvasSurface } from "./surface.js";
export interface SpriteDrawOptions {
  readonly x: number;
  readonly y: number;
  /** Extra scale on top of the sprite's own size. Default 1. */
  readonly scale?: number;
}
export interface Sprite {
  readonly id: string;
  /** Size in drawing units (before `opts.scale`). */
  readonly width: number;
  readonly height: number;
  /** The point placed at (x, y), as a fraction of width and height. */
  readonly anchor: { readonly x: number; readonly y: number };
  draw(ctx: CanvasContext, opts: SpriteDrawOptions): void;
}
/** A sprite backed by a canvas where the platform provides one. */
export interface CanvasSprite extends Sprite {
  readonly canvas?: CanvasSurface;
  /** Device pixels per drawing unit in `canvas`. */
  readonly scale: number;
}
/**
 * Paints the sprite content in drawing units, (0, 0) at the top left. `ctx` is
 * already scaled; `canvas` is the backing canvas when there is one, for
 * compositing passes that need raw pixels.
 */
export type SpritePainter = (ctx: CanvasContext, canvas?: CanvasSurface) => void;

/** Most cached sprites alive at once; the least recently used one is dropped first. */
export const SPRITE_CACHE_LIMIT = 256;
const cache = new Map<string, CanvasSprite>();

function place(sprite: Sprite, opts: SpriteDrawOptions): { x: number; y: number; w: number; h: number } {
  const k = opts.scale ?? 1,
    w = sprite.width * k,
    h = sprite.height * k;
  return { x: opts.x - sprite.anchor.x * w, y: opts.y - sprite.anchor.y * h, w, h };
}

/**
 * A procedurally drawn sprite pre-rendered at `scale` device pixels per unit
 * into a `ceil(w * scale) x ceil(h * scale)` canvas. Same key, same sprite:
 * the painter runs once until the entry is evicted.
 */
export function cachedSprite(
  key: string,
  w: number,
  h: number,
  scale: number,
  paint: SpritePainter,
  anchor: { x: number; y: number } = { x: 0, y: 0 },
): CanvasSprite {
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let canvas: CanvasSurface | undefined;
  if (typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined") {
    canvas = surface(Math.ceil(w * scale), Math.ceil(h * scale));
    const c = canvas.getContext("2d")!;
    c.scale(scale, scale);
    paint(c, canvas);
  }
  const sprite: CanvasSprite = {
    id: key,
    width: w,
    height: h,
    anchor,
    scale,
    canvas,
    draw(ctx, opts) {
      const r = place(sprite, opts);
      if (canvas) {
        ctx.drawImage(canvas, r.x, r.y, (canvas.width / scale) * (opts.scale ?? 1), (canvas.height / scale) * (opts.scale ?? 1));
        return;
      }
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(opts.scale ?? 1, opts.scale ?? 1);
      paint(ctx);
      ctx.restore();
    },
  };
  cache.set(key, sprite);
  while (cache.size > SPRITE_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return sprite;
}

/** Capability only: a sprite backed by an image source. Shipped art never uses it. */
export function imageSprite(
  id: string,
  image: CanvasImageSource,
  w: number,
  h: number,
  anchor: { x: number; y: number } = { x: 0.5, y: 1 },
): Sprite {
  const sprite: Sprite = {
    id,
    width: w,
    height: h,
    anchor,
    draw(ctx, opts) {
      const r = place(sprite, opts);
      ctx.drawImage(image, r.x, r.y, r.w, r.h);
    },
  };
  return sprite;
}

export function spriteCacheSize(): number {
  return cache.size;
}
export function clearSpriteCache(): void {
  cache.clear();
}
