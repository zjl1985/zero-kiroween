import { normalize } from "../../game/collision.js";
import { EFFECT_LIFE, type SimState } from "../../game/types.js";
import type { SimContext, WeaponDef } from "../types.js";
import { fireBolt } from "./meow-bolt.js";

const VALUES = {
  fireInterval: 0.32,
  range: 190,
  burstRadius: 74,
  burstDamage: 3,
  decoyLife: 0.6,
} as const;
export { VALUES as ECHO_LEGION_VALUES };

declare module "../types.js" {
  interface PlayerStats {
    echo: boolean;
    echoBurstRadius: number;
  }
  interface UpgradeValueMap {
    "echo-legion": typeof VALUES;
  }
}

/** The afterimage bursts as it fades (or is replaced), hurting ink around it. */
export function echoBurst(state: SimState, ctx: SimContext): void {
  const d = state.decoy,
    reach = ctx.stats(state).echoBurstRadius;
  ctx.effect(state, d.x, d.y, "echo-burst", EFFECT_LIFE["echo-burst"], { radius: reach });
  for (const e of state.enemies)
    if (e.alive && e.spawnTime <= 0 && Math.hypot(e.x - d.x, e.y - d.y) <= reach)
      ctx.hurtEnemy(state, e, VALUES.burstDamage);
}

/** Zero's evolution (max Meow Bolt + Long Shadow): the decoy keeps firing its own bolts. */
export const ECHO_LEGION: WeaponDef = {
  id: "echo-legion",
  pool: "zero",
  kind: "evolution",
  values: VALUES,
  timing: "aura",
  stats(s, level) {
    const echo = level > 0;
    s.echo = echo;
    s.decoyLife = s.decoyLife + (echo ? VALUES.decoyLife : 0);
    s.echoBurstRadius = VALUES.burstRadius * s.area;
  },
  step(state, ps, dt, _rng, ctx) {
    const d = state.decoy;
    if (!d.live || !ps.echo) return;
    d.fire -= dt;
    if (d.fire > 0) return;
    const target = ctx.nearestEnemy(state, d.x, d.y, VALUES.range);
    if (!target) {
      d.fire = 0;
      return;
    }
    const dir = normalize(target.x - d.x, target.y - d.y);
    if (!dir.x && !dir.y) return;
    d.fire = VALUES.fireInterval;
    fireBolt(state, ctx, d.x, d.y, dir.x, dir.y, false, true);
  },
};
