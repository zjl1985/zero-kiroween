/** Native presentation grid. Simulation/camera coordinates remain unchanged. */
export const WORLD_UNITS_PER_PIXEL = 2;
export function pixelBacking(width: number, height: number): { width: number; height: number } {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new RangeError("Invalid pixel viewport");
  return { width: Math.max(1, Math.round(width / WORLD_UNITS_PER_PIXEL)), height: Math.max(1, Math.round(height / WORLD_UNITS_PER_PIXEL)) };
}
