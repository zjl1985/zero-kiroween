import type { PassiveDef } from "../types.js";

const VALUES = { radius: 14, duration: 0.8 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "deep-fold": typeof VALUES;
  }
}

/** Nicole's exclusive: a wider, longer fold-moon field. */
export const DEEP_FOLD: PassiveDef = {
  id: "deep-fold",
  pool: "nicole",
  maxLevel: 3,
  values: VALUES,
  modify(s, level) {
    s.fieldRadius = s.fieldRadius + VALUES.radius * level;
    s.fieldDuration = s.fieldDuration + VALUES.duration * level;
  },
};
