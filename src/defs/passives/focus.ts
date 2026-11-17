import type { PassiveDef } from "../types.js";

const VALUES = { cooldown: 0.1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "focus": typeof VALUES;
  }
}

/** Shorter skill cooldown. */
export const FOCUS: PassiveDef = {
  id: "focus",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.cooldown = s.cooldown * (1 - VALUES.cooldown * level);
  },
};
