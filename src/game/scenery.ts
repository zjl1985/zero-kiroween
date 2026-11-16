/** Ground-contact geometry for the substantial foreground fences and boulders. */
export const SOLID_SCENERY = [
  { x1: 28, y1: 438, x2: 114, y2: 438, radius: 3 },
  { x1: 712, y1: 500, x2: 809, y2: 500, radius: 3 },
  { x1: 906, y1: 371, x2: 928, y2: 371, radius: 10 },
] as const;

/** Capsule projection permits sliding along a fence and around either end. */
export function avoidScenery(
  x: number,
  y: number,
  radius: number,
  width = 960,
): { x: number; y: number } {
  for (const o of SOLID_SCENERY) {
    const dx = o.x2 - o.x1,
      dy = o.y2 - o.y1;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - o.x1) * dx + (y - o.y1) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    const qx = o.x1 + t * dx,
      qy = o.y1 + t * dy,
      nx = x - qx,
      ny = y - qy;
    const distance = Math.hypot(nx, ny),
      min = radius + o.radius;
    if (distance < min) {
      x = qx + (distance > 0.0001 ? nx / distance : 0) * min;
      y = qy + (distance > 0.0001 ? ny / distance : -1) * min;
      // A boulder beside the edge must not push an actor outside the map.
      if (x < radius + 10 || x > width - radius - 10) {
        x = Math.max(radius + 10, Math.min(width - radius - 10, x));
        y = qy + (ny >= 0 ? min : -min);
      }
    }
  }
  return { x, y };
}
