import type { ReactionDef } from "../types.js";
import { PAPER_ELEMENTS } from "./paper-status.js";

/** Heat consumes wax without awarding the loot reserved for tearing. */
export const MELT_WAX: ReactionDef = {
  id: "melt-wax", material: "wax", element: "fire", result: "scraps", fx: "steam",
  effect(state, hit, ctx) {
    if (!Number.isFinite(hit.power) || hit.power <= 0) return;
    ctx.damageProp(state, hit.prop, hit.power * PAPER_ELEMENTS.waxHeatScale, true);
  },
};
