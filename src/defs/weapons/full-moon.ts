import { normalize } from "../../game/collision.js";
import { EFFECT_LIFE } from "../../game/types.js";
import type { WeaponDef } from "../types.js";

const VALUES = {
  stars: 2,
  pulseInterval: 3.2,
  pulseReach: 34,
  pulseDamage: 1.5,
  pulsePush: 26,
} as const;

declare module "../types.js" {
  interface PlayerStats {
    fullMoon: boolean;
    pulseReach: number;
  }
  interface UpgradeValueMap {
    "full-moon": typeof VALUES;
  }
}

/** Nicole's evolution (max Moon Stars + Deep Fold): two more stars and a periodic pulse. */
export const FULL_MOON: WeaponDef = {
  id: "full-moon",
  pool: "nicole",
  kind: "evolution",
  values: VALUES,
  timing: "aura",
  init(state) {
    state.pulseTimer = VALUES.pulseInterval;
  },
  stats(s, level) {
    const full = level > 0;
    s.fullMoon = full;
    s.pulseReach = VALUES.pulseReach * s.area;
    // Only adds to an orbit that exists (after moon-stars in registration order).
    if (s.orbitCount > 0) s.orbitCount = s.orbitCount + (full ? VALUES.stars : 0);
  },
  step(state, ps, dt, _rng, ctx) {
    if (!ps.fullMoon) return;
    const p = state.player;
    state.pulseTimer -= dt;
    if (state.pulseTimer > 0) return;
    state.pulseTimer = VALUES.pulseInterval * ps.attackIntervalScale;
    const reach = ps.orbitRadius + ps.pulseReach;
    ctx.effect(state, p.x, p.y, "moon-pulse", EFFECT_LIFE["moon-pulse"], { radius: reach });
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > reach) continue;
      ctx.hurtEnemy(state, e, VALUES.pulseDamage);
      const dir = normalize(e.x - p.x, e.y - p.y),
        knock = VALUES.pulsePush * ctx.knockOf(e),
        pos = ctx.safePosition(state, e.x + dir.x * knock, e.y + dir.y * knock, ctx.enemyRadius(e));
      e.x = pos.x;
      e.y = pos.y;
      e.slowTime = Math.max(e.slowTime, 0.4);
    }
  },
};

/** Half an interval after the chest, so the first pulse comes soon. */
export function fullMoonFirstPulse(): number {
  return VALUES.pulseInterval * 0.5;
}
