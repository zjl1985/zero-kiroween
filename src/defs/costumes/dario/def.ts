/**
 * Costume: Night Desk Cat.
 *
 * Source (archive 4.4, card 11): an AI lab founder; the card follows a
 * community "admin" meme the user asked for (community context only, not
 * his words and no real account action).
 * Distilled elements: a night-shift desk lamp, a "put away for tonight"
 * paper seal (not a red stamp), a paper tag with a timer.
 * Cat design: the chosen cat with a night-desk visor and a round paper seal
 * in its paw. No official logo, no real face.
 * Skill "Put it away tonight" adapts the card's assist: a warning ring, then
 * the seal comes down and ordinary ink inside is frozen for a few seconds.
 * Never affects the cat; the Boss is never frozen.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, stunNormals } from "../skills.js";

export const DARIO_SKILL = {
  cooldown: 38,
  firstAt: 35,
  /** Warning seconds before the seal comes down. */
  telegraph: 0.8,
  radius: 110,
  /** Seconds ordinary ink stays frozen. */
  freeze: 4,
} as const;

export const DARIO: CostumeDef = {
  id: "dario",
  i18n: "costume.dario",
  art: "dario",
  skill: { cooldown: DARIO_SKILL.cooldown, firstAt: DARIO_SKILL.firstAt, notice: "costume-dario" },
  unlock: { stat: "kills", at: 1800 },
  activate(state) {
    const { x, y } = state.player,
      armed = state.elapsed + DARIO_SKILL.telegraph;
    addZone(state, {
      kind: "circle",
      x,
      y,
      radius: DARIO_SKILL.radius,
      until: armed + DARIO_SKILL.freeze,
      power: DARIO_SKILL.freeze,
      armed,
    });
  },
  step(state) {
    for (const z of state.costume!.zones) {
      if (z.kind !== "circle" || z.clock === 1 || (z.armed ?? 0) > state.elapsed) continue;
      z.clock = 1;
      stunNormals(state, z.x, z.y, z.radius, z.power);
    }
  },
  copyParams: () => ({ radius: DARIO_SKILL.radius, freeze: DARIO_SKILL.freeze, cooldown: DARIO_SKILL.cooldown }),
};
