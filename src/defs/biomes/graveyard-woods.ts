import type { BiomeDef } from "../types.js";

/** Dense dark woods with bare trees, paper tombstones, candles and mushrooms. */
export const GRAVEYARD_WOODS: BiomeDef = {
  id: "graveyard-woods",
  decor: { cottageChance: 0.03, trees: [3, 5], bushes: [3, 5], lampChance: 0.2, fenceChance: 0.15, candlesChance: 0.45, pumpkinChance: 0.08, flowers: [0, 1], leaves: [4, 6] },
  props: [
    { prop: "dead-tree", chance: 0.85, count: [1, 2] },
    { prop: "paper-tombstone", chance: 0.75, count: [2, 4] },
    { prop: "paper-mushroom", chance: 0.4, count: [1, 2] },
    { prop: "paper-grass", chance: 0.3, count: [1, 1] },
  ],
};
