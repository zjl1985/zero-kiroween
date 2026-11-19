/**
 * Costume: Book List Cat.
 *
 * Source (archive 4.4, card 07): a software founder turned philanthropist who
 * publishes yearly reading lists.
 * Distilled elements: a small stack of untitled books, a page being turned, a
 * bookmark shaped like a cat tail.
 * Cat design: the chosen cat with a little stack of blank paper books under
 * one arm and a tail-shaped bookmark. No titles, no logo, no real face.
 * Skill "Turn to this page" adapts the card's assist: one attraction pulse
 * gathers the shards around the cat to it. No teleport, no extra XP.
 */
import type { CostumeDef } from "../../types.js";
import { pullShards } from "../skills.js";

export const GATES_SKILL = {
  cooldown: 26,
  firstAt: 38,
  /** Shards within this radius are pulled to the cat. */
  pull: 260,
} as const;

export const GATES: CostumeDef = {
  id: "gates",
  i18n: "costume.gates",
  art: "gates",
  skill: { cooldown: GATES_SKILL.cooldown, firstAt: GATES_SKILL.firstAt, notice: "costume-gates" },
  unlock: { stat: "shardsCollected", at: 1500 },
  activate(state, _ps, ctx) {
    pullShards(state, ctx, state.player.x, state.player.y, GATES_SKILL.pull);
  },
  copyParams: () => ({ pull: GATES_SKILL.pull, cooldown: GATES_SKILL.cooldown }),
};
