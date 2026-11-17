import { EFFECT_LIFE } from "../../game/types.js";
import type { WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = { interval: 1.5, reach: 58, damage: 2, arc: 1.2 } as const;
const STEPS = [{ damage: 1 }, { area: 10 }, { rate: 0.15 }, { damage: 1, area: 10 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    claw: false | { interval: number; reach: number; damage: number; arc: number };
  }
  interface WeaponBaseMap {
    "night-claw": typeof BASE;
  }
}

/** Zero's melee swipe: a cone toward the nearest ink. */
export const NIGHT_CLAW: WeaponDef = {
  id: "night-claw",
  pool: "zero",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "auto",
  elements: ["cut"],
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.claw = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      reach: (BASE.reach + b.area) * s.area,
      damage: BASE.damage + b.damage,
      arc: BASE.arc,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    if (!ps.claw || !weaponReady(state, "night-claw", dt)) return;
    const c = ps.claw,
      p = state.player,
      target = ctx.nearestEnemy(state, p.x, p.y, c.reach);
    if (!target) return;
    state.weaponTimers["night-claw"] = c.interval;
    const angle = Math.atan2(target.y - p.y, target.x - p.x),
      cos = Math.cos(c.arc);
    ctx.effect(state, p.x, p.y, "claw", EFFECT_LIFE.claw, { angle, radius: c.reach });
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0) continue;
      const dx = e.x - p.x,
        dy = e.y - p.y,
        d = Math.hypot(dx, dy);
      if (d > c.reach + ctx.enemyRadius(e)) continue;
      if (d > 0 && (dx * Math.cos(angle) + dy * Math.sin(angle)) / d < cos) continue;
      ctx.hurtEnemy(state, e, c.damage);
    }
    // The swipe also tears paper props in front of the cat.
    const r = c.reach / 2;
    ctx.elementHit(state, p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r, r, "cut", c.damage);
  },
};
