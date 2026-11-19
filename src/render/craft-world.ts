/**
 * The explorable papercraft town: per-chunk ground caches, roads, the map
 * hedge, landmark art and the y-sorted decor sprites. Everything is drawn by
 * code; offscreen canvases only cache what was drawn procedurally. Nothing
 * here touches the sim RNG or writes to SimState.
 */
import type { CanvasSurface } from "../engine/surface.js";
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
} from "../game/world-gen.js";
import type { InteractState, SimState } from "../game/types.js";
import { waterRegionsNear } from "../game/water.js";
import { drawWaterCrossings, drawWaterGround, drawWaterShape } from "./water-art.js";
import { MOON_LANTERN } from "../game/interactions.js";
import { cachedSprite } from "../engine/sprite.js";
import { LANDMARK_DEFS } from "../defs/registries.js";
import { BIOME_ART, LANDMARK_ART, decorPiece, landmarkReach } from "./art-registry.js";
import { bossEnemy } from "../game/sim.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import type { Camera, ViewRect } from "./camera.js";
import { viewRect } from "./camera.js";
import { popupStep, popupTarget } from "./timeline.js";
import { drawInteractable } from "./craft-juice.js";
import { tintedSprite } from "./sprite-tint.js";
import { drawSketched, sketchedSprite } from "./sprite-sketch.js";
import { patchSpots, sheetGround, sheetOutline, sheetsIn } from "./paper-ground.js";
import { constructionLine, hatch, pencilFootprint, pencilGround, pencilLine, pencilPatch, PENCIL, rawPaper, shadeAlong, subdivide } from "./pencil.js";
import { insidePolygon } from "../defs/weapons/paper-geometry.js";
import { PAPER_VALUE } from "./paper-rules.js";
import { gradeCanvas } from "./paper-value.js";
import { drawRoadNetwork } from "./road-art.js";
import { clipOutsideLawn, drawLawnEdge, drawLawnVerge, lawnContour, reachesLawn, yardDistance } from "./start-lawn.js";
import {
  bush,
  candles,
  cottage,
  drawLamp,
  fence,
  flower,
  grassTuft,
  groundOutline,
  groundTilePasses,
  groundUnderlay,
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
  surface,
  withFlatShadows,
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
/** Can a foreground paper piece cover the player's head or body? */
export function paperOccludesActor(x: number, y: number, s: number, b: Bounds, actor: { x: number; y: number }): boolean {
  return actor.y <= y && actor.x + 26 > x + b.l * s && actor.x - 26 < x + b.r * s &&
    actor.y + 8 > y + b.t * s && actor.y - 68 < y + b.b * s;
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
const PAD = 8;
function decorBounds(d: Decor): Bounds | null {
  if (d.kind === "lamp") return { l: -18, r: 18, t: -75 * d.s, b: 8 };
  const b = BOUNDS[d.kind] ?? decorPiece(d.kind)?.bounds;
  return b ? { l: b.l * d.s, r: b.r * d.s, t: b.t * d.s, b: b.b * d.s } : null;
}
function drawDecor(ctx: Ctx, d: Decor, time: number, shade = 0, activity?: Readonly<SimState["landmarkEvents"][string]>, pencil = 0): void {
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
    w = (b.r - b.l) * s + PAD * 2,
    h = (b.b - b.t) * s + PAD * 2,
    ax = -b.l * s + PAD,
    ay = -b.t * s + PAD,
    sprite = cachedSprite(
      `decor:${d.kind}:${s}:${v}`,
      w,
      h,
      2,
      (c, canvas) => {
        withFlatShadows(() => paint(c, ax, ay, s, v));
        // Plain decor sits a step below the actors; landmark pieces keep their full value.
        if (own) gradeCanvas(canvas, PAPER_VALUE.decor);
      },
      { x: ax / w, y: ay / h },
    );
  // Pieces standing on colourless paper show their pencil version (cached per sprite and step).
  sketchedSprite(tintedSprite(sprite, "#000000", 0.28 * shade), pencil).draw(ctx, { x: d.x, y: d.y });
  const live = extra?.live;
  if (live) drawSketched(ctx, pencil, d.x, d.y, { l: b.l * s, r: b.r * s, t: b.t * s, b: b.b * s }, (c) => live(c, d.x, d.y, s, v, time, activity));
}

// ---------------------------------------------------------------- flat art baked in chunks
function flatDecor(ctx: Ctx, d: Decor): void {
  withFlatShadows(() => flatDecorPieces(ctx, d));
}
function flatDecorPieces(ctx: Ctx, d: Decor): void {
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
/**
 * District ground detail in a chunk's cache: clustered patches placed on a
 * world grid by render hashes (patchSpots), so every chunk that overlaps a
 * patch draws it the same way.
 */
function* biomeGround(ctx: Ctx, seed: number, x0: number, y0: number, x1: number, y1: number): Generator<void> {
  for (const s of patchSpots(seed, x0, y0, x1, y1)) {
    s.art.patch(ctx, s.x, s.y, s.r, s.seed);
    yield;
  }
}
/** Ground-level landmark art baked into the chunk caches. */
function landmarkGround(ctx: Ctx, l: Landmark): void {
  const art = LANDMARK_ART.find(l.kind);
  withFlatShadows(() => {
    art?.base(ctx, l);
    art?.ground(ctx, l);
  });
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
    { decor, spots } = landmarkParts(l),
    interactables: InteractState[] = spots.map((s, i) => ({
      ...s, id: i + 1, lit: 0, cooldown: 0, tick: 0,
      charge: s.kind === "lantern" ? MOON_LANTERN.startCharge : 0,
    })),
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
  for (const o of interactables) {
    // Include the ready flame tag / hanging moon tag, not just the prop body.
    const s = o.s ?? 1;
    bounds.l = Math.min(bounds.l, o.x - 5);
    bounds.r = Math.max(bounds.r, o.x + (o.kind === "lantern" ? 26 : 5));
    bounds.t = Math.min(bounds.t, o.y - (o.kind === "lantern" ? 78 : 33 * s + 9));
  }
  return {
    bounds,
    draw(ctx, time) {
      for (const water of LANDMARK_DEFS.get(kind).water?.(l) ?? []) drawWaterShape(ctx, water);
      landmarkGround(ctx, l);
      for (const d of decor) if (FLAT_DECOR.has(d.kind)) flatDecor(ctx, d);
      const sprites: WorldSprite[] = decor.filter((d) => !FLAT_DECOR.has(d.kind))
        .map((d) => ({ y: d.y, draw: () => drawDecor(ctx, d, time) }));
      // Layouts already include the bodies; match the world's overlay order.
      for (const o of interactables) sprites.push({ y: o.y + 0.1, draw: () => drawInteractable(ctx, o, time) });
      for (const sprite of sprites.sort((a, b) => a.y - b.y)) sprite.draw();
    },
  };
}

// ---------------------------------------------------------------- chunk caches
type ChunkImage = CanvasSurface | ImageBitmap;
/** A chunk tile bake: the painted ground, or the pencil underdrawing that washed paper reveals. */
export type ChunkLayer = "paint" | "sketch";
interface ChunkTile {
  key: string;
  cx: number;
  cy: number;
  layer?: ChunkLayer;
}
export interface TerrainRequest {
  id: number;
  seed: number;
  cx: number;
  cy: number;
  /** Which bake: the painted ground (default) or its pencil underdrawing. */
  layer?: ChunkLayer;
}
export interface TerrainReply {
  id: number;
  bitmap: ImageBitmap | null;
}
const chunkCache = new Map<string, ChunkImage>();
/** Each full tile is 960 × 1080 device pixels. Keep at most 14 plus one in progress. */
const MAX_CHUNK_CANVASES = 14;
const PREFETCH = 320;
const LOCAL_PAINT_BUDGET_MS = 2;

let wantedChunks = new Set<string>();
let chunkWorker: Worker | null | undefined;
let inFlight: { id: number; key: string } | undefined;
let requestId = 0;
let localPaint: { key: string; canvas: CanvasSurface; steps: Generator<void> } | undefined;

function cacheKey(seed: number, cx: number, cy: number): string {
  return isStartChunk(cx, cy) ? "start:" + cx : seed + ":" + cx + "," + cy;
}
function contentAround(seed: number, cx: number, cy: number): ChunkContent[] {
  const out: ChunkContent[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(chunkContent(seed, cx + dx, cy + dy));
  return out;
}
function* paintChunk(canvas: CanvasSurface, seed: number, cx: number, cy: number): Generator<void> {
  const c = chunkContent(seed, cx, cy),
    // Keep the worker's one-off raster work off the foreground GPU queue.
    ctx = canvas.getContext("2d", { willReadFrequently: typeof document === "undefined" })!;
  ctx.scale(2, 2);
  ctx.translate(-c.x, -c.y);
  if (c.start) {
    ctx.drawImage(startYard(), 0, 0, 960, 540);
    gradeCanvas(canvas, PAPER_VALUE.ground);
    return;
  }
  const x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
  const tile = { x0, y0, x1, y1 };
  const around = contentAround(seed, cx, cy), lamps: GroundLamp[] = [];
  for (const n of around)
    for (const d of n.decor)
      if (d.kind === "lamp" && d.x > x0 - 90 && d.x < x1 + 90 && d.y > y0 - 60 && d.y < y1 + 60) lamps.push(d);
  if (cy === 0) horizonHills(ctx, x0, x1);
  yield;
  yield* groundTilePasses(ctx, x0, y0, c.w, c.h, lamps, cy === 0);
  // Large district paper sheets over the pulp, clipped to the ground silhouette (horizon row).
  ctx.save();
  ctx.clip(groundOutline(x0, y0, c.w, c.h, cy === 0));
  ctx.save();
  clipOutsideLawn(ctx, tile);
  yield* sheetGround(ctx, seed, x0, y0, x1, y1);
  ctx.restore();
  // The stock is cut around the lawn: shadow, card side, rim, lip and fringe, not a raw clip line.
  drawLawnEdge(ctx, tile, seed);
  ctx.restore();
  drawLawnVerge(ctx, tile, seed);
  yield* biomeGround(ctx, seed, x0, y0, x1, y1);
  const waters = waterRegionsNear(seed, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(c.w, c.h) / 2 + 24);
  for (const water of waters) {
    drawWaterGround(ctx, water);
    yield;
  }
  for (const l of landmarks(seed)) {
    const reach = landmarkReach(l);
    if (l.x + reach < x0 || l.x - reach > x1 || l.y + reach < y0 || l.y - reach > y1) continue;
    landmarkGround(ctx, l);
    yield;
  }
  yield* drawRoadNetwork(ctx, seed, tile);
  for (const water of waters) drawWaterCrossings(ctx, water);
  for (const n of around)
    for (const d of n.decor) {
      if (!FLAT_DECOR.has(d.kind) || d.x <= x0 - 50 || d.x >= x1 + 50 || d.y <= y0 - 30 || d.y >= y1 + 30) continue;
      flatDecor(ctx, d);
      yield;
    }
  drawHedge(ctx, x0, y0, x1, y1);
  // The whole baked ground steps down in value; lamp pools are laid per frame (world.ts).
  gradeCanvas(canvas, PAPER_VALUE.ground);
}
/** Drain the same painter on the worker, or copy an already cached start yard. */
export function buildChunk(seed: number, cx: number, cy: number, layer: ChunkLayer = "paint"): CanvasSurface {
  const canvas = surface(CHUNK.width * 2, CHUNK.height * 2);
  for (const _ of paintLayer(canvas, seed, cx, cy, layer)) { /* finish the tile */ }
  return canvas;
}
function paintLayer(canvas: CanvasSurface, seed: number, cx: number, cy: number, layer: ChunkLayer): Generator<void> {
  return layer === "sketch" ? paintSketchChunk(canvas, seed, cx, cy) : paintChunk(canvas, seed, cx, cy);
}
/** Run segments of a polyline that come near a box (keeps long roads cheap to sketch). */
function runsNear(points: readonly { x: number; y: number }[], pad: number, x0: number, y0: number, x1: number, y1: number): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!,
      near = Math.max(a.x, b.x) + pad >= x0 && Math.min(a.x, b.x) - pad <= x1 && Math.max(a.y, b.y) + pad >= y0 && Math.min(a.y, b.y) - pad <= y1;
    if (near) {
      if (!run.length) run.push([a.x, a.y]);
      run.push([b.x, b.y]);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}
/** A polyline moved `off` units along its normals (the road edge in pencil). */
function offsetRun(pts: readonly Point[], off: number): Point[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(pts.length - 1, i + 1)]!,
      len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] + (-(b[1] - a[1]) / len) * off, p[1] + ((b[0] - a[0]) / len) * off] as Point;
  });
}
/**
 * The pencil underdrawing of a chunk, in the same world coordinates as the
 * painted tile: raw cream paper and fibre, faint district sheet seams with a
 * hatched shadow strip, loose patch rings, water shores, landmark footprints
 * with construction axes, both road edges plus a construction centreline
 * and shadow-side hatching, flat decor marks and hatched footings under tall
 * pieces. Baked only for chunks that have washed cells (worker or budgeted
 * fallback, same generator), at the painted tile's resolution, then graded by
 * PAPER_VALUE.washed so raw paper sits one value step above painted ground.
 */
