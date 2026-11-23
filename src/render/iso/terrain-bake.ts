/**
 * Isometric ground bake (plan steps 2.2 / 2.3). The view's ground is a grid
 * of screen-space blocks (ISO_BLOCK px). Every block pixel inverse-projects
 * to a world point, asks the terrain field which material shows there and
 * takes its colour from the seamless diamond texture, whose phase is the
 * absolute screen pixel. A pixel is therefore a pure function of
 * (seed, px, py): blocks keyed by (seed, col, row) meet without seams.
 *
 * Ready blocks live in a small LRU whose area budget matches the old
 * 14-chunk ground cache; evicted canvases are released. Bakes run on the
 * terrain worker when OffscreenCanvas is available, otherwise in small
 * per-frame slices on the main thread. Missing blocks show a flat grass
 * placeholder inside the world diamond. No DOM reads, no RNG.
 */
import { CHUNK, WORLD } from "../../game/world-gen.js";
import { surface, type CanvasSurface } from "../../engine/surface.js";
import { prepareTerrainField, type FieldBox, type TerrainSample } from "./terrain-field.js";
import { MATERIAL_SURFACE, SURFACE_RAMP, surfaceRgb } from "./surface-texture.js";
import { rampColour, type Rgb } from "./palette.js";
import { neighbourMaterial, transitionRgb, type Sampler } from "./transitions.js";
import { roadRgb, roadSurface } from "./road-texture.js";
import { toScreen, toWorld } from "./projection.js";

type Ctx = CanvasRenderingContext2D;
type BlockImage = CanvasSurface | ImageBitmap;

const BLOCK_W = 512, BLOCK_H = 256;
export const ISO_BLOCK = {
  width: BLOCK_W,
  height: BLOCK_H,
  /** Same pixel area as the legacy ground cache: 14 chunks of CHUNK.width x CHUNK.height. */
  budgetArea: 14 * CHUNK.width * CHUNK.height,
  /** Ready blocks kept (budgetArea / block area). */
  limit: Math.floor((14 * CHUNK.width * CHUNK.height) / (BLOCK_W * BLOCK_H)),
  /** Rows baked between yields of the sliced main-thread fallback. */
  sliceRows: 4,
  /** Main-thread fallback budget per frame, like the legacy chunk painter. */
  localBudgetMs: 2,
  /** Screen pixels around the view that are warmed ahead. */
  prefetch: 128,
} as const;

export interface IsoBlockRequest {
  kind: "iso-block";
  id: number;
  seed: number;
  col: number;
  row: number;
}

/** World AABB of block (col, row): its screen rectangle's inverse-projected corners. */
export function blockWorldBox(col: number, row: number): FieldBox {
  const sx0 = col * BLOCK_W, sy0 = row * BLOCK_H, sx1 = sx0 + BLOCK_W, sy1 = sy0 + BLOCK_H;
  const pts = [toWorld(sx0, sy0), toWorld(sx1, sy0), toWorld(sx1, sy1), toWorld(sx0, sy1)];
  return {
    x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)),
    x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)),
  };
}
/** True when block (col, row) can show any world ground. */
export function blockTouchesWorld(col: number, row: number): boolean {
  const b = blockWorldBox(col, row);
  return b.x1 >= WORLD.minX && b.x0 <= WORLD.maxX && b.y1 >= WORLD.minY && b.y0 <= WORLD.maxY;
}

const inWorld = (x: number, y: number) => x >= WORLD.minX && x < WORLD.maxX && y >= WORLD.minY && y < WORLD.maxY;

/** Ground colour of screen pixel (px, py) at world point (x, y) with field sample `s`. */
function groundRgb(seed: number, px: number, py: number, x: number, y: number, s: TerrainSample, sample: Sampler): Rgb {
  const road = s.material === "road",
    surface = road ? roadSurface(s) : MATERIAL_SURFACE[s.material], n = neighbourMaterial(sample, x, y, s);
  return (n && transitionRgb(seed, px, py, x, y, s, n, SURFACE_RAMP[surface]))
    || (road ? roadRgb(seed, px, py, s) : surfaceRgb(seed, surface, px, py));
}

/**
 * Pure ground pixel at absolute screen pixel (px, py) for `seed`, sampled at
 * the pixel centre: [r, g, b, a], transparent outside WORLD. `sample` is a
 * terrain field (materialAt or a prepared field covering the point).
 */
export function isoGroundPixel(seed: number, px: number, py: number, sample: Sampler): readonly [number, number, number, number] {
  const w = toWorld(px + 0.5, py + 0.5);
  if (!inWorld(w.x, w.y)) return [0, 0, 0, 0];
  const [r, g, b] = groundRgb(seed, px, py, w.x, w.y, sample(w.x, w.y), sample);
  return [r, g, b, 255];
}

