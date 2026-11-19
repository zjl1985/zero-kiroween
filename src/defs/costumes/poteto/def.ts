/**
 * Costume: Roast Sweet Potato Cat.
 *
 * Source (archive 4.3, card "poteto"): a developer whose avatar has thin gold
 * round glasses, a closed-eye smile, a black turtleneck and a roasted sweet
 * potato (purple-red skin, golden flesh).
 * Distilled elements: thin gold round glasses, closed-eye smile makeup, dark
 * turtleneck, a split sweet potato held in the paws.
 * Cat design: the chosen cat in a dark paper turtleneck with gold round
 * glasses, holding a split roast sweet potato. No real face, no logo.
 * Skill "Warm supplies" adapts the card's two warm orbs: a short warmth
 * (slightly faster steps, a wider pickup reach) and a pull that gathers nearby
 * shards to the cat. No heal and no shield (shields belong to Nicole).
 */
import type { CostumeDef } from "../../types.js";
import { pullShards } from "../skills.js";

export const POTETO_SKILL = {
  cooldown: 34,
  firstAt: 22,
  /** Seconds of warmth. */
  warmth: 4,
  /** Move speed factor while warm. */
  speed: 1.12,
  /** Extra pickup reach while warm, in world units. */
  pickup: 40,
  /** Shards within this radius are pulled to the cat. */
  pull: 200,
} as const;

export const POTETO: CostumeDef = {
  id: "poteto",
  i18n: "costume.poteto",
  art: "poteto",
  skill: { cooldown: POTETO_SKILL.cooldown, firstAt: POTETO_SKILL.firstAt, notice: "costume-poteto" },
  unlock: { stat: "treatsEaten", at: 2 },
  activate(state, _ps, ctx) {
    state.costume!.buff = POTETO_SKILL.warmth;
    pullShards(state, ctx, state.player.x, state.player.y, POTETO_SKILL.pull);
  },
  stats(s, q) {
    if ((q.state.costume?.buff ?? 0) <= 0) return;
    s.speed *= POTETO_SKILL.speed;
    s.pickupRadius += POTETO_SKILL.pickup;
  },
  copyParams: () => ({
    warmth: POTETO_SKILL.warmth,
    pickup: POTETO_SKILL.pickup,
    pull: POTETO_SKILL.pull,
    cooldown: POTETO_SKILL.cooldown,
  }),
};
