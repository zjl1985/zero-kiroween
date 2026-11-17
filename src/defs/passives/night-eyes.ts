import type { PassiveDef } from "../types.js";

const VALUES = { area: 0.1 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "night-eyes": typeof VALUES;
  }
}

/** Wider weapon reach and bursts (applied before weapons fold in). */
export const NIGHT_EYES: PassiveDef = {
  id: "night-eyes",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.area = s.area + VALUES.area * level;
  },
};
