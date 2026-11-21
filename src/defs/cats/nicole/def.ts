import type { CharacterDef } from "../../types.js";
import { NICOLE_STATS as N } from "./stats.js";

export const NICOLE_FOLD_POWER = 2;

declare module "../../types.js" {
  interface PlayerStats {
    fieldRadius: number;
    fieldDuration: number;
    shieldCharges: number;
  }
  interface CharacterStatsMap {
    nicole: typeof N;
  }
}

/**
 * Nicole (female cat): automatic Moon Stars orbit; a one-time rescue shield
 * at low hp. Exclusive Star
 * Fall, Deep Fold and Moon Shield; evolves into Full Moon.
 */
export const NICOLE: CharacterDef<typeof N> = {
  id: "nicole",
  gender: "female",
  stats: N,
  startWeapon: "moon-stars",
  exclusives: ["moon-stars", "star-fall", "deep-fold", "moon-shield", "full-moon", "page-fold"],
  evolutions: ["full-moon"],
  i18n: "nicole",
  art: "nicole",
  skillNotice: "nicole-fold",
  copyParams: () => ({
    stars: N.orbitCount,
    field: N.fieldDuration,
    shield: N.shieldCharges,
    shieldTime: N.shieldDuration,
    slowPercent: Math.round((1 - N.slowMultiplier) * 100),
    threshold: N.rescueThreshold,
    rescue: N.rescueCharges,
    rescueTime: N.rescueDuration,
  }),
  enemySlow: N.slowMultiplier,
  kitStats(s) {
    s.fieldRadius = N.fieldRadius;
    s.fieldDuration = N.fieldDuration;
    s.shieldCharges = N.shieldCharges;
  },
  hooks: {
    // Rescue: once per night, a low-hp hit wraps Nicole in fresh shields.
    damaged(state, _payload, ctx) {
      const p = state.player;
      if (p.rescueUsed || p.hp <= 0 || p.hp > N.rescueThreshold) return;
      p.rescueUsed = true;
      p.shield = N.rescueCharges;
      p.shieldTime = N.rescueDuration;
      ctx.effect(state, p.x, p.y, "rescue", 0.8);
      ctx.notify(state, "nicole-rescue");
    },
  },
};
