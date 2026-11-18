import type { EnemyDef } from "../../types.js";

// Commons die in 1-3 early hits (Zero's bolt and Nicole's star deal 1-1.5);
// HORDE.hpPerMinute toughens them as the night goes on.
export const INK_BLOB_STATS = { hp: 2, speed: 40, radius: 10, contactDamage: 1, xp: 1, knockback: 1 };

/** The plain ink blot: chases the cat (or a nearby decoy). */
export const INK_BLOB: EnemyDef = {
  id: "ink-blob",
  stats: INK_BLOB_STATS,
  behaviours: [{ id: "chase" }],
  eliteable: true,
  contactPush: 8,
  pigment: "#4a3d6b",
};
