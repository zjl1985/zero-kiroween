/**
 * Costume: Leather Jacket Compute Cat.
 *
 * Source (archive 4.4, card 01): a chip-company founder known for a black
 * leather jacket and talks about GPUs and parallel compute.
 * Distilled elements: a short black leather jacket, an unbranded paper chip,
 * a touch of green as the skill colour.
 * Cat design: the chosen cat in a cropped black paper jacket holding a plain
 * paper chip, in a helping pose. No real face, no logo, no brand.
 * Skill "Parallel work" adapts the card's assist: for a few seconds each new
 * shot of the cat spawns one weaker parallel copy beside it. Copies never
 * copy, and one trigger makes at most `cap` copies.
 */
import type { CostumeDef } from "../../types.js";

export const JENSEN_SKILL = {
  cooldown: 36,
  firstAt: 26,
  /** Seconds of parallel work. */
  duration: 6,
  /** Damage factor of a copy. */
  damage: 0.5,
  /** Sideways offset of a copy, world units. */
  offset: 10,
  /** Most copies per trigger. */
  cap: 12,
} as const;

export const JENSEN: CostumeDef = {
  id: "jensen",
  i18n: "costume.jensen",
  art: "jensen",
  skill: { cooldown: JENSEN_SKILL.cooldown, firstAt: JENSEN_SKILL.firstAt, notice: "costume-jensen" },
  unlock: { stat: "damageDealt", at: 2000 },
  activate(state) {
    const c = state.costume!;
    c.buff = JENSEN_SKILL.duration;
    c.vars.copies = 0;
    // Only shots fired from now on are copied.
    c.vars.lastShot = state.nextShotId - 1;
  },
  step(state, ps, _dt, ctx) {
    const c = state.costume!;
    if (c.buff <= 0) return;
    const last = c.vars.lastShot ?? Infinity,
      count = state.shots.length;
    for (let i = 0; i < count; i++) {
      const s = state.shots[i]!;
      if (!s.alive || s.id <= last) continue;
      if ((c.vars.copies ?? 0) >= JENSEN_SKILL.cap) break;
      const v = Math.hypot(s.vx, s.vy) || 1,
        nx = (-s.vy / v) * JENSEN_SKILL.offset,
        ny = (s.vx / v) * JENSEN_SKILL.offset,
        { id, ...rest } = s;
      void id;
      ctx.spawnShot(state, {
        ...rest,
        x: s.x + nx,
        y: s.y + ny,
        hits: [],
        damage: (s.damage ?? ps.shotDamage) * JENSEN_SKILL.damage,
      });
      c.vars.copies = (c.vars.copies ?? 0) + 1;
    }
    // Copies get ids past the last seen one too, so they are never copied.
    c.vars.lastShot = state.nextShotId - 1;
  },
  copyParams: () => ({
    duration: JENSEN_SKILL.duration,
    damagePct: Math.round(JENSEN_SKILL.damage * 100),
    cap: JENSEN_SKILL.cap,
    cooldown: JENSEN_SKILL.cooldown,
  }),
};
