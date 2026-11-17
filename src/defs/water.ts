import type { Point, WaterPolygon, WaterRegion, WaterShape } from "./types.js";

/** Shared water tuning. Shallow water slows actors; a dry crossing never wets them. */
export const WATER = {
  shallowSlow: 0.68,
  rim: 28,
  vertices: 24,
  clearance: 0.02,
  cachedSeeds: 4,
  /** Just east of the yard, north of every generated road and clear of the fixed boulder. */
  startBasin: { x: 1040, y: 420, rx: 76, ry: 46 },
  canal: { rx: 108, ry: 69, jitter: 24 },
} as const;

/** Straight cut edges are intentional: collision and Canvas use these same vertices. */
export function waterOval(x: number, y: number, rx: number, ry: number): WaterPolygon {
  return Array.from({ length: WATER.vertices }, (_, i) => {
    const a = i * Math.PI * 2 / WATER.vertices;
    return { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
  });
}
export function waterRect(x0: number, y0: number, x1: number, y1: number): WaterPolygon {
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}
export function waterSide(a: Readonly<Point>, b: Readonly<Point>, p: Readonly<Point>): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}
export function inWaterPolygon(p: Readonly<Point>, polygon: WaterPolygon): boolean {
  return polygon.length >= 3 && polygon.every((a, i) => waterSide(a, polygon[(i + 1) % polygon.length]!, p) >= -1e-7);
}
export function waterBounds(polygon: WaterPolygon): WaterRegion["bounds"] {
  return {
    minX: Math.min(...polygon.map((p) => p.x)), minY: Math.min(...polygon.map((p) => p.y)),
    maxX: Math.max(...polygon.map((p) => p.x)), maxY: Math.max(...polygon.map((p) => p.y)),
  };
}
function clipSide(polygon: WaterPolygon, a: Readonly<Point>, b: Readonly<Point>, inside: boolean): WaterPolygon {
  const out: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!, q = polygon[(i + 1) % polygon.length]!,
      dp = waterSide(a, b, p), dq = waterSide(a, b, q),
      pin = inside ? dp >= 0 : dp <= 0, qin = inside ? dq >= 0 : dq <= 0;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  // Coincident bridge edges must not leave zero-area invisible collision slivers.
  const area = out.reduce((sum, p, i) => {
    const q = out[(i + 1) % out.length]!;
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  return area > 1e-5 ? out : [];
}
/** Convex subtraction: each outside slice is disjoint; only the inside proceeds. */
function subtract(polygon: WaterPolygon, hole: WaterPolygon): WaterPolygon[] {
  let rest = polygon;
  const out: WaterPolygon[] = [];
  for (let i = 0; i < hole.length && rest.length; i++) {
    const a = hole[i]!, b = hole[(i + 1) % hole.length]!;
    const slice = clipSide(rest, a, b, false);
    if (slice.length) out.push(slice);
    rest = clipSide(rest, a, b, true);
  }
  return out;
}
export function prepareWater(shape: WaterShape): WaterRegion {
  let solids: WaterPolygon[] = shape.core.length ? [shape.core] : [];
  for (const c of shape.crossings) solids = solids.flatMap((p) => subtract(p, c.polygon));
  return { ...shape, solids, bounds: waterBounds(shape.shore) };
}
export function nearestWaterEdge(p: Readonly<Point>, polygon: WaterPolygon): { x: number; y: number; nx: number; ny: number; distance: number } {
  let best = { x: p.x, y: p.y, nx: 0, ny: -1, distance: Infinity };
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, dx = b.x - a.x, dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (len < 1e-8) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len))),
      x = a.x + dx * t, y = a.y + dy * t, distance = Math.hypot(p.x - x, p.y - y);
    if (distance < best.distance) best = { x, y, nx: dy / len, ny: -dx / len, distance };
  }
  return best;
}
/** Placement clearance deliberately includes shallow banks, not just the blocked core. */
export function touchesWaterShore(region: WaterRegion, x: number, y: number, radius: number): boolean {
  const p = { x, y };
  return inWaterPolygon(p, region.shore) || nearestWaterEdge(p, region.shore).distance <= radius;
}
