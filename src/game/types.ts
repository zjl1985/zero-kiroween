import {CHARACTERS} from "./characters.js";
import type { CatId } from "../cats/types.js";
import { ENEMIES, type BossAttack, type EnemyKind } from "./enemies.js";
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
export interface BossAct {
  kind: BossAttack;
  /** Telegraph seconds left; the attack resolves when it reaches 0. */
  t: number;
  /** Seconds of active movement left (charge only). */
  run: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}
export interface EnemyState {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  orbitCooldown: number;
  slowTime: number;
  spawnTime: number;
  /** Defaults to the kind's data when omitted. */
  maxHp?: number;
  radius?: number;
  /** Behaviour timer: smudge reload, Boss attack gap. */
  timer?: number;
  /** Smudge windup seconds left before the drop is thrown. */
  windup?: number;
  /** Locked target of a telegraphed throw. */
  tx?: number;
  ty?: number;
  /** Per-enemy swoop phase for bats. */
  phase?: number;
  act?: BossAct | null;
  /** Index into the Boss attack rotation. */
  combo?: number;
  /** Seconds of white hit flash left after taking damage. */
  hitFlash?: number;
  /** Seconds frozen by the moon-lantern pulse. */
  stun?: number;
}
/** A jack-o'-lantern or the moon-lantern in the yard. */
export interface InteractState {
  id: number;
  kind: "pumpkin" | "lantern";
  x: number;
  y: number;
  /** Pumpkin: seconds of light left. */
  lit: number;
  /** Pumpkin: seconds until it can be lit again. */
  cooldown: number;
  /** Lantern: charge from 0 to 1. */
  charge: number;
  /** Pumpkin: seconds until the next aura tick. */
  tick: number;
}
export interface TreatState {
  id: number;
  x: number;
  y: number;
  life: number;
  alive: boolean;
}
/** Kill streak with a short timeout. */
export interface StreakState {
  count: number;
  timer: number;
  best: number;
}
/** A slow ink drop lobbed by a smudge; lands at (tx, ty). */
export interface EnemyShotState {
  id: number;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  t: number;
  flight: number;
  alive: boolean;
}
export interface HazardState {
  id: number;
  kind: "puddle";
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}
export interface BossTrack {
  spawned: boolean;
  defeated: boolean;
  id: number | null;
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
  | "collect"
  | "splat"
  | "erase"
  | "summon"
  | "boss-down"
  | "crumple"
  | "damage"
  | "dissolve"
  | "pumpkin-light"
  | "pumpkin-pulse"
  | "treat"
  | "moon-stun"
  | "streak";
export interface Impact {
  x: number;
  y: number;
  life: number;
  kind: EffectKind;
  /** Damage dealt ("damage") or streak count ("streak"). */
  amount?: number;
  /** Enemy kind that produced a hit or defeat. */
  src?: EnemyKind;
  /** Stable per-impact number for render-only scatter. */
  seed?: number;
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
  damage: 0.7,
  dissolve: 0.9,
  "pumpkin-light": 0.7,
  "pumpkin-pulse": 0.5,
  treat: 0.6,
  "moon-stun": 1.1,
  streak: 0.9,
} as const;
export interface RunStats {
  kills: number;
  skillUses: number;
  damageDealt: number;
  damageTaken: number;
  shieldBlocks: number;
  upgradesTaken: number;
  shardsCollected: number;
  bossDefeated: boolean;
  bestStreak: number;
  pumpkinsLit: number;
  treatsEaten: number;
  moonPulses: number;
}
export type Notice =
  | "zero-dash"
  | "nicole-fold"
  | "nicole-rescue"
  | "shield-block"
  | "evolve-zero"
  | "evolve-nicole"
  | "boss-incoming"
  | "boss-defeated"
  | "phase1"
  | "phase2"
  | "phase3"
  | "pumpkin-lit"
  | "fish-treat"
  | "moon-ready"
  | "moon-stun"
  | "streak";
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
  enemyShots: EnemyShotState[];
  hazards: HazardState[];
  nextHazardId: number;
  boss: BossTrack;
  /** Count of scripted waves already released. */
  wavesDone: number;
  interactables: InteractState[];
  treats: TreatState[];
  nextTreatId: number;
  /** Seconds until the next fish treat appears. */
  treatTimer: number;
  streak: StreakState;
  /** Highest night phase already announced. */
  phaseSeen: number;
  /** Stable counter that seeds render-only scatter of effects. */
  fxSeq: number;
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
  // Ink-blob aliases; per-kind numbers live in ENEMIES (src/game/enemies.ts).
  enemyRadius: ENEMIES["ink-blob"].radius,
  enemySpeed: ENEMIES["ink-blob"].speed,
  enemyHp: ENEMIES["ink-blob"].hp,
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
  /** White flash on a damaged enemy. */
  hitFlash: 0.14,
  /** Seconds a kill streak survives without another kill. */
  streakWindow: 2.6,
  /** Every this many streak kills grants a bonus. */
  streakMilestone: 10,
  streakBonusXp: 4,
  /** Streak count from which the HUD badge appears. */
  streakShow: 3,
} as const;
