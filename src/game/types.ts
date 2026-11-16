import {CHARACTERS} from "./characters.js";
import type { CatId } from "../cats/types.js";
export interface FrameInput {
  ax: number;
  ay: number;
  dash: boolean;
  /** Index (0..2) of an upgrade card while a choice is pending. */
  choose?: number;
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
  empowerTime: number;
  shield: number;
  shieldTime: number;
  rescueUsed: boolean;
}
export interface DecoyState {
  live: boolean;
  x: number;
  y: number;
  time: number;
  /** Echo Legion: seconds until the evolved decoy fires again. */
  fire: number;
}
export interface PickupState {
  id: number;
  x: number;
  y: number;
  value: number;
  alive: boolean;
  age: number;
}
export interface EnemyState {
  id: number;
  kind: "ink-blob";
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  orbitCooldown: number;
  slowTime: number;
  spawnTime: number;
}
export interface ShotState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alive: boolean;
  empowered?: boolean;
  /** Fired by Zero's evolved decoy. */
  echo?: boolean;
  hits?: number[];
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
export type EffectKind =
  | "hit"
  | "defeat"
  | "dash"
  | "fold"
  | "shield"
  | "rescue"
  | "hurt"
  | "levelup"
  | "evolve"
  | "echo-burst"
  | "moon-pulse"
  | "collect";
export interface Impact {
  x: number;
  y: number;
  life: number;
  kind: EffectKind;
}
export interface MoonField {
  x: number;
  y: number;
  life: number;
  /** Radius and duration at cast time; defaults to Nicole's base values. */
  radius?: number;
  duration?: number;
}
/** Lifetimes for celebration effects; the renderer reads the same values. */
export const EFFECT_LIFE = {
  levelup: 0.9,
  evolve: 1.5,
  "echo-burst": 0.55,
  "moon-pulse": 0.65,
  collect: 0.28,
} as const;
export interface RunStats {
  kills: number;
  skillUses: number;
  damageDealt: number;
  damageTaken: number;
  shieldBlocks: number;
  upgradesTaken: number;
  shardsCollected: number;
}
export type Notice =
  | "zero-dash"
  | "nicole-fold"
  | "nicole-rescue"
  | "shield-block"
  | "evolve-zero"
  | "evolve-nicole";
export interface UpgradeChoice {
  options: string[];
}
export interface SimState {
  seed: number;
  rngState: number;
  timeLeft: number;
  elapsed: number;
  sessionSeconds: number;
  ended: "playing" | "won" | "lost";
  player: PlayerState;
  decoy: DecoyState;
  enemies: EnemyState[];
  shots: ShotState[];
  impacts: Impact[];
  fields: MoonField[];
  stroke: StrokeZone;
  nextEnemyId: number;
  nextShotId: number;
  spawnTimer: number;
  world: WorldBounds;
  stats: RunStats;
  notice: { kind: Notice; life: number } | null;
  xp: number;
  level: number;
  xpToNext: number;
  upgrades: Record<string, number>;
  /** While set, the night is frozen until a card is chosen. */
  pendingChoice: UpgradeChoice | null;
  pickups: PickupState[];
  nextPickupId: number;
  /** Full Moon: seconds until the next moon pulse. */
  pulseTimer: number;
}
export interface SimConfig {
  cat: CatId;
  seed: number;
  world: WorldBounds;
  sessionSeconds: number;
}
export const DEFAULT_WORLD: WorldBounds = { width: 960, height: 540 };
export const YARD_TOP = 264;
export const STATS = {
  playerRadius: 12,
  enemyRadius: 10,
  enemySpeed: 32,
  enemyHp: 3,
  contactDamage: 1,
  hurtIframes: 0.8,
  shotRadius: 3,
  shotDamage: CHARACTERS.zero.shotDamage,
  strokeFadePerSecond: 0.06,
  strokeReink: 0.55,
  strokeBlankTime: 2.4,
  strokeSlow: 0.65,
  sessionSeconds: 300,
  // Legacy common dash constants remain aliases for the starting Zero loadout.
  dashCooldown: CHARACTERS.zero.cooldown,
  decoyTime: CHARACTERS.zero.decoyLife,
} as const;
