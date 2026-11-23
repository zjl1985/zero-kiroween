/**
 * Isometric view culling in world space. The screen rectangle becomes a
 * parallelogram in the world (viewWorldPolygon); a cheap AABB check runs
 * first, then the exact convex polygon test. `pad` is in world units and
 * grows the polygon on every side, which keeps tall sprites whose foot point
 * sits just past an edge.
 */
import type { Vec } from "./projection.js";

export interface WorldBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function polygonBounds(poly: readonly Vec[]): WorldBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

/** Works for either winding of a convex polygon. */
export function isoInView(poly: readonly Vec[], x: number, y: number, pad = 0): boolean {
  const b = polygonBounds(poly);
  if (x < b.x0 - pad || x > b.x1 + pad || y < b.y0 - pad || y > b.y1 + pad) return false;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, c = poly[(i + 1) % poly.length]!;
    area += a.x * c.y - c.x * a.y;
  }
  const sign = area >= 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, c = poly[(i + 1) % poly.length]!, ex = c.x - a.x, ey = c.y - a.y;
    const len = Math.hypot(ex, ey);
    if (len === 0) continue;
    // Signed distance of (x, y) to the inside of edge a -> c; negative means outside.
    const inside = (sign * (ex * (y - a.y) - ey * (x - a.x))) / len;
    if (inside < -pad) return false;
  }
  return true;
}
