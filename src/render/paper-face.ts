import { officialVariant, officialRects, MASCOT_VIEWBOX_WIDTH, MASCOT_VIEWBOX_HEIGHT, type MascotRect } from "../cats/official.js";
import type { MascotPalette } from "../cats/meow-wall-art.js";
import type { CatId } from "../cats/types.js";
import { cachedSprite } from "../engine/sprite.js";
import type { CatPose } from "./layout.js";
import { mix, stroke, type Ctx, type Point } from "./paper-material.js";

import { paperCut } from "./paper-kit.js";
import { catArt, type CatArt } from "./art-registry.js";

export const PAPER_FACE_SCALE = 0.16;
export const PAPER_FACE_RIM = 0.625;
export const PAPER_FACE_SIZE = {
  w: Math.ceil(MASCOT_VIEWBOX_WIDTH * PAPER_FACE_SCALE + 8),
  h: Math.ceil(MASCOT_VIEWBOX_HEIGHT * PAPER_FACE_SCALE + 8),
} as const;
const FACE_CACHE_SCALE = 3;
const FACE_CENTER = 34.8;

/** The reference's short ear crowns, full cheeks and broad chin, cut from one card. */
export const PAPER_FACE_OUTLINE = `
  M 11 21.8 L 10.9 17.1 Q 10.9 15 13.4 13.5 L 13.8 8.4
  Q 14 7.2 15.2 7.2 L 18.3 7.2 Q 19.8 7.2 20.9 8.5 L 29.2 19.5
  Q 34.9 18.9 40.6 19.5 L 48.6 8.6 Q 49.6 7.2 51 7.2 L 54.4 7.2
  Q 55.6 7.3 55.7 8.7 L 56.2 13.6 Q 58.5 15 58.5 17.1 L 58.3 21.7
  Q 58.1 23.1 55.4 24 Q 58 28 58.7 32.6 L 59.2 38.6 Q 59.4 41.7 55.9 43
  L 52.9 46.8 Q 51.1 48.8 48.6 48.8 L 21.1 48.8 Q 18.5 48.8 16.9 46.7
  L 13.9 43 Q 10.5 41.6 10.4 38.6 L 10.8 32.8 Q 11.8 27.9 14 24 Q 11.2 23.3 11 21.8 Z`;

export interface FaceLayer {
  readonly color: string;
  /** Visible, non-overlapping official regions, before the subpixel cut-edge rounding. */
  readonly contours: readonly (readonly Point[])[];
  readonly area: number;
}
export interface FaceContours {
  readonly layers: readonly FaceLayer[];
  readonly silhouette: readonly (readonly Point[])[];
}

/** Trace a compressed rectangle grid, keeping holes and diagonal contacts separate. */
function contours(xs: number[], ys: number[], cells: readonly (string | undefined)[], color?: string): Point[][] {
  const w = xs.length - 1, h = ys.length - 1;
  const occupied = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h &&
    (color === undefined ? cells[y * w + x] !== undefined : cells[y * w + x] === color);
  type Edge = { x: number; y: number; nx: number; ny: number; direction: number; used: boolean };
  const edges: Edge[] = [], starts = new Map<string, Edge[]>();
  const add = (x: number, y: number, nx: number, ny: number, direction: number) => {
    const e = { x, y, nx, ny, direction, used: false }, key = `${x},${y}`;
    edges.push(e);
    const list = starts.get(key) ?? [];
    list.push(e);
    starts.set(key, list);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!occupied(x, y)) continue;
    if (!occupied(x, y - 1)) add(x, y, x + 1, y, 0);
    if (!occupied(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
    if (!occupied(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
    if (!occupied(x - 1, y)) add(x, y + 1, x, y, 3);
  }
  const loops: Point[][] = [];
  for (const first of edges) {
    if (first.used) continue;
    const loop: Point[] = [];
    let edge: Edge | undefined = first;
    while (edge && !edge.used) {
      edge.used = true;
      loop.push([xs[edge.x]!, ys[edge.y]!]);
      if (edge.nx === first.x && edge.ny === first.y) break;
      const direction: number = edge.direction;
      const candidates: Edge[] = (starts.get(`${edge.nx},${edge.ny}`) ?? []).filter((e) => !e.used);
      edge = [1, 0, 3, 2].map((turn) => candidates.find((e) => (e.direction - direction + 4) % 4 === turn)).find(Boolean);
    }
    loops.push(loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length]!, b = loop[(i + 1) % loop.length]!;
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    }));
  }
  return loops;
}

