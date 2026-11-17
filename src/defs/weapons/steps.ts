import type { WeaponStat, WeaponStep } from "../types.js";

/** Sum of the weapon steps reached at `level` (level 1 adds nothing). */
export function stepBonus(steps: readonly WeaponStep[], level: number): Required<WeaponStep> {
  const out = { damage: 0, rate: 0, count: 0, pierce: 0, area: 0 };
  for (const s of steps.slice(0, Math.max(0, level - 1)))
    for (const k of Object.keys(s) as WeaponStat[]) out[k] += s[k]!;
  return out;
}
