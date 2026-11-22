/** A solid ground-contact capsule: a fence rail, a boulder, a house wall. */
export interface Capsule {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly radius: number;
}
/** Anchors shared by collision and the y-sorted opening scenery. Offsets below
 * describe the ground contact, independent of the height of the painted prop. */
export const YARD_FURNITURE = [
  { kind: "woodpile", x: 350, y: 482, left: -29, right: 28, contactY: -8, radius: 10 },
  { kind: "west-planter", x: 368, y: 340, left: -16, right: 18, contactY: -4, radius: 5 },
  { kind: "tool-rack", x: 672, y: 334, left: -12, right: 16, contactY: -3, radius: 5 },
  { kind: "east-planter", x: 713, y: 334, left: -13, right: 14, contactY: -5, radius: 5 },
] as const;
export const YARD_RAILS = [
  { x: 340, y: 316, s: .85 }, { x: 414, y: 316, s: .85 },
  { x: 645, y: 324, s: .85 }, { x: 718, y: 324, s: .85 },
] as const;

/** Ground-contact geometry for the solid fixtures in the starting yard. */
export const SOLID_SCENERY: readonly Capsule[] = [
  { x1: 28, y1: 438, x2: 114, y2: 438, radius: 3 },
  { x1: 712, y1: 500, x2: 809, y2: 500, radius: 3 },
  { x1: 906, y1: 371, x2: 928, y2: 371, radius: 10 },
  ...YARD_FURNITURE.map(p => ({
    x1: p.x + p.left, y1: p.y + p.contactY,
    x2: p.x + p.right, y2: p.y + p.contactY, radius: p.radius,
  })),
  ...YARD_RAILS.map(p => ({ x1: p.x - 34, y1: p.y - 2, x2: p.x + 34, y2: p.y + 2, radius: 3 })),
];

/**
 * Capsule projection permits sliding along a fence and around either end.
 * `colliders` defaults to the start yard; the sim passes the colliders of
 * the chunks around the actor (src/game/world-gen.ts nearColliders).
 */
export function avoidScenery(
  x: number,
  y: number,
  radius: number,
  colliders: readonly Capsule[] = SOLID_SCENERY,
): { x: number; y: number } {
  for (const o of colliders) {
    // Cheap reject: far capsules cannot touch the actor.
    const reach = radius + o.radius;
    if (
      x < Math.min(o.x1, o.x2) - reach ||
      x > Math.max(o.x1, o.x2) + reach ||
      y < Math.min(o.y1, o.y2) - reach ||
      y > Math.max(o.y1, o.y2) + reach
    )
      continue;
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
    const distance = Math.hypot(nx, ny);
    if (distance < reach) {
      x = qx + (distance > 0.0001 ? nx / distance : 0) * reach;
      y = qy + (distance > 0.0001 ? ny / distance : -1) * reach;
    }
  }
  return { x, y };
}
