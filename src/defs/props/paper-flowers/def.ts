import type { PropDef } from "../../types.js";

/** A patch of tall cut-paper flowers; flat ground cover that tears and burns. */
export const PAPER_FLOWERS: PropDef = {
  id: "paper-flowers",
  material: "thin-paper",
  size: { w: 76, d: 34 },
  durability: 1.5,
  damagedBelow: 0.55,
  accepts: ["cut", "wind", "fire", "ink", "fold", "water"],
  regrow: { seconds: 24, burntSeconds: 36 },
  drops: { shard: 0.1, shardValue: 1, treat: 0.03 },
  spawn: { clear: 36, scale: [0.85, 1.2], flat: true },
  art: "paper-flowers",
};