function* paintSketchChunk(canvas: CanvasSurface, seed: number, cx: number, cy: number): Generator<void> {
  const c = chunkContent(seed, cx, cy),
    ctx = canvas.getContext("2d", { willReadFrequently: typeof document === "undefined" })!,
    x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
  ctx.scale(2, 2);
  ctx.translate(-x0, -y0);
  rawPaper(ctx, x0, y0, c.w, c.h);
  yield;
  if (!c.start) {
    ctx.save();
    clipOutsideLawn(ctx, { x0, y0, x1, y1 });
    for (const s of sheetsIn(seed, x0, y0, x1, y1)) {
      const pts = sheetOutline(s.corners, s.art.sheet, s.sd),
        // Sheets that fade out near the yard still show their outline in pencil.
        k = Math.max(SKETCH_SEAM_FLOOR, s.opacity);
      pencilLine(ctx, pts, s.sd, { weight: 0.55, alpha: 0.26 * k, closed: true, color: PENCIL.soft });
      const [, , br, bl] = s.corners as [Point, Point, Point, Point];
      shadeAlong(ctx, subdivide([bl, br], 40), 0.5, 6, 0.16 * k, s.sd);
    }
    ctx.restore();
    // The same torn cut around the lawn, drawn in graphite.
    if (reachesLawn({ x0, y0, x1, y1 }, 24))
      pencilLine(ctx, lawnContour(), 1931, { weight: 0.7, alpha: 0.5, closed: false, color: PENCIL.soft });
  }
  yield;
  for (const p of patchSpots(seed, x0, y0, x1, y1)) pencilPatch(ctx, p.x, p.y, p.r, p.seed);
  yield;
  const waters = waterRegionsNear(seed, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(c.w, c.h) / 2 + 24),
    roadRuns = roads(seed).flatMap((r) => runsNear(r.points, r.width + 30, x0, y0, x1, y1).map((run) => ({ run, width: r.width }))),
    courts = landmarks(seed).filter((l) => {
      const reach = landmarkReach(l);
      return !(l.x + reach < x0 || l.x - reach > x1 || l.y + reach < y0 || l.y - reach > y1);
    });
  // Open ground: loose tufts and hatch clusters, never on roads, water or landmark footprints.
  pencilGround(ctx, x0, y0, x1, y1, (x, y) =>
    roadRuns.some(({ run, width }) => run.some((a, i) => i > 0 && segmentDistance(x, y, run[i - 1]!, a) < width + 6)) ||
    waters.some((w) => insidePolygon(w.shore, x, y)) ||
    courts.some((l) => ((x - l.x) / (l.radius * 0.98)) ** 2 + ((y - l.y) / (l.radius * 0.56)) ** 2 < 1));
  yield;
  for (const water of waters) {
    const shore = water.shore.map((v) => [v.x, v.y] as Point);
    pencilLine(ctx, subdivide(shore, 16, true), water.seed, { weight: 0.95, alpha: 0.62, closed: true });
    // Shallow water in pencil: short loose ripple dashes inside the shore (world-anchored).
    const { minX, minY, maxX, maxY } = water.bounds, ripples = new Path2D();
    for (let ry = Math.floor(Math.max(minY, y0 - 20) / 18) * 18; ry < Math.min(maxY, y1 + 20); ry += 18)
      for (let rx = Math.floor(Math.max(minX, x0 - 40) / 40) * 40; rx < Math.min(maxX, x1 + 40); rx += 40) {
        const h = (n: number) => hash(rx * 3 + ry * 7919 + n * 131 + water.seed);
        if (h(0) > 0.7) continue;
        const sx = rx + h(1) * 24, sy = ry + h(2) * 8, len = 9 + h(3) * 10;
        ripples.moveTo(sx, sy);
        ripples.quadraticCurveTo(sx + len * 0.25, sy - 2, sx + len * 0.5, sy);
        ripples.quadraticCurveTo(sx + len * 0.75, sy + 2, sx + len, sy);
      }
    ctx.save();
    ctx.clip(path(shore));
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = PENCIL.soft;
    ctx.lineWidth = 0.6;
    ctx.lineCap = "round";
    ctx.stroke(ripples);
    ctx.restore();
    if (water.core.length) {
      const core = water.core.map((v) => [v.x, v.y] as Point), corePath = path(core);
      pencilLine(ctx, subdivide(core, 16, true), water.seed + 5, { weight: 0.7, alpha: 0.48, closed: true });
      hatch(ctx, corePath, minX, minY, maxX, maxY, 4.2, 0.22, water.seed);
    }
    for (const crossing of water.crossings) {
      const deck = crossing.polygon.map((v) => [v.x, v.y] as Point);
      pencilLine(ctx, subdivide(deck, 14, true), water.seed + 9, { weight: 0.8, alpha: 0.55, closed: true, gaps: false });
    }
    yield;
  }
  for (const l of courts) {
    const rx = l.radius * 0.92, ry = l.radius * 0.5;
    constructionLine(ctx, l.x - rx, l.y, l.x + rx, l.y, 22, 0.18);
    constructionLine(ctx, l.x, l.y - ry * 1.3, l.x, l.y + ry * 1.3, 18, 0.16);
    pencilFootprint(ctx, l.x, l.y, rx, ry, l.seed, 0.46);
    yield;
  }
  roads(seed).forEach((r, ri) => {
    for (const run of runsNear(r.points, r.width + 30, x0, y0, x1, y1)) {
      for (let i = 0; i < run.length - 1; i++)
        constructionLine(ctx, run[i]![0], run[i]![1], run[i + 1]![0], run[i + 1]![1], 9, 0.14);
      for (const side of [-1, 1]) pencilLine(ctx, subdivide(offsetRun(run, side * r.width), 16), ri * 13 + side, { weight: 0.8, alpha: 0.43, overshoot: 5 });
      shadeAlong(ctx, run, r.width + 0.8, r.width + 7, 0.18, ri);
    }
  });
  yield;
  const marks = new Path2D();
  for (const n of contentAround(seed, cx, cy))
    for (const d of n.decor) {
      if (d.x <= x0 - 60 || d.x >= x1 + 60 || d.y <= y0 - 40 || d.y >= y1 + 40) continue;
      if (FLAT_DECOR.has(d.kind)) {
        // Flowers as tiny rings, tufts and leaf piles as quick ticks.
        for (let i = 0; i < 3; i++) {
          const tx = d.x + (i - 1) * 7 * d.s, ty = d.y + (hash(d.seed + i) - 0.5) * 4;
          if (d.kind === "flowers") { marks.moveTo(tx + 2, ty - 3); marks.arc(tx, ty - 3, 2, 0, Math.PI * 2); }
          else { marks.moveTo(tx - 2, ty); marks.lineTo(tx, ty - 5 * d.s); marks.lineTo(tx + 2.2, ty - 0.5); }
        }
        continue;
      }
      const bd = decorBounds(d);
      if (!bd) continue;
      const rx = Math.max(6, (bd.r - bd.l) * 0.3);
      pencilFootprint(ctx, d.x, d.y + 1, rx, Math.max(2.5, rx * 0.28), d.seed, 0.32);
    }
  ctx.save();
  ctx.globalAlpha = 0.31;
  ctx.strokeStyle = PENCIL.graphite;
  ctx.lineWidth = 0.6;
  ctx.lineCap = "round";
  ctx.stroke(marks);
  ctx.restore();
  // The map hedge as a loose scalloped pencil line.
  const scallops = (a: Point, b: Point, sd: number) => {
    const pts: Point[] = [], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t + (i % 2 ? 3 : 0), a[1] + (b[1] - a[1]) * t + (i % 2 ? -3 : 0)]);
    }
    pencilLine(ctx, pts, sd, { weight: 0.8, alpha: 0.5 });
  };
  if (x0 < WORLD.minX + 80) scallops([WORLD.minX + 16, Math.max(190, y0)], [WORLD.minX + 16, y1], 1);
  if (x1 > WORLD.maxX - 80) scallops([WORLD.maxX - 16, Math.max(190, y0)], [WORLD.maxX - 16, y1], 2);
  if (y1 > WORLD.maxY - 80) scallops([x0, WORLD.maxY - 14], [x1, WORLD.maxY - 14], 3);
  // Washed paper is raw paper under the moon: one value step above painted ground, below decor.
  gradeCanvas(canvas, PAPER_VALUE.washed);
}
/** Lowest share of the sheet-seam pencil strength (sheets faded near the yard still show in pencil). */
const SKETCH_SEAM_FLOOR = 0.6;
function segmentDistance(px: number, py: number, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy,
    t = d <= 1e-8 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / d));
  return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
}
function releaseChunk(image: ChunkImage): void {
  if ("close" in image) image.close();
  else image.width = image.height = 0;
}
function keepChunk(key: string, image: ChunkImage): void {
  chunkCache.set(key, image);
  for (const [old, oldImage] of chunkCache) {
    if (chunkCache.size <= MAX_CHUNK_CANVASES) break;
    if (wantedChunks.has(old)) continue;
    releaseChunk(oldImage);
    chunkCache.delete(old);
    // A pencil layer is released with its painted chunk.
    const sketch = chunkCache.get(old + SKETCH_KEY);
    if (sketch && !wantedChunks.has(old + SKETCH_KEY)) {
      releaseChunk(sketch);
      chunkCache.delete(old + SKETCH_KEY);
    }
  }
}
/** Cache key suffix of a chunk's pencil layer (shares the ready-tile budget with painted tiles). */
const SKETCH_KEY = ":sketch";
/** The baked pencil layer of a chunk, when it is ready. */
export function sketchTile(seed: number, cx: number, cy: number): ChunkImage | undefined {
  return chunkCache.get(cacheKey(seed, cx, cy) + SKETCH_KEY);
}
function disableTerrainWorker(worker: Worker): void {
  if (chunkWorker !== worker) return;
  worker.terminate();
  inFlight = undefined;
  chunkWorker = null;
}
function workerForTerrain(): Worker | null {
  if (chunkWorker !== undefined) return chunkWorker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return chunkWorker = null;
  try {
    const worker = new Worker(new URL("./terrain-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<TerrainReply>) => {
      const { id, bitmap } = data;
      if (chunkWorker !== worker || inFlight?.id !== id) {
        bitmap?.close();
        return;
      }
      const { key } = inFlight;
      inFlight = undefined;
      if (!bitmap) disableTerrainWorker(worker);
      else if (wantedChunks.has(key) && !chunkCache.has(key)) keepChunk(key, bitmap);
      else bitmap.close();
    };
    worker.onerror = (event) => {
      event.preventDefault();
      disableTerrainWorker(worker);
    };
    worker.onmessageerror = () => disableTerrainWorker(worker);
    return chunkWorker = worker;
  } catch {
    return chunkWorker = null;
  }
}
function cancelLocalPaint(): void {
  if (!localPaint) return;
  releaseChunk(localPaint.canvas);
  localPaint = undefined;
}
function warmChunk(seed: number, tile: ChunkTile | undefined): void {
  if (localPaint && !wantedChunks.has(localPaint.key)) cancelLocalPaint();
  if (!tile || inFlight) return;
  const worker = workerForTerrain();
  if (worker) {
    const id = ++requestId;
    inFlight = { id, key: tile.key };
    const request: TerrainRequest = { id, seed, cx: tile.cx, cy: tile.cy, ...(tile.layer === "sketch" ? { layer: "sketch" as const } : {}) };
    try {
      worker.postMessage(request);
      return;
    } catch {
      disableTerrainWorker(worker);
    }
  }
  const deadline = performance.now() + LOCAL_PAINT_BUDGET_MS;
  if (!localPaint) {
    const canvas = surface(CHUNK.width * 2, CHUNK.height * 2);
    localPaint = { key: tile.key, canvas, steps: paintLayer(canvas, seed, tile.cx, tile.cy, tile.layer ?? "paint") };
  }
  do {
    if (!localPaint.steps.next().done) continue;
    keepChunk(localPaint.key, localPaint.canvas);
    localPaint = undefined;
    break;
  } while (performance.now() < deadline);
}
function chunkRange(r: ViewRect) {
  const a = chunkOf(r.x0, r.y0),
    b = chunkOf(r.x1 - 0.001, r.y1 - 0.001);
  return { a, b };
}
function tilesIn(seed: number, rect: ViewRect): ChunkTile[] {
  const { a, b } = chunkRange(rect), tiles: ChunkTile[] = [];
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) tiles.push({ cx, cy, key: cacheKey(seed, cx, cy) });
  return tiles;
}
function drawMissingGround(ctx: Ctx, seed: number, cx: number, cy: number): void {
  const x = cx * CHUNK.width, y = cy * CHUNK.height;
  const clip = new Path2D();
  clip.rect(x, y, CHUNK.width, CHUNK.height);
  ctx.save();
  ctx.clip(clip);
  if (cy === 0) horizonHills(ctx, x, x + CHUNK.width);
  const stock = BIOME_ART.find(biomeAt(seed, cx, cy).id)?.sheet.colors[0],
    opacity = Math.min(1, 0.48 + yardDistance(x + CHUNK.width / 2, y + CHUNK.height / 2) / 580);
  groundUnderlay(ctx, x, y, CHUNK.width, CHUNK.height, cy === 0, stock, opacity);
  ctx.restore();
}
/**
 * Paint ready tiles and warm the closest missing tile. Rank only as many
 * tiles as can fit, so a full cache cannot repaint the same margin forever.
 * `washed` names visible chunks ("cx,cy") with washed cells: only those get a
 * pencil layer baked, inside the same ready-tile budget. Without washed
 * chunks nothing about the pencil layer runs.
 */
