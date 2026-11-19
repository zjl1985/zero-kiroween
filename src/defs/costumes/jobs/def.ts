/**
 * Costume: One More Thing Cat.
 *
 * Source (archive 4.4, card 06): a product presenter remembered for a dark
 * turtleneck and the keynote phrase "one more thing".
 * Distilled elements: a dark turtleneck, a plain paper curtain, an extra paper
 * star hidden behind the tail.
 * Cat design: the chosen cat in a dark paper turtleneck with a small paper
 * star peeking from behind the tail. No product, no logo, no real face.
 * Skill "One more" adapts the card's assist: a clear warning ring, then one
 * delayed paper-star strike on the nearest ink. It hurts everything inside,
 * the Boss included (bounded damage). No random high-value gear.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, fireArmedBursts, heading } from "../skills.js";

export const JOBS_SKILL = {
  cooldown: 20,
  firstAt: 36,
  /** Warning seconds before the star lands. */
  telegraph: 1.2,
  radius: 120,
  damage: 6,
  /** The star aims at the nearest ink within this range, else lands ahead of the cat. */
  aim: 260,
  ahead: 80,
} as const;

export const JOBS: CostumeDef = {
  id: "jobs",
  i18n: "costume.jobs",
  art: "jobs",
  skill: { cooldown: JOBS_SKILL.cooldown, firstAt: JOBS_SKILL.firstAt, notice: "costume-jobs" },
  unlock: { stat: "wins", at: 1 },
  activate(state, _ps, ctx) {
    const p = state.player,
      e = ctx.nearestEnemy(state, p.x, p.y, JOBS_SKILL.aim),
      h = heading(state),
      x = e ? e.x : p.x + h.x * JOBS_SKILL.ahead,
      y = e ? e.y : p.y + h.y * JOBS_SKILL.ahead,
      armed = state.elapsed + JOBS_SKILL.telegraph;
    addZone(state, { kind: "burst", x, y, radius: JOBS_SKILL.radius, until: armed + 0.3, power: JOBS_SKILL.damage, armed });
  },
  step(state, _ps, _dt, ctx) {
    fireArmedBursts(state, ctx);
  },
  copyParams: () => ({
    telegraph: JOBS_SKILL.telegraph,
    radius: JOBS_SKILL.radius,
    damage: JOBS_SKILL.damage,
    cooldown: JOBS_SKILL.cooldown,
  }),
};
