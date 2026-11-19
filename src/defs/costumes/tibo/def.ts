/**
 * Costume: Basement Reset Cat.
 *
 * Source (docs/archive/PLAN-v0.7-obsolete.md 4.3, card "Tibo"): a developer
 * whose public avatar shows short spiky dark hair, thick brows and black
 * clothing, with a "basement / reset" meme around him.
 * Distilled elements: short spiky forehead tufts, thick dark brow blocks,
 * black collar, a little basement door with a loop-arrow paper tag.
 * Cat design: the chosen cat in a charcoal hood with spiky tufts and brows,
 * peeking from a paper basement door. No real face, no logo.
 * Skill "Reset a bit" adapts the card's assist: ordinary ink near the cat is
 * pushed back outward and enemy shots there are cleared. Nothing is rolled
 * back (no time, HP, level, RNG or Boss HP). The Boss is never pushed; only
 * its shots in range are cleared.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, clearEnemyShots, pushRing } from "../skills.js";

export const TIBO_SKILL = {
  cooldown: 30,
  firstAt: 20,
  /** Ordinary ink within this radius is pushed out. */
  radius: 120,
  /** ... to this distance from the cat. */
  pushTo: 230,
  /** Enemy shots within this radius are cleared. */
  shotRadius: 230,
  /** Seconds the reset ring stays drawn. */
  show: 0.6,
} as const;

export const TIBO: CostumeDef = {
  id: "tibo",
  i18n: "costume.tibo",
  art: "tibo",
  skill: { cooldown: TIBO_SKILL.cooldown, firstAt: TIBO_SKILL.firstAt, notice: "costume-tibo" },
  unlock: { stat: "nights", at: 1 },
  activate(state, _ps, ctx) {
    const { x, y } = state.player;
    pushRing(state, ctx, x, y, TIBO_SKILL.radius, TIBO_SKILL.pushTo);
    clearEnemyShots(state, x, y, TIBO_SKILL.shotRadius);
    addZone(state, { kind: "circle", x, y, radius: TIBO_SKILL.pushTo, until: state.elapsed + TIBO_SKILL.show, power: 0 });
  },
  copyParams: () => ({ radius: TIBO_SKILL.radius, pushTo: TIBO_SKILL.pushTo, cooldown: TIBO_SKILL.cooldown }),
};
