import type { DecorMix } from "../types.js";

/**
 * How the bounded town splits into districts. A jittered grid of `cols` x
 * `rows` district sites sits on chunk centres (one site per grid cell); every
 * chunk belongs to its nearest site, and a seeded shuffle gives every biome at
 * least one site. The start yard's chunks belong to `start`.
 */
export const DISTRICTS = {
  cols: 4,
  rows: 3,
  start: "old-town",
  /** Most props one generic chunk may hold (migrated fences and bushes count). */
  propCap: 14,
  /** Width of the band beside a road where roadside props stand. */
  roadsideBand: 36,
} as const;

/** The base decor mix of a generic chunk; each biome overrides some of it. */
export const BASE_DECOR: DecorMix = {
  cottageChance: 0.22,
  trees: [1, 3],
  bushes: [2, 4],
  stones: [1, 3],
  lampChance: 0.45,
  fenceChance: 0.3,
  candlesChance: 0.12,
  pumpkinChance: 0.18,
  flowers: [2, 4],
  tufts: [4, 7],
  leaves: [2, 4],
};