/** Bakes block (col, row) into `out` (RGBA, ISO_BLOCK size), yielding every few rows. */
export function* bakeBlockRows(seed: number, col: number, row: number, out: Uint8ClampedArray): Generator<void> {
  const field = prepareTerrainField(seed, blockWorldBox(col, row)),
    ox = col * BLOCK_W, oy = row * BLOCK_H;
  for (let y = 0; y < BLOCK_H; y++) {
    for (let x = 0; x < BLOCK_W; x++) {
      const px = ox + x, py = oy + y, w = toWorld(px + 0.5, py + 0.5), i = (y * BLOCK_W + x) * 4;
      if (!inWorld(w.x, w.y)) { out[i + 3] = 0; continue; }
      const rgb = groundRgb(seed, px, py, w.x, w.y, field(w.x, w.y), field);
      out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
    }
    if ((y + 1) % ISO_BLOCK.sliceRows === 0) yield;
  }
}
/** The RGBA pixels of block (col, row), baked in one go (tests, worker). */
export function bakeBlockPixels(seed: number, col: number, row: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(BLOCK_W * BLOCK_H * 4);
  for (const _ of bakeBlockRows(seed, col, row, out)) { /* finish the block */ }
  return out;
}
/** Copies baked pixels into a new block canvas. */
function blockCanvas(pixels: Uint8ClampedArray): CanvasSurface {
  const canvas = surface(BLOCK_W, BLOCK_H),
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx || typeof ctx.createImageData !== "function") throw new Error("No pixel context for the iso ground");
  const image = ctx.createImageData(BLOCK_W, BLOCK_H);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
/** Worker / fallback entry: block (col, row) as a canvas. */
export function buildIsoBlock(seed: number, col: number, row: number): CanvasSurface {
  return blockCanvas(bakeBlockPixels(seed, col, row));
}

// ---------------------------------------------------------------- cache

export interface BlockCache<T> {
  get(key: string): T | undefined;
  has(key: string): boolean;
  /** Stores `value`, then evicts least recently used entries over the limit that are not `keep`. */
  set(key: string, value: T, keep?: ReadonlySet<string>): void;
  readonly size: number;
  keys(): string[];
  clear(): void;
}
/** LRU map with a fixed entry limit; `release` frees each evicted or cleared value. */
export function createBlockCache<T>(limit: number, release: (value: T) => void): BlockCache<T> {
  const map = new Map<string, T>();
  return {
    get(key) {
      const value = map.get(key);
      if (value !== undefined) { map.delete(key); map.set(key, value); }
      return value;
    },
    has: (key) => map.has(key),
    set(key, value, keep) {
      const old = map.get(key);
      if (old !== undefined && old !== value) release(old);
      map.delete(key);
      map.set(key, value);
      for (const [k, v] of map) {
        if (map.size <= limit) break;
        if (k === key || keep?.has(k)) continue;
        release(v);
        map.delete(k);
      }
    },
    get size() { return map.size; },
    keys: () => [...map.keys()],
    clear() {
      for (const v of map.values()) release(v);
      map.clear();
    },
  };
}

function releaseBlock(image: BlockImage): void {
  if ("close" in image) image.close();
  else image.width = image.height = 0;
}
const blocks = createBlockCache<BlockImage>(ISO_BLOCK.limit, releaseBlock);
const blockKey = (seed: number, col: number, row: number) => seed + ":" + col + "," + row;
interface Tile { key: string; col: number; row: number }

let wanted = new Set<string>();
let worker: Worker | null | undefined;
let inFlight: { id: number; key: string } | undefined;
let requestId = 0;
let localBake: { key: string; pixels: Uint8ClampedArray; steps: Generator<void> } | undefined;
/** Keys whose canvas copy failed (no pixel context): placeholder only, never retried in a loop. */
const failed = new Set<string>();

