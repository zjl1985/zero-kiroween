/**
 * Definition interfaces for game content. A def file describes one cat,
 * weapon, passive, evolution or enemy: its numbers plus small hooks that the
 * generic simulation calls. Defs never import the simulation itself; they
 * receive a SimContext of helpers instead, so src/game stays content-free and
 * sim def files stay DOM-free.
 *
 * Determinism rules for every hook: run synchronously, mutate only SimState,
 * and take randomness only from the Rng argument the sim passes in.
 */
import type { Rng } from "../game/rng.js";
import type { EffectKind, EnemyState, Impact, Notice, ShotState, SimState } from "../game/types.js";
import type { Capsule } from "../game/scenery.js";

export type CatId = string;
export type UpgradeId = string;
export type WeaponId = string;
export type EnemyKind = string;
/** Who may be offered an item: every cat, or one cat id. */
export type UpgradePool = "any" | CatId;

/** Numbers every cat has; a cat's kit adds its own on top. */
export interface CatBaseStats {
  readonly maxHp: number;
  readonly speed: number;
  readonly accent: string;
  readonly dashSpeed: number;
  readonly dashTime: number;
  /** Skill cooldown in seconds. */
  readonly cooldown: number;
  readonly invulnerability: number;
}

/**
 * The combined stat view of the chosen cat (base, passives, weapon levels).
 * Each def file adds the fields it contributes with module augmentation
 * (`declare module "../types.js" { interface PlayerStats { ... } }`).
 */
export interface PlayerStats {
  speed: number;
  cooldown: number;
  pickupRadius: number;
  xpMultiplier: number;
  hurtIframes: number;
  /** Area multiplier for weapon reach and bursts. */
  area: number;
}
/** Typed view of per-level card values, keyed by upgrade id (augmented by defs). */
export interface UpgradeValueMap {}
/** Typed view of weapon level-1 numbers shown on cards (augmented by defs). */
export interface WeaponBaseMap {}
/** Typed view of every cat's numbers, keyed by cat id (augmented by defs). */
export interface CharacterStatsMap {}

/** Read-only levels for the stat fold. */
export interface StatQuery {
  readonly state: SimState;
  /** Owned level of an upgrade (0 when not owned). */
  level(id: UpgradeId): number;
  /** Weapon level; the chosen cat's starting weapon is always at least 1. */
  weaponLevel(id: WeaponId): number;
}

export interface Point {
  x: number;
  y: number;
}

/** Simulation helpers handed to every hook. */
export interface SimContext {
  stats(state: SimState): PlayerStats;
  effect(
    state: SimState,
    x: number,
    y: number,
    kind: EffectKind,
    life: number,
    extra?: Pick<Impact, "amount" | "src" | "angle" | "radius">,
  ): void;
  notify(state: SimState, kind: Notice): void;
  hurtEnemy(state: SimState, e: EnemyState, damage: number): void;
  /** Damages the cat (shields and invulnerability apply); true when it landed or was blocked. */
  hurtPlayer(state: SimState, damage: number): boolean;
  spawnEnemy(
    state: SimState,
    kind: EnemyKind,
    x: number,
    y: number,
    hp?: number,
    spawnTime?: number,
  ): EnemyState;
  /** Pushes a shot with the next shot id. */
  spawnShot(state: SimState, shot: Omit<ShotState, "id">): void;
  /** Clamps to the world and steps out of nearby scenery. */
  safePosition(state: SimState, x: number, y: number, radius: number): Point;
  nearestEnemy(
    state: SimState,
    x: number,
    y: number,
    range: number,
    skip?: readonly number[],
  ): EnemyState | undefined;
  enemyRadius(e: EnemyState): number;
  /** Knockback scale of an enemy (elites shrug most of it off). */
  knockOf(e: EnemyState): number;
  livingEnemies(state: SimState): number;
  /** Touching the page line with (x, y, radius) re-inks it. */
  maybeReink(state: SimState, x: number, y: number, radius: number): void;
  dropShard(state: SimState, x: number, y: number, value: number): void;
  dropChest(state: SimState, x: number, y: number, big: boolean): void;
  /** Places a fish treat at (x, y) (prop drops), if the treat cap allows. */
  dropTreat(state: SimState, x: number, y: number): void;
  /**
   * Applies `element` with `power` to every prop whose footprint overlaps the
   * circle (x, y, radius); the reaction table decides what happens.
   */
  elementHit(state: SimState, x: number, y: number, radius: number, element: Element, power: number): void;
  /** Takes durability off a prop; at 0 it turns to scraps (burnt: to ash). */
  damageProp(state: SimState, prop: PropSpot, amount: number, burnt?: boolean): void;
  /** Sets flammable fire cells inside the circle alight (up to the fire cap). */
  ignite(state: SimState, x: number, y: number, radius: number): void;
}

