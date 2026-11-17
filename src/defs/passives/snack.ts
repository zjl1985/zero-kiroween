import type { PassiveDef } from "../types.js";

const VALUES = { heal: 1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "snack": typeof VALUES;
  }
}

/** Filler card: tops up a short hand and fills chests once the build is grown. */
export const SNACK: PassiveDef = {
  id: "snack",
  pool: "any",
  maxLevel: 99,
  values: VALUES,
  filler: true,
  onLevel(state) {
    const p = state.player;
    p.hp = Math.min(p.maxHp, p.hp + VALUES.heal);
  },
};
