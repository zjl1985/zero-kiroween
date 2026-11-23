/**
 * Four-direction isometric sprite sheets (docs/ISOMETRIC_PIXEL_PLAN.md D4,
 * docs/iso-art-spec.md).
 *
 * - Directions SE and NE are painted; SW and NW are exact horizontal mirrors
 *   of SE and NE about the foot column, made at bake time from the same pixels.
 * - Animations: idle 2 frames, walk 4 to 6 frames (per sheet, default 6),
 *   hurt 1 frame. Reduced motion always shows frame 0.
 * - The facing direction is derived at render time from the screen direction
 *   of the projected velocity. A still actor keeps its last direction from a
 *   bounded render-only map keyed by actor id, then falls back to the sim's
 *   left/right `facing`. Nothing here writes simulation state.
 * - Painters write a pure pixel buffer (usable in Node). `isoSpriteFrame`
 *   wraps a bake into a canvas inside a finite LRU keyed only by
 *   (identity, direction, animation, frame, palette); evicted canvases are released.
 */
import { surface, type CanvasContext, type CanvasSurface } from "../../engine/surface.js";
import { snap, toScreen, type Vec } from "./projection.js";

export const ISO_DIRS = ["se", "ne", "sw", "nw"] as const;
export type IsoDir = (typeof ISO_DIRS)[number];
/** The two directions a painter draws; the other two are mirrors. */
export type IsoPaintedDir = "se" | "ne";

export const ISO_ANIMS = ["idle", "walk", "hurt"] as const;
export type IsoAnim = (typeof ISO_ANIMS)[number];
export type IsoWalkFrames = 4 | 5 | 6;

export const ISO_SPRITE = {
  /** Frames per animation; walk is the default and a sheet may choose 4 to 6. */
  frames: { idle: 2, walk: 6, hurt: 1 },
  /** Frames per second of each animation. */
  fps: { idle: 2, walk: 10, hurt: 1 },
  /** Screen speed (px per second of velocity units) below which the actor counts as still. */
  still: 1e-3,
  /** Remembered actor directions at once; the least recently used is dropped. */
  memoryLimit: 256,
  /** Cached frame canvases alive at once. */
  cacheLimit: 128,
} as const;

/** The painted direction a direction is drawn from. */
export function paintedDir(dir: IsoDir): IsoPaintedDir {
  return dir === "sw" ? "se" : dir === "nw" ? "ne" : dir;
}
export function isMirroredDir(dir: IsoDir): boolean {
  return dir === "sw" || dir === "nw";
}
export function isEastDir(dir: IsoDir): boolean {
  return dir === "se" || dir === "ne";
}
export function isSouthDir(dir: IsoDir): boolean {
  return dir === "se" || dir === "sw";
}
function dirOf(east: boolean, south: boolean): IsoDir {
  return east ? (south ? "se" : "ne") : south ? "sw" : "nw";
}

export function frameCount(anim: IsoAnim, walkFrames: IsoWalkFrames = ISO_SPRITE.frames.walk): number {
  return anim === "walk" ? walkFrames : ISO_SPRITE.frames[anim];
}

/** Any integer frame folded into [0, count) for `anim`. */
export function clampFrame(anim: IsoAnim, frame: number, walkFrames?: IsoWalkFrames): number {
  const n = frameCount(anim, walkFrames);
  const f = Number.isFinite(frame) ? Math.floor(frame) : 0;
  return ((f % n) + n) % n;
}

/** The frame of `anim` at render time `time` seconds; reduced motion is always frame 0. */
export function frameFor(anim: IsoAnim, time: number, reduced: boolean, walkFrames?: IsoWalkFrames): number {
  if (reduced || !Number.isFinite(time)) return 0;
  return clampFrame(anim, time * ISO_SPRITE.fps[anim], walkFrames);
}

/**
 * Direction from a screen-space velocity. A still axis keeps that half of
 * `last` (or east from `facing` >= 0, and south when there is no last
 * direction). Returns null when the velocity is below `ISO_SPRITE.still`.
 */
export function dirFromScreen(sx: number, sy: number, last: IsoDir | null, facing: number): IsoDir | null {
  if (!(Math.hypot(sx, sy) >= ISO_SPRITE.still)) return null;
  const eps = ISO_SPRITE.still * 0.5;
  const east = sx > eps ? true : sx < -eps ? false : last ? isEastDir(last) : facing >= 0;
  const south = sy > eps ? true : sy < -eps ? false : last ? isSouthDir(last) : true;
  return dirOf(east, south);
}

