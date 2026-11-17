import type { BiomeDef } from "../types.js";

/** Shallow paper water, reeds and lantern strings along the towpaths. */
export const LANTERN_CANAL: BiomeDef = {
  id: "lantern-canal",
  decor: { cottageChance: 0.12, trees: [1, 2], stones: [2, 4], lampChance: 0.8, fenceChance: 0.1, flowers: [1, 2] },
  props: [
    { prop: "paper-reeds", chance: 0.9, count: [2, 4] },
    { prop: "paper-lanterns", chance: 0.7, count: [1, 2], roadside: true },
    { prop: "paper-crate", chance: 0.35, count: [1, 1] },
    { prop: "laundry-line", chance: 0.25, count: [1, 1] },
    { prop: "paper-grass", chance: 0.3, count: [1, 1] },
  ],
};
