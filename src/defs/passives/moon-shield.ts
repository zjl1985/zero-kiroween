import type { PassiveDef } from "../types.js";

const VALUES = { charges: 1, seconds: 12 } as const;

declare module "../types.js" {
  interface UpgradeValueMap {
    "moon-shield": typeof VALUES;
  }
}

/** A passive shield on gaining a level, including when this upgrade is taken. */
export const MOON_SHIELD: PassiveDef = {
  id: "moon-shield",
  pool: "nicole",
  maxLevel: 2,
  values: VALUES,
  onLevel: grantShield,
  hooks: { levelUp: grantShield },
};

function grantShield(state: import("../../game/types.js").SimState): void {
  const charges = (state.upgrades["moon-shield"] ?? 0) * VALUES.charges;
  state.player.shield = Math.max(state.player.shield, charges);
  state.player.shieldTime = Math.max(state.player.shieldTime, VALUES.seconds);
}
