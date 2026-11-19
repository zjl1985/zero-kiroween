/**
 * Costume: Twelve Notes Cat.
 *
 * Source (archive 4.4, card 10): an indie maker known for a "twelve small
 * projects in twelve months" challenge (not all of them worked out).
 * Distilled elements: a twelve-square folded sticky-note book, little notes
 * stuck along the way.
 * Cat design: the chosen cat with a folded note book on a strap and a few
 * sticky notes on the coat. No logo, no real face.
 * Skill "Ship small steps" adapts the card's assist: three one-shot paper
 * pads drop ahead of the cat a few seconds apart; stepping on one gives a very
 * short speed burst. Bursts refresh instead of stacking; pads leave no
 * obstacle.
 */
import { STATS } from "../../../game/types.js";
import type { CostumeDef } from "../../types.js";
import { addZone, heading, insideCircle } from "../skills.js";

export const LEVELS_SKILL = {
  cooldown: 34,
  firstAt: 27,
  /** Pads per trigger, the gap between drops and how far ahead they land. */
  pads: 3,
  gap: 2.5,
  ahead: 70,
  /** Pad radius and seconds it waits to be stepped on. */
  radius: 22,
  life: 8,
  /** Speed burst: seconds and speed factor (refreshed, never multiplied). */
  burst: 1.5,
  speed: 1.2,
} as const;

export const LEVELS: CostumeDef = {
  id: "levels",
  i18n: "costume.levels",
  art: "levels",
  skill: { cooldown: LEVELS_SKILL.cooldown, firstAt: LEVELS_SKILL.firstAt, notice: "costume-levels" },
  unlock: { stat: "skillUses", at: 100 },
  activate(state) {
    const c = state.costume!;
    c.vars.left = LEVELS_SKILL.pads;
    c.vars.next = state.elapsed;
  },
  step(state, _ps, _dt, ctx) {
    const c = state.costume!,
      p = state.player;
    if ((c.vars.left ?? 0) > 0 && state.elapsed >= (c.vars.next ?? Infinity)) {
      const h = heading(state),
        at = ctx.safePosition(state, p.x + h.x * LEVELS_SKILL.ahead, p.y + h.y * LEVELS_SKILL.ahead, LEVELS_SKILL.radius);
      addZone(state, {
        kind: "pad",
        x: at.x,
        y: at.y,
        radius: LEVELS_SKILL.radius,
        until: state.elapsed + LEVELS_SKILL.life,
        power: LEVELS_SKILL.speed,
        armed: state.elapsed,
      });
      c.vars.left! -= 1;
      c.vars.next = state.elapsed + LEVELS_SKILL.gap;
    }
    for (const z of c.zones) {
      if (z.kind !== "pad" || z.armed === undefined || !insideCircle(z, p.x, p.y, STATS.playerRadius)) continue;
      c.buff = LEVELS_SKILL.burst;
      // One shot: the pad is spent and goes on the next step.
      delete z.armed;
      z.until = state.elapsed;
    }
  },
  stats(s, q) {
    if ((q.state.costume?.buff ?? 0) > 0) s.speed *= LEVELS_SKILL.speed;
  },
  copyParams: () => ({
    pads: LEVELS_SKILL.pads,
    burst: LEVELS_SKILL.burst,
    speedPct: Math.round((LEVELS_SKILL.speed - 1) * 100),
    cooldown: LEVELS_SKILL.cooldown,
  }),
};
