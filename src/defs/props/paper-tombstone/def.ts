import type { PropDef } from "../../types.js";

/** A card tombstone of the graveyard woods; sturdy, but cuts wear it down. */
export const PAPER_TOMBSTONE: PropDef = {
  id: "paper-tombstone",
  material: "card",
  size: { w: 28, d: 12 },
  colliders: (_seed, x, y, s) => [{ x1: x - 6 * s, y1: y - 2, x2: x + 6 * s, y2: y - 2, radius: 6 * s }],
  durability: 5,
  damagedBelow: 0.6,
  accepts: ["cut", "ink", "fold", "fire"],
  drops: { shard: 0.45, shardValue: 1, treat: 0 },
  spawn: { clear: 30, scale: [0.8, 1.1] },
  art: "paper-tombstone",
};
