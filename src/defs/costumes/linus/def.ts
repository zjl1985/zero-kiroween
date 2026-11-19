/**
 * Costume: Branch Keeper Cat.
 *
 * Source (archive 4.4, card 03): the creator of a free operating system
 * kernel and of a version control tool built around branches and merges.
 * Distilled elements: a forked paper branch tree, an original penguin-shaped
 * paper tag on the collar (not any existing mascot).
 * Cat design: the chosen cat holding a forked paper twig with a small
 * original penguin tag. No real face, no logo, no mascot copy.
 * Skill "Merge path" adapts the card's assist: two short branch lanes fork
 * ahead of the cat and meet at a merge point, where a keep-out circle pushes
 * ordinary ink out for a few seconds. The Boss is never pushed.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, heading, pushRing } from "../skills.js";

export const LINUS_SKILL = {
  cooldown: 34,
  firstAt: 30,
  /** Merge point distance ahead of the cat. */
  reach: 150,
  /** Half spread of the two branch starts beside the cat. */
  spread: 40,
  /** Branch lane half width (drawn). */
  width: 12,
  /** Keep-out circle radius at the merge point and its seconds. */
  radius: 85,
  life: 4,
} as const;

export const LINUS: CostumeDef = {
  id: "linus",
  i18n: "costume.linus",
  art: "linus",
  skill: { cooldown: LINUS_SKILL.cooldown, firstAt: LINUS_SKILL.firstAt, notice: "costume-linus" },
  unlock: { stat: "chestsOpened", at: 5 },
  activate(state, _ps, ctx) {
    const { x, y } = state.player,
      h = heading(state),
      mx = x + h.x * LINUS_SKILL.reach,
      my = y + h.y * LINUS_SKILL.reach,
      until = state.elapsed + LINUS_SKILL.life;
    for (const side of [1, -1]) {
      const bx = x - h.y * LINUS_SKILL.spread * side,
        by = y + h.x * LINUS_SKILL.spread * side;
      addZone(state, { kind: "lane", x: bx, y: by, x2: mx, y2: my, radius: LINUS_SKILL.width, until, power: 0 });
    }
    addZone(state, { kind: "circle", x: mx, y: my, radius: LINUS_SKILL.radius, until, power: 1 });
    pushRing(state, ctx, mx, my, LINUS_SKILL.radius, LINUS_SKILL.radius + 12);
  },
  step(state, _ps, _dt, ctx) {
    for (const z of state.costume!.zones)
      if (z.kind === "circle") pushRing(state, ctx, z.x, z.y, z.radius, z.radius + 12, false);
  },
  copyParams: () => ({ radius: LINUS_SKILL.radius, life: LINUS_SKILL.life, cooldown: LINUS_SKILL.cooldown }),
};
