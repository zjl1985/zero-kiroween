import { FIRE } from "../fire.js";
import type { ReactionDef } from "../types.js";

/** Paper cloth catches fire more reluctantly than thin paper. */
export const BURN_CLOTH: ReactionDef = {
  id: "burn-cloth",
  material: "cloth",
  element: "fire",
  result: "scraps",
  fx: "ember",
  effect(state, hit, ctx) {
    ctx.ignite(state, hit.prop.x, hit.prop.y, FIRE.cell);
  },
};
