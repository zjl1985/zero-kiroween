import type { CatId } from "../cats/types.js";

export type StyleMode = "paper" | "pixel";

export interface FrameInput {
  /** Movement axis, already clamped to a unit disk. */
  ax: number;
  ay: number;
  /** Rising edge of the dash button this step. */
  dash: boolean;
}

export interface PlayerState {
  id: CatId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  invuln: number;
  dashCooldown: number;
  dashTime: number;
  attackCooldown: number;
  slow: number;
}

export interface PartnerState {
  id: CatId;
  x: number;
  y: number;
  facing: 1 | -1;
}

export interface DecoyState {
  live: boolean;
  x: number;
  y: number;
  time: number;
}

export interface EnemyState {
  id: number;
  kind: "ink-blob";
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

export interface ShotState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alive: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeZone {
  points: StrokePoint[];
  thickness: number;
  ink: number;
  blankTime: number;
}

export interface WorldBounds {
  width: number;
  height: number;
}

export interface SimState {
  seed: number;
  rngState: number;
  timeLeft: number;
  elapsed: number;
  ended: "playing" | "won" | "lost";
  player: PlayerState;
  partner: PartnerState;
  decoy: DecoyState;
  enemies: EnemyState[];
  shots: ShotState[];
  stroke: StrokeZone;
  nextEnemyId: number;
  nextShotId: number;
  spawnTimer: number;
  world: WorldBounds;
}

export interface SimConfig {
  seed: number;
  world: WorldBounds;
  sessionSeconds: number;
}

export const DEFAULT_WORLD: WorldBounds = { width: 640, height: 400 };

/** Cats and ink stay on the sketched yard, not in the night sky. */
export const YARD_TOP = 188;

export const STATS = {
  playerSpeed: 86,
  playerRadius: 12,
  partnerRadius: 12,
  dashSpeed: 280,
  dashTime: 0.18,
  dashCooldown: 3,
  dashIframes: 0.2,
  decoyTime: 1.2,
  decoyAttract: 110,
  maxHp: 5,
  hurtIframes: 0.8,
  attackCooldown: 0.42,
  shotSpeed: 240,
  shotLife: 0.28,
  shotRadius: 3,
  shotDamage: 1,
  enemyRadius: 10,
  enemySpeed: 28,
  enemyHp: 3,
  contactDamage: 1,
  strokeFadePerSecond: 0.06,
  strokeReink: 0.55,
  strokeBlankTime: 2.4,
  strokeSlow: 0.45,
  sessionSeconds: 5 * 60,
  spawnEvery: 11,
  maxEnemies: 4,
} as const;
