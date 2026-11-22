import { CATS, ENEMY_DEFS } from "../registries.js";
import { EFFECT_LIFE } from "../../game/types.js";
import type { WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = {
  /** Seconds between dabs of the brush. */
  interval: 0.3,
  /** Radius of each dab around the cat. */
  radius: 34,
  /** Colour painted back per dab (1 = a colourless cell fully repainted). */
  paint: 0.5,
  damage: 0.5,
  /** Damage multiplier on pencil sketches (they are only pencil lines). */
  sketchBonus: 4,
} as const;
const STEPS = [{ area: 6 }, { damage: 0.5 }, { rate: 0.2 }, { area: 8, damage: 0.5 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    brush:
      | false
      | {
          interval: number;
          radius: number;
          paint: number;
          damage: number;
          sketchBonus: number;
        };
  }
  interface WeaponBaseMap {
    "watercolour-brush": typeof BASE;
  }
}

/**
 * Shared weapon: a watercolour brush that dabs the cat's own colour on the
 * page wherever it walks, repainting washed and blank paper. Each dab grazes
 * ink a little and rubs pencil sketches out fast.
 */
export const WATERCOLOUR_BRUSH: WeaponDef = {
  id: "watercolour-brush",
  pool: "any",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "move",
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.brush = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      radius: BASE.radius + b.area,
      paint: BASE.paint,
      damage: BASE.damage + b.damage,
      sketchBonus: BASE.sketchBonus,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    if (!ps.brush || !weaponReady(state, "watercolour-brush", dt)) return;
    const b = ps.brush,
      p = state.player,
      r = b.radius * ps.area;
    state.weaponTimers["watercolour-brush"] = b.interval;
    ctx.paint(state, p.x, p.y, r, b.paint, CATS.get(p.id).stats.accent);
    let touched = false;
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > r + ctx.enemyRadius(e)) continue;
      const sketch = ENEMY_DEFS.get(e.kind).wakesOn === "colourless";
      ctx.hurtEnemy(state, e, b.damage * (sketch ? b.sketchBonus : 1), { family: "brush", x: p.x, y: p.y });
      touched = true;
    }
    if (touched) ctx.effect(state, p.x, p.y, "pigment", EFFECT_LIFE.pigment, { radius: r });
  },
};
