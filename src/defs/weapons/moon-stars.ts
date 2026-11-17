import { circlesOverlap, normalize } from "../../game/collision.js";
import type { SimState } from "../../game/types.js";
import { NICOLE_STATS as N } from "../cats/nicole/stats.js";
import type { PlayerStats, Point, WeaponDef } from "../types.js";
import { stepBonus } from "./steps.js";

const STEPS = [
  { count: 1 },
  { damage: 0.5 },
  { area: 9 },
  { count: 1 },
  { damage: 0.5 },
  { count: 1, area: 9 },
] as const;
/** Hit radius of one star. */
const STAR_RADIUS = 9;

declare module "../types.js" {
  interface PlayerStats {
    orbit: boolean;
    orbitCount: number;
    orbitRadius: number;
    orbitDamage: number;
  }
}

/** Star centres around the cat; the renderer draws the very same coordinates. */
export function moonStarPositions(state: SimState, ps: PlayerStats): Point[] {
  return Array.from({ length: ps.orbitCount }, (_, i) => {
    const a = state.elapsed * N.orbitSpeed + (i * Math.PI * 2) / ps.orbitCount;
    return {
      x: state.player.x + Math.cos(a) * ps.orbitRadius,
      y: state.player.y + Math.sin(a) * ps.orbitRadius,
    };
  });
}

/** Nicole's weapon: paper stars circling her that nick, slow and push ink. */
export const MOON_STARS: WeaponDef = {
  id: "moon-stars",
  pool: "nicole",
  kind: "weapon",
  steps: STEPS,
  timing: "aura",
  elements: ["cut"],
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.orbit = level > 0;
    s.orbitCount = level > 0 ? N.orbitCount + b.count : 0;
    s.orbitRadius = (N.orbitRadius + b.area) * s.area;
    s.orbitDamage = N.orbitDamage + b.damage;
  },
  step(state, ps, _dt, _rng, ctx) {
    for (const star of moonStarPositions(state, ps)) {
      ctx.maybeReink(state, star.x, star.y, STAR_RADIUS);
      ctx.elementHit(state, star.x, star.y, STAR_RADIUS, "cut", ps.orbitDamage);
      for (const e of state.enemies) {
        if (!e.alive || e.spawnTime > 0 || e.orbitCooldown > 0) continue;
        if (!circlesOverlap(star.x, star.y, STAR_RADIUS, e.x, e.y, ctx.enemyRadius(e))) continue;
        ctx.hurtEnemy(state, e, ps.orbitDamage);
        e.orbitCooldown = N.orbitHitInterval;
        e.slowTime = Math.max(e.slowTime, 0.3);
        const dir = normalize(e.x - state.player.x, e.y - state.player.y),
          knock = 12 * ctx.knockOf(e),
          pos = ctx.safePosition(state, e.x + dir.x * knock, e.y + dir.y * knock, ctx.enemyRadius(e));
        e.x = pos.x;
        e.y = pos.y;
      }
    }
  },
};
