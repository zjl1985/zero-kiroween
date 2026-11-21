import "../defs/index.js";
import { XP } from "../defs/progression.js";
import { CATS, COSTUME_DEFS, PASSIVE_DEFS, WEAPON_DEFS } from "../defs/registries.js";
import type { PlayerStats, StatQuery } from "../defs/types.js";
import type { SimState } from "./types.js";

export type { PlayerStats } from "../defs/types.js";

/**
 * The chosen cat's numbers combined with weapon levels and passives; sim,
 * renderer and HUD share it. Folded from the registries in a fixed order:
 * the chosen cat's base, every cat's kit fields, passives (so area and
 * cooldown are ready), then weapons and evolutions in registration order,
 * then the worn costume's buffs.
 */
export function playerStats(state: SimState): PlayerStats {
  const cat = CATS.get(state.player.id),
    level = (id: string) => state.upgrades[id] ?? 0,
    // The starting weapon is always in hand, even in hand-built test states.
    weaponLevel = (id: string) => (cat.startWeapon === id ? Math.max(1, level(id)) : level(id)),
    q: StatQuery = { state, level, weaponLevel };
  const s = {
    speed: cat.stats.speed,
    cooldown: cat.stats.cooldown,
    pickupRadius: XP.pickupRadius,
    xpMultiplier: 1,
    hurtIframes: 0,
    area: 1,
    attackIntervalScale: 1,
  } as PlayerStats;
  for (const c of CATS.all()) c.kitStats?.(s, q);
  for (const p of PASSIVE_DEFS.all()) p.modify?.(s, level(p.id), q);
  for (const w of WEAPON_DEFS.all()) w.stats?.(s, weaponLevel(w.id), q);
  // Weapon stats are assembled first; interval-bearing attacks then share the passive rate.
  // Orbit contact cadence and evolution-local timers consume the same scale in their defs.
  s.attackInterval *= s.attackIntervalScale;
  s.empoweredInterval *= s.attackIntervalScale;
  for (const value of Object.values(s)) {
    if (value && typeof value === "object" && "interval" in value && typeof value.interval === "number")
      value.interval *= s.attackIntervalScale;
  }
  if (s.paperCut) s.paperCut.edgeInterval *= s.attackIntervalScale;
  // The worn costume's timed buffs come last (a plain run skips this).
  if (state.costume) COSTUME_DEFS.find(state.costume.id)?.stats?.(s, q);
  return s;
}