/** Last rectangle wins, exactly as in the official painter; no replacement face geometry. */
export function traceFaceRects(rects: readonly MascotRect[]): FaceContours {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b),
    ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b),
    w = xs.length - 1,
    cells: (string | undefined)[] = new Array(Math.max(0, w * (ys.length - 1))),
    colors = [...new Set(rects.map((r) => r.fill))];
  for (const r of rects) {
    const x0 = xs.indexOf(r.x), x1 = xs.indexOf(r.x + r.w), y1 = ys.indexOf(r.y + r.h);
    for (let y = ys.indexOf(r.y); y < y1; y++) for (let x = x0; x < x1; x++) cells[y * w + x] = r.fill;
  }
  const areas = new Map<string, number>();
  for (let y = 0; y < ys.length - 1; y++) for (let x = 0; x < w; x++) {
    const c = cells[y * w + x];
    if (c !== undefined) areas.set(c, (areas.get(c) ?? 0) + (xs[x + 1]! - xs[x]!) * (ys[y + 1]! - ys[y]!));
  }
  return {
    layers: colors.filter((c) => areas.has(c)).map((color) => ({ color, area: areas.get(color)!, contours: contours(xs, ys, cells, color) })),
    silhouette: contours(xs, ys, cells),
  };
}
const sourceMemo = new Map<CatId, FaceContours>();
export function officialFaceContours(id: CatId): FaceContours {
  let face = sourceMemo.get(id);
  if (!face) {
    // officialRects validates the identity before anything is retained in the cache.
    face = traceFaceRects(officialRects(id));
    sourceMemo.set(id, face);
  }
  return face;
}

/** Join tiny staircase runs into scissor cuts, leaving small eye/whisker pieces intact. */
export function scissorContour(points: readonly Point[], tolerance = 0.9): readonly Point[] {
  if (points.length < 12) return points;
  const simplify = (pts: readonly Point[]): Point[] => {
    const a = pts[0]!, b = pts[pts.length - 1]!, dx = b[0] - a[0], dy = b[1] - a[1];
    let far = tolerance * tolerance, split = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!, u = Math.max(0, Math.min(1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      const d = (p[0] - a[0] - u * dx) ** 2 + (p[1] - a[1] - u * dy) ** 2;
      if (d > far) { far = d; split = i; }
    }
    return split < 0 ? [a, b] : [...simplify(pts.slice(0, split + 1)).slice(0, -1), ...simplify(pts.slice(split))];
  };
  const start = points[0]!;
  let opposite = 1;
  for (let i = 2; i < points.length; i++)
    if (Math.hypot(points[i]![0] - start[0], points[i]![1] - start[1]) >
        Math.hypot(points[opposite]![0] - start[0], points[opposite]![1] - start[1])) opposite = i;
  const result = [...simplify(points.slice(0, opposite + 1)).slice(0, -1),
    ...simplify([...points.slice(opposite), start]).slice(0, -1)];
  const area = (ps: readonly Point[]) => Math.abs(ps.reduce((sum, p, i) => {
    const q = ps[(i + 1) % ps.length]!;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0));
  // Narrow markings and holes must not disappear during simplification.
  return result.length >= 4 && Math.abs(area(result) - area(points)) <= area(points) * 0.08 ? result : points;
}

// Source contour helpers above remain for reference; runtime heads use authored curves.
type FaceDesign = CatArt["face"];
const paths = new WeakMap<FaceDesign, { outline: Path2D; layers: { color: FaceDesign["patches"][number]["color"]; path: Path2D }[] }>();
function facePaths(id: CatId) {
  const design = catArt(id).face;
  let result = paths.get(design);
  if (!result) {
    result = { outline: new Path2D(design.outline), layers: design.patches.map((patch) => ({ color: patch.color, path: new Path2D(patch.path) })) };
    paths.set(design, result);
  }
  return result;
}

const FACE_STOCK = `
  M 16 22.7 Q 21.5 19.1 29.3 20.1 Q 35 19.4 40.6 20.1 Q 48.5 19 53.4 23
  L 51.6 25.5 Q 54.9 30.8 55.2 37.2 Q 55.4 40.1 52.8 42.1
  L 49.6 44.8 Q 47.8 46.2 44.6 46.2 L 25 46.2 Q 21.5 46.2 19.7 44.8
  L 16.7 42 Q 14.5 40 14.5 37.2 Q 14.8 30.8 17.9 25.5 Z`;
const MUZZLE = `
  M 25.1 37 Q 27.2 34.8 30.8 35.4 Q 32 33.8 34.4 34 Q 37.1 33.8 38.3 35.4
  Q 42.2 34.8 44.4 37 Q 44.1 40.2 40.2 41.1 Q 38 42.7 34.4 42.5
  Q 31 42.7 28.7 41.1 Q 25.4 40.2 25.1 37 Z`;

function fill(ctx: Ctx, shape: Path2D, color: string): void {
  ctx.fillStyle = color;
  ctx.fill(shape);
}

/** Three strips of dark cardstock, tucked under each cheek. */
function paintWhiskers(ctx: Ctx, p: MascotPalette): void {
  const strips = new Path2D(`
    M -20 30.8 Q -24.6 30.2 -29.1 30.4 L -29.1 31.6 Q -24.8 31.5 -20 32.3 Z
    M -20 33.8 Q -25.2 33.5 -30.6 33.8 L -30.6 35.1 Q -25.2 35 -20 35.2 Z
    M -20 36.7 Q -24.6 37.1 -29.1 37.5 L -29.1 38.7 Q -24.8 38.3 -20 38.1 Z`);
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(FACE_CENTER, 0);
    ctx.scale(side, 1);
    paperCut(ctx, strips, { color: p.ink, edge: mix(p.ink, p.head, 0.2), thickness: 0.32, shadow: 0.3, texture: 0.18 });
    ctx.restore();
  }
}

function paintEars(ctx: Ctx, p: MascotPalette): void {
  const liner = new Path2D(`
    M -21.4 20.3 L -20.4 15.7 Q -18.8 14.5 -18.2 11.9
    Q -15.6 11.5 -13.8 14.8 L -9.9 19.6 L -12.9 21 L -14.4 22.7
    Q -18.6 23.2 -21.4 20.3 Z`);
  const facet = new Path2D("M -21.1 20.4 L -17.4 21.2 L -15.3 15.6 L -13.8 14.8 L -9.9 19.6 L -14.4 22.7 Q -18.6 23.2 -21.1 20.4 Z");
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(FACE_CENTER, 0);
    ctx.scale(side, 1);
    paperCut(ctx, liner, { color: p.earInner, edge: mix(p.earInner, p.headLight, 0.35), thickness: 0.48, shadow: 0.4, texture: 0.3 });
    fill(ctx, facet, mix(p.earInner, p.headDark, 0.22));
    ctx.restore();
  }
}

