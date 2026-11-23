/**
 * Pure 2:1 isometric projection kernel (docs/iso-art-spec.md section 1).
 * The simulation keeps its top-down world coordinates; only presentation
 * and the live input mapping go through these functions.
 */

/**
 * k = 0.5: the low native frame (docs/iso-art-spec.md section 1). One 32-unit
 * tile is a 32 x 16 px diamond and a 480 x 270 view covers the same world area
 * as the old 960 x 540 view at k = 1 (Jacobian determinant k^2 = 1/4).
 */
export const ISO = { k: 0.5, tile: 32, tileW: 32, tileH: 16 } as const;

/**
 * The one switch that moves both the live view and the controls to isometric.
 * FEAT-003 flips it together with the renderer, so no commit ships iso
 * controls over a top-down view or the reverse.
 */
export const ISO_PIPELINE = true;

export interface Vec {
  x: number;
  y: number;
}

/** World +x goes down-right on screen, +y down-left, (1, 1) straight down. */
export function toScreen(x: number, y: number): Vec {
  return { x: (x - y) * ISO.k, y: ((x + y) * ISO.k) / 2 };
}

/** Exact inverse of toScreen. */
export function toWorld(sx: number, sy: number): Vec {
  return { x: sx / (2 * ISO.k) + sy / ISO.k, y: sy / ISO.k - sx / (2 * ISO.k) };
}

/** Screen heading (radians) of a world direction (dx, dy) under the projection; 0 for a zero vector. */
export function screenAngle(dx: number, dy: number): number {
  const h = toScreen(dx, dy);
  return h.x === 0 && h.y === 0 ? 0 : Math.atan2(h.y, h.x);
}

/** Foot-point draw order: larger is nearer and drawn later. Callers break ties by a stable id. */
export function depthKey(x: number, y: number): number {
  return x + y;
}

/**
 * Integer pixel rounding applied once, after projection and camera offset.
 * Math.floor(v + 0.5) rounds halves the same way on both sides of zero
 * (Math.round(-0.5) is -0 but Math.round(-1.5) is -1), so tiles that meet at
 * a shared edge always land on the same pixel column.
 */
export function snap(v: number): number {
  return Math.floor(v + 0.5);
}

/**
 * Screen-relative stick or keys to a world move vector (D8). Up on screen is
 * world (-1, -1)/sqrt2 and right is world (1, -1)/sqrt2: a 45 degree rotation,
 * so the output length equals the input length, capped at 1, and zero stays zero.
 */
export function screenToWorldDir(dx: number, dy: number): Vec {
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return { x: 0, y: 0 };
  const scale = len > 1 ? 1 / len : 1;
  const ax = dx * scale, ay = dy * scale;
  return { x: (ax + ay) * Math.SQRT1_2, y: (ay - ax) * Math.SQRT1_2 };
}

/** The live input conversion: the sim still receives a FrameInput with world axes. */
export function isoInput<T extends { ax: number; ay: number }>(input: T): T {
  const w = screenToWorldDir(input.ax, input.ay);
  return { ...input, ax: w.x, ay: w.y };
}
