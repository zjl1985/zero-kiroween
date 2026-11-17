import type { PassiveDef } from "../types.js";

const VALUES = { radius: 0.35 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "magnet": typeof VALUES;
  }
}

/** Ink shards drift in from farther away. */
export const MAGNET: PassiveDef = {
  id: "magnet",
  pool: "any",
  maxLevel: 4,
  values: VALUES,
  percent: true,
  modify(s, level) {
    s.pickupRadius = s.pickupRadius * (1 + VALUES.radius * level);
  },
};