/** Events the sim emits; payloads are plain data. */
export interface SimEvents {
  /** Once per step, after timers tick and before the cat moves. */
  tick: { dt: number };
  /** An enemy took damage (it may have died). */
  hit: { enemy: EnemyState; damage: number; dealt: number };
  kill: { enemy: EnemyState };
  /** The cat used its skill, dashing along (dx, dy). */
  dash: { dx: number; dy: number };
  /** The cat lost hp (after shields), before the defeat check. */
  damaged: { damage: number };
  pickup: { value: number };
  levelUp: { level: number };
  chestOpen: { big: boolean; evolved: string | null };
  /** The cat lit a pumpkin or fired a moon-lantern. */
  touchProp: { id: number; kind: string };
}
export type SimHandler<K extends keyof SimEvents> = (
  state: SimState,
  payload: SimEvents[K],
  ctx: SimContext,
) => void;
/** Event subscriptions of a def; the defs index gates them to when the def is active. */
export type SimHooks = { [K in keyof SimEvents]?: SimHandler<K> };

export interface CharacterDef<K extends CatBaseStats = CatBaseStats> {
  readonly id: CatId;
  readonly gender: "male" | "female";
  /** Base numbers plus the kit's own numbers (one source for sim, selection page and HUD). */
  readonly stats: K;
  readonly startWeapon: WeaponId;
  /** Upgrade ids only this cat may be offered. */
  readonly exclusives: readonly UpgradeId[];
  readonly evolutions: readonly UpgradeId[];
  /** i18n key prefix: `<prefix>.role`, `<prefix>.active.name`, `cat.<id>.choice`. */
  readonly i18n: string;
  /** Art id the renderer looks up (palette and head data). */
  readonly art: string;
  /** Notice shown when the skill is used. */
  readonly skillNotice: Notice;
  /**
   * Named numbers the kit copy interpolates (`{decoy}`, `{stars}` ...). The UI
   * merges every cat's params, so one cat's text may cite another's numbers.
   */
  copyParams?(): Readonly<Record<string, number>>;
  /** Speed factor of ink slowed by this cat's skill and weapons (1 = no slow). */
  readonly enemySlow?: number;
  /** Skill effect after the shared dash has started. */
  onSkill(state: SimState, ps: PlayerStats, ctx: SimContext): void;
  /** Adds the kit's own fields to the stat view (runs for every registered cat). */
  kitStats?(s: PlayerStats, q: StatQuery): void;
  /** Passive hooks, only called while this cat is the one in the run. */
  readonly hooks?: SimHooks;
}

/**
 * Stats a weapon level can raise. damage: +damage; rate: fraction faster;
 * count: more bolts / stars / targets / cranes / seeds; pierce: +enemies
 * passed through; area: +radius or reach in world units.
 */
export type WeaponStat = "damage" | "rate" | "count" | "pierce" | "area";
export type WeaponStep = Partial<Record<WeaponStat, number>>;

/**
 * When a weapon acts inside a step: "move" right after the cat moves (hand
 * weapons), "aura" after the page line fades (orbits, pulses, echoes),
 * "auto" for the timed auto weapons. Within a timing, registration order.
 */
export type WeaponTiming = "move" | "aura" | "auto";

