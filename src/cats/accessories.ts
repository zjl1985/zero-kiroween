import type { AccessoryId, Overlay } from "./types.js";

/** Accessory overlays from the Meow Wall 32-cell authoring format. */
export const ACCESSORIES: Record<AccessoryId, Overlay> = {
  sunglasses: {
    15: ".......KKKKKK.......KKKKKK......",
    16: ".......KWKKKKKKKKKKKKKWKKKK.....",
    17: ".......KKKKKK.......KKKKKK......",
  },
  glasses: {
    15: ".......KKKKK.......KKKKK........",
    16: ".......K...K.......K...K........",
    17: ".......KKKKK.......KKKKK........",
  },
  "gold-chain": {
    24: "...........M.K.M.K.M.M..........",
    25: "..........M.K.M.K.M.K.M.........",
    26: "...........M.K.M.K.M.M..........",
  },
};
