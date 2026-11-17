import { STATS } from "../../../game/types.js";
import type { EnemyDef } from "../../types.js";
import { ENEMY_FX_LIFE } from "../fx-life.js";

/** Smudges stop at range and lob a slow, telegraphed ink drop. */
export const SMUDGE = {
  range: 150,
  windup: 0.8,
  cooldown: 3.4,
  dropSpeed: 115,
  minFlight: 0.7,
  splashRadius: 20,
  splashDamage: 1,
  puddleRadius: 24,
  puddleLife: 3,
  puddleSlow: 0.6,
} as const;

export const SMUDGE_DEF: EnemyDef = {
  id: "smudge",
  stats: { hp: 3, speed: 30, radius: 11, contactDamage: 1, xp: 2, knockback: 0.9 },
  behaviours: [{ id: "chase" }, { id: "kite-lob", params: SMUDGE }],
  eliteable: true,
  contactPush: 8,
  onSpawn(e) {
    e.timer = SMUDGE.cooldown * 0.5;
    e.windup = 0;
  },
  // Standing in a puddle slows the cat.
  catSlow(state) {
    const p = state.player;
    return state.hazards.some((h) => Math.hypot(p.x - h.x, (p.y - h.y) * 1.6) <= h.radius)
      ? SMUDGE.puddleSlow
      : 1;
  },
  // Ink drops arc to their locked target, splash, and leave a slowing puddle.
  stepWorld(state, dt, ctx) {
    if (state.ended !== "playing") return;
    const p = state.player;
    for (const s of state.enemyShots) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t < s.flight) continue;
      s.alive = false;
      ctx.effect(state, s.tx, s.ty, "splat", ENEMY_FX_LIFE.splat);
      state.hazards.push({
        id: state.nextHazardId++,
        kind: "puddle",
        x: s.tx,
        y: s.ty,
        radius: SMUDGE.puddleRadius,
        life: SMUDGE.puddleLife,
        maxLife: SMUDGE.puddleLife,
      });
      if (Math.hypot(p.x - s.tx, p.y - s.ty) <= SMUDGE.splashRadius + STATS.playerRadius)
        ctx.hurtPlayer(state, SMUDGE.splashDamage);
    }
  },
};
