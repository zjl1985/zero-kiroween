import type { PassiveDef } from "../types.js";

const VALUES = { rate: 0.1 } as const;

declare module "../types.js" {
  interface PlayerStats {
    attackIntervalScale: number;
  }
  interface UpgradeValueMap {
    "focus": typeof VALUES;
  }
}

/** Shorter automatic attack intervals, with no manual skill dependency. */
export const FOCUS: PassiveDef = {
  id: "focus",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.attackIntervalScale = 1 - VALUES.rate * level;
  },
};
