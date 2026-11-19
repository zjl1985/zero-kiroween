/**
 * Costume: Stone Placing Cat.
 *
 * Source (archive 4.4, card 09): a research lab founder whose team built a
 * program that won at the board game go (team credit, not one person).
 * Distilled elements: a small paper go board, one black and one white disc.
 * Cat design: the chosen cat with a tiny folded go board on the hip and a
 * black and a white paper disc in its paws. No logo, no real face.
 * Skill "Leave a liberty" adapts the card's assist: three stones land around
 * the cat with one open gap ahead, then a slow ring forms for a few seconds.
 * Ordinary ink inside is slowed; the Boss is not. No runtime AI.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, heading, insideCircle, slowNormals } from "../skills.js";

export const HASSABIS_SKILL = {
  cooldown: 32,
  firstAt: 25,
  /** Seconds between the stones landing and the ring forming. */
  delay: 0.8,
  /** Ring radius, its seconds and the ink speed factor inside. */
  radius: 100,
  life: 4,
  slow: 0.5,
  /** Stone marker radius (drawn). */
  stone: 10,
} as const;

export const HASSABIS: CostumeDef = {
  id: "hassabis",
  i18n: "costume.hassabis",
  art: "hassabis",
  skill: { cooldown: HASSABIS_SKILL.cooldown, firstAt: HASSABIS_SKILL.firstAt, notice: "costume-hassabis" },
  unlock: { stat: "bestStreak", at: 1200 },
  activate(state) {
    const { x, y } = state.player,
      h = heading(state),
      gap = Math.atan2(h.y, h.x),
      armed = state.elapsed + HASSABIS_SKILL.delay,
      until = armed + HASSABIS_SKILL.life;
    // Three stones a quarter turn apart; the quarter ahead stays open.
    for (const k of [1, 2, 3]) {
      const a = gap + (k * Math.PI) / 2;
      addZone(state, {
        kind: "circle",
        x: x + Math.cos(a) * HASSABIS_SKILL.radius,
        y: y + Math.sin(a) * HASSABIS_SKILL.radius,
        radius: HASSABIS_SKILL.stone,
        until,
        power: 0,
      });
    }
    addZone(state, { kind: "circle", x, y, radius: HASSABIS_SKILL.radius, until, power: HASSABIS_SKILL.slow, armed });
  },
  step(state) {
    for (const z of state.costume!.zones) {
      if (z.kind !== "circle" || z.power <= 0 || (z.armed ?? 0) > state.elapsed) continue;
      slowNormals(state, (e) => insideCircle(z, e.x, e.y), z.power);
    }
  },
  copyParams: () => ({
    radius: HASSABIS_SKILL.radius,
    life: HASSABIS_SKILL.life,
    slowPct: Math.round((1 - HASSABIS_SKILL.slow) * 100),
    cooldown: HASSABIS_SKILL.cooldown,
  }),
};
