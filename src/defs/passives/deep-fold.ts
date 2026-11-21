import type { PassiveDef } from "../types.js";

const VALUES = { area: 0.1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "deep-fold": typeof VALUES;
  }
}

/** Nicole's exclusive: wider automatic attack areas. */
export const DEEP_FOLD: PassiveDef = {
  id: "deep-fold",
  pool: "nicole",
  maxLevel: 3,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.area += VALUES.area * level;
  },
};