export interface WeaponDef {
  readonly id: WeaponId;
  readonly pool: UpgradePool;
  /** Evolutions take a weapon slot but are only granted by chests. */
  readonly kind: "weapon" | "evolution";
  /** steps[i] is what the weapon gains going from level i + 1 to i + 2 (weapons only). */
  readonly steps?: readonly WeaponStep[];
  /** Level-1 numbers shown on cards, when the weapon has its own. */
  readonly base?: Readonly<Record<string, number>>;
  /** Per-level card values of an evolution. */
  readonly values?: Readonly<Record<string, number>>;
  readonly timing: WeaponTiming;
  /**
   * Elements this weapon applies to props it touches (the first one is used).
   * Shots carry it through `shotTag` (ShotState.weapon; plain bolts are "bolt").
   */
  readonly elements?: readonly Element[];
  readonly shotTag?: string;
  /** Adds this weapon's fields to the stat view at `level` (0 = not owned). */
  stats?(s: PlayerStats, level: number, q: StatQuery): void;
  /** Acts once per step while owned. */
  step?(state: SimState, ps: PlayerStats, dt: number, rng: Rng, ctx: SimContext): void;
  /** Sets this weapon's initial SimState values in createSim. */
  init?(state: SimState): void;
  readonly hooks?: SimHooks;
}

export interface PassiveDef {
  readonly id: UpgradeId;
  readonly pool: UpgradePool;
  readonly maxLevel: number;
  /** Per-level amounts, shown on cards through i18n params. */
  readonly values: Readonly<Record<string, number>>;
  /** Cards show these values as percentages. */
  readonly percent?: boolean;
  /** The filler card that tops up a short hand (never takes a slot). */
  readonly filler?: boolean;
  /** Folds this passive into the stat view at `level` (0 = not owned). */
  modify?(s: PlayerStats, level: number, q: StatQuery): void;
  /** Runs each time a level is taken. */
  onLevel?(state: SimState, ctx: SimContext): void;
  readonly hooks?: SimHooks;
}

export interface EvolutionDef {
  /** Also the id of the evolved weapon def. */
  readonly id: UpgradeId;
  readonly cat: CatId;
  /** Must be at max level. */
  readonly weapon: WeaponId;
  /** Must be owned (any level). */
  readonly passive: UpgradeId;
  /** Weapon slot the evolution takes over. */
  readonly replaces: WeaponId;
  /** Banner shown when the chest grants it. */
  readonly notice: Notice;
  onEvolve?(state: SimState): void;
}

/** Shared per-kind numbers. */
export interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  /** Ink-shard XP dropped on defeat. */
  xp: number;
  /** How far knockback moves this kind (1 = full). */
  knockback: number;
}

/** Movement being built for one enemy this step. */
export interface EnemyMove {
  dx: number;
  dy: number;
  /** Unit direction to the target. */
  dir: Point;
  speed: number;
  dt: number;
  /** Distance to the cat. */
  dist: number;
}

/** A composable AI piece referenced by id from EnemyDef.behaviours. */
export interface EnemyBehaviour<P = unknown> {
  readonly id: string;
  /** Replaces the default chase speed (before slows). */
  speed?(state: SimState, e: EnemyState, def: EnemyDef, params: P): number;
  /** Adjusts the move; "halt" ends this step's enemy pass at once. */
  steer?(
    state: SimState,
    e: EnemyState,
    move: EnemyMove,
    params: P,
    rng: Rng,
    ctx: SimContext,
  ): void | "halt";
}
export interface BehaviourRef {
  readonly id: string;
  readonly params?: unknown;
}

