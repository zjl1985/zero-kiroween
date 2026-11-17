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
// Commons die in 1-3 early hits (Zero's bolt and Nicole's star deal 1-1.5);
// HORDE.hpPerMinute toughens them as the night goes on.
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  "ink-blob": { hp: 2, speed: 40, radius: 10, contactDamage: 1, xp: 1, knockback: 1 },
  "paper-bat": { hp: 1, speed: 66, radius: 8, contactDamage: 1, xp: 1, knockback: 1.2 },
  crumple: { hp: 6, speed: 24, radius: 14, contactDamage: 1, xp: 3, knockback: 0.5 },
  smudge: { hp: 3, speed: 30, radius: 11, contactDamage: 1, xp: 2, knockback: 0.9 },
  "eraser-boss": { hp: 420, speed: 30, radius: 26, contactDamage: 1, xp: 0, knockback: 0.08 },
};
/**
 * Survivors pacing. Index = whole minutes elapsed (0..9 of the 10-minute
 * night). The living count ramps from about a dozen to near 100 and never
 * passes hardCap, Boss summons, crumple splits, waves and elites included.
 * Spawn points come from SPAWN_RING (ring margin, leash) in world-gen.ts.
 */
export const HORDE = {
  capByMinute: [12, 18, 26, 34, 44, 54, 64, 74, 84, 96],
  spawnPerSecondByMinute: [0.7, 1, 1.3, 1.7, 2.1, 2.5, 2.9, 3.3, 3.7, 4.2],
  hardCap: 100,
  /** Grace seconds before the first ring spawn. */
  firstSpawn: 3,
  /** Room kept free for the Eraser's summons while it is alive. */
  bossRoom: 8,
  /** Extra hp per minute for common kinds (0.15 = +15 % each minute). */
  hpPerMinute: 0.15,
  /** Extra speed per night phase for common kinds. */
  speedPerPhase: 4,
} as const;
/** At most this many of a kind alive at once; extra rolls become ink blobs. */
export const KIND_CAP: Partial<Record<EnemyKind, number>> = {
  smudge: 8,
  crumple: 14,
};
/** Night phase boundaries as fractions of the session (90 s, 270 s, 480 s of 600). */
export const PHASE_AT: readonly [number, number, number] = [0.15, 0.45, 0.8];
/**
 * Elites: a bigger, tougher common with a paper crown, on a fixed timer.
 * Each one drops a chest. They skip their slot while the Boss is alive.
 */
export const ELITE = {
  first: 60,
  every: 60,
  /** No elites after this many seconds (the Boss owns the last stretch). */
  until: 500,
  hpMul: 9,
  radiusMul: 1.55,
  speedMul: 0.85,
  xpMul: 5,
  knockbackMul: 0.35,
  /** Cycled by elite index. */
  kinds: ["ink-blob", "paper-bat", "crumple", "smudge"] as readonly EnemyKind[],
} as const;
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
  /** Fraction of the session at which the Boss arrives (540 s of 600). */
  spawnAt: 0.9,
  spawnTime: 1.2,
  /** Farther than this from the cat, the Eraser hunts at huntSpeed. */
  huntRange: 360,
  huntSpeed: 92,
  /** Zero's decoy only pulls the Boss when it is this close. */
  lureRange: 50,
  /** Slow effects bite less on the heavy eraser. */
  slowMultiplier: 0.8,
  firstAttack: 2.4,
  attackGap: 2.3,
  sweep: { telegraph: 0.9, length: 300, width: 70, damage: 1 },
  summon: { telegraph: 0.7, count: 5, distance: 38 },
  charge: { telegraph: 0.75, speed: 230, time: 0.7 },
  rewardShards: 8,
  rewardValue: 6,
} as const;
export type BossAttack = "sweep" | "summon" | "charge";
export const BOSS_ATTACKS: readonly BossAttack[] = ["sweep", "summon", "charge"];
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
/**
 * Scripted waves at fixed fractions of the session, bounded by HORDE.hardCap.
 * "side": a flock from the left or right edge of the view; "ring": an even
 * circle around the cat that closes in; "line": a row marching in from one
 * side of the view.
 */
export type WavePattern = "side" | "ring" | "line";
export interface WaveDef {
  at: number;
  kind: EnemyKind;
  count: number;
  pattern: WavePattern;
}
export const WAVES: readonly WaveDef[] = [
  { at: 0.17, kind: "paper-bat", count: 6, pattern: "side" },
  { at: 0.25, kind: "paper-bat", count: 10, pattern: "ring" },
  { at: 0.35, kind: "ink-blob", count: 9, pattern: "line" },
  { at: 0.45, kind: "crumple", count: 3, pattern: "side" },
  { at: 0.55, kind: "paper-bat", count: 14, pattern: "ring" },
  { at: 0.62, kind: "smudge", count: 3, pattern: "side" },
  { at: 0.7, kind: "ink-blob", count: 12, pattern: "line" },
  { at: 0.8, kind: "paper-bat", count: 18, pattern: "ring" },
  { at: 0.95, kind: "ink-blob", count: 14, pattern: "line" },
];
/**
 * A "ring" wave is an even ellipse around the view centre that contains the
 * whole view (SPAWN_RING half-extents times `scale`), so it starts off screen.
 */
export const WAVE_RING = { scale: 1.18 } as const;
/** Lifetimes of enemy-side effects; the renderer reads the same values. */
export const ENEMY_FX_LIFE = {
  splat: 0.45,
  erase: 0.6,
  summon: 0.6,
  "boss-down": 1.6,
  crumple: 0.5,
} as const;