function disableWorker(w: Worker): void {
  if (worker !== w) return;
  w.terminate();
  inFlight = undefined;
  worker = null;
}
function blockWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return worker = null;
  try {
    const w = new Worker(new URL("../terrain-worker.js", import.meta.url), { type: "module" });
    w.onmessage = ({ data }: MessageEvent<{ id: number; bitmap: ImageBitmap | null }>) => {
      const { id, bitmap } = data;
      if (worker !== w || inFlight?.id !== id) { bitmap?.close(); return; }
      const { key } = inFlight;
      inFlight = undefined;
      if (!bitmap) disableWorker(w);
      else if (wanted.has(key) && !blocks.has(key)) blocks.set(key, bitmap, wanted);
      else bitmap.close();
    };
    w.onerror = (event) => { event.preventDefault(); disableWorker(w); };
    w.onmessageerror = () => disableWorker(w);
    return worker = w;
  } catch {
    return worker = null;
  }
}
function warm(seed: number, tile: Tile | undefined): void {
  if (localBake && !wanted.has(localBake.key)) localBake = undefined;
  if (!tile || inFlight) return;
  const w = blockWorker();
  if (w) {
    const id = ++requestId, request: IsoBlockRequest = { kind: "iso-block", id, seed, col: tile.col, row: tile.row };
    inFlight = { id, key: tile.key };
    try { w.postMessage(request); return; } catch { disableWorker(w); }
  }
  if (!localBake || localBake.key !== tile.key) {
    const pixels = new Uint8ClampedArray(BLOCK_W * BLOCK_H * 4);
    localBake = { key: tile.key, pixels, steps: bakeBlockRows(seed, tile.col, tile.row, pixels) };
  }
  const deadline = performance.now() + ISO_BLOCK.localBudgetMs;
  do {
    if (!localBake.steps.next().done) continue;
    const { key, pixels } = localBake;
    localBake = undefined;
    try { blocks.set(key, blockCanvas(pixels), wanted); } catch { failed.add(key); }
    break;
  } while (performance.now() < deadline);
}

/** A screen-space rectangle in projected pixels. */
export interface ScreenRect { x0: number; y0: number; x1: number; y1: number }

function tilesIn(seed: number, r: ScreenRect): Tile[] {
  const out: Tile[] = [];
  const c0 = Math.floor(r.x0 / BLOCK_W), c1 = Math.floor((r.x1 - 0.001) / BLOCK_W),
    r0 = Math.floor(r.y0 / BLOCK_H), r1 = Math.floor((r.y1 - 0.001) / BLOCK_H);
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++)
      if (blockTouchesWorld(col, row)) out.push({ col, row, key: blockKey(seed, col, row) });
  return out;
}
/** Flat grass inside the world diamond while a block is still baking. */
function placeholder(ctx: Ctx, col: number, row: number): void {
  const x = col * BLOCK_W, y = row * BLOCK_H,
    d = [toScreen(WORLD.minX, WORLD.minY), toScreen(WORLD.maxX, WORLD.minY), toScreen(WORLD.maxX, WORLD.maxY), toScreen(WORLD.minX, WORLD.maxY)];
  ctx.save();
  if (typeof Path2D !== "undefined") {
    const clip = new Path2D(), diamond = new Path2D();
    clip.rect(x, y, BLOCK_W, BLOCK_H);
    d.forEach((p, i) => (i ? diamond.lineTo(p.x, p.y) : diamond.moveTo(p.x, p.y)));
    diamond.closePath();
    ctx.clip(clip);
    ctx.fillStyle = rampColour("grass", 2);
    ctx.fill(diamond);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.rect(x, y, BLOCK_W, BLOCK_H);
  ctx.clip();
  ctx.beginPath();
  d.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = rampColour("grass", 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the baked iso ground blocks covering `view` (projected screen
 * pixels; ctx already carries the camera translate / zoom), a placeholder
 * for blocks still baking, and warms the nearest missing block (visible
 * first, then a `prefetch` ring when asked).
 */
export function drawIsoGround(ctx: Ctx, seed: number, view: ScreenRect, prefetch = true): void {
  const mx = (view.x0 + view.x1) / 2, my = (view.y0 + view.y1) / 2, p = ISO_BLOCK.prefetch,
    distance = (t: Tile) => ((t.col + 0.5) * BLOCK_W - mx) ** 2 + ((t.row + 0.5) * BLOCK_H - my) ** 2,
    visible = tilesIn(seed, view).sort((a, b) => distance(a) - distance(b)), keys = new Set(visible.map((t) => t.key));
  const ahead = prefetch
    ? tilesIn(seed, { x0: view.x0 - p, y0: view.y0 - p, x1: view.x1 + p, y1: view.y1 + p })
      .filter((t) => !keys.has(t.key)).sort((a, b) => distance(a) - distance(b))
    : [];
  const want = [...visible, ...ahead.slice(0, Math.max(0, ISO_BLOCK.limit - visible.length))];
  wanted = new Set(want.map((t) => t.key));
  for (const { key, col, row } of visible) {
    const image = blocks.get(key);
    if (image) ctx.drawImage(image, col * BLOCK_W, row * BLOCK_H, BLOCK_W, BLOCK_H);
    else placeholder(ctx, col, row);
  }
  warm(seed, want.find((t) => !blocks.has(t.key) && !failed.has(t.key)));
}

/** Ready block count (tests). */
export function cachedIsoBlockCount(): number {
  return blocks.size;
}
/** Release block pixels and pending bake work with the run that owns them. */
export function clearIsoGroundCache(): void {
  worker?.terminate();
  worker = undefined;
  inFlight = undefined;
  localBake = undefined;
  wanted = new Set();
  failed.clear();
  blocks.clear();
}
