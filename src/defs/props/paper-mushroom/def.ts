import type { PropDef } from "../../types.js";

/** A glowing card mushroom cluster; cut, it pops for a shard. */
export const PAPER_MUSHROOM: PropDef = {
  id: "paper-mushroom",
  material: "card",
  size: { w: 32, d: 14 },
  durability: 2,
  damagedBelow: 0.6,
  accepts: ["cut"],
  drops: { shard: 0.35, shardValue: 1, treat: 0 },
  spawn: { clear: 26, scale: [0.8, 1.2] },
  art: "paper-mushroom",
};
