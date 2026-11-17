import type { PropDef } from "../../types.js";

/** A card mailbox on a post beside the road; letters flutter out when cut. */
export const MAILBOX: PropDef = {
  id: "mailbox",
  material: "card",
  size: { w: 22, d: 12 },
  colliders: (_seed, x, y) => [{ x1: x, y1: y - 1, x2: x, y2: y - 1, radius: 4 }],
  durability: 3,
  damagedBelow: 0.6,
  accepts: ["cut"],
  drops: { shard: 0.5, shardValue: 1, treat: 0.05 },
  spawn: { clear: 30, scale: [0.9, 1.1] },
  art: "mailbox",
};