export function drawChunks(ctx: Ctx, seed: number, cam: Camera, prefetch = true, washed?: ReadonlySet<string>): void {
  const visible = tilesIn(seed, viewRect(cam));
  const keys = new Set(visible.map((tile) => tile.key));
  const distance = ({ cx, cy }: ChunkTile) =>
    ((cx + 0.5) * CHUNK.width - cam.x) ** 2 + ((cy + 0.5) * CHUNK.height - cam.y) ** 2;
  const sketches: ChunkTile[] = washed?.size
    ? visible.filter((t) => washed.has(t.cx + "," + t.cy)).map((t) => ({ ...t, key: t.key + SKETCH_KEY, layer: "sketch" as const }))
    : [];
  const ahead = prefetch
    ? tilesIn(seed, viewRect(cam, PREFETCH))
      .filter((tile) => !keys.has(tile.key) && !isStartChunk(tile.cx, tile.cy))
      .sort((a, b) => distance(a) - distance(b))
    : [];
  const wanted = [...visible, ...sketches, ...ahead.slice(0, Math.max(0, MAX_CHUNK_CANVASES - visible.length - sketches.length))];
  wantedChunks = new Set(wanted.map((tile) => tile.key));
  for (const s of sketches) {
    const image = chunkCache.get(s.key);
    if (!image) continue;
    chunkCache.delete(s.key);
    chunkCache.set(s.key, image);
  }

  for (const { key, cx, cy } of visible) {
    let image = chunkCache.get(key);
    if (image) {
      chunkCache.delete(key);
      chunkCache.set(key, image);
    } else if (isStartChunk(cx, cy)) {
      image = buildChunk(seed, cx, cy);
      keepChunk(key, image);
    }
    if (image) ctx.drawImage(image, cx * CHUNK.width, cy * CHUNK.height, CHUNK.width, CHUNK.height);
    else drawMissingGround(ctx, seed, cx, cy);
  }
  warmChunk(seed, wanted.find((tile) => !chunkCache.has(tile.key)));
}
/** How many ready tile images are cached. */
export function cachedChunkCount(): number {
  return chunkCache.size;
}

