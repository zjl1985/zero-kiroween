import type { BossAttack } from "../defs/enemies/eraser-boss/def.js";
import { INK_BLOB_STATS } from "../defs/enemies/ink-blob/def.js";
import { ZERO_STATS } from "../defs/cats/zero/stats.js";
import type { CatId, CostumeId, EnemyKind, Point } from "../defs/types.js";
export interface FrameInput {
  ax: number;
  ay: number;
  /** Legacy replay input accepted but never acted on. Live input has axes only. */
  dash?: boolean;
  /** Index (0..2) of an upgrade card while a choice is pending. */
  choose?: number;
}
export interface PaperStatus {
  /** Seconds of carried fire / damp protection remaining. */
  burnTime?: number;
  burnClock?: number;
  wetTime?: number;
}
export interface PlayerState extends PaperStatus {
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
  /** state.elapsed of the last time hp went back up (render: tape patches). */
  healAt?: number;
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
export interface EnemyState extends PaperStatus {
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
  /** Speed factor a costume zone puts on this enemy for the next move only (then cleared). */
  costumeSlow?: number;
  /** Elite variant: bigger, tougher, drops a chest. */
  elite?: boolean;
}
/** A paper chest dropped by an elite (or a big one by the Eraser). */
export interface ChestState {
  id: number;
  x: number;
  y: number;
  /** Boss chest: more card picks. */
  big: boolean;
  alive: boolean;
  age: number;
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
  /** Drawn scale of the prop (pumpkin size, lamp size). */
  s?: number;
  /** Key of the world chunk that owns this object. */
  chunk?: string;
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
  /** Water spit (wash enemy) instead of a smudge's ink drop. */
  kind?: "water";
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
  /** Weapon shots (paper crane, pumpkin seed) carry their own numbers. */
  weapon?: "crane" | "seed";
  damage?: number;
  pierce?: number;
  /** Paper crane: turn rate toward the nearest ink, radians per second. */
  homing?: number;
  /** Pumpkin seed: bursts over this radius on its first hit or when it lands. */
  burst?: number;
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
/** One sample of a cut line, stamped with state.elapsed. */
export interface CutPoint {
  x: number;
  y: number;
  t: number;
}
/** A piece of the page cut out by a closed cut line (render: the hole and the lifted piece). */
export interface CutOut {
  id: number;
  points: StrokePoint[];
  at: number;
}
/** The live cut line a weapon slits through the page as the cat moves. */
export interface CutLineState {
  points: CutPoint[];
  /** Pieces cut out lately (capped by the weapon def). */
  outs: CutOut[];
  /** Loops closed so far (the audio layer diffs it). */
  cuts: number;
  nextId: number;
  /** Closing distance in use (render: the guide toward a closable point). */
  close: number;
}
/** One page fold: a flap of the page folded over the crease through (x, y). */
export interface FoldFlap {
  id: number;
  x: number;
  y: number;
  /** Unit normal toward the side that was folded over. */
  nx: number;
  ny: number;
  /** Flap depth across the crease and half length along it. */
  band: number;
  half: number;
  at: number;
}
export interface PageFoldState {
  flaps: FoldFlap[];
  /** Folds made so far (the audio layer diffs it). */
  folds: number;
  nextId: number;
  /**
   * Live paper bridges over water. Created on the first bridge (so runs that
   * never lay one keep their old state shape) and replaced, never mutated in
   * place, whenever a bridge is added or removed: the water queries cache the
   * deck list by its identity.
   */
  bridges?: FoldBridge[];
  /** Elapsed time from which the next bridge may be laid. */
  bridgeReady?: number;
}
/**
 * A folded paper strip laid over water by Page Fold. Its polygon is a dry deck
 * for every water query (waterAt, resolveWaterMove, avoidDeepWater, wet
 * contact) and the exact outline the renderer draws.
 */
export interface FoldBridge {
  id: number;
  polygon: Point[];
  at: number;
  /** Planned removal; pushed back while an actor still stands over its deep part. */
  until: number;
  /** Removal can be deferred up to here; after it actors are projected to the bank. */
  hold: number;
}
/** A temporary standing paper wall: a solid capsule until its life runs out. */
export interface PaperWall {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
  life: number;
  maxLife: number;
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
  | "streak"
  | "chest-open"
  | "claw"
  | "star-fall"
  | "seed-burst"
  | "prop-tear"
  | "prop-scraps"
  | "ember"
  | "steam"
  | "regrow"
  | "ink-wash"
  | "landmark-reward"
  | "splash"
  | "pigment"
  | "paper-cut"
  | "page-fold"
  | "costume-burst"
  | "costume-push"
  | "costume-pull";
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
  /** Facing of directional effects (night claw), radians. */
  angle?: number;
  /** Radius of area effects (star fall, seed burst, night claw reach). */
  radius?: number;
}
export interface MoonField {
  x: number;
  y: number;
  life: number;
  /** Radius and duration at cast time. */
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
  "chest-open": 1,
  claw: 0.26,
  "star-fall": 0.45,
  "seed-burst": 0.4,
  /** A few paper flecks off a prop that was hit. */
  "prop-tear": 0.45,
  /** A prop gives way: its scraps flutter down. */
  "prop-scraps": 0.9,
  /** Sparks where fire caught. */
  "ember": 0.6,
  steam: 0.7,
  regrow: 0.9,
  "ink-wash": 0.65,
  "landmark-reward": 1.1,
  /** Water lands and lifts the colour (wash grid). */
  splash: 0.6,
  /** Pigment splashes back onto washed paper. */
  pigment: 0.7,
  /** A closed cut line drops its piece out of the page. */
  "paper-cut": 0.9,
  /** A page flap folds over the crease. */
  "page-fold": 0.8,
  /** A costume skill bursts over an area (radius in the impact). */
  "costume-burst": 0.6,
  /** A costume skill pushes ink outward. */
  "costume-push": 0.6,
  /** A costume skill pulls shards in. */
  "costume-pull": 0.7,
} as const;
/** Most live damage tags and dissolves at once, so a crowd of ~100 stays readable. */
export const FX_CAP = { damage: 24, dissolve: 20 } as const;
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
  /** World units the cat has walked or dashed. */
  distance: number;
  elitesDefeated: number;
  chestsOpened: number;
  /** Props torn down to scraps (not burnt). */
  propsTorn: number;
  /** Fire cells that burnt out to ash. */
  cellsBurnt: number;
  /**
   * Colour kept this night, in percent: of every patch the water washed out,
   * the share painted again when dawn broke (or when the watch ended). 100
   * when nothing was washed. Frozen once dawn starts.
   */
  colourKept: number;
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
  | "streak"
  | "found-clock-tower"
  | "found-pumpkin-field"
  | "found-stone-bridge"
  | "found-graveyard"
  | "found-lantern-market"
  | "found-moon-hill"
  | "found-paper-windmill"
  | "found-puppet-theatre"
  | "found-wishing-well"
  | "found-paper-teahouse"
  | "found-fold-greenhouse"
  | "found-star-observatory"
  | "elite"
  | "chest"
  | "burning"
  | "extinguished"
  | "landmark-tea"
  | "landmark-greenhouse"
  | "landmark-observatory"
  | "landmark-windmill"
  | "paper-rain"
  | "eraser-wipe"
  /** A worn costume's skill triggered (one per costume id). */
  | `costume-${string}`;
export interface UpgradeChoice {
  options: string[];
}
/** What the last opened chest gave, shown by the HUD while `life` lasts. */
export interface ChestReveal {
  items: { id: string; level: number }[];
  /** Evolution granted by this chest, if any. */
  evolved: string | null;
  big: boolean;
  life: number;
}
export interface BuildSlots {
  /** Weapon slot order; an evolution replaces its base weapon in place. */
  weapons: string[];
  passives: string[];
}
/** A prop that has been touched; untouched props are not stored. */
export interface PropState {
  hp: number;
  /** 0 intact, 1 damaged, 2 scraps. */
  phase: 0 | 1 | 2;
  /** Turned to ash by fire. */
  burnt?: boolean;
  /** state.elapsed of the last element hit (hit interval). */
  hitAt: number;
  /** state.elapsed of the last fire tick that burnt it (render glow). */
  burnAt?: number;
  destroyedAt?: number;
  regrowAt?: number;
  /** Regrowth must not create an unlimited loot farm. */
  dropsClaimed?: boolean;
  foldedUntil?: number;
  inkedUntil?: number;
  /** Soaked by water: it cannot burn and tears more easily (WASH.tearEase). */
  soakedUntil?: number;
}
/** The sparse fire grid: keys are "ix,iy" cell coords (FIRE.cell). */
export interface FireState {
  /** Burning cells and their seconds left. */
  cells: Record<string, number>;
  /** Burnt-out cells (value: ash order); renewed flora clears its own old ash. */
  ash: Record<string, number>;
  /** Time banked toward the next fire tick. */
  clock: number;
  /** Fire ticks run so far (seeds the spread hash). */
  ticks: number;
}
/** One stored cell of the wash grid; cells not stored are painted. */
export interface WashCell {
  /** 0 painted .. 1 colourless (raw paper and pencil underdrawing). */
  level: number;
  /** Rubbed out by the Eraser: no colour and no pencil until repainted. */
  blank?: boolean;
  /** state.elapsed of the last level change (render bloom / tide line). */
  changedAt: number;
  /** Wet paper until then: slows, soaks actors and stops fire. */
  wetUntil?: number;
  /** A white cut hole (blank look) until then; only colourless cells take one. */
  cutUntil?: number;
  /** Last pigment colour painted here (render hint). */
  hint?: string;
}
/**
 * Fold protection: water cannot wash any cell whose centre lies in the circle
 * until `until`. Kept as circles, not cells, so folding painted ground stores
 * no wash cells (an unwashed run keeps an empty grid and no wash render).
 */
export interface WashFold {
  x: number;
  y: number;
  radius: number;
  until: number;
}
/** The sparse wash grid: keys are "ix,iy" cell coords (WASH.cell). */
export interface WashState {
  cells: Record<string, WashCell>;
  /** Number of stored cells (kept by src/game/wash.ts). */
  size: number;
  /** Live fold protection circles, oldest first (at most WASH.fold.maxZones). */
  folds: WashFold[];
  clock: number;
  ticks: number;
  /** Painted cells that turned colourless or blank (each time). */
  touched: number;
  /** Colourless cells forgotten by the cap (counted as not kept). */
  lost: number;
  /** Counters the audio layer diffs. */
  splashes: number;
  pigments: number;
  rainPulses: number;
  wipes: number;
  /** Time banked toward the next sketch roll. */
  sketchClock: number;
}
export interface LandmarkEventState {
  progress: number;
  cooldown: number;
  activations: number;
  /** Seconds of extra wind-driven motion remaining. */
  wind: number;
  /** Integrated rotor angle; rendering never advances it. */
  turn?: number;
}
/** "dawn": survived with no Boss loose; "fallen": hp hit 0; "boss-escaped": dawn with the Boss alive. */
export type EndReason = "dawn" | "fallen" | "boss-escaped";
/**
 * A small area a costume skill leaves on the page, shared by every costume:
 * a lane from (x, y) to (x2, y2) with half width `radius`, or a circle /
 * pad / turret / burst of `radius` at (x, y). Removed once `elapsed`
 * reaches `until` (at most COSTUME.maxZones live at once).
 */
export interface CostumeZone {
  kind: "lane" | "circle" | "pad" | "turret" | "burst";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  radius: number;
  until: number;
  /** Skill-specific strength (slow factor, damage, speed bonus). */
  power: number;
  /** Elapsed time from which the zone acts (telegraphs before it); a used pad is disarmed. */
  armed?: number;
  /** Seconds banked toward the next action (turret shots). */
  clock?: number;
}
/** The costume the chosen cat wears this night. */
export interface CostumeState {
  id: CostumeId;
  /** Seconds until the skill triggers next. */
  timer: number;
  /** Skill triggers so far. */
  uses: number;
  /** Seconds left on the skill's timed buff (the costume's stats hook reads it). */
  buff: number;
  /** Per-costume scratch numbers (generic; each def names its own). */
  vars: Record<string, number>;
  zones: CostumeZone[];
}
export interface SimState {
  seed: number;
  rngState: number;
  timeLeft: number;
  elapsed: number;
  sessionSeconds: number;
  ended: "playing" | "won" | "lost";
  /**
   * Why the night ended; null while playing. Dawn is a win only when no Boss is
   * left on the page: dawn with the Eraser still loose is a "boss-escaped" loss.
   */
  endReason: EndReason | null;
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
  build: BuildSlots;
  /** Seconds until each auto weapon fires next. */
  weaponTimers: Record<string, number>;
  chestReveal: ChestReveal | null;
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
  /** Keys of the world chunks whose interactables are live around the cat. */
  loadedChunks: string[];
  /** Ids of landmarks the cat has come close to, in discovery order. */
  landmarksFound: string[];
  /** Elite slots already used (spawned or skipped). */
  elitesDone: number;
  chests: ChestState[];
  nextChestId: number;
  /**
   * Touched props by id ("cx,cy#i"), retained across chunk reloads with
   * destruction, treatment, regeneration deadlines and lifetime loot claims.
   * Bounded by the number of props in the world.
   */
  props: Record<string, PropState>;
  fire: FireState;
  wash: WashState;
  landmarkEvents: Record<string, LandmarkEventState>;
  /** Cut line and cut-out pieces (paper cut weapon). */
  cut: CutLineState;
  /** Recent page folds (page fold weapon). */
  fold: PageFoldState;
  /** Temporary paper walls; they block like scenery while they stand. */
  walls: PaperWall[];
  nextWallId: number;
  /**
   * The worn costume. Absent (not null) for a plain run, so a night without a
   * costume keeps exactly its old state shape and snapshot.
   */
  costume?: CostumeState;
}
export interface SimConfig {
  cat: CatId;
  seed: number;
  world: WorldBounds;
  sessionSeconds: number;
  /** Costume the cat wears (null / omitted: plain). Unlock checks belong to the UI. */
  costume: CostumeId | null;
}
/** The start yard frame; the explorable bounds are WORLD in src/game/world-gen.ts. */
export const DEFAULT_WORLD: WorldBounds = { width: 960, height: 540 };
export const YARD_TOP = 264;
export const STATS = {
  playerRadius: 12,
  // Ink-blob aliases; per-kind numbers live in src/defs/enemies/<id>/def.ts.
  enemyRadius: INK_BLOB_STATS.radius,
  enemySpeed: INK_BLOB_STATS.speed,
  enemyHp: INK_BLOB_STATS.hp,
  contactDamage: 1,
  hurtIframes: 0.8,
  shotRadius: 3,
  shotDamage: ZERO_STATS.shotDamage,
  strokeFadePerSecond: 0.06,
  strokeReink: 0.55,
  strokeBlankTime: 2.4,
  strokeSlow: 0.65,
  sessionSeconds: 600,
  /** The sky warms toward dawn over these last seconds of the night. */
  dawnSeconds: 30,
  // Legacy common dash constants remain aliases for the starting Zero loadout.
  dashCooldown: ZERO_STATS.cooldown,
  decoyTime: ZERO_STATS.decoyLife,
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
