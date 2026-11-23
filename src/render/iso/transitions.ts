/**
 * Material transitions for the isometric ground bake (plan step 3.3). Every
 * rule reads the terrain field's edge distance and the neighbouring material
 * across the nearest edge, so it stays a pure function of the world point
 * and the screen pixel: blocks still meet without seams.
 *
 * - Borders are 2 to 4 units wide; the width is smooth value noise from a
 *   render hash of the world point, so edges read irregular, never ruled.
 * - Grass hangs over road and garden-soil edges, with a 1 px dark lip
 *   (its shadow) on the lower side.
 * - Land next to water turns to damp soil, ending in a dark lip at the shore.
 * - Bridge heads show lit plank ends; bridge sides a dark deck lip; water
 *   under the deck edge is shadowed.
 * No RNG, no DOM.
 */
import { rampRgb, type RampName, type Rgb } from "./palette.js";
import { surfaceStep, texHash } from "./surface-texture.js";
import { bayer } from "../pixelfx/math.js";
import { ISO } from "./projection.js";
import type { TerrainMaterial, TerrainSample } from "./terrain-field.js";

export const TRANSITION = {
  /** Only points this close (world units) to an edge look for their neighbour. */
  band: 8,
  /** Probes land this far beyond the nearest edge. */
  probe: 1.5,
  /** Irregular border width range, in world units (about one screen pixel each). */
  minWidth: 2,
  maxWidth: 4,
  /** Value-noise lattice for the border width, in world units. */
  noiseCell: 6,
  /** Plank-end depth at bridge heads, in world units. */
  plankEnd: 4,
  /** Deck shadow cast on the water beside a bridge. */
  deckShadow: 3,
  /** One screen pixel of lip, in world units at the current projection (2 at k = 0.5). */
  lip: 1 / ISO.k,
  /** Dithered grass fringe past the overhang, in world units (about 1 to 2 px). */
  fringe: 3,
  salt: 4211,
} as const;

export type Sampler = (x: number, y: number) => TerrainSample;

/** Eight probe directions, in a fixed order (deterministic first hit). */
const DIRS: readonly (readonly [number, number])[] = Array.from({ length: 8 }, (_, k) =>
  [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)] as const);

/**
 * The material across the nearest edge of `s` at (x, y), or undefined when
 * the point is farther than TRANSITION.band from any edge (or no probe finds
 * another material). Probes sit on a circle just past the nearest edge: at
 * that radius the far side covers an arc wider than the 45 degree probe step.
 */
export function neighbourMaterial(sample: Sampler, x: number, y: number, s: TerrainSample): TerrainMaterial | undefined {
  if (s.edge >= TRANSITION.band) return undefined;
  const r = s.edge + TRANSITION.probe;
  for (const [dx, dy] of DIRS) {
    const m = sample(x + dx * r, y + dy * r).material;
    if (m !== s.material) return m;
  }
  return undefined;
}

/** Irregular border width at world point (x, y): smooth value noise in [minWidth, maxWidth]. */
export function borderWidth(seed: number, x: number, y: number): number {
  const c = TRANSITION.noiseCell, gx = Math.floor(x / c), gy = Math.floor(y / c),
    fx = x / c - gx, fy = y / c - gy, salt = TRANSITION.salt + seed,
    h = (i: number, j: number) => texHash(i, j, salt),
    sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy),
    top = h(gx, gy) + (h(gx + 1, gy) - h(gx, gy)) * sx,
    bottom = h(gx, gy + 1) + (h(gx + 1, gy + 1) - h(gx, gy + 1)) * sx,
    v = top + (bottom - top) * sy;
  return TRANSITION.minWidth + (TRANSITION.maxWidth - TRANSITION.minWidth) * v;
}

const isWater = (m: TerrainMaterial) => m === "shallow" || m === "deep";
const isLand = (m: TerrainMaterial) => m === "grass" || m === "road" || m === "soil";

/**
 * Transition colour of screen pixel (px, py) at world point (x, y) with
 * sample `s` and neighbour `n`, or undefined when the base surface shows.
 * `ownRamp` is the ramp of the surface that textures `s` (stone roads differ).
 */
export function transitionRgb(
  seed: number, px: number, py: number, x: number, y: number,
  s: TerrainSample, n: TerrainMaterial, ownRamp: RampName,
): Rgb | undefined {
  const e = s.edge, m = s.material;
  const L = TRANSITION.lip;
  if ((m === "road" || m === "soil") && n === "grass") {
    const w = borderWidth(seed, x, y), f = TRANSITION.fringe;
    if (e < w) return rampRgb("grass", surfaceStep(seed, "grass", px, py)); // grass overhang (no flowers on the edge)
    // A dithered fringe of grass pixels thinning into the road (4 x 4 Bayer).
    if (e < w + f && bayer(px, py) < 0.55 * (1 - (e - w) / f)) return rampRgb("grass", 1);
    if (e < w + f + L && bayer(px + 2, py) < 0.5) return rampRgb(ownRamp, 0); // its shadow: a broken dark lip
    return undefined;
  }
  if (isLand(m) && isWater(n)) {
    if (e < L) return rampRgb("soil", 0); // shore lip
    if (e < borderWidth(seed, x, y) + L) return rampRgb("soil", texHash(px >> 1, py, 61) < 0.25 ? 2 : 1); // damp soil
    if (e < borderWidth(seed, x, y) + 2 * L && bayer(px, py) < 0.5) return rampRgb("soil", 2); // dithered damp edge
    return undefined;
  }
  if (m === "bridge") {
    if (isWater(n)) return e < L ? rampRgb("wood", 1) : undefined; // deck side lip
    if (e < L) return rampRgb("wood", 0); // end-grain shadow line
    if (e < TRANSITION.plankEnd) return rampRgb("wood", texHash(px >> 1, py, 67) < 0.2 ? 3 : 4); // lit plank ends
    return undefined;
  }
  if (isWater(m) && n === "bridge") return e < TRANSITION.deckShadow ? rampRgb(ownRamp, 0) : undefined;
  if (m === "shallow" && n === "deep") {
    if (e < L) return rampRgb("deep", 2); // drop-off lip
    if (e < borderWidth(seed, x, y) + L) return rampRgb("shallow", 1);
    return undefined;
  }
  if (m === "grass" && n === "bridge") return e < L ? rampRgb("grass", 0) : undefined;
  return undefined;
}
