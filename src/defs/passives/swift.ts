import type { PassiveDef } from "../types.js";

const VALUES = { speed: 0.08 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "swift": typeof VALUES;
  }
}

/** Faster paws. */
export const SWIFT: PassiveDef = {
  id: "swift",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.speed = s.speed * (1 + VALUES.speed * level);
  },
};
