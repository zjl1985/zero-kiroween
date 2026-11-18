import { WASH } from "../../wash.js";
import type { PropDef } from "../../types.js";

/** A folded card bucket of water: torn or burnt, it spills and washes the colour out around it. */
export const WATER_BUCKET: PropDef = {
  id: "water-bucket",
  material: "card",
  size: { w: 30, d: 22 },
  colliders: (_seed, x, y, s) => [{ x1: x - 5 * s, y1: y - 5 * s, x2: x + 5 * s, y2: y - 5 * s, radius: 9 * s }],
  durability: 1.6,
  damagedBelow: 0.6,
  accepts: ["cut", "ink", "fold", "fire", "water"],
  drops: { shard: 0.5, shardValue: 1, treat: 0 },
  spawn: { clear: 34, scale: [0.85, 1.05] },
  onScraps(state, prop, ctx) {
    ctx.wash(state, prop.x, prop.y, WASH.bucket.radius * prop.s, WASH.bucket.amount);
  },
  art: "water-bucket",
};
