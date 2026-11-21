import type { CharacterDef } from "../../types.js";
import { ZERO_STATS as Z } from "./stats.js";

declare module "../../types.js" {
  interface PlayerStats {
    decoyLife: number;
    decoyRange: number;
  }
  interface CharacterStatsMap {
    zero: typeof Z;
  }
}

/**
 * Zero (male cat): automatic Meow Bolt hand weapon. Exclusive Night Claw
 * and Long Shadow; evolves into Echo Legion.
 */
export const ZERO: CharacterDef<typeof Z> = {
  id: "zero",
  gender: "male",
  stats: Z,
  startWeapon: "meow-bolt",
  exclusives: ["meow-bolt", "night-claw", "long-shadow", "echo-legion", "paper-cut"],
  evolutions: ["echo-legion"],
  i18n: "zero",
  art: "zero",
  skillNotice: "zero-dash",
  copyParams: () => ({ decoy: Z.decoyLife, empower: Z.empowerDuration, pierce: Z.empoweredPierce }),
  kitStats(s) {
    s.decoyLife = Z.decoyLife;
    s.decoyRange = Z.decoyRange;
  },
};
