import type { PropDef } from "../../types.js";

/** A bare card tree with crooked branches; cuts fell it to a stump. */
export const DEAD_TREE: PropDef = {
  id: "dead-tree",
  material: "card",
  size: { w: 44, d: 16 },
  colliders: (_seed, x, y, s) => [{ x1: x - 4 * s, y1: y - 2, x2: x + 4 * s, y2: y - 2, radius: 7 * s }],
  durability: 6,
  damagedBelow: 0.55,
  accepts: ["cut"],
  drops: { shard: 0.6, shardValue: 1, treat: 0 },
  spawn: { clear: 56, scale: [0.85, 1.15] },
  art: "dead-tree",
};
