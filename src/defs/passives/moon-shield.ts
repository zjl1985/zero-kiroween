import type { PassiveDef } from "../types.js";

const VALUES = { charges: 1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "moon-shield": typeof VALUES;
  }
}

/** Nicole's exclusive: one more shield charge per fold. */
export const MOON_SHIELD: PassiveDef = {
  id: "moon-shield",
  pool: "nicole",
  maxLevel: 2,
  values: VALUES,
  modify(s, level) {
    s.shieldCharges = s.shieldCharges + VALUES.charges * level;
  },
};
