import type { WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = {
  interval: 2.4,
  range: 320,
  speed: 190,
  life: 2.4,
  turn: 4.2,
  damage: 1.5,
  count: 1,
  pierce: 1,
} as const;
const STEPS = [{ count: 1 }, { damage: 1 }, { rate: 0.15 }, { count: 1, pierce: 1 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    crane:
      | false
      | {
          interval: number;
          range: number;
          speed: number;
          life: number;
          turn: number;
          damage: number;
          count: number;
          pierce: number;
        };
  }
  interface WeaponBaseMap {
    "paper-crane": typeof BASE;
  }
}

/** Shared weapon: homing paper cranes that leave in a fan and curl back onto ink. */
export const PAPER_CRANE: WeaponDef = {
  id: "paper-crane",
  pool: "any",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "auto",
  elements: ["wind"],
  shotTag: "crane",
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.crane = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      range: BASE.range,
      speed: BASE.speed,
      life: BASE.life,
      turn: BASE.turn,
      damage: BASE.damage + b.damage,
      count: BASE.count + b.count,
      pierce: BASE.pierce + b.pierce,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    if (!ps.crane || !weaponReady(state, "paper-crane", dt)) return;
    const c = ps.crane,
      p = state.player,
      target = ctx.nearestEnemy(state, p.x, p.y, c.range);
    if (!target) return;
    state.weaponTimers["paper-crane"] = c.interval;
    const base = Math.atan2(target.y - p.y, target.x - p.x);
    for (let i = 0; i < c.count; i++) {
      const a = base + (i - (c.count - 1) / 2) * 0.9;
      ctx.spawnShot(state, {
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * c.speed,
        vy: Math.sin(a) * c.speed,
        life: c.life,
        alive: true,
        weapon: "crane",
        damage: c.damage,
        pierce: c.pierce,
        homing: c.turn,
        hits: [],
      });
    }
  },
};
