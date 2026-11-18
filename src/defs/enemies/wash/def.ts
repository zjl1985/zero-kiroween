import { FIRE } from "../../fire.js";
import { STATS, EFFECT_LIFE } from "../../../game/types.js";
import type { EnemyDef } from "../../types.js";
import type { KiteLobParams } from "../behaviours.js";

/** The wash drip stops at range and spits a water drop that lifts the colour where it lands. */
export const WASH_DRIP = {
  range: 170,
  windup: 0.7,
  cooldown: 3.8,
  dropSpeed: 140,
  minFlight: 0.6,
  shot: "water",
  splashRadius: 30,
  splashDamage: 1,
  /** Colour lifted where the drop lands (1 = straight to colourless). */
  washAmount: 1,
  /** Soaked: the cat stays damp this long after a hit. */
  soakSeconds: FIRE.wetTime * 2,
} as const satisfies KiteLobParams & Record<string, unknown>;

/** A water-spitting paper drip: blue-dyed paper that leaks the night's colour away. */
export const WASH_DEF: EnemyDef = {
  id: "wash",
  stats: { hp: 3, speed: 34, radius: 11, contactDamage: 1, xp: 2, knockback: 0.9 },
  behaviours: [{ id: "chase" }, { id: "kite-lob", params: WASH_DRIP }],
  eliteable: false,
  contactPush: 8,
  pigment: "#4f86a8",
  onSpawn(e) {
    e.timer = WASH_DRIP.cooldown * 0.5;
    e.windup = 0;
  },
  // Water drops arc to their locked target, splash, wash the page and soak the cat.
  stepWorld(state, dt, ctx) {
    if (state.ended !== "playing") return;
    const p = state.player;
    for (const s of state.enemyShots) {
      if (!s.alive || s.kind !== "water") continue;
      s.t += dt;
      if (s.t < s.flight) continue;
      s.alive = false;
      ctx.effect(state, s.tx, s.ty, "splash", EFFECT_LIFE.splash, { radius: WASH_DRIP.splashRadius });
      ctx.wash(state, s.tx, s.ty, WASH_DRIP.splashRadius, WASH_DRIP.washAmount);
      if (Math.hypot(p.x - s.tx, p.y - s.ty) > WASH_DRIP.splashRadius + STATS.playerRadius) continue;
      p.wetTime = Math.max(p.wetTime ?? 0, WASH_DRIP.soakSeconds);
      ctx.hurtPlayer(state, WASH_DRIP.splashDamage);
    }
  },
};
