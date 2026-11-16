import {
  buildRects,
  CAT_VARIANTS,
  MASCOT_VIEWBOX_HEIGHT,
  MASCOT_VIEWBOX_WIDTH,
  type MascotRect,
  type MascotState,
} from "./meow-wall-art.js";
import type { CatId } from "./types.js";

export { MASCOT_VIEWBOX_HEIGHT, MASCOT_VIEWBOX_WIDTH };
export type { MascotRect, MascotState };

export function officialVariant(id: CatId) {
  const variant = CAT_VARIANTS.find((item) => item.id === id);
  if (!variant) throw new Error(`missing meow-wall variant: ${id}`);
  return variant;
}

/** Official Meow Wall head geometry for a locked guest. */
export function officialRects(id: CatId, state: MascotState = "idle"): MascotRect[] {
  const variant = officialVariant(id);
  return buildRects(variant.palette, {
    state,
    accessories: variant.accessories,
    markings: variant.markings,
  });
}
