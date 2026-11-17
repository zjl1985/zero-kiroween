import type { PropDef } from "../../types.js";

/** A folded card crate: cut it open for a shard and sometimes a fish treat. */
export const PAPER_CRATE: PropDef = {
  id: "paper-crate",
  material: "card",
  size: { w: 36, d: 22 },
  colliders: (_seed, x, y, s) => [{ x1: x - 9 * s, y1: y - 6, x2: x + 9 * s, y2: y - 6, radius: 9 * s }],
  durability: 3,
  damagedBelow: 0.6,
  accepts: ["cut"],
  drops: { shard: 0.8, shardValue: 1, treat: 0.15 },
  spawn: { clear: 34, scale: [0.85, 1.15] },
  art: "paper-crate",
};
