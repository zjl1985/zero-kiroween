/**
 * Costume: Flying Circus Cat.
 *
 * Source (archive 4.4, card 04): the creator of a programming language named
 * after a comedy troupe's flying circus (not after the snake).
 * Distilled elements: a folded mini stage curtain, a comic round bowler hat.
 * Cat design: the chosen cat in a small paper bowler hat, with a folded
 * curtain flap on the shoulder. No real face, no logo.
 * Skill "Comic pause" adapts the card's assist: the curtain drops and ordinary
 * ink nearby pauses briefly (shared stun). The Boss is not paused; enemy shots
 * in range only fly slower while the curtain is down.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, slowEnemyShots, stunNormals } from "../skills.js";

export const GUIDO_SKILL = {
  cooldown: 32,
  firstAt: 32,
  radius: 130,
  /** Seconds ordinary ink is paused. */
  pause: 1.5,
  /** Speed factor of enemy shots in range while the curtain is down. */
  shotSlow: 0.5,
} as const;

export const GUIDO: CostumeDef = {
  id: "guido",
  i18n: "costume.guido",
  art: "guido",
  skill: { cooldown: GUIDO_SKILL.cooldown, firstAt: GUIDO_SKILL.firstAt, notice: "costume-guido" },
  unlock: { stat: "elitesDefeated", at: 6 },
  activate(state) {
    const { x, y } = state.player;
    stunNormals(state, x, y, GUIDO_SKILL.radius, GUIDO_SKILL.pause);
    addZone(state, {
      kind: "circle",
      x,
      y,
      radius: GUIDO_SKILL.radius,
      until: state.elapsed + GUIDO_SKILL.pause,
      power: GUIDO_SKILL.shotSlow,
    });
  },
  step(state, _ps, dt) {
    for (const z of state.costume!.zones)
      if (z.kind === "circle") slowEnemyShots(state, z.x, z.y, z.radius, z.power, dt);
  },
  copyParams: () => ({ radius: GUIDO_SKILL.radius, pause: GUIDO_SKILL.pause, cooldown: GUIDO_SKILL.cooldown }),
};
