import type { PassiveDef } from "../types.js";

const VALUES = { decoyLife: 0.4, decoyRange: 20 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "long-shadow": typeof VALUES;
  }
}

/** Zero's exclusive: the mirror-dash decoy lasts longer and pulls from farther. */
export const LONG_SHADOW: PassiveDef = {
  id: "long-shadow",
  pool: "zero",
  maxLevel: 3,
  values: VALUES,
  modify(s, level) {
    s.decoyLife = s.decoyLife + VALUES.decoyLife * level;
    s.decoyRange = s.decoyRange + VALUES.decoyRange * level;
  },
};