/** Keep the low, widely spaced boxes and the tiny highlights from the reference. */
function paintEyes(ctx: Ctx, p: MascotPalette, glasses: boolean, sunglasses: boolean): void {
  const outer = `M -4.15 -4.25 L 4.05 -4.25 Q 4.85 -4.25 4.85 -3.5 L 4.85 3.45
    Q 4.85 4.25 4.05 4.25 L -4.1 4.25 Q -4.95 4.25 -4.95 3.45 L -4.95 -3.45 Q -4.95 -4.25 -4.15 -4.25 Z`;
  // The opposite winding cuts a window into the frame. A small sliver of fur shows beside the eye.
  const frame = new Path2D(glasses && !sunglasses
    ? `${outer} M -3.7 -3.05 L -3.7 3.15 Q -3.7 3.3 -3.45 3.3 L 3.5 3.3 L 3.5 -3.05 Z`
    : outer);
  const pupil = new Path2D("M -2.15 -2.9 L 3.1 -2.9 L 3.1 3.6 L -1.95 3.6 Q -2.35 3.6 -2.35 3.15 Z");
  const shine = sunglasses
    ? new Path2D("M -3.4 -2.75 L -1.15 -2.75 L -1.15 -1 L -3.4 -1 Z")
    : new Path2D("M 0.15 -2.55 L 2.65 -2.55 L 2.65 -0.05 L 0.15 -0.05 Z");
  if (glasses || sunglasses) {
    stroke(ctx, new Path2D("M 27.4 32.15 L 42.2 32.15"), p.ink, sunglasses ? 1.85 : 1.25);
  }
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(FACE_CENTER + side * 11.76, 32.65);
    if (sunglasses) {
      ctx.scale(1, 0.9);
    } else {
      ctx.scale(-side, 1);
      fill(ctx, pupil, p.ink);
    }
    if (glasses || sunglasses) {
      // Draw the frame as one ink cut, without an extra outline around the pupil.
      fill(ctx, frame, p.ink);
    }
    fill(ctx, shine, p.white);
    ctx.restore();
  }
}