export interface EnemyDef {
  readonly id: EnemyKind;
  readonly stats: EnemyStats;
  /** Applied in order every step; every enemy chases unless a piece says otherwise. */
  readonly behaviours: readonly BehaviourRef[];
  /** The Boss: never rubbed out, leashed or elite; follows decoys only up close. */
  readonly boss?: boolean;
  /** May come as a crowned elite. */
  readonly eliteable: boolean;
  /** Keeps apart from other ink (crowd separation). Default true. */
  readonly crowd?: boolean;
  /** Moves straight through scenery, only kept inside the map. */
  readonly throughScenery?: boolean;
  /** How far a contact hit pushes the cat. */
  readonly contactPush: number;
  /** Caps how close a decoy must be to pull this kind. */
  readonly lureRange?: number;
  /** Overrides the cat's slow factor on this kind. */
  readonly slowMultiplier?: number;
  /** Drops an ink shard worth stats.xp on defeat. Default true. */
  readonly dropsShard?: boolean;
  /** When this kind arrives on its own schedule (the Boss), as a fraction of the night. */
  readonly arrival?: { readonly at: number; readonly spawnTime: number };
  /** Per-enemy setup right after spawning (no RNG). */
  onSpawn?(e: EnemyState, state: SimState): void;
  /** Runs on defeat, after the shard and elite chest. */
  readonly onDeath?: readonly ((state: SimState, e: EnemyState, ctx: SimContext) => void)[];
  /** Speed factor this kind's leftovers put on the cat (puddles); 1 = none. */
  catSlow?(state: SimState): number;
  /** Once per step after the enemy pass: this kind's projectiles and hazards. */
  stepWorld?(state: SimState, dt: number, ctx: SimContext): void;
}

// ---------------------------------------------------------------- paper world

/** What touches paper: weapons, pumpkins and ink apply one of these. */
export type Element = "fire" | "ink" | "wind" | "cut" | "fold";
export const ELEMENTS: readonly Element[] = ["fire", "ink", "wind", "cut", "fold"];

export interface MaterialDef {
  readonly id: string;
  /** Multiplies a prop's base durability. */
  readonly durability: number;
  /** 0 never burns; otherwise scales the fire's chance to spread onto it. */
  readonly flammability: number;
  /** Scales how much a cut or gust tears it. */
  readonly tearability: number;
}

/** The three looks every prop has. */
export type PropPhase = "intact" | "damaged" | "scraps";
export const PROP_PHASES: readonly PropPhase[] = ["intact", "damaged", "scraps"];

/** One generated prop in a chunk (pure world-gen data). */
export interface PropSpot {
  /** Stable id from the chunk and index, e.g. "3,4#2". */
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly s: number;
  readonly seed: number;
}

/** Where world-gen puts a prop. */
export interface PropSpawn {
  /** Generic decor of this kind becomes this prop (same spot, same hash). */
  readonly from?: string;
  /** Extra props scattered per generic chunk: chance of any, then a count range. */
  readonly chance?: number;
  readonly count?: readonly [number, number];
  /** Ground kept clear around it (other tall pieces, roads, landmarks). */
  readonly clear?: number;
  readonly scale?: readonly [number, number];
  /** Flat props may overlap tall pieces. */
  readonly flat?: boolean;
}

export interface PropDef {
  readonly id: string;
  readonly material: string;
  /** Ground footprint at s = 1 (width, depth); element hits and fire cells test it. */
  readonly size: { readonly w: number; readonly d: number };
  /** Solid ground contact while not scraps; scraps open the path. */
  colliders?(seed: number, x: number, y: number, s: number): Capsule[];
  /** Base durability, times the material's multiplier. */
  readonly durability: number;
  /** Below this fraction of durability the prop looks damaged. */
  readonly damagedBelow: number;
  /** Elements it reacts to (a reaction row must exist for its material). */
  readonly accepts: readonly Element[];
  /** Seeded drop chances when it turns to scraps by tearing (not by fire). */
  readonly drops: { readonly shard: number; readonly shardValue: number; readonly treat: number };
  readonly spawn: PropSpawn;
  /** Art id the renderer looks up. */
  readonly art: string;
}

/** A prop being touched by an element. */
export interface PropHit {
  readonly prop: PropSpot;
  readonly def: PropDef;
  readonly material: MaterialDef;
  readonly element: Element;
  readonly power: number;
}

/** One row of the reaction table: material x element -> effect. */
export interface ReactionDef {
  readonly id: string;
  readonly material: string;
  readonly element: Element;
  /** Changes prop durability, lights fire cells ... through the context. */
  effect(state: SimState, hit: PropHit, ctx: SimContext): void;
  /** The phase the prop ends in when this reaction uses it up. */
  readonly result: PropPhase;
  /** Impact kind left where it happened. */
  readonly fx: EffectKind;
}
