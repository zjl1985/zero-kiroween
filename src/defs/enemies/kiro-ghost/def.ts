import type { EnemyDef } from "../../types.js";

/** A gentle paper-tail pulse: gather, glide, then relax. Shared with art. */
export const KIRO_GHOST = { cycle: 3.2, minSpeed: 0.6, pulseSpeed: 0.9 } as const;

export function kiroGhostMotion(timer: number): { fold: number; speed: number } {
  const fold = (1 - Math.cos(timer / KIRO_GHOST.cycle * Math.PI * 2)) / 2;
  return { fold, speed: KIRO_GHOST.minSpeed + fold * KIRO_GHOST.pulseSpeed };
}

export const KIRO_GHOST_DEF: EnemyDef = {
  id: "kiro-ghost",
  stats: { hp: 2, speed: 42, radius: 12, contactDamage: 1, xp: 2, knockback: 1 },
  behaviours: [{ id: "chase" }, { id: "ghost-glide" }],
  eliteable: false,
  contactPush: 8,
  onSpawn(e) {
    e.phase = (e.id * 2.399) % KIRO_GHOST.cycle;
    e.timer = e.phase;
  },
};