function paintChain(ctx: Ctx, color: string): void {
  stroke(ctx, new Path2D("M 27.1 44 Q 33.5 47 41.9 45.4"), color, 0.75);
  for (const [x, y] of [[28.4, 44], [32.4, 45.5], [36.4, 44.3], [40.4, 45.5]]) {
    paperCut(ctx, [[x - 1.2, y - 0.6], [x + 0.7, y - 0.9], [x + 1.2, y + 0.6], [x - 0.7, y + 0.9]],
      { color, edge: mix(color, "#fff0d4", 0.45), thickness: 0.27, shadow: 0.3, texture: 0.18 });
  }
}

/** Reserve the visible depth for a few broad paper layers. Ink stays crisp at play scale. */
export function paperFace(id: CatId) {
  return cachedSprite(`paper-face:${id}`, PAPER_FACE_SIZE.w, PAPER_FACE_SIZE.h, FACE_CACHE_SCALE, (ctx) => {
    const face = facePaths(id), { palette: p, accessories = [] } = officialVariant(id);
    paintWhiskers(ctx, p);
    paperCut(ctx, face.outline, { color: p.headDark, edge: mix(p.headDark, p.head, 0.13), thickness: 0.5, shadow: 0.45, texture: 0.42 });
    ctx.save();
    ctx.clip(face.outline);
    paintEars(ctx, p);
    paperCut(ctx, new Path2D(FACE_STOCK), { color: p.head, edge: mix(p.head, p.headLight, 0.3), thickness: 0.48, shadow: 0.7, texture: 0.34 });
    for (const layer of face.layers) {
      const color = p[layer.color] ?? p.head;
      paperCut(ctx, layer.path, { color, edge: mix(color, p.head, 0.17), thickness: 0.3, shadow: 0.42, texture: 0.27 });
    }
    paperCut(ctx, new Path2D(MUZZLE), { color: p.headLight, edge: mix(p.headLight, p.head, 0.23), thickness: 0.34, shadow: 0.22, texture: 0.24 });
    fill(ctx, new Path2D(`
      M 18.8 36.2 Q 21.7 35.2 25.1 36.5 Q 25.8 38.1 23.6 38.9 Q 20.4 39 18.8 36.2 Z
      M 44.5 36.5 Q 47.8 35.2 50.8 36.2 Q 49.2 39 46 38.9 Q 43.8 38.1 44.5 36.5 Z`), p.blush);
    paintEyes(ctx, p, accessories.includes("glasses"), accessories.includes("sunglasses"));
    fill(ctx, new Path2D("M 32.1 34.55 Q 34.4 34.1 36.7 34.55 L 35.3 36 L 33.5 36 Z"), p.nose);
    stroke(ctx, new Path2D("M 34.4 35.75 L 34.4 37.05 M 31.6 38.8 L 34.4 37.05 L 37.2 38.8"), p.ink, 0.95);
    if (accessories.includes("gold-chain")) paintChain(ctx, p.mark ?? p.headLight);
    ctx.restore();
  });
}
export function paperFaceEdge(id: CatId, rim: string) {
  return cachedSprite(`paper-face-edge:${id}:${rim}`, PAPER_FACE_SIZE.w + 4, PAPER_FACE_SIZE.h + 4, FACE_CACHE_SCALE, (ctx) => {
    const { outline } = facePaths(id);
    ctx.translate(2, 2);
    ctx.save();
    ctx.translate(0, 0.8);
    ctx.globalAlpha *= 0.42;
    ctx.fillStyle = "#241b26";
    ctx.fill(outline);
    ctx.restore();
    ctx.lineJoin = "round";
    ctx.lineWidth = PAPER_FACE_RIM * 2;
    ctx.strokeStyle = rim;
    ctx.fillStyle = rim;
    ctx.fill(outline);
    ctx.globalAlpha *= 0.78;
    ctx.stroke(outline);
  });
}

/** Head-only cards and HUD use the same layered source as the world, with the old anchor. */
export function drawPaperPortrait(ctx: Ctx, pose: CatPose, scale: number, rim: string): void {
  const k = scale / PAPER_FACE_SCALE;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing * k, k);
  const x = -MASCOT_VIEWBOX_WIDTH * PAPER_FACE_SCALE / 2 - 4,
    y = -MASCOT_VIEWBOX_HEIGHT * PAPER_FACE_SCALE - 4;
  paperFaceEdge(pose.id, rim).draw(ctx, { x: x - 2, y: y - 2 });
  paperFace(pose.id).draw(ctx, { x, y });
  ctx.restore();
}
