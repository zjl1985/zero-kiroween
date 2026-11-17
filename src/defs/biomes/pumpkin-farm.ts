import type { BiomeDef } from "../types.js";

/** Open farmland: paper grass, hay bales, scarecrows and pumpkins. */
export const PUMPKIN_FARM: BiomeDef = {
  id: "pumpkin-farm",
  decor: { cottageChance: 0.08, trees: [0, 1], bushes: [1, 2], lampChance: 0.25, fenceChance: 0.45, pumpkinChance: 0.65, leaves: [3, 5] },
  props: [
    { prop: "scarecrow", chance: 0.5, count: [1, 1] },
    { prop: "haybale", chance: 0.75, count: [1, 3] },
    { prop: "paper-grass", chance: 0.9, count: [2, 3] },
    { prop: "paper-crate", chance: 0.25, count: [1, 1] },
    { prop: "signpost", chance: 0.3, count: [1, 1], roadside: true },
  ],
};
