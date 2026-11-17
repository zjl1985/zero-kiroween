import type { PropDef } from "../../types.js";

/** A patch of tall thin-paper grass: the fire's fuel. */
export const PAPER_GRASS: PropDef = {
  id: "paper-grass",
  material: "thin-paper",
  size: { w: 110, d: 56 },
  durability: 2,
  damagedBelow: 0.55,
  accepts: ["cut", "wind", "fire", "ink", "fold"],
  regrow: { seconds: 18, burntSeconds: 30 },
  drops: { shard: 0, shardValue: 0, treat: 0 },
  spawn: { chance: 0.7, count: [1, 2], clear: 40, scale: [0.85, 1.2], flat: true },
  art: "paper-grass",
};
