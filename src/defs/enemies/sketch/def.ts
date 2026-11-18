import type { EnemyDef } from "../../types.js";

/**
 * A pencil underdrawing that comes alive where the colour washed away. Weak
 * and quick to rub out; it never comes from the spawn table, only from
 * colourless (not blank) cells near the cat, and it splashes no pigment.
 */
export const SKETCH_DEF: EnemyDef = {
  id: "sketch",
  stats: { hp: 1, speed: 52, radius: 10, contactDamage: 1, xp: 1, knockback: 1.2 },
  behaviours: [{ id: "chase" }],
  eliteable: false,
  contactPush: 7,
  wakesOn: "colourless",
  onSpawn(e) {
    e.phase = (e.id * 2.399) % (Math.PI * 2);
  },
};
