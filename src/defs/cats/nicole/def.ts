import { normalize } from "../../../game/collision.js";
import type { CharacterDef } from "../../types.js";
import { NICOLE_STATS as N } from "./stats.js";

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
 * Nicole (female cat): Moon Stars orbit; fold moon lays a slowing field and
 * grants shield charges; a one-time rescue shield at low hp. Exclusive Star
 * Fall, Deep Fold and Moon Shield; evolves into Full Moon.
 */
export const NICOLE: CharacterDef<typeof N> = {
  id: "nicole",
  gender: "female",
  stats: N,
  startWeapon: "moon-stars",
  exclusives: ["moon-stars", "star-fall", "deep-fold", "moon-shield", "full-moon"],
  evolutions: ["full-moon"],
  i18n: "nicole",
  art: "nicole",
  skillNotice: "nicole-fold",
  enemySlow: N.slowMultiplier,
  kitStats(s) {
    s.fieldRadius = N.fieldRadius;
    s.fieldDuration = N.fieldDuration;
    s.shieldCharges = N.shieldCharges;
  },
  onSkill(state, ps, ctx) {
    const p = state.player;
    state.fields.push({
      x: p.x,
      y: p.y,
      life: ps.fieldDuration,
      radius: ps.fieldRadius,
      duration: ps.fieldDuration,
    });
    p.shield = Math.max(p.shield, ps.shieldCharges);
    p.shieldTime = Math.max(p.shieldTime, N.shieldDuration);
    for (const e of state.enemies)
      if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) <= ps.fieldRadius) {
        e.slowTime = 0.5;
        const push = normalize(e.x - p.x, e.y - p.y),
          knock = 20 * ctx.knockOf(e);
        const pos = ctx.safePosition(state, e.x + push.x * knock, e.y + push.y * knock, ctx.enemyRadius(e));
        e.x = pos.x;
        e.y = pos.y;
      }
    ctx.effect(state, p.x, p.y, "fold", 0.6);
    ctx.notify(state, "nicole-fold");
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
