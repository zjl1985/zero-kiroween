/**
 * Costume: Hydrofoil Cat.
 *
 * Source (archive 4.4, card 08): a social network founder seen riding a
 * hydrofoil board.
 * Distilled elements: an origami hydrofoil board, a blue pencil water line.
 * Cat design: the chosen cat standing on a folded paper hydrofoil board with a
 * blue pencil wake. No logo, no real face.
 * Skill "Sticker slide" adapts the card's assist: for a few seconds a slide
 * lane trails behind the cat; on it the cat is a little faster and ordinary
 * ink crossing it is slowed. The Boss is not slowed.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, insideLane, slowNormals } from "../skills.js";

export const ZUCKERBERG_SKILL = {
  cooldown: 30,
  firstAt: 40,
  life: 4,
  /** Lane half width and its longest trail. */
  width: 26,
  length: 220,
  /** Cat speed factor on the lane and ink speed factor on it. */
  speed: 1.15,
  slow: 0.6,
} as const;

export const ZUCKERBERG: CostumeDef = {
  id: "zuckerberg",
  i18n: "costume.zuckerberg",
  art: "zuckerberg",
  skill: { cooldown: ZUCKERBERG_SKILL.cooldown, firstAt: ZUCKERBERG_SKILL.firstAt, notice: "costume-zuckerberg" },
  unlock: { stat: "propsTorn", at: 45 },
  activate(state) {
    const { x, y } = state.player;
    addZone(state, {
      kind: "lane",
      x,
      y,
      x2: x,
      y2: y,
      radius: ZUCKERBERG_SKILL.width,
      until: state.elapsed + ZUCKERBERG_SKILL.life,
      power: ZUCKERBERG_SKILL.slow,
      clock: 0,
    });
  },
  step(state, _ps, _dt, ctx) {
    const p = state.player;
    for (const z of state.costume!.zones) {
      if (z.kind !== "lane") continue;
      // The trail follows the cat until it reaches its full length (clock 1).
      if (z.clock !== 1) {
        if (Math.hypot(p.x - z.x, p.y - z.y) <= ZUCKERBERG_SKILL.length) {
          z.x2 = p.x;
          z.y2 = p.y;
        } else z.clock = 1;
      }
      slowNormals(state, (e) => insideLane(z, e.x, e.y, ctx.enemyRadius(e)), z.power);
    }
  },
  stats(s, q) {
    const p = q.state.player;
    if (q.state.costume?.zones.some((z) => z.kind === "lane" && insideLane(z, p.x, p.y)))
      s.speed *= ZUCKERBERG_SKILL.speed;
  },
  copyParams: () => ({
    life: ZUCKERBERG_SKILL.life,
    slowPct: Math.round((1 - ZUCKERBERG_SKILL.slow) * 100),
    cooldown: ZUCKERBERG_SKILL.cooldown,
  }),
};
