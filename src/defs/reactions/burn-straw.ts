import { FIRE } from "../fire.js";
import type { ReactionDef } from "../types.js";

/** Fire on straw lights a wider patch of cells than thin paper. */
export const BURN_STRAW: ReactionDef = {
  id: "burn-straw",
  material: "straw",
  element: "fire",
  result: "scraps",
  fx: "ember",
  effect(state, hit, ctx) {
    ctx.ignite(state, hit.prop.x, hit.prop.y, FIRE.cell * 1.5);
  },
};
