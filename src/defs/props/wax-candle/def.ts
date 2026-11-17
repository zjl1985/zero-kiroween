import type { PropDef } from "../../types.js";

/** An unlit folded-wax candle: heat melts it, and the wax can carry a spreading fire. */
export const WAX_CANDLE: PropDef = {
  id: "wax-candle",
  material: "wax",
  size: { w: 30, d: 24 },
  colliders: (_seed, x, y, s) => [{ x1: x, y1: y - 4 * s, x2: x, y2: y - 4 * s, radius: 6 * s }],
  durability: 3,
  damagedBelow: 0.6,
  accepts: ["cut", "fire"],
  drops: { shard: 0, shardValue: 1, treat: 0 },
  spawn: { clear: 26, scale: [0.85, 1.2] },
  art: "wax-candle",
};
