import type { BiomeDef } from "../types.js";

/** Pale open meadow: tall paper flowers, mushrooms and long grass. */
export const MOON_MEADOW: BiomeDef = {
  id: "moon-meadow",
  decor: { cottageChance: 0.05, trees: [0, 2], bushes: [1, 3], stones: [1, 2], lampChance: 0.3, fenceChance: 0.1, flowers: [5, 8], tufts: [6, 9] },
  props: [
    { prop: "paper-flowers", chance: 0.95, count: [2, 4] },
    { prop: "paper-mushroom", chance: 0.7, count: [1, 3] },
    { prop: "paper-grass", chance: 0.6, count: [1, 2] },
    { prop: "signpost", chance: 0.2, count: [1, 1], roadside: true },
  ],
};
