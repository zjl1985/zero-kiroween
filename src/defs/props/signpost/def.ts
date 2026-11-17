import type { PropDef } from "../../types.js";

/** A card signpost with two arrow boards at a road side. */
export const SIGNPOST: PropDef = {
  id: "signpost",
  material: "card",
  size: { w: 34, d: 10 },
  colliders: (_seed, x, y) => [{ x1: x, y1: y - 1, x2: x, y2: y - 1, radius: 3.5 }],
  durability: 3,
  damagedBelow: 0.6,
  accepts: ["cut"],
  drops: { shard: 0.4, shardValue: 1, treat: 0 },
  spawn: { clear: 30, scale: [0.9, 1.1] },
  art: "signpost",
};