const memory = new Map<number | string, IsoDir>();

/**
 * The facing direction of actor `id` moving with world velocity (vx, vy).
 * Moving: the screen direction of toScreen(vx, vy). Still: the last
 * remembered direction, else SE / SW from the sim `facing` sign.
 * Only the render-only memory map is updated.
 */
export function isoDirection(id: number | string, vx: number, vy: number, facing: number): IsoDir {
  const s = toScreen(Number.isFinite(vx) ? vx : 0, Number.isFinite(vy) ? vy : 0);
  const last = memory.get(id) ?? null;
  const dir = dirFromScreen(s.x, s.y, last, facing) ?? last ?? (facing < 0 ? "sw" : "se");
  memory.delete(id);
  memory.set(id, dir);
  while (memory.size > ISO_SPRITE.memoryLimit) memory.delete(memory.keys().next().value!);
  return dir;
}
export function forgetIsoDirection(id: number | string): void {
  memory.delete(id);
}
export function clearIsoDirections(): void {
  memory.clear();
}
export function isoDirectionMemorySize(): number {
  return memory.size;
}

export type Rgb = readonly [number, number, number];

/** The write surface a painter sees: binary alpha, integer pixels, out-of-bounds writes clipped and counted. */
export interface IsoPixelTarget {
  readonly width: number;
  readonly height: number;
  /** The foot pixel (column, row) inside the declared bounds. */
  readonly foot: Vec;
  set(x: number, y: number, rgb: Rgb): void;
  rect(x: number, y: number, w: number, h: number, rgb: Rgb): void;
  clear(x: number, y: number): void;
}

export interface IsoFrameInfo {
  readonly dir: IsoPaintedDir;
  readonly anim: IsoAnim;
  readonly frame: number;
  readonly palette: string;
}

/** Must be a pure function of (identity, info). */
export type IsoFramePainter = (px: IsoPixelTarget, info: IsoFrameInfo) => void;

export interface IsoSheet {
  /** Stable art identity (from the art registry), part of every cache key. */
  readonly identity: string;
  /** Declared frame bounds in pixels; every frame of the sheet has this size. */
  readonly width: number;
  readonly height: number;
  /** Foot anchor pixel, placed on the snapped projected foot point. */
  readonly foot: Vec;
  readonly walkFrames?: IsoWalkFrames;
  readonly paint: IsoFramePainter;
}

export interface IsoFrameRaster {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  /** Foot pixel of this (possibly mirrored) frame. */
  readonly anchor: Vec;
  /** RGBA, alpha 0 or 255. */
  readonly pixels: Uint8ClampedArray;
  /** Painter writes that fell outside the declared bounds (dropped). */
  readonly clipped: number;
  readonly mirrored: boolean;
}

export function isoSpriteKey(identity: string, dir: IsoDir, anim: IsoAnim, frame: number, palette = "", walkFrames?: IsoWalkFrames): string {
  return `iso-sprite:${identity}:${dir}:${anim}:${clampFrame(anim, frame, walkFrames)}:${palette}`;
}

function checkSheet(sheet: IsoSheet): void {
  const { width, height, foot } = sheet;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`iso sheet ${sheet.identity}: bounds must be positive integers`);
  }
  if (!Number.isInteger(foot.x) || !Number.isInteger(foot.y) || foot.x < 0 || foot.y < 0 || foot.x >= width || foot.y >= height) {
    throw new Error(`iso sheet ${sheet.identity}: foot must be an integer pixel inside the bounds`);
  }
}

function paintBuffer(sheet: IsoSheet, info: IsoFrameInfo): { pixels: Uint8ClampedArray; clipped: number } {
  const { width, height } = sheet;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let clipped = 0;
  const put = (x: number, y: number, rgb: Rgb | null): void => {
    const px = Math.floor(x), py = Math.floor(y);
    if (!(px >= 0 && py >= 0 && px < width && py < height)) {
      clipped++;
      return;
    }
    const i = (py * width + px) * 4;
    if (rgb) {
      pixels[i] = rgb[0];
      pixels[i + 1] = rgb[1];
      pixels[i + 2] = rgb[2];
      pixels[i + 3] = 255;
    } else pixels.fill(0, i, i + 4);
  };
  const target: IsoPixelTarget = {
    width,
    height,
    foot: { x: sheet.foot.x, y: sheet.foot.y },
    set: (x, y, rgb) => put(x, y, rgb),
    rect(x, y, w, h, rgb) {
      for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) put(x + u, y + v, rgb);
    },
    clear: (x, y) => put(x, y, null),
  };
  sheet.paint(target, info);
  return { pixels, clipped };
}

