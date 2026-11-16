/** Every enemy kind, spawn table, wave and Boss number lives here as data. */
export type EnemyKind =
  | "ink-blob"
  | "paper-bat"
  | "crumple"
  | "smudge"
  | "eraser-boss";
export interface EnemyDef {
  hp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  /** Ink-shard XP dropped on defeat. */
  xp: number;
  /** How far knockback moves this kind (1 = full). */
  knockback: number;
}
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  "ink-blob": { hp: 3, speed: 32, radius: 10, contactDamage: 1, xp: 1, knockback: 1 },
  "paper-bat": { hp: 1, speed: 62, radius: 8, contactDamage: 1, xp: 1, knockback: 1.2 },
  crumple: { hp: 9, speed: 19, radius: 14, contactDamage: 1, xp: 3, knockback: 0.5 },
  smudge: { hp: 4, speed: 27, radius: 11, contactDamage: 1, xp: 2, knockback: 0.9 },
  "eraser-boss": { hp: 90, speed: 24, radius: 26, contactDamage: 1, xp: 0, knockback: 0.08 },
};
/** Paper bats swoop on a sine path across their line of approach. */
export const BAT = { swoopFrequency: 4.2, swoopAmount: 0.85 } as const;
/** Crumpled balls burst into small blobs. */
export const CRUMPLE = { splitCount: 2, splitHp: 2, splitOffset: 12 } as const;
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
/** Eraser Boss timing, attacks and reward. */
export const BOSS = {
  /** Fraction of the session at which the Boss arrives (234 s of 300). */
  spawnAt: 0.78,
  spawnTime: 1.2,
  /** Zero's decoy only pulls the Boss when it is this close. */
  lureRange: 50,
  /** Slow effects bite less on the heavy eraser. */
  slowMultiplier: 0.8,
  firstAttack: 2.4,
  attackGap: 2.3,
  sweep: { telegraph: 0.9, length: 300, width: 70, damage: 1 },
  summon: { telegraph: 0.7, count: 3, distance: 34 },
  charge: { telegraph: 0.75, speed: 230, time: 0.7 },
  rewardShards: 6,
  rewardValue: 4,
} as const;
export type BossAttack = "sweep" | "summon" | "charge";
export const BOSS_ATTACKS: readonly BossAttack[] = ["sweep", "summon", "charge"];
/** Absolute living-enemy cap, including Boss summons and crumple splits. */
export const ENEMY_CAP = 18;
/** Regular spawn weights per night phase (0..3). */
export const SPAWN_TABLE: readonly (readonly [EnemyKind, number][])[] = [
  [["ink-blob", 1]],
  [
    ["ink-blob", 3],
    ["paper-bat", 2],
  ],
  [
    ["ink-blob", 2],
    ["paper-bat", 2],
    ["crumple", 1],
    ["smudge", 1],
  ],
  [
    ["ink-blob", 2],
    ["paper-bat", 3],
    ["crumple", 2],
    ["smudge", 2],
  ],
];
/** Scripted small waves at fixed fractions of the session. */
export const WAVES: readonly { at: number; kind: EnemyKind; count: number }[] = [
  { at: 0.3, kind: "paper-bat", count: 5 },
  { at: 0.5, kind: "paper-bat", count: 6 },
  { at: 0.64, kind: "crumple", count: 2 },
  { at: 0.7, kind: "smudge", count: 3 },
  { at: 0.92, kind: "paper-bat", count: 7 },
];
/** Lifetimes of enemy-side effects; the renderer reads the same values. */
export const ENEMY_FX_LIFE = {
  splat: 0.45,
  erase: 0.6,
  summon: 0.6,
  "boss-down": 1.6,
  crumple: 0.5,
} as const;
