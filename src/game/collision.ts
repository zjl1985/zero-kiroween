export interface Vec {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function normalize(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  if (len <= 1e-8) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const denom = abx * abx + aby * aby;
  const t = denom <= 1e-8 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / denom, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

export function circleHitsPolyline(
  cx: number,
  cy: number,
  radius: number,
  points: readonly Vec[],
  thickness: number,
): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (pointSegDist(cx, cy, a.x, a.y, b.x, b.y) <= radius + thickness) return true;
  }
  return false;
}

export function keepInside(
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number,
  pad = 8,
  minY?: number,
): Vec {
  return {
    x: clamp(x, pad + radius, width - pad - radius),
    y: clamp(y, (minY ?? pad) + radius, height - pad - radius),
  };
}
