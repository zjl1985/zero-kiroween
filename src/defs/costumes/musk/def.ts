/**
 * Costume: Cardboard Car Rocket Cat.
 *
 * Source (archive 4.3, card "Musk"): a public figure associated with electric
 * cars and rockets; the user chose "rocket + car" for the card.
 * Distilled elements: an unbranded cardboard car, an origami rocket in tow,
 * wheel tracks on the paper.
 * Cat design: the chosen cat with a cardboard car shell around the waist and a
 * small origami rocket on the back. No brand names, no logos, no real face.
 * Skill "Clear the road" adapts the card's road-then-rocket relay: a short car
 * lane ahead of the cat pushes ordinary ink sideways out of it, then an
 * origami rocket lands at the lane end. The Boss is never moved; it only takes
 * the small rocket damage. No permanent collision change.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, fireArmedBursts, heading, pushOutOfLane } from "../skills.js";

export const MUSK_SKILL = {
  cooldown: 32,
  firstAt: 24,
  /** Lane length ahead of the cat. */
  length: 170,
  /** Lane half width. */
  width: 34,
  /** Seconds the car keeps the lane clear; the rocket lands when it ends. */
  drive: 1,
  /** Rocket burst radius and damage. */
  radius: 60,
  damage: 4,
} as const;

export const MUSK: CostumeDef = {
  id: "musk",
  i18n: "costume.musk",
  art: "musk",
  skill: { cooldown: MUSK_SKILL.cooldown, firstAt: MUSK_SKILL.firstAt, notice: "costume-musk" },
  unlock: { stat: "distance", at: 20000 },
  activate(state, _ps, ctx) {
    const { x, y } = state.player,
      h = heading(state),
      x2 = x + h.x * MUSK_SKILL.length,
      y2 = y + h.y * MUSK_SKILL.length,
      land = state.elapsed + MUSK_SKILL.drive;
    addZone(state, { kind: "lane", x, y, x2, y2, radius: MUSK_SKILL.width, until: land, power: 0 });
    addZone(state, {
      kind: "burst",
      x: x2,
      y: y2,
      radius: MUSK_SKILL.radius,
      until: land + 0.3,
      power: MUSK_SKILL.damage,
      armed: land,
    });
    for (const z of state.costume!.zones) if (z.kind === "lane") pushOutOfLane(state, ctx, z);
  },
  step(state, _ps, _dt, ctx) {
    for (const z of state.costume!.zones) if (z.kind === "lane") pushOutOfLane(state, ctx, z);
    fireArmedBursts(state, ctx);
  },
  copyParams: () => ({
    length: MUSK_SKILL.length,
    radius: MUSK_SKILL.radius,
    damage: MUSK_SKILL.damage,
    cooldown: MUSK_SKILL.cooldown,
  }),
};
