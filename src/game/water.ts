import type { Point, WaterPolygon, WaterRegion } from "../defs/types.js";
import { WATER, inWaterPolygon, nearestWaterEdge } from "../defs/water.js";
import { waterRegionsNear } from "./world-gen.js";

export { waterRegionsNear } from "./world-gen.js";
export type { WaterRegion, WaterPolygon, WaterCrossing } from "../defs/types.js";
export type WaterStatus = "dry" | "shallow" | "deep" | "bridge";

/** Bridges are dry for status even where their approach extends beyond the shore. */
export function waterAt(seed: number, x: number, y: number): WaterStatus {
  const p = { x, y }, regions = waterRegionsNear(seed, x, y, 0);
  if (regions.some((r) => r.crossings.some((c) => inWaterPolygon(p, c.polygon)))) return "bridge";
  if (regions.some((r) => inWaterPolygon(p, r.core))) return "deep";
  return regions.some((r) => inWaterPolygon(p, r.shore)) ? "shallow" : "dry";
}
function blocked(p: Readonly<Point>, radius: number, regions: readonly WaterRegion[]): boolean {
  return regions.some((r) => {
    if (radius === 0 && r.crossings.some((c) => inWaterPolygon(p, c.polygon))) return false;
    return r.solids.some((s) => inWaterPolygon(p, s) || nearestWaterEdge(p, s).distance < radius);
  });
}
/** Deterministic spawn/recovery projection. Normal movement should use resolveWaterMove. */
export function avoidDeepWater(seed: number, x: number, y: number, radius: number): Point {
  radius = Math.max(0, radius);
  const p = { x, y }, regions = waterRegionsNear(seed, x, y, radius);
  if (!blocked(p, radius, regions)) return p;
  let best: Point | undefined, bestD = Infinity;
  // Test all edges, not just a core's centre or AABB; this also handles crossing corners.
  for (const r of regions) for (const polygon of r.solids) for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, dx = b.x - a.x, dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (len < 1e-8) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (len * len))),
      qx = a.x + dx * t, qy = a.y + dy * t, gap = radius + WATER.clearance,
      away = Math.hypot(x - qx, y - qy);
    const candidates = [{ x: qx + dy / len * gap, y: qy - dx / len * gap }];
    if (away > 1e-8) candidates.push({ x: qx + (x - qx) / away * gap, y: qy + (y - qy) / away * gap });
    for (const q of candidates) {
      const d = Math.hypot(q.x - x, q.y - y);
      if (d >= bestD || blocked(q, radius, waterRegionsNear(seed, q.x, q.y, radius))) continue;
      best = q; bestD = d;
    }
  }
  return best ?? p;
}
interface Hit { t: number; nx: number; ny: number }
/** Exact swept circle against a convex cut-paper polygon (offset faces + round corners). */
function sweep(p: Readonly<Point>, v: Readonly<Point>, radius: number, polygon: WaterPolygon): Hit | null {
  let best: Hit | null = null;
  const accept = (t: number, nx: number, ny: number) => {
    if (t >= -1e-8 && t <= 1 && (!best || t < best.t) && v.x * nx + v.y * ny < -1e-9)
      best = { t: Math.max(0, t), nx, ny };
  };
  const vv = v.x * v.x + v.y * v.y;
  if (vv < 1e-12) return null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, dx = b.x - a.x, dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (len < 1e-8) continue;
    const nx = dy / len, ny = -dx / len, speed = v.x * nx + v.y * ny;
    if (speed < -1e-9) {
      const distance = (p.x - a.x) * nx + (p.y - a.y) * ny,
        t = (radius - distance) / speed,
        along = ((p.x + v.x * t - a.x) * dx + (p.y + v.y * t - a.y) * dy) / len;
      if (along >= 0 && along <= len) accept(t, nx, ny);
    }
    if (radius > 0) {
      const px = p.x - a.x, py = p.y - a.y, dot = px * v.x + py * v.y,
        disc = dot * dot - vv * (px * px + py * py - radius * radius);
      if (disc >= 0) {
        const t = (-dot - Math.sqrt(disc)) / vv;
        accept(t, (px + v.x * t) / radius, (py + v.y * t) / radius);
      }
    }
  }
  return best;
}
/** Swept movement, with bounded tangent sliding: a dash cannot tunnel across a core. */
export function resolveWaterMove(seed: number, from: Readonly<Point>, to: Readonly<Point>, radius: number): Point {
  radius = Math.max(0, radius);
  let p = avoidDeepWater(seed, from.x, from.y, radius), v = { x: to.x - from.x, y: to.y - from.y };
  for (let pass = 0; pass < 3; pass++) {
    const length = Math.hypot(v.x, v.y);
    if (length < 1e-7) break;
    const regions = waterRegionsNear(seed, p.x + v.x / 2, p.y + v.y / 2, length / 2 + radius);
    let hit: Hit | null = null;
    for (const r of regions) for (const polygon of r.solids) {
      const h = sweep(p, v, radius, polygon);
      if (h && (!hit || h.t < hit.t)) hit = h;
    }
    if (!hit) { p = { x: p.x + v.x, y: p.y + v.y }; break; }
    const t = Math.max(0, hit.t - WATER.clearance / length);
    p = { x: p.x + v.x * t, y: p.y + v.y * t };
    const rest = { x: v.x * (1 - t), y: v.y * (1 - t) }, into = rest.x * hit.nx + rest.y * hit.ny;
    v = { x: rest.x - hit.nx * Math.min(0, into), y: rest.y - hit.ny * Math.min(0, into) };
  }
  return p;
}
