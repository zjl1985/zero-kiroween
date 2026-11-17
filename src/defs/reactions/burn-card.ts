import { FIRE } from "../fire.js";
import type { ReactionDef } from "../types.js";

/** Thick card catches fire, but its lower flammability slows spread through it. */
export const BURN_CARD: ReactionDef = {
  id: "burn-card",
  material: "card",
  element: "fire",
  result: "scraps",
  fx: "ember",
  effect(state, hit, ctx) {
    ctx.ignite(state, hit.prop.x, hit.prop.y, FIRE.cell);
  },
};
