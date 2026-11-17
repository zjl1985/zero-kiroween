import type { PassiveDef } from "../types.js";

const VALUES = { iframes: 0.2 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "paper-armor": typeof VALUES;
  }
}

/** Longer grace after a hit. */
export const PAPER_ARMOR: PassiveDef = {
  id: "paper-armor",
  pool: "any",
  maxLevel: 3,
  values: VALUES,
  modify(s, level) {
    s.hurtIframes = s.hurtIframes + VALUES.iframes * level;
  },
};
