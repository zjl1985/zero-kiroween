import type { BiomeDef } from "../types.js";
import { WATER, waterOval } from "../water.js";

/** Real canal pockets, shallow banks, reeds and lantern strings along the towpaths. */
export const LANTERN_CANAL: BiomeDef = {
  id: "lantern-canal",
  decor: { cottageChance: 0.12, trees: [1, 2], stones: [2, 4], lampChance: 0.8, fenceChance: 0.1, flowers: [1, 2] },
  water(a) {
    const { rx, ry, jitter } = WATER.canal;
    return [0, 1].map((i) => {
      const x = a.x + a.width * (0.28 + i * 0.44) + (a.hash(70 + i) - 0.5) * jitter,
        y = a.y + a.height * (0.3 + i * 0.4) + (a.hash(72 + i) - 0.5) * jitter;
      return { id: `canal:${a.x},${a.y}:${i}`, seed: Math.floor(a.hash(74 + i) * 1e6),
        shore: waterOval(x, y, rx, ry), core: waterOval(x, y, rx - WATER.rim, ry - WATER.rim), crossings: [],
      };
    });
  },
  props: [
    { prop: "paper-reeds", chance: 0.9, count: [2, 4] },
    { prop: "paper-lanterns", chance: 0.7, count: [1, 2], roadside: true },
    { prop: "paper-crate", chance: 0.35, count: [1, 1] },
    { prop: "laundry-line", chance: 0.25, count: [1, 1] },
    { prop: "paper-grass", chance: 0.3, count: [1, 1] },
    { prop: "ink-vat", chance: 0.5, count: [1, 1] },
    { prop: "water-bucket", chance: 0.5, count: [1, 1] },
  ],
};
