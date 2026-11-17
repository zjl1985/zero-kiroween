import type { PropDef } from "../../types.js";

/** Reeds of thin paper strips at the canal edge: cut, gust and burn. */
export const PAPER_REEDS: PropDef = {
  id: "paper-reeds",
  material: "thin-paper",
  size: { w: 54, d: 20 },
  durability: 2,
  damagedBelow: 0.55,
  accepts: ["cut", "wind", "fire"],
  drops: { shard: 0.15, shardValue: 1, treat: 0 },
  spawn: { clear: 30, scale: [0.85, 1.2], flat: true },
  art: "paper-reeds",
};
