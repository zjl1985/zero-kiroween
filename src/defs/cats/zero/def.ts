import type { CharacterDef } from "../../types.js";
import { ECHO_LEGION_VALUES, echoBurst } from "../../weapons/echo-legion.js";
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
 * Zero (male cat): Meow Bolt hand weapon; mirror dash leaves a decoy that
 * pulls ink and opens a window of empowered rapid fire. Exclusive Night Claw
 * and Long Shadow; evolves into Echo Legion.
 */
export const ZERO: CharacterDef<typeof Z> = {
  id: "zero",
  gender: "male",
  stats: Z,
  startWeapon: "meow-bolt",
  exclusives: ["meow-bolt", "night-claw", "long-shadow", "echo-legion"],
  evolutions: ["echo-legion"],
  i18n: "zero",
  art: "zero",
  skillNotice: "zero-dash",
  kitStats(s) {
    s.decoyLife = Z.decoyLife;
    s.decoyRange = Z.decoyRange;
  },
  onSkill(state, ps, ctx) {
    const p = state.player;
    // A re-dash replaces a live echo; it still bursts as it fades.
    if (state.decoy.live && ps.echo) echoBurst(state, ctx);
    state.decoy = {
      live: true,
      x: p.x,
      y: p.y,
      time: ps.decoyLife,
      fire: ECHO_LEGION_VALUES.fireInterval * 0.5,
    };
    p.empowerTime = Z.empowerDuration;
    p.attackCooldown = 0;
    ctx.effect(state, p.x, p.y, "dash", 0.4);
    ctx.notify(state, "zero-dash");
  },
  hooks: {
    tick(state, { dt }, ctx) {
      const d = state.decoy;
      if (!d.live) return;
      d.time = Math.max(0, d.time - dt);
      d.live = d.time > 0;
      if (!d.live && ctx.stats(state).echo) echoBurst(state, ctx);
    },
  },
};
