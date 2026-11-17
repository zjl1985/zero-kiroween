import { normalize } from "../../game/collision.js";
import type { SimState } from "../../game/types.js";
import { ZERO_STATS as Z } from "../cats/zero/stats.js";
import type { SimContext, WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";

const BASE = { spread: 0.2 } as const;
const STEPS = [
  { damage: 0.5 },
  { rate: 0.12 },
  { count: 1 },
  { pierce: 1 },
  { damage: 0.5, rate: 0.12 },
  { count: 1, pierce: 1 },
] as const;

declare module "../types.js" {
  interface PlayerStats {
    bolt: boolean;
    attackInterval: number;
    empoweredInterval: number;
    shotDamage: number;
    bolts: number;
    spread: number;
    pierce: number;
    empoweredPierce: number;
  }
  interface WeaponBaseMap {
    "meow-bolt": typeof BASE;
  }
}

/** One bolt from (x, y) along (dx, dy); echo bolts come from Echo Legion's afterimage. */
export function fireBolt(
  state: SimState,
  ctx: SimContext,
  x: number,
  y: number,
  dx: number,
  dy: number,
  empowered: boolean,
  echo: boolean,
): void {
  ctx.spawnShot(state, {
    x: x + dx * 14,
    y: y + dy * 14,
    vx: dx * Z.shotSpeed,
    vy: dy * Z.shotSpeed,
    life: Z.shotLife,
    alive: true,
    empowered,
    ...(echo ? { echo: true } : {}),
    hits: [],
  });
}

/** Zero's hand weapon: aimed bolts at the nearest ink, faster while empowered. */
export const MEOW_BOLT: WeaponDef = {
  id: "meow-bolt",
  pool: "zero",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "move",
  elements: ["cut"],
  shotTag: "bolt",
  stats(s, level) {
    const b = stepBonus(STEPS, level),
      quick = 1 - b.rate;
    s.bolt = level > 0;
    s.attackInterval = Z.attackInterval * quick;
    s.empoweredInterval = Z.empoweredInterval * quick;
    s.shotDamage = Z.shotDamage + b.damage;
    s.bolts = 1 + b.count;
    s.spread = BASE.spread;
    s.pierce = 1 + b.pierce;
    s.empoweredPierce = Z.empoweredPierce + b.pierce;
  },
  step(state, ps, _dt, _rng, ctx) {
    const p = state.player;
    if (p.attackCooldown > 0) return;
    const target = ctx.nearestEnemy(state, p.x, p.y, Z.shotSpeed * Z.shotLife + 25);
    if (!target) return;
    const dir = normalize(target.x - p.x, target.y - p.y);
    if (!dir.x && !dir.y) return;
    const empowered = p.empowerTime > 0;
    p.attackCooldown = empowered ? ps.empoweredInterval : ps.attackInterval;
    const base = Math.atan2(dir.y, dir.x);
    for (let i = 0; i < ps.bolts; i++) {
      const a = base + (i - (ps.bolts - 1) / 2) * ps.spread;
      fireBolt(state, ctx, p.x, p.y, Math.cos(a), Math.sin(a), empowered, false);
    }
  },
};