/** Release pixels and pending bake work with the run that owns them. */
export function clearWorldRenderCache(): void {
  chunkWorker?.terminate();
  chunkWorker = undefined;
  inFlight = undefined;
  cancelLocalPaint();
  wantedChunks.clear();
  for (const image of chunkCache.values()) releaseChunk(image);
  chunkCache.clear();
  folds.clear();
  foldTime = null;
}

// ---------------------------------------------------------------- sprites
export interface WorldSprite {
  y: number;
  draw: () => void;
  occludesPlayer?: boolean;
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
  activities?: Readonly<SimState["landmarkEvents"]>;
  /** Pencil amount (0 painted .. 1 colourless) at a piece's base, when the page has washed cells. */
  sketch?: (x: number, y: number) => number;
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
function drawFolded(ctx: Ctx, d: Decor, bd: Bounds, f: number, paint: (shade: number) => void): void {
  if (f >= 0.995) {
    paint(0);
    return;
  }
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(1, f);
  ctx.translate(-d.x, -d.y);
  // Eight shade intervals keep tinted sprite keys bounded while the fold stays smooth.
  paint(Math.round((1 - f) * 8) / 8);
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
      const chunk = chunkContent(seed, cx, cy);
      const activity = chunk.landmark ? pop?.activities?.[chunk.landmark.id] : undefined;
      for (const d of chunk.decor) {
        if (FLAT_DECOR.has(d.kind)) continue;
        const bd = decorBounds(d);
        if (!bd) continue;
        // Cull by the sprite's own bounds.
        if (d.x + bd.r < view.x0 || d.x + bd.l > view.x1 || d.y + bd.b < view.y0 || d.y + bd.t > view.y1) continue;
        if (d.kind === "lamp") lamps.push(d);
        const f = pop && pops(d.kind) ? foldOf(d, pop, dt) : 1,
          pencil = pop?.sketch?.(d.x, d.y) ?? 0;
        sprites.push({
          y: d.y,
          occludesPlayer: !!pop?.cat && paperOccludesActor(d.x, d.y, 1, { ...bd, t: bd.t * f, b: bd.b * f }, pop.cat),
          draw: () => drawFolded(ctx, d, bd, f, (shade) =>
            drawDecor(ctx, d, pop?.reduced ? 0 : time, shade, pop?.reduced ? undefined : activity, pencil)),
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
    ctx.font = "700 10px Allo, sans-serif";
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
