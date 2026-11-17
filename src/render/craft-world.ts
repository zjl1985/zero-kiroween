/**
 * The explorable papercraft town: per-chunk ground caches, roads, the map
 * hedge, landmark art and the y-sorted decor sprites. Everything is drawn by
 * code; offscreen canvases only cache what was drawn procedurally. Nothing
 * here touches the sim RNG or writes to SimState.
 */
import {
  CHUNK,
  FLAT_DECOR,
  LANDMARK,
  WORLD,
  biomeAt,
  chunkContent,
  chunkOf,
  isStartChunk,
  landmarkParts,
  landmarks,
  roads,
  type ChunkContent,
  type Decor,
  type DecorKind,
  type Landmark,
  type LandmarkKind,
  type Road,
} from "../game/world-gen.js";
import type { SimState } from "../game/types.js";
import { LANDMARK_DEFS } from "../defs/registries.js";
import { BIOME_ART, LANDMARK_ART, decorPiece, landmarkReach } from "./art-registry.js";
import { bossEnemy } from "../game/sim.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import type { Camera, ViewRect } from "./camera.js";
import { viewRect } from "./camera.js";
import { popupStep, popupTarget } from "./timeline.js";
import {
  bush,
  candles,
  cottage,
  drawLamp,
  fence,
  flower,
  grassTuft,
  groundTile,
  horizonHills,
  leaf,
  pumpkin,
  startYard,
  stone,
  tree,
  type GroundLamp,
} from "./craft-scene.js";
import {
  box,
  glow,
  grain,
  hash,
  line,
  mix,
  oval,
  path,
  piece,
  shadow,
  stitch,
  stroke,
  surface,
  type Ctx,
  type Point,
} from "./paper-material.js";

// ---------------------------------------------------------------- decor sprite cache
export interface Bounds {
  l: number;
  r: number;
  t: number;
  b: number;
}
/** Generic decor sprites; landmark pieces come from LANDMARK_ART (decorPiece). */
const BOUNDS: Record<string, Bounds> = {
  tree: { l: -82, r: 82, t: -158, b: 16 },
  cottage: { l: -120, r: 100, t: -144, b: 16 },
  bush: { l: -52, r: 52, t: -34, b: 10 },
  fence: { l: -46, r: 46, t: -42, b: 10 },
  stone: { l: -16, r: 16, t: -16, b: 8 },
  candles: { l: -22, r: 22, t: -36, b: 8 },
  pumpkin: { l: -22, r: 26, t: -32, b: 8 },
};
type Painter = (ctx: Ctx, x: number, y: number, s: number, seed: number) => void;
const PAINT: Record<keyof typeof BOUNDS, Painter> = {
  tree,
  cottage,
  bush,
  fence: (c, x, y, s) => fence(c, x, y, s),
  stone,
  candles: (c, x, y, s) => candles(c, x, y, s),
  pumpkin,
};
/** Variants per kind keep the cache small; pumpkins keep their carved bit (seed % 4). */
const VARIANTS: Partial<Record<DecorKind, number>> = { pumpkin: 8, tree: 6, cottage: 4, bush: 6, stone: 4 };
const spriteCache = new Map<string, HTMLCanvasElement>();
const PAD = 8;
function decorBounds(d: Decor): Bounds | null {
  if (d.kind === "lamp") return { l: -18, r: 18, t: -75 * d.s, b: 8 };
  const b = BOUNDS[d.kind] ?? decorPiece(d.kind)?.bounds;
  return b ? { l: b.l * d.s, r: b.r * d.s, t: b.t * d.s, b: b.b * d.s } : null;
}
function drawDecor(ctx: Ctx, d: Decor, time: number): void {
  if (d.kind === "lamp") {
    drawLamp(ctx, { x: d.x, y: d.y, s: Math.round(d.s * 20) / 20 }, time);
    return;
  }
  const own = BOUNDS[d.kind],
    extra = own ? undefined : decorPiece(d.kind),
    b = own ?? extra?.bounds,
    paint = own ? PAINT[d.kind as keyof typeof PAINT] : extra?.paint;
  if (!b || !paint) return;
  const s = Math.round(d.s * 20) / 20,
    v = Math.abs(d.seed) % ((own ? VARIANTS[d.kind] : extra?.variants) ?? 1),
    key = `${d.kind}-${s}-${v}`;
  let c = spriteCache.get(key);
  const w = (b.r - b.l) * s + PAD * 2,
    h = (b.b - b.t) * s + PAD * 2;
  if (!c) {
    if (spriteCache.size > 220) spriteCache.clear();
    c = surface(Math.ceil(w * 2), Math.ceil(h * 2));
    const g = c.getContext("2d")!;
    g.scale(2, 2);
    paint(g, -b.l * s + PAD, -b.t * s + PAD, s, v);
    spriteCache.set(key, c);
  }
  ctx.drawImage(c, d.x + b.l * s - PAD, d.y + b.t * s - PAD, Math.ceil(w * 2) / 2, Math.ceil(h * 2) / 2);
}

