import type { PassiveDef } from "../types.js";

const VALUES = { maxHp: 1, heal: 1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "vitality": typeof VALUES;
  }
}

/** One more heart per level, and a little heal. */
export const VITALITY: PassiveDef = {
  id: "vitality",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  onLevel(state) {
    const p = state.player;
    p.maxHp += VALUES.maxHp;
    p.hp = Math.min(p.maxHp, p.hp + VALUES.heal);
    p.healAt = state.elapsed;
  },
};
