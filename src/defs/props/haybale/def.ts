import type { PropDef } from "../../types.js";

/** A round hay bale: straw burns hot and spreads fire to the grass around it. */
export const HAYBALE: PropDef = {
  id: "haybale",
  material: "straw",
  size: { w: 50, d: 24 },
  colliders: (_seed, x, y, s) => [{ x1: x - 12 * s, y1: y - 6, x2: x + 12 * s, y2: y - 6, radius: 11 * s }],
  durability: 4,
  damagedBelow: 0.6,
  accepts: ["cut", "wind", "fire"],
  drops: { shard: 0.35, shardValue: 1, treat: 0.04 },
  spawn: { clear: 44, scale: [0.85, 1.15] },
  art: "haybale",
};
