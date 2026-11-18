import type { BiomeDef } from "../types.js";

/** Cottages, fences and lamps; lantern strings, mailboxes and washing by the roads. */
export const OLD_TOWN: BiomeDef = {
  id: "old-town",
  decor: { cottageChance: 0.55, trees: [1, 2], lampChance: 0.38, fenceChance: 0.5, pumpkinChance: 0.12 },
  props: [
    { prop: "paper-lanterns", chance: 0.55, count: [1, 1], roadside: true },
    { prop: "mailbox", chance: 0.5, count: [1, 1], roadside: true },
    { prop: "signpost", chance: 0.3, count: [1, 1], roadside: true },
    { prop: "laundry-line", chance: 0.35, count: [1, 1] },
    { prop: "paper-crate", chance: 0.4, count: [1, 2] },
    { prop: "paper-grass", chance: 0.35, count: [1, 1] },
    { prop: "ink-vat", chance: 0.65, count: [1, 1] },
    { prop: "wax-candle", chance: 0.5, count: [1, 2] },
    { prop: "water-bucket", chance: 0.35, count: [1, 1] },
  ],
};
