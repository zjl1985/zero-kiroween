import { fullMoonFirstPulse } from "../weapons/full-moon.js";
import type { EvolutionDef } from "../types.js";

/** Nicole: max Moon Stars + Deep Fold, granted only by opening a chest. */
export const FULL_MOON_EVOLUTION: EvolutionDef = {
  id: "full-moon",
  cat: "nicole",
  weapon: "moon-stars",
  passive: "deep-fold",
  replaces: "moon-stars",
  notice: "evolve-nicole",
  onEvolve(state) {
    state.pulseTimer = fullMoonFirstPulse();
  },
};
