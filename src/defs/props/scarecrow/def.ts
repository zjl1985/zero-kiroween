import type { PropDef } from "../../types.js";

/**
 * A cloth scarecrow stuffed with ink shards: torn down, it always spills a
 * ring of them (drops.burst). Wind only flaps its coat loose slowly.
 */
export const SCARECROW: PropDef = {
  id: "scarecrow",
  material: "cloth",
  size: { w: 40, d: 14 },
  colliders: (_seed, x, y, s) => [{ x1: x, y1: y - 2, x2: x, y2: y - 2, radius: 5 * s }],
  durability: 4,
  damagedBelow: 0.55,
  accepts: ["cut", "wind"],
  drops: { shard: 1, shardValue: 2, treat: 0, burst: 4 },
  spawn: { clear: 60, scale: [0.9, 1.1] },
  art: "scarecrow",
};
