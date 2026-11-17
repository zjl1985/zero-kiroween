import type { PropDef } from "../../types.js";

/** Paper lanterns strung between two poles; thin paper, so they tear and burn. */
export const PAPER_LANTERNS: PropDef = {
  id: "paper-lanterns",
  material: "thin-paper",
  size: { w: 78, d: 12 },
  colliders: (_seed, x, y, s) => [
    { x1: x - 34 * s, y1: y - 1, x2: x - 34 * s, y2: y - 1, radius: 3 },
    { x1: x + 34 * s, y1: y - 1, x2: x + 34 * s, y2: y - 1, radius: 3 },
  ],
  durability: 2,
  damagedBelow: 0.6,
  accepts: ["cut", "wind", "fire", "ink", "fold"],
  drops: { shard: 0.3, shardValue: 1, treat: 0.06 },
  spawn: { clear: 46, scale: [0.9, 1.1] },
  art: "paper-lanterns",
};