// ---------------------------------------------------------------- flat art baked in chunks
function flatDecor(ctx: Ctx, d: Decor): void {
  const { x, y, s, seed } = d;
  if (d.kind === "flowers") {
    for (let i = 0; i < 4; i++) flower(ctx, x + (i - 1.5) * 6 * s, y + Math.sin(i + seed) * 4, 0.6 * s, seed + i);
    grassTuft(ctx, x - 9 * s, y + 3, 0.7 * s, seed);
  } else if (d.kind === "tuft") {
    grassTuft(ctx, x, y, 0.8 * s, seed);
    grassTuft(ctx, x + 7 * s, y + 2, 0.6 * s, seed + 5);
  } else if (d.kind === "leaves") {
    for (let i = 0; i < 8; i++)
      leaf(
        ctx,
        x + (hash(seed + i) - 0.5) * 34 * s,
        y + hash(seed + i * 7) * 10,
        6 + hash(seed + i * 3) * 3,
        3,
        hash(seed + i * 11) * 6,
        ["#b97a3e", "#9f5740", "#b68b48"][i % 3]!,
        i,
      );
  }
}
function roadPath(points: readonly { x: number; y: number }[], off = 0): Path2D {
  // Offset polyline (for the stitched edges), then smoothed through midpoints.
  const pts = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!,
      b = points[Math.min(points.length - 1, i + 1)]!,
      len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x + (-(b.y - a.y) / len) * off, y: p.y + ((b.x - a.x) / len) * off };
  });
  const p = new Path2D();
  p.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!,
      b = pts[i + 1]!;
    p.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  p.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
  return p;
}
function roadHits(r: Road, x0: number, y0: number, x1: number, y1: number): boolean {
  const pad = r.width + 30;
  return r.points.some((p, i) => {
    const q = r.points[Math.min(i + 1, r.points.length - 1)]!;
    return Math.max(p.x, q.x) + pad >= x0 && Math.min(p.x, q.x) - pad <= x1 && Math.max(p.y, q.y) + pad >= y0 && Math.min(p.y, q.y) - pad <= y1;
  });
}
/** A cut-paper road strip: contact shadow, dark cut edge, light top edge, pebbles and stitching. */
function drawRoad(ctx: Ctx, r: Road, ri: number): void {
  const p = roadPath(r.points),
    w = r.width * 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(-0.9, 2.6);
  stroke(ctx, p, "rgba(15,10,25,.42)", w + 4);
  ctx.restore();
  stroke(ctx, p, "#5f5243", w + 2.2);
  stroke(ctx, p, "#bfb399", w);
  ctx.save();
  ctx.translate(-0.35, -0.6);
  stroke(ctx, p, "#e4cfaa", 1.1, 0.5);
  ctx.restore();
  ctx.restore();
  // Pebbles, placed by world position so every chunk agrees.
  for (let i = 0; i < r.points.length - 1; i++) {
    const a = r.points[i]!,
      b = r.points[i + 1]!,
      len = Math.hypot(b.x - a.x, b.y - a.y),
      nx = -(b.y - a.y) / (len || 1),
      ny = (b.x - a.x) / (len || 1);
    for (let k = 0; k < len; k += 7) {
      const seed = ri * 100003 + i * 7919 + k,
        t = k / len,
        across = (hash(seed) - 0.5) * r.width * 1.3,
        x = a.x + (b.x - a.x) * t + nx * across,
        y = a.y + (b.y - a.y) * t + ny * across,
        d = new Path2D();
      d.ellipse(x, y, 1 + hash(seed + 8) * 2, 0.3 + hash(seed + 1) * 0.6, hash(seed + 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = seed % 3 ? "rgba(95,77,64,.14)" : "rgba(245,224,186,.3)";
      ctx.fill(d);
    }
  }
  for (const side of [-1, 1]) stitch(ctx, roadPath(r.points, side * (r.width - 3.5)), "#826c55", 0.9);
}
/** The map edge: a paper hedge on the west, east and south. */
function drawHedge(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const step = 24,
    colors = ["#3f4a3a", "#4a5440", "#35402f", "#45503d"];
  const clump = (x: number, y: number, i: number) => {
    const p = oval(x, y, 30 + hash(i) * 8, 21 + hash(i + 5) * 6, i, 0.14);
    piece(ctx, p, colors[Math.abs(i) % 4]!, { shadow: 2.6, edge: "#7d8a5c", texture: 0.85, thickness: 1 });
    stitch(ctx, oval(x, y, 26 + hash(i) * 8, 17 + hash(i + 5) * 6, i, 0.13), "#9aa36a", 0.55);
    for (let j = 0; j < 3; j++)
      leaf(ctx, x + (hash(i * 3 + j) - 0.5) * 30, y + 8, 8 + hash(i + j) * 4, 3, (hash(i * 5 + j) - 0.5) * 2, ["#5e6a45", "#8a6846", "#6d7a4c"][j]!, j);
  };
  if (x0 < WORLD.minX + 80)
    for (let y = Math.max(190, Math.floor(y0 / step) * step - step); y < y1 + step; y += step)
      clump(WORLD.minX + 12 + hash(y) * 8, y, Math.floor(y / step) * 3 + 1);
  if (x1 > WORLD.maxX - 80)
    for (let y = Math.max(190, Math.floor(y0 / step) * step - step); y < y1 + step; y += step)
      clump(WORLD.maxX - 12 - hash(y + 1) * 8, y, Math.floor(y / step) * 3 + 2);
  if (y1 > WORLD.maxY - 80)
    for (let x = Math.floor(x0 / step) * step - step; x < x1 + step; x += step)
      clump(x, WORLD.maxY - 10 - hash(x) * 8, Math.floor(x / step) * 3);
}
/** Ground patch grid: one possible cluster per cell, its biome from the cell centre's chunk. */
const PATCH = { cell: 150, margin: 110, r: [46, 84] } as const;
/**
 * District ground detail in a chunk's cache: clustered patches placed on a
 * world grid by render hashes, so every chunk that overlaps a patch draws it
 * the same way and district edges follow chunk ownership.
 */
function biomeGround(ctx: Ctx, seed: number, x0: number, y0: number, x1: number, y1: number): void {
  const c = PATCH.cell,
    ia = Math.floor((x0 - PATCH.margin) / c),
    ib = Math.floor((x1 + PATCH.margin) / c),
    ja = Math.floor((y0 - PATCH.margin) / c),
    jb = Math.floor((y1 + PATCH.margin) / c);
  for (let j = ja; j <= jb; j++)
    for (let i = ia; i <= ib; i++) {
      const sd = seed * 31 + i * 7919 + j * 104729,
        x = (i + 0.2 + hash(sd) * 0.6) * c,
        y = (j + 0.2 + hash(sd + 1) * 0.6) * c;
      if (y < WORLD.playTop + 10 || (y < 560 && x > -40 && x < 1000)) continue;
      if (x < WORLD.minX + 60 || x > WORLD.maxX - 60 || y > WORLD.maxY - 50) continue;
      const { cx, cy } = chunkOf(x, y),
        art = BIOME_ART.find(biomeAt(seed, cx, cy).id);
      if (!art || hash(sd + 2) > art.patchChance) continue;
      const r = PATCH.r[0] + hash(sd + 3) * (PATCH.r[1] - PATCH.r[0]);
      if (x + r < x0 - 20 || x - r > x1 + 20 || y + r < y0 - 20 || y - r > y1 + 20) continue;
      art.patch(ctx, x, y, r, Math.floor(hash(sd + 4) * 1e5));
    }
}
/** Ground-level landmark art baked into the chunk caches. */
function landmarkGround(ctx: Ctx, l: Landmark): void {
  LANDMARK_ART.find(l.kind)?.ground(ctx, l);
}
/** Span of the river band in a stand-alone landmark preview. */
const PREVIEW_SPAN = 260;
/**
 * A landmark kind on its own, centred on (0, 0): its ground art, then its
 * decor (flat first, tall ones y-sorted). For the ?gallery=1 page; the world
 * itself draws landmarks through the chunk caches and worldSprites.
 */
export function landmarkPreview(kind: LandmarkKind, seed = 7): { bounds: Bounds; draw(ctx: Ctx, time: number): void } {
  const l: Landmark = {
      id: `preview-${kind}`,
      kind,
      x: 0,
      y: 0,
      radius: LANDMARK_DEFS.get(kind).radius,
      seed,
      ...(LANDMARK_DEFS.get(kind).span ? { span: PREVIEW_SPAN } : {}),
    },
    { decor } = landmarkParts(l),
    reach = landmarkReach(l),
    bounds: Bounds = { l: -reach, r: reach, t: -reach * 0.7, b: reach * 0.7 };
  for (const d of decor) {
    const bd = decorBounds(d);
    if (!bd) continue;
    bounds.l = Math.min(bounds.l, d.x + bd.l);
    bounds.r = Math.max(bounds.r, d.x + bd.r);
    bounds.t = Math.min(bounds.t, d.y + bd.t);
    bounds.b = Math.max(bounds.b, d.y + bd.b);
  }
  return {
    bounds,
    draw(ctx, time) {
      landmarkGround(ctx, l);
      for (const d of decor) if (FLAT_DECOR.has(d.kind)) flatDecor(ctx, d);
      for (const d of decor.filter((d) => !FLAT_DECOR.has(d.kind)).sort((a, b) => a.y - b.y)) drawDecor(ctx, d, time);
    },
  };
}

// ---------------------------------------------------------------- chunk caches
interface CachedChunk {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
}
const chunkCache = new Map<string, CachedChunk>();
/** Canvases kept alive; each is 960 x 1080 device pixels (about 4 MB). */
const MAX_CHUNK_CANVASES = 14;
/** World margin around the view whose missing chunks are built ahead, one per frame. */
const PREFETCH = 320;
function cacheKey(seed: number, cx: number, cy: number): string {
  return isStartChunk(cx, cy) ? `start:${cx}` : `${seed}:${cx},${cy}`;
}
function contentAround(seed: number, cx: number, cy: number): ChunkContent[] {
  const out: ChunkContent[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(chunkContent(seed, cx + dx, cy + dy));
  return out;
}
function buildChunk(seed: number, cx: number, cy: number): HTMLCanvasElement {
  const c = chunkContent(seed, cx, cy),
    canvas = surface(CHUNK.width * 2, CHUNK.height * 2),
    ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.translate(-c.x, -c.y);
  if (c.start) {
    ctx.drawImage(startYard(), 0, 0, 960, 540);
    return canvas;
  }
  const x0 = c.x,
    y0 = c.y,
    x1 = c.x + c.w,
    y1 = c.y + c.h,
    around = contentAround(seed, cx, cy),
    lamps: GroundLamp[] = [];
  for (const n of around)
    for (const d of n.decor)
      if (d.kind === "lamp" && d.x > x0 - 90 && d.x < x1 + 90 && d.y > y0 - 60 && d.y < y1 + 60) lamps.push(d);
  if (cy === 0) horizonHills(ctx, x0, x1);
  groundTile(ctx, x0, y0, c.w, c.h, lamps, cy === 0);
  biomeGround(ctx, seed, x0, y0, x1, y1);
  for (const l of landmarks(seed)) {
    const reach = landmarkReach(l);
    if (l.x + reach >= x0 && l.x - reach <= x1 && l.y + reach >= y0 && l.y - reach <= y1) landmarkGround(ctx, l);
  }
  const rs = roads(seed);
  // Branches first; the spine is laid over their joints.
  for (let i = rs.length - 1; i >= 0; i--) if (roadHits(rs[i]!, x0, y0, x1, y1)) drawRoad(ctx, rs[i]!, i);
  for (const n of around)
    for (const d of n.decor)
      if (FLAT_DECOR.has(d.kind) && d.x > x0 - 50 && d.x < x1 + 50 && d.y > y0 - 30 && d.y < y1 + 30) flatDecor(ctx, d);
  for (const l of lamps) glow(ctx, l.x, l.y, 55, "#eab563", 0.13, 0.55);
  drawHedge(ctx, x0, y0, x1, y1);
  return canvas;
}
function chunkCanvas(seed: number, cx: number, cy: number): HTMLCanvasElement {
  const key = cacheKey(seed, cx, cy);
  let entry = chunkCache.get(key);
  if (!entry) {
    entry = { canvas: buildChunk(seed, cx, cy), cx, cy };
    chunkCache.set(key, entry);
  } else {
    // Map order doubles as recency for eviction.
    chunkCache.delete(key);
    chunkCache.set(key, entry);
  }
  return entry.canvas;
}
function chunkRange(r: ViewRect) {
  const a = chunkOf(r.x0, r.y0),
    b = chunkOf(r.x1 - 0.001, r.y1 - 0.001);
  return { a, b };
}
/**
 * Draws the cached ground of every chunk the view touches (world space),
 * builds at most one chunk ahead of the camera per frame, and evicts the
 * least recently drawn caches beyond the budget.
 */
export function drawChunks(ctx: Ctx, seed: number, cam: Camera): void {
  const view = viewRect(cam),
    { a, b } = chunkRange(view),
    visible = new Set<string>();
  let built = false;
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) {
      const key = cacheKey(seed, cx, cy);
      visible.add(key);
      if (!chunkCache.has(key)) built = true;
      ctx.drawImage(chunkCanvas(seed, cx, cy), cx * CHUNK.width, cy * CHUNK.height, CHUNK.width, CHUNK.height);
    }
  if (!built) {
    const ahead = chunkRange(viewRect(cam, PREFETCH));
    let best: { cx: number; cy: number; d: number } | null = null;
    for (let cy = ahead.a.cy; cy <= ahead.b.cy; cy++)
      for (let cx = ahead.a.cx; cx <= ahead.b.cx; cx++) {
        if (chunkCache.has(cacheKey(seed, cx, cy))) continue;
        const d = Math.hypot((cx + 0.5) * CHUNK.width - cam.x, (cy + 0.5) * CHUNK.height - cam.y);
        if (!best || d < best.d) best = { cx, cy, d };
      }
    if (best) {
      const key = cacheKey(seed, best.cx, best.cy);
      chunkCache.set(key, { canvas: buildChunk(seed, best.cx, best.cy), cx: best.cx, cy: best.cy });
    }
  }
  for (const key of chunkCache.keys()) {
    if (chunkCache.size <= MAX_CHUNK_CANVASES) break;
    if (!visible.has(key)) chunkCache.delete(key);
  }
}
/** How many chunk canvases are cached (for the budget test and debugging). */
export function cachedChunkCount(): number {
  return chunkCache.size;
}

// ---------------------------------------------------------------- sprites
export interface WorldSprite {
  y: number;
  draw: () => void;
}
export interface VisibleLamp {
  x: number;
  y: number;
  s: number;
}
/** Pieces that fold up like a pop-up book page as the cat approaches. */
const POP_KINDS: ReadonlySet<DecorKind> = new Set<DecorKind>(["tree", "cottage"]);
const pops = (kind: DecorKind) => POP_KINDS.has(kind) || !!decorPiece(kind)?.popup;
/** Render-only fold per piece (never SimState); pieces out of view are forgotten. */
const folds = new Map<string, number>();
let foldTime: number | null = null;
export interface PopupView {
  /** The cat's position; without it everything stands. */
  cat: { x: number; y: number } | null;
  reduced: boolean;
}
/** Current fold (0..1) of a piece, eased toward its distance target. */
function foldOf(d: Decor, pop: PopupView, dt: number): number {
  if (!pop.cat) return 1;
  const key = `${d.kind}:${d.x},${d.y}`,
    target = popupTarget(Math.hypot(d.x - pop.cat.x, d.y - pop.cat.y)),
    // A piece entering the view starts where it should be.
    next = popupStep(folds.get(key) ?? target, target, dt, pop.reduced);
  folds.set(key, next);
  return next;
}
/** The hinge crease and darkening of a page that is not fully up. */
function drawFolded(ctx: Ctx, d: Decor, bd: Bounds, f: number, paint: () => void): void {
  if (f >= 0.995) {
    paint();
    return;
  }
  ctx.save();
  ctx.filter = `brightness(${(0.72 + 0.28 * f).toFixed(3)})`;
  ctx.translate(d.x, d.y);
  ctx.scale(1, f);
  ctx.translate(-d.x, -d.y);
  paint();
  ctx.restore();
  // Paper hinge: a dark crease with a pale lip along the base.
  const l = d.x + bd.l * 0.75,
    r = d.x + bd.r * 0.75;
  line(ctx, l, d.y + 2, r, d.y + 2, "#14101f", 2, 0.45 * (1 - f));
  line(ctx, l, d.y + 0.5, r, d.y + 0.5, "#e7cf9c", 0.8, 0.5 * (1 - f));
}
/**
 * Tall decor (trees, cottages, lamps, landmark buildings) inside the view,
 * as y-sorted sprites. Lamps are also returned for ground light and glow.
 * With `pop`, buildings and trees fold up near the cat (pop-up book).
 */
export function worldSprites(
  ctx: Ctx,
  seed: number,
  cam: Camera,
  time: number,
  fade?: (d: Decor) => boolean,
  pop?: PopupView,
): { sprites: WorldSprite[]; lamps: VisibleLamp[] } {
  const dt = foldTime === null ? 0 : Math.min(0.1, Math.max(0, time - foldTime));
  foldTime = time;
  if (folds.size > 800) folds.clear();
  const view = viewRect(cam),
    { a, b } = chunkRange(viewRect(cam, 480)),
    sprites: WorldSprite[] = [],
    lamps: VisibleLamp[] = [];
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) {
      for (const d of chunkContent(seed, cx, cy).decor) {
        if (FLAT_DECOR.has(d.kind)) continue;
        const bd = decorBounds(d);
        if (!bd) continue;
        // Cull by the sprite's own bounds.
        if (d.x + bd.r < view.x0 || d.x + bd.l > view.x1 || d.y + bd.b < view.y0 || d.y + bd.t > view.y1) continue;
        if (d.kind === "lamp") lamps.push(d);
        const f = pop && pops(d.kind) ? foldOf(d, pop, dt) : 1;
        sprites.push({
          y: d.y,
          draw: () =>
            drawFolded(ctx, d, bd, f, () => {
              if (fade?.(d)) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                drawDecor(ctx, d, time);
                ctx.restore();
              } else drawDecor(ctx, d, time);
            }),
        });
      }
    }
  return { sprites, lamps };
}

