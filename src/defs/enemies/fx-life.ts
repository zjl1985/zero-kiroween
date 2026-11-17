/** Lifetimes of enemy-side effects; the renderer reads the same values. */
export const ENEMY_FX_LIFE = {
  splat: 0.45,
  erase: 0.6,
  summon: 0.6,
  "boss-down": 1.6,
  crumple: 0.5,
} as const;