function mirror(width: number, height: number, src: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = (y * width + x) * 4, b = (y * width + (width - 1 - x)) * 4;
      out[b] = src[a]!;
      out[b + 1] = src[a + 1]!;
      out[b + 2] = src[a + 2]!;
      out[b + 3] = src[a + 3]!;
    }
  }
  return out;
}

/** Pure bake of one frame: SE / NE straight from the painter, SW / NW as exact mirrors about the foot column. */
export function bakeIsoFrame(sheet: IsoSheet, dir: IsoDir, anim: IsoAnim, frame: number, palette = ""): IsoFrameRaster {
  checkSheet(sheet);
  const f = clampFrame(anim, frame, sheet.walkFrames);
  const painted = paintBuffer(sheet, { dir: paintedDir(dir), anim, frame: f, palette });
  const mirrored = isMirroredDir(dir);
  const { width, height } = sheet;
  return {
    key: isoSpriteKey(sheet.identity, dir, anim, f, palette, sheet.walkFrames),
    width,
    height,
    anchor: { x: mirrored ? width - 1 - sheet.foot.x : sheet.foot.x, y: sheet.foot.y },
    pixels: mirrored ? mirror(width, height, painted.pixels) : painted.pixels,
    clipped: painted.clipped,
    mirrored,
  };
}

export interface IsoSpriteFrame {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly anchor: Vec;
  /** Undefined without a canvas (Node). */
  readonly canvas?: CanvasSurface;
}

function toCanvas(width: number, height: number, data: Uint8ClampedArray): CanvasSurface | undefined {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return undefined;
  try {
    const canvas = surface(width, height);
    const ctx = canvas.getContext("2d") as CanvasContext | null;
    if (!ctx || typeof ctx.createImageData !== "function") return undefined;
    const image = ctx.createImageData(width, height);
    image.data.set(data);
    ctx.putImageData(image, 0, 0);
    return canvas;
  } catch {
    return undefined;
  }
}

const frames = new Map<string, IsoSpriteFrame>();

/**
 * The cached frame of `sheet` for (dir, anim, frame, palette). The painter
 * only runs on a miss; beyond `ISO_SPRITE.cacheLimit` the least recently used
 * frame is dropped and its canvas released.
 */
export function isoSpriteFrame(sheet: IsoSheet, dir: IsoDir, anim: IsoAnim, frame: number, palette = ""): IsoSpriteFrame {
  const key = isoSpriteKey(sheet.identity, dir, anim, frame, palette, sheet.walkFrames);
  const hit = frames.get(key);
  if (hit) {
    frames.delete(key);
    frames.set(key, hit);
    return hit;
  }
  const r = bakeIsoFrame(sheet, dir, anim, frame, palette);
  const canvas = toCanvas(r.width, r.height, r.pixels);
  const entry: IsoSpriteFrame = { key, width: r.width, height: r.height, anchor: r.anchor, ...(canvas ? { canvas } : {}) };
  frames.set(key, entry);
  while (frames.size > ISO_SPRITE.cacheLimit) {
    const oldest = frames.keys().next().value!;
    const c = frames.get(oldest)!.canvas;
    if (c) { c.width = 0; c.height = 0; }
    frames.delete(oldest);
  }
  return entry;
}

/** Stamp a frame with its foot on the snapped screen point (x, y). */
export function drawIsoSprite(ctx: CanvasContext, f: IsoSpriteFrame, x: number, y: number): void {
  if (f.canvas) ctx.drawImage(f.canvas, snap(x) - f.anchor.x, snap(y) - f.anchor.y);
}

export function isoSpriteCacheSize(): number {
  return frames.size;
}
export function isoSpriteCacheKeys(): string[] {
  return [...frames.keys()];
}
export function clearIsoSpriteCache(): void {
  for (const f of frames.values()) if (f.canvas) { f.canvas.width = 0; f.canvas.height = 0; }
  frames.clear();
}
