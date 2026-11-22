import { EFFECT_LIFE } from "../../game/types.js";
import type { WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = { interval: 2.2, range: 230, radius: 34, damage: 2.5, count: 1 } as const;
const STEPS = [{ count: 1 }, { damage: 1 }, { area: 8 }, { count: 1, rate: 0.15 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    starFall:
      | false
      | { interval: number; range: number; radius: number; damage: number; count: number };
  }
  interface WeaponBaseMap {
    "star-fall": typeof BASE;
  }
}

/** Nicole's sky weapon: stars drop on random ink in range (uses the step RNG). */
export const STAR_FALL: WeaponDef = {
  id: "star-fall",
  pool: "nicole",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "auto",
  elements: ["cut"],
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.starFall = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      range: BASE.range,
      radius: (BASE.radius + b.area) * s.area,
      damage: BASE.damage + b.damage,
      count: BASE.count + b.count,
    };
  },
  step(state, ps, dt, rng, ctx) {
    if (!ps.starFall || !weaponReady(state, "star-fall", dt)) return;
    const f = ps.starFall,
      p = state.player,
      pool = state.enemies.filter(
        (e) => e.alive && e.spawnTime <= 0 && Math.hypot(e.x - p.x, e.y - p.y) <= f.range,
      );
    if (!pool.length) return;
    state.weaponTimers["star-fall"] = f.interval;
    for (let i = 0; i < f.count && pool.length; i++) {
      const t = pool.splice(rng.int(0, pool.length), 1)[0]!,
        x = t.x,
        y = t.y;
      ctx.effect(state, x, y, "star-fall", EFFECT_LIFE["star-fall"], { radius: f.radius });
      for (const e of state.enemies)
        if (e.alive && e.spawnTime <= 0 && Math.hypot(e.x - x, e.y - y) <= f.radius + ctx.enemyRadius(e))
          ctx.hurtEnemy(state, e, f.damage, { family: "star-fall", x, y });
      ctx.elementHit(state, x, y, f.radius, "cut", f.damage);
    }
  },
};
