/**
 * Pure plane geometry for the paper verbs (cut loops and fold lines). No
 * state, no randomness: the same points always give the same answer.
 */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Signed shoelace area (positive when counter-clockwise in y-up terms). */
export function signedArea(poly: readonly Pt[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j]!.x * poly[i]!.y - poly[i]!.x * poly[j]!.y;
  return a / 2;
}
export function polygonArea(poly: readonly Pt[]): number {
  return Math.abs(signedArea(poly));
}
/** Area centroid (falls back to the vertex mean for degenerate polygons). */
export function centroid(poly: readonly Pt[]): Pt {
  const a = signedArea(poly);
  if (Math.abs(a) < 1e-6) {
    let x = 0,
      y = 0;
    for (const p of poly) {
      x += p.x;
      y += p.y;
    }
    return { x: x / (poly.length || 1), y: y / (poly.length || 1) };
  }
  let cx = 0,
    cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j]!.x * poly[i]!.y - poly[i]!.x * poly[j]!.y;
    cx += (poly[j]!.x + poly[i]!.x) * f;
    cy += (poly[j]!.y + poly[i]!.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}
/** Even-odd point in polygon. */
export function insidePolygon(poly: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!,
      b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** Where segments ab and cd cross (strictly inside both), if they do. */
export function segmentCross(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const rx = b.x - a.x,
    ry = b.y - a.y,
    sx = d.x - c.x,
    sy = d.y - c.y,
    den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c.x - a.x,
    qy = c.y - a.y,
    t = (qx * sy - qy * sx) / den,
    u = (qx * ry - qy * rx) / den;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return { x: a.x + rx * t, y: a.y + ry * t };
}
/** Distance from (x, y) to the segment ab. */
export function segmentDistance(a: Pt, b: Pt, x: number, y: number): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

/**
 * Whether the newest point of a cut line closes a loop, and the loop if so.
 * A loop closes when the newest segment crosses an earlier, non-adjacent
 * segment, or when the newest point comes back within `close` of an earlier
 * point at least `gap` samples ago. The earliest (largest) loop whose area
 * reaches `minArea` wins. A straight or gently curved line never closes.
 */
export function closeLoop(points: readonly Pt[], close: number, minArea: number, gap = 4): Pt[] | null {
  const n = points.length;
  if (n < 4) return null;
  const a = points[n - 2]!,
    b = points[n - 1]!;
  for (let i = 0; i <= n - 4; i++) {
    const x = segmentCross(points[i]!, points[i + 1]!, a, b);
    if (x) {
      const loop = [x, ...points.slice(i + 1, n - 1)];
      if (loop.length >= 3 && polygonArea(loop) >= minArea) return loop;
    }
    if (i <= n - 1 - gap && Math.hypot(b.x - points[i]!.x, b.y - points[i]!.y) <= close) {
      const loop = points.slice(i, n);
      if (polygonArea(loop) >= minArea) return loop;
    }
  }
  return null;
}
/** Mirror of (x, y) across the line through (ox, oy) with unit normal (nx, ny). */
export function reflectAcross(x: number, y: number, ox: number, oy: number, nx: number, ny: number): Pt {
  const d = (x - ox) * nx + (y - oy) * ny;
  return { x: x - 2 * d * nx, y: y - 2 * d * ny };
}
