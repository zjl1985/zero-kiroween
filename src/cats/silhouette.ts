import { tokenAt } from "./compose.js";
import type { ComposedCat } from "./compose.js";
import { isPixelToken } from "./tokens.js";
import { GRID_SIZE } from "./types.js";

export interface Point {
  x: number;
  y: number;
}

export function cellMatches(
  composed: ComposedCat,
  x: number,
  y: number,
  facing: 1 | -1,
  pred: (token: string) => boolean,
): boolean {
  if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return false;
  const acc = tokenAt(composed.accessory, x, y, facing);
  if (isPixelToken(acc) && pred(acc)) return true;
  const cell = tokenAt(composed.cells, x, y, facing);
  return pred(cell);
}

export function isFilled(composed: ComposedCat, x: number, y: number, facing: 1 | -1): boolean {
  return cellMatches(composed, x, y, facing, isPixelToken);
}

export type Segment = readonly [Point, Point];

/** One charcoal-ready segment for every occupied/empty cell border. */
export function boundarySegments(
  composed: ComposedCat,
  facing: 1 | -1,
  pred: (token: string) => boolean = isPixelToken,
): Segment[] {
  const segs: Segment[] = [];
  const filled = (x: number, y: number) => cellMatches(composed, x, y, facing, pred);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) segs.push([{ x, y }, { x: x + 1, y }]);
      if (!filled(x + 1, y)) segs.push([{ x: x + 1, y }, { x: x + 1, y: y + 1 }]);
      if (!filled(x, y + 1)) segs.push([{ x: x + 1, y: y + 1 }, { x, y: y + 1 }]);
      if (!filled(x - 1, y)) segs.push([{ x, y: y + 1 }, { x, y }]);
    }
  }
  return segs;
}

/**
 * Join boundary segments into closed loops where possible so a fill or a
 * single charcoal stroke can follow the silhouette.
 */
export function outlineLoops(
  composed: ComposedCat,
  facing: 1 | -1,
  pred: (token: string) => boolean = isPixelToken,
): Point[][] {
  const segs = boundarySegments(composed, facing, pred).map((s) => [s[0], s[1]] as [Point, Point]);
  const used = new Uint8Array(segs.length);
  const loops: Point[][] = [];

  const key = (p: Point) => `${p.x},${p.y}`;
  const starts = new Map<string, number[]>();
  segs.forEach((seg, i) => {
    const k = key(seg[0]);
    const list = starts.get(k);
    if (list) list.push(i);
    else starts.set(k, [i]);
  });

  for (let i = 0; i < segs.length; i += 1) {
    if (used[i]) continue;
    const loop: Point[] = [];
    let cur = i;
    const origin = segs[i]![0];
    while (cur >= 0 && !used[cur]) {
      used[cur] = 1;
      const seg = segs[cur]!;
      loop.push(seg[0]);
      const end = seg[1];
      if (end.x === origin.x && end.y === origin.y && loop.length > 2) {
        loop.push(end);
        break;
      }
      const candidates = starts.get(key(end)) ?? [];
      let next = -1;
      for (const idx of candidates) {
        if (!used[idx]) {
          next = idx;
          break;
        }
      }
      cur = next;
      if (cur < 0) {
        loop.push(end);
        break;
      }
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

/** Chaikin corner-cutting for a slightly loose hand-drawn curve. */
export function chaikin(points: Point[], rounds = 2): Point[] {
  let pts = points;
  for (let r = 0; r < rounds; r += 1) {
    if (pts.length < 3) break;
    const next: Point[] = [];
    const n = pts.length;
    const closed = dist(pts[0]!, pts[n - 1]!) < 0.15;
    const last = closed ? n - 1 : n - 1;
    if (!closed) next.push(pts[0]!);
    const limit = closed ? last : last;
    for (let i = 0; i < limit; i += 1) {
      const a = pts[i]!;
      const b = pts[(i + 1) % (closed ? last : n)]!;
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    if (!closed) next.push(pts[n - 1]!);
    else next.push(next[0]!);
    pts = next;
  }
  return pts;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
