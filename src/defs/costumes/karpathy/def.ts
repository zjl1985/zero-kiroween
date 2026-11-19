/**
 * Costume: Vibe Beat Cat.
 *
 * Source (archive 4.4, card 02): an AI researcher and teacher whose post
 * named "vibe coding".
 * Distilled elements: small headphones, a tail swaying to a beat, a dashed
 * pencil line.
 * Cat design: the chosen cat with small paper headphones and beat-note
 * stickers on the coat. No real face, no logo.
 * Skill "Go with the feel" adapts the card's assist: a short dashed lane is
 * drawn from the cat pointing away from the nearby ink; walking along it
 * gives a brief speed boost. No auto-steer and no runtime AI.
 */
import type { CostumeDef } from "../../types.js";
import { addZone, heading, insideLane } from "../skills.js";

export const KARPATHY_SKILL = {
  cooldown: 30,
  firstAt: 28,
  /** Lane length and how long it stays. */
  length: 180,
  life: 6,
  /** The boost applies while the cat is this close to the lane's centre line. */
  near: 28,
  /** Speed factor near the lane. */
  speed: 1.2,
  /** Ink within this radius sets the direction (the lane points away from it). */
  sense: 260,
} as const;

export const KARPATHY: CostumeDef = {
  id: "karpathy",
  i18n: "costume.karpathy",
  art: "karpathy",
  skill: { cooldown: KARPATHY_SKILL.cooldown, firstAt: KARPATHY_SKILL.firstAt, notice: "costume-karpathy" },
  unlock: { stat: "level", at: 20 },
  activate(state) {
    const { x, y } = state.player;
    let sx = 0,
      sy = 0,
      n = 0;
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0 || Math.hypot(e.x - x, e.y - y) > KARPATHY_SKILL.sense) continue;
      sx += e.x;
      sy += e.y;
      n++;
    }
    let dx = n ? x - sx / n : 0,
      dy = n ? y - sy / n : 0;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) ({ x: dx, y: dy } = heading(state));
    else {
      dx /= d;
      dy /= d;
    }
    addZone(state, {
      kind: "lane",
      x,
      y,
      x2: x + dx * KARPATHY_SKILL.length,
      y2: y + dy * KARPATHY_SKILL.length,
      radius: KARPATHY_SKILL.near,
      until: state.elapsed + KARPATHY_SKILL.life,
      power: KARPATHY_SKILL.speed,
    });
  },
  stats(s, q) {
    const p = q.state.player;
    if (q.state.costume?.zones.some((z) => z.kind === "lane" && insideLane(z, p.x, p.y))) s.speed *= KARPATHY_SKILL.speed;
  },
  copyParams: () => ({
    length: KARPATHY_SKILL.length,
    life: KARPATHY_SKILL.life,
    speedPct: Math.round((KARPATHY_SKILL.speed - 1) * 100),
    cooldown: KARPATHY_SKILL.cooldown,
  }),
};
