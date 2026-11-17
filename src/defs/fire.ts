/**
 * Fire and prop-hit numbers. Fire lives on a grid of square cells; only
 * cells under an intact or damaged flammable prop can burn. Spread rolls come
 * from hash2(seed, cell, tick), never the step RNG, so fire does not shift
 * enemy spawns or card rolls.
 */
export const FIRE = {
  /** Cell size in world units. */
  cell: 24,
  /** Hard cap on cells burning at once. */
  maxCells: 40,
  /** Seconds one cell burns before it turns to ash. */
  burnTime: 2.4,
  /** Fire updates (spread, damage) run on this beat. */
  tick: 0.2,
  /** Chance per tick that a burning cell lights one flammable neighbour (times flammability). */
  spreadChance: 0.35,
  /** Carried fire lasts this long after the last dry flame contact. */
  actorBurnTime: 3,
  /** A cat gets a full beat to seek water before its first burn hit. */
  playerInterval: 1,
  playerDamage: 1,
  enemyInterval: 0.2,
  enemyDamage: 0.4,
  /** Damp paper cannot reignite immediately after leaving water. */
  wetTime: 1.25,
  /** Carried flames reach just beyond the actor, on the fire tick only. */
  carryReach: 4,
  /** Durability lost by each burning prop once per tick, regardless of footprint. */
  propBurn: 0.5,
  /** Ash cells remembered (oldest are forgotten first). */
  maxAsh: 500,
  /** Lit pumpkins set flammable cells this close alight on every pulse. */
  pumpkinRadius: 64,
} as const;

export const PROP_HITS = {
  /** Seconds a prop ignores further element hits after one lands. */
  hitInterval: 0.18,
  /** How far a prop's shard burst (drops.burst) spills, at s = 1. */
  burstRadius: 26,
} as const;
