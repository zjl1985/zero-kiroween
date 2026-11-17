import { officialVariant, officialRects, MASCOT_VIEWBOX_WIDTH, MASCOT_VIEWBOX_HEIGHT, type MascotRect } from "../cats/official.js";
import type { CatId } from "../cats/types.js";
import { cachedSprite } from "../engine/sprite.js";
import type { CatPose } from "./layout.js";
import { grain, mix, stroke, type Ctx, type Point } from "./paper-material.js";

import { paperCut } from "./paper-kit.js";
import { catArt, type CatArt } from "./art-registry.js";

export const PAPER_FACE_SCALE = 0.16;
export const PAPER_FACE_RIM = 0.625;
export const PAPER_FACE_SIZE = {
  w: Math.ceil(MASCOT_VIEWBOX_WIDTH * PAPER_FACE_SCALE + 8),
  h: Math.ceil(MASCOT_VIEWBOX_HEIGHT * PAPER_FACE_SCALE + 8),
} as const;
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

/** Authored paper cuts retain original palette and accessories without the pixel grid. */
export function paperFace(id: CatId) {
  return cachedSprite(`paper-face:${id}`, PAPER_FACE_SIZE.w, PAPER_FACE_SIZE.h, 2, (ctx) => {
    const face = facePaths(id), original = officialVariant(id), p = original.palette;
    const cut = (shape: Path2D, color: string, thickness = 0.4) =>
      paperCut(ctx, shape, { color, edge: mix(color, "#fff0d4", 0.25), thickness, shadow: 0.22, texture: 0.16 });
    cut(face.outline, p.head, 0.65);
    stroke(ctx, face.outline, p.ink, 1.2, 0.9);
    ctx.save(); ctx.clip(face.outline);
    cut(new Path2D("M 11 30 L 16 40 L 19 44 L 51 44 L 57 39 L 52 48 L 18 48 L 11 41 Z"), mix(p.head, p.headDark, 0.16), 0.2);
    for (const layer of face.layers) cut(layer.path, p[layer.color] ?? p.head);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(34.8, 0); ctx.scale(side, 1);
      cut(new Path2D("M 12 21.6 L 18.5 12.5 L 20.8 20.8 L 18 22.2 Z"), p.earInner, 0.35);
      stroke(ctx, new Path2D("M 17 20.8 L 18.5 16"), mix(p.earInner, p.headLight, 0.55), 0.65, 0.7);
      ctx.restore();
    }
    for (const x of [22, 47]) {
      const blush = new Path2D(); blush.ellipse(x, 37.8, 2.8, 1.2, x < 35 ? 0.12 : -0.12, 0, Math.PI * 2);
      ctx.save(); ctx.globalAlpha *= 0.65; cut(blush, p.blush, 0.2); ctx.restore();
    }
    const glasses = original.accessories?.includes("glasses"), sunglasses = original.accessories?.includes("sunglasses");
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(34.8 + side * 11.76, 32.72);
      if (sunglasses) {
        cut(new Path2D("M -4.4 -3.92 L 4.4 -3.92 Q 4.96 -3.92 4.96 -3.3 L 4.96 3.2 Q 4.96 3.76 4.4 3.76 L -4.4 3.76 Q -4.96 3.76 -4.96 3.2 L -4.96 -3.3 Q -4.96 -3.92 -4.4 -3.92 Z"), p.ink, 0.55);
        cut(new Path2D("M -3.5 -3 L -1.2 -3 L -1.2 -1.4 L -3.5 -1.4 Z"), p.white, 0.15);
        stroke(ctx, new Path2D("M 1.5 -3 L 3.5 -3"), p.headLight, 0.45, 0.55);
      } else {
        const eye = new Path2D("M -2.5 -2.8 L 2.4 -2.8 L 2.7 2.8 Q 0.2 3.8 -2.5 2.8 Z"); cut(eye, p.ink, 0.25);
        const glint = new Path2D("M -1.9 -2.6 L 0.5 -2.6 L 0.5 -0.2 L -1.9 -0.2 Z"); cut(glint, p.white, 0.1);
        stroke(ctx, new Path2D("M -2.6 -3.1 L 2.6 -3.1"), p.headDark, 0.55);
        if (glasses) {
          const frame = new Path2D("M -4.3 -4.4 L 4.3 -4.4 Q 4.96 -4.4 4.96 -3.7 L 4.96 3.7 Q 4.96 4.4 4.3 4.4 L -4.3 4.4 Q -4.96 4.4 -4.96 3.7 L -4.96 -3.7 Q -4.96 -4.4 -4.3 -4.4 Z"); stroke(ctx, frame, p.ink, 1.15);
          stroke(ctx, new Path2D("M -3.5 -4 L 1 -4"), p.headLight, 0.5, 0.9);
        }
      }
      ctx.restore();
    }
    if (glasses || sunglasses) stroke(ctx, new Path2D("M 28 32.2 L 41.6 32.2 M 18 30.8 L 15.5 29.8 M 51.6 30.8 L 54 29.8"), p.ink, 1.1);
    cut(new Path2D("M 32 34.4 L 36.8 34.4 L 35 36 L 33.8 36 Z"), p.nose, 0.25);
    stroke(ctx, new Path2D("M 34.4 36 L 34.4 37 L 31.2 38.4 M 34.4 37 L 37.6 38.4"), p.ink, 0.65);
    if (original.accessories?.includes("gold-chain")) {
      stroke(ctx, new Path2D("M 27.2 44.2 L 32 46 L 36.8 44.2 L 41.6 46"), p.mark ?? p.headLight, 0.6);
      for (const [x, y] of [[28.4, 44.2], [32.4, 45.8], [36.4, 44.2], [40.4, 45.8]]) {
        const link = new Path2D(); link.rect(x - 1.2, y - 0.85, 2.4, 1.7);
        cut(link, p.mark ?? p.headLight, 0.3);
      }
    }
    grain(ctx, face.outline, 0.08); ctx.restore();
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(35, 0); ctx.scale(side, 1);
      const whiskers = new Path2D("M 20 31.2 L 29.4 30.8 M 20 34.4 L 31 34.4 M 20 37.6 L 29.4 38");
      stroke(ctx, whiskers, p.headDark, 1.1, 0.9); stroke(ctx, whiskers, p.headLight, 0.35, 0.75); ctx.restore();
    }
  });
}
export function paperFaceEdge(id: CatId, rim: string) {
  return cachedSprite(`paper-face-edge:${id}:${rim}`, PAPER_FACE_SIZE.w + 4, PAPER_FACE_SIZE.h + 4, 2, (ctx) => {
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
