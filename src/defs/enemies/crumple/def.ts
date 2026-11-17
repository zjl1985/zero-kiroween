import { HORDE } from "../../horde.js";
import type { EnemyDef } from "../../types.js";
import { ENEMY_FX_LIFE } from "../fx-life.js";

/** Crumpled balls burst into small blobs. */
export const CRUMPLE = { splitCount: 2, splitHp: 2, splitOffset: 12, into: "ink-blob" } as const;

export const CRUMPLE_DEF: EnemyDef = {
  id: "crumple",
  stats: { hp: 6, speed: 24, radius: 14, contactDamage: 1, xp: 3, knockback: 0.5 },
  behaviours: [{ id: "chase" }],
  eliteable: true,
  contactPush: 8,
  onDeath: [
    // A crumpled ball bursts into small blobs, as far as the cap allows.
    (state, e, ctx) => {
      ctx.effect(state, e.x, e.y, "crumple", ENEMY_FX_LIFE.crumple);
      for (let i = 0; i < CRUMPLE.splitCount; i++) {
        if (ctx.livingEnemies(state) >= HORDE.hardCap) break;
        const side = i % 2 ? 1 : -1;
        ctx.spawnEnemy(
          state,
          CRUMPLE.into,
          e.x + side * CRUMPLE.splitOffset,
          e.y + (i >> 1) * CRUMPLE.splitOffset,
          CRUMPLE.splitHp,
          0.2,
        );
      }
    },
  ],
};
