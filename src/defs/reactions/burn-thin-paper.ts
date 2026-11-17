import { FIRE } from "../fire.js";
import type { ReactionDef } from "../types.js";

/** Fire on thin paper lights the cells under the prop; the fire grid does the rest. */
export const BURN_THIN_PAPER: ReactionDef = {
  id: "burn-thin-paper",
  material: "thin-paper",
  element: "fire",
  result: "scraps",
  fx: "ember",
  effect(state, hit, ctx) {
    ctx.ignite(state, hit.prop.x, hit.prop.y, FIRE.cell);
  },
};
