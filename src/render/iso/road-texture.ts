/**
 * Directional road textures for the isometric ground bake (plan step 3.4).
 * A road pixel's pattern runs along one of the two screen diagonals of the
 * 2:1 lattice: world +x (screen (2, 1)) or world +y (screen (-2, 1)),
 * whichever is closer to the road tangent from the terrain field. Dirt roads
 * get two cart ruts that follow the edge distance and short dashes along the
 * diagonal; paved branches get running-bond stone courses along the road.
 * Pure functions of the screen pixel and the field sample. No RNG.
 */
import { rampRgb, type Rgb } from "./palette.js";
import { SURFACE_RAMP, surfaceStep, texHash, type Surface } from "./surface-texture.js";
import type { TerrainSample } from "./terrain-field.js";

export const ROAD_TEXTURE = {
  /** Cart ruts sit this far inside each road edge (world units) ... */
  rutFrom: 9,
  /** ... are this wide, then catch a 1-unit lit lip. */
  rutWidth: 2.5,
  /** Dirt dash rows repeat every `dashPeriod` across-pixels, dashes are `dashLength` along. */
  dashPeriod: 10,
  dashLength: 8,
  /** Stone courses are `course` across-pixels deep; stones `stone` along-pixels long. */
  course: 16,
  stone: 32,
} as const;

export type RoadAxis = "x" | "y";

/** The lattice diagonal closest to a world tangent: world x runs screen (2, 1), world y screen (-2, 1). */
export function roadAxis(tangent: readonly [number, number] | undefined): RoadAxis {
  if (!tangent) return "x";
  return Math.abs(tangent[0]) >= Math.abs(tangent[1]) ? "x" : "y";
}
/** Surface of a road sample: paved branches are stone, everything else a dirt track. */
export function roadSurface(s: TerrainSample): Surface {
  return s.paved ? "stone" : "dirt";
}
/**
 * Lattice coordinates of screen pixel (px, py) for `axis`: `across` is
 * constant along the road diagonal, `along` grows along it.
 */
export function roadCoords(axis: RoadAxis, px: number, py: number): { across: number; along: number } {
  return axis === "x" ? { across: 2 * py - px, along: px + 2 * py } : { across: 2 * py + px, along: 2 * py - px };
}
const mod = (v: number, n: number) => ((v % n) + n) % n;

/** Ramp step of a road pixel on `surface` (dirt or stone). */
export function roadStep(seed: number, surface: Surface, axis: RoadAxis, px: number, py: number, edge: number): number {
  const { across, along } = roadCoords(axis, px, py), R = ROAD_TEXTURE;
  if (surface === "stone") {
    const course = Math.floor(across / R.course), a = across - course * R.course,
      shifted = along + course * (R.stone / 2), stone = Math.floor(shifted / R.stone);
    if (a === 0 || mod(shifted, R.stone) < 2) return 1; // course line / butt joint
    if (a === 1) return 4; // lit bevel under the joint
    const tone = texHash(course, stone, 73) < 0.45 ? 2 : 3;
    return texHash(px >> 1, py, 79) < 0.06 ? tone - 1 : tone;
  }
  // Dirt: two ruts that follow the road edges, then dashes along the diagonal.
  if (edge >= R.rutFrom && edge < R.rutFrom + R.rutWidth) return 1;
  if (edge >= R.rutFrom + R.rutWidth && edge < R.rutFrom + R.rutWidth + 1) return 3;
  const row = mod(across, R.dashPeriod);
  if (row <= 1 && texHash(Math.floor(along / R.dashLength), Math.floor(across / R.dashPeriod), 71 + seed) < 0.4)
    return row === 0 ? 1 : 3;
  return surfaceStep(seed, "dirt", px, py);
}

/** Road pixel colour for the bake. */
export function roadRgb(seed: number, px: number, py: number, s: TerrainSample): Rgb {
  const surface = roadSurface(s);
  return rampRgb(SURFACE_RAMP[surface], roadStep(seed, surface, roadAxis(s.tangent), px, py, s.edge));
}
