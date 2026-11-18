import type { PropDef } from "../../types.js";

/** A card picket fence beside the roads; torn down, it opens the way. */
export const PAPER_FENCE: PropDef = {
  id: "paper-fence",
  material: "card",
  size: { w: 82, d: 14 },
  colliders: (_seed, x, y, s) => [{ x1: x - 39 * s, y1: y - 3, x2: x + 40 * s, y2: y - 3, radius: 3 }],
  durability: 5,
  damagedBelow: 0.6,
  accepts: ["cut", "wind", "ink", "fold", "fire", "water"],
  drops: { shard: 0.5, shardValue: 1, treat: 0 },
  spawn: { from: "fence" },
  art: "paper-fence",
};
