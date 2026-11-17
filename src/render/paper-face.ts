import { officialRects, MASCOT_VIEWBOX_WIDTH, MASCOT_VIEWBOX_HEIGHT, type MascotRect } from "../cats/official.js";
import type { CatId } from "../cats/types.js";
import { cachedSprite } from "../engine/sprite.js";
import type { CatPose } from "./layout.js";
import { grain, mix, type Ctx, type Point } from "./paper-material.js";

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

function cutPath(loops: FaceContours["silhouette"]): Path2D {
  const p = new Path2D();
  for (const loop of loops) {
    const pts = scissorContour(loop.map(([x, y]) => [4 + x * PAPER_FACE_SCALE, 4 + y * PAPER_FACE_SCALE] as Point));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length]!, b = pts[i]!, c = pts[(i + 1) % pts.length]!,
        ab = Math.hypot(a[0] - b[0], a[1] - b[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]),
        // A small scissor turn, not smoothing away a marking, eyelash or accessory.
        r = Math.min(1.25, ab * 0.4, bc * 0.4),
        before: Point = [b[0] + (a[0] - b[0]) * r / ab, b[1] + (a[1] - b[1]) * r / ab],
        after: Point = [b[0] + (c[0] - b[0]) * r / bc, b[1] + (c[1] - b[1]) * r / bc];
      if (i === 0) p.moveTo(...before); else p.lineTo(...before);
      p.quadraticCurveTo(...b, ...after);
    }
    p.closePath();
  }
  return p;
}
const paths = new WeakMap<FaceContours, { outline: Path2D; layers: { layer: FaceLayer; path: Path2D }[] }>();
function facePaths(id: CatId) {
  const face = officialFaceContours(id);
  let result = paths.get(face);
  if (!result) {
    result = { outline: cutPath(face.silhouette), layers: face.layers.map((layer) => ({ layer, path: cutPath(layer.contours) })) };
    paths.set(face, result);
  }
  return result;
}
export function paperFace(id: CatId) {
  return cachedSprite(`paper-face:${id}`, PAPER_FACE_SIZE.w, PAPER_FACE_SIZE.h, 2, (ctx) => {
    const face = facePaths(id);
    ctx.save();
    ctx.clip(face.outline);
    // A backing sheet prevents hairline gaps between antialiased colour cuts.
    ctx.fillStyle = [...face.layers].sort((a, b) => b.layer.area - a.layer.area)[0]!.layer.color;
    ctx.fill(face.outline);
    for (const { layer, path } of face.layers) {
      ctx.fillStyle = layer.color;
      ctx.fill(path);
      if (layer.area < 600) continue; // tiny eye/nose/highlight details retain the exact ink
      ctx.save();
      ctx.clip(path);
      ctx.lineWidth = 0.35;
      ctx.strokeStyle = mix(layer.color, "#211a28", 0.2);
      ctx.translate(0.28, 0.42);
      ctx.stroke(path);
      ctx.translate(-0.55, -0.72);
      ctx.strokeStyle = mix(layer.color, "#fff0d4", 0.22);
      ctx.stroke(path);
      ctx.restore();
    }
    grain(ctx, face.outline, 0.1);
    ctx.restore();
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
