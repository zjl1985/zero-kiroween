/**
 * Costume: Ten-Day Prototype Cat.
 *
 * Source (archive 4.4, card 05): the creator of a web scripting language whose
 * first prototype was built in about ten days.
 * Distilled elements: a ten-square mini calendar, a pencil behind the ear.
 * Cat design: the chosen cat with a paper ten-day calendar strip on the belt
 * and a pencil tucked by one ear. No real face, no logo.
 * Skill "Make it run first" adapts the card's assist: one small paper turret
 * stands for a few seconds and shoots the nearest ink. At most one turret; it
 * keeps its own plain numbers (no upgrades) and folds away if the cat walks
 * far from it.
 */
import { STATS } from "../../../game/types.js";
import type { CostumeDef } from "../../types.js";
import { addZone } from "../skills.js";

export const EICH_SKILL = {
  cooldown: 30,
  firstAt: 34,
  /** Turret seconds, shot gap, damage and range. */
  life: 6,
  every: 0.6,
  damage: 1,
  range: 260,
  /** Shot speed, world units per second. */
  shotSpeed: 320,
  /** The turret folds away when the cat is farther than this. */
  leash: 420,
} as const;

export const EICH: CostumeDef = {
  id: "eich",
  i18n: "costume.eich",
  art: "eich",
  skill: { cooldown: EICH_SKILL.cooldown, firstAt: EICH_SKILL.firstAt, notice: "costume-eich" },
  unlock: { stat: "dawn", at: 1 },
  activate(state) {
    const c = state.costume!,
      { x, y } = state.player;
    // At most one turret: a new one replaces the old.
    c.zones = c.zones.filter((z) => z.kind !== "turret");
    addZone(state, {
      kind: "turret",
      x,
      y,
      radius: EICH_SKILL.range,
      until: state.elapsed + EICH_SKILL.life,
      power: EICH_SKILL.damage,
      clock: 0,
    });
  },
  step(state, _ps, dt, ctx) {
    const p = state.player;
    for (const z of state.costume!.zones) {
      if (z.kind !== "turret") continue;
      if (Math.hypot(p.x - z.x, p.y - z.y) > EICH_SKILL.leash) {
        z.until = state.elapsed;
        continue;
      }
      z.clock = (z.clock ?? 0) + dt;
      while (z.clock >= EICH_SKILL.every) {
        z.clock -= EICH_SKILL.every;
        const e = ctx.nearestEnemy(state, z.x, z.y, z.radius);
        if (!e) continue;
        const d = Math.hypot(e.x - z.x, e.y - z.y) || 1;
        ctx.spawnShot(state, {
          x: z.x,
          y: z.y,
          vx: ((e.x - z.x) / d) * EICH_SKILL.shotSpeed,
          vy: ((e.y - z.y) / d) * EICH_SKILL.shotSpeed,
          life: (z.radius + STATS.playerRadius) / EICH_SKILL.shotSpeed,
          alive: true,
          damage: z.power,
          pierce: 1,
          hits: [],
        });
      }
    }
  },
  copyParams: () => ({
    life: EICH_SKILL.life,
    every: EICH_SKILL.every,
    damage: EICH_SKILL.damage,
    cooldown: EICH_SKILL.cooldown,
  }),
};
