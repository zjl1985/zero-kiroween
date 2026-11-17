import type { PropDef } from "../../types.js";

/** Cut or gust the vat to splash a temporary, fire-resistant ink coating on nearby paper. */
export const INK_VAT: PropDef = {
  id: "ink-vat",
  material: "ink",
  size: { w: 42, d: 26 },
  colliders: (_seed, x, y, s) => [{ x1: x - 7 * s, y1: y - 6 * s, x2: x + 7 * s, y2: y - 6 * s, radius: 10 * s }],
  durability: 2.4,
  damagedBelow: 0.6,
  accepts: ["cut", "wind"],
  drops: { shard: 1, shardValue: 2, treat: 0 },
  spawn: { clear: 38, scale: [0.85, 1.1] },
  art: "ink-vat",
};
