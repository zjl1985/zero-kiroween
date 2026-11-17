import type { PassiveDef } from "../types.js";

const VALUES = { xp: 0.15 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "scholar": typeof VALUES;
  }
}

/** More XP from each shard. */
export const SCHOLAR: PassiveDef = {
  id: "scholar",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.xpMultiplier = s.xpMultiplier + VALUES.xp * level;
  },
};