// ---------------------------------------------------------------- navigation
export interface NavTarget {
  x: number;
  y: number;
  kind: "landmark" | "boss" | "chest";
  label: MessageKey;
}
/**
 * Off-screen targets worth an arrow: the nearest undiscovered landmark, the
 * Boss while it is alive and the nearest unopened chest.
 */
export function navTargets(sim: SimState): NavTarget[] {
  const out: NavTarget[] = [],
    p = sim.player;
  let best: Landmark | null = null,
    bestD = Infinity;
  for (const l of landmarks(sim.seed)) {
    if (sim.landmarksFound.includes(l.id)) continue;
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  if (best) out.push({ x: best.x, y: best.y, kind: "landmark", label: `landmark.${best.kind}` as MessageKey });
  const boss = bossEnemy(sim);
  if (boss) out.push({ x: boss.x, y: boss.y, kind: "boss", label: "nav.boss" });
  // The nearest unopened chest.
  let chest: { x: number; y: number } | null = null,
    chestD = Infinity;
  for (const c of sim.chests) {
    if (!c.alive) continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < chestD) {
      chestD = d;
      chest = c;
    }
  }
  if (chest) out.push({ x: chest.x, y: chest.y, kind: "chest", label: "nav.chest" });
  return out;
}
const NAV_INSET = { side: 44, top: 78, bottom: 70 } as const;
/** Paper arrow tabs on the screen edge, pointing at off-screen targets. Screen space. */
export function drawNavArrows(ctx: Ctx, sim: SimState, cam: Camera, locale: Locale, time: number): void {
  const W = 960,
    H = 540;
  for (const target of navTargets(sim)) {
    const sx = target.x - cam.x + W / 2,
      sy = target.y - cam.y + H / 2;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const cx = W / 2,
      cy = H / 2,
      dx = sx - cx,
      dy = sy - cy,
      hw = cx - NAV_INSET.side,
      top = cy - NAV_INSET.top,
      bottom = H - NAV_INSET.bottom - cy,
      k = Math.min(Math.abs(hw / (dx || 1e-6)), dy < 0 ? top / -dy : bottom / (dy || 1e-6)),
      ax = cx + dx * k,
      ay = cy + dy * k,
      ang = Math.atan2(dy, dx),
      boss = target.kind === "boss",
      chest = target.kind === "chest",
      bob = Math.sin(time * 3 + (boss ? 1 : 0)) * 1.5;
    ctx.save();
    ctx.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
    // The pointer: a folded paper triangle.
    ctx.save();
    ctx.rotate(ang);
    piece(ctx, path([[16, 0], [2, -8], [5, 0], [2, 8]]), boss ? "#b4564a" : chest ? "#a8643d" : "#e9c27a", {
      shadow: 1.6,
      edge: boss ? "#f0a090" : chest ? "#e5bd62" : "#fff0c4",
      texture: 0.6,
      thickness: 0.8,
    });
    ctx.restore();
    // The label tab sits on the inner side of the pointer.
    const label = t(locale, target.label);
    ctx.font = "700 10px Georgia, serif";
    const tw = ctx.measureText(label).width + 14,
      lx = -Math.cos(ang) * (tw / 2 + 10) - tw / 2,
      ly = -Math.sin(ang) * 16 - 8;
    const tab = box(lx, ly, tw, 16, label.length);
    piece(ctx, tab, boss ? "#5a2f37" : "#e8d5ad", { shadow: 1.8, edge: boss ? "#a65a4d" : "#fff1cf", texture: 0.7, thickness: 0.9 });
    stitch(ctx, box(lx + 2, ly + 2, tw - 4, 12, label.length + 1), boss ? "#d39a7c" : "#a88a60", 0.7);
    ctx.fillStyle = boss ? "#f6dcc2" : "#4a3328";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, lx + tw / 2, ly + 8.5);
    ctx.restore();
  }
}
