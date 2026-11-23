/** Native presentation grid. Simulation/camera coordinates remain unchanged. */
export const WORLD_UNITS_PER_PIXEL = 1;
export function pixelBacking(width: number, height: number): { width: number; height: number } {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new RangeError("Invalid pixel viewport");
  return { width: Math.max(1, Math.round(width / WORLD_UNITS_PER_PIXEL)), height: Math.max(1, Math.round(height / WORLD_UNITS_PER_PIXEL)) };
}

/** Largest whole enlargement of the native frame on the presentation canvas (bounds the retro layer's fill cost). */
export const PRESENT_MAX_SCALE = 4;

/**
 * Backing size of the presentation canvas: the native frame enlarged by a
 * whole factor close to the CSS size in device pixels (1..PRESENT_MAX_SCALE),
 * so nearest-neighbour pixels stay square and the scanlines stay regular.
 */
export function presentBacking(native: { width: number; height: number }, cssWidth: number, dpr: number): { width: number; height: number; scale: number } {
  const want = (Math.max(1, cssWidth) * Math.max(1, Number.isFinite(dpr) ? dpr : 1)) / Math.max(1, native.width);
  const scale = Math.max(1, Math.min(PRESENT_MAX_SCALE, Math.round(want)));
  return { width: native.width * scale, height: native.height * scale, scale };
}
