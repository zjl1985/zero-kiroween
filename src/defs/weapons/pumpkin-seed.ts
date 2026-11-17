import type { WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = {
  interval: 2.8,
  range: 260,
  speed: 240,
  minFlight: 0.25,
  radius: 40,
  damage: 2,
  count: 1,
  spread: 0.35,
} as const;
const STEPS = [{ area: 8 }, { damage: 1 }, { count: 1 }, { rate: 0.2, damage: 1 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    seed:
      | false
      | {
          interval: number;
          range: number;
          speed: number;
          minFlight: number;
          radius: number;
          damage: number;
          count: number;
          spread: number;
        };
  }
  interface WeaponBaseMap {
    "pumpkin-seed": typeof BASE;
  }
}

/** Shared weapon: lobbed seeds that burst over an area on the first hit or where they land. */
export const PUMPKIN_SEED: WeaponDef = {
  id: "pumpkin-seed",
  pool: "any",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "auto",
  elements: ["fire"],
  shotTag: "seed",
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.seed = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      range: BASE.range,
      speed: BASE.speed,
      minFlight: BASE.minFlight,
      radius: (BASE.radius + b.area) * s.area,
      damage: BASE.damage + b.damage,
      count: BASE.count + b.count,
      spread: BASE.spread,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    if (!ps.seed || !weaponReady(state, "pumpkin-seed", dt)) return;
    const s = ps.seed,
      p = state.player,
      target = ctx.nearestEnemy(state, p.x, p.y, s.range);
    if (!target) return;
    state.weaponTimers["pumpkin-seed"] = s.interval;
    const base = Math.atan2(target.y - p.y, target.x - p.x),
      d = Math.hypot(target.x - p.x, target.y - p.y);
    for (let i = 0; i < s.count; i++) {
      const a = base + (i - (s.count - 1) / 2) * s.spread;
      ctx.spawnShot(state, {
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * s.speed,
        vy: Math.sin(a) * s.speed,
        // Lands on the target's spot if nothing is hit on the way.
        life: Math.max(s.minFlight, d / s.speed),
        alive: true,
        weapon: "seed",
        damage: s.damage,
        burst: s.radius,
        hits: [],
      });
    }
  },
};
