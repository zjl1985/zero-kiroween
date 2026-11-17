import type { PropDef } from "../../types.js";

/** Cloth washing pegged on a line between two posts; wind and cuts tear it down. */
export const LAUNDRY_LINE: PropDef = {
  id: "laundry-line",
  material: "cloth",
  size: { w: 92, d: 12 },
  colliders: (_seed, x, y, s) => [
    { x1: x - 42 * s, y1: y - 1, x2: x - 42 * s, y2: y - 1, radius: 3 },
    { x1: x + 42 * s, y1: y - 1, x2: x + 42 * s, y2: y - 1, radius: 3 },
  ],
  durability: 2.5,
  damagedBelow: 0.6,
  accepts: ["cut", "wind", "ink", "fold", "fire"],
  drops: { shard: 0.3, shardValue: 1, treat: 0.05 },
  spawn: { clear: 56, scale: [0.9, 1.05] },
  art: "laundry-line",
};
