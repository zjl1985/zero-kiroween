import type { PropDef } from "../../types.js";

/** A thin-paper bush: tears quickly and burns. */
export const PAPER_BUSH: PropDef = {
  id: "paper-bush",
  material: "thin-paper",
  size: { w: 64, d: 22 },
  durability: 3,
  damagedBelow: 0.6,
  accepts: ["cut", "wind", "fire"],
  drops: { shard: 0.35, shardValue: 1, treat: 0.05 },
  spawn: { from: "bush" },
  art: "paper-bush",
};
