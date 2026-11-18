import type { EnemyDef } from "../../types.js";

/** Paper bats swoop on a sine path across their line of approach. */
export const BAT = { swoopFrequency: 4.2, swoopAmount: 0.85 } as const;

export const PAPER_BAT: EnemyDef = {
  id: "paper-bat",
  stats: { hp: 1, speed: 66, radius: 8, contactDamage: 1, xp: 1, knockback: 1.2 },
  behaviours: [{ id: "chase" }, { id: "swoop", params: BAT }],
  eliteable: true,
  contactPush: 8,
  pigment: "#6b4f8a",
  onSpawn(e) {
    // No RNG here: bats get a swoop phase from their id.
    e.phase = (e.id * 2.399) % (Math.PI * 2);
  },
};
