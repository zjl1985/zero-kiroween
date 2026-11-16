import type { CatId } from "../cats/types.js";

/** Combat numbers and UI values share this source. Neither character is a companion. */
export const CHARACTERS = {
  zero: {
    maxHp: 4,
    speed: 126,
    accent: "#e4b76c",
    attackInterval: 0.34,
    shotSpeed: 370,
    shotLife: 0.55,
    shotDamage: 1,
    dashSpeed: 370,
    dashTime: 0.2,
    cooldown: 3,
    invulnerability: 0.24,
    decoyLife: 1.2,
    decoyRange: 145,
    empowerDuration: 2,
    empoweredInterval: 0.17,
    empoweredPierce: 2,
  },
  nicole: {
    maxHp: 6,
    speed: 96,
    accent: "#bda5ef",
    dashSpeed: 265,
    dashTime: 0.18,
    cooldown: 5.5,
    invulnerability: 0.22,
    orbitRadius: 47,
    orbitSpeed: 3.2,
    orbitCount: 3,
    orbitDamage: 1.5,
    orbitHitInterval: 0.55,
    fieldRadius: 78,
    fieldDuration: 3.5,
    slowMultiplier: 0.4,
    shieldCharges: 2,
    shieldDuration: 4.5,
    rescueThreshold: 2,
    rescueCharges: 2,
    rescueDuration: 4,
  },
} as const;
export function character(id: CatId) {
  return CHARACTERS[id];
}
