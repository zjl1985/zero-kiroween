/**
 * Pure terrain field for the isometric ground bake (plan step 2.2). For a
 * world point it answers which ground material shows there and how far the
 * point is from that material's edge, reading the simulation's own pure
 * functions (read-only): water status via waterAt, the shared water
 * polygons, the road network, and the district via biomeAt. Start-yard road
 * and garden plots come from the render-only yard layout. No DOM, no RNG.
 *
 * Priority mirrors the sim and the old chunk painter: bridge (dry crossing),
 * deep, shallow, road, garden soil, grass.
 */
import { CHUNK, biomeAt, roads, waterRegionsNear } from "../../game/world-gen.js";
import { waterAt } from "../../game/water.js";
import { nearestWaterEdge, inWaterPolygon } from "../../defs/water.js";
import type { WaterPolygon } from "../../defs/types.js";
import { CROP_PATCHES, YARD_EXTENSION_PLOTS, type GroundPoint } from "../homestead-layout.js";
import { openingRoadProfile } from "../road-art.js";

export type TerrainMaterial = "bridge" | "deep" | "shallow" | "road" | "soil" | "grass";

export interface TerrainSample {
  material: TerrainMaterial;
  /** World-unit distance to the nearest edge of this material, in [0, TERRAIN.edgeCap]. */
  edge: number;
  /** District biome id of the containing chunk. */
  biome: string;
}

export const TERRAIN = {
  /** Edge distances saturate here; transitions (3.3) only need the first few units. */
  edgeCap: 64,
  /** The opening yard road is sampled into capsules every `yardStep` world units of y. */
  yardStep: 4,
  yardTop: 222,
  yardBottom: 540,
} as const;

interface Capsule { ax: number; ay: number; dx: number; dy: number; len2: number; width: number }
interface Field { seed: number; capsules: readonly Capsule[]; plots: readonly (readonly GroundPoint[])[] }

function capsule(a: { x: number; y: number }, b: { x: number; y: number }, width: number): Capsule {
  const dx = b.x - a.x, dy = b.y - a.y;
  return { ax: a.x, ay: a.y, dx, dy, len2: dx * dx + dy * dy, width };
}
function yardCapsules(): Capsule[] {
  const out: Capsule[] = [];
  for (let y = TERRAIN.yardTop; y < TERRAIN.yardBottom; y += TERRAIN.yardStep) {
    const y1 = Math.min(TERRAIN.yardBottom, y + TERRAIN.yardStep),
      p0 = openingRoadProfile(y), p1 = openingRoadProfile(y1);
    out.push(capsule({ x: p0.center, y }, { x: p1.center, y: y1 }, Math.min(p0.width, p1.width)));
  }
  return out;
}
let memo: Field | undefined;
function field(seed: number): Field {
  if (memo?.seed === seed) return memo;
  const capsules: Capsule[] = [];
  for (const r of roads(seed))
    for (let i = 1; i < r.points.length; i++) capsules.push(capsule(r.points[i - 1]!, r.points[i]!, r.width));
  capsules.push(...yardCapsules());
  memo = { seed, capsules, plots: [...CROP_PATCHES.map((p) => p.outline), ...YARD_EXTENSION_PLOTS] };
  return memo;
}

/**
 * Signed road field: negative inside the union of road capsules. Inside it is
 * the depth in the deepest capsule (a 1-Lipschitz lower bound of the true
 * union distance, exact on a single road); outside it is the exact distance.
 */
function roadField(f: Field, x: number, y: number): number {
  let d = Infinity;
  for (const s of f.capsules) {
    const t = s.len2 <= 1e-8 ? 0 : Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / s.len2));
    d = Math.min(d, Math.hypot(x - s.ax - t * s.dx, y - s.ay - t * s.dy) - s.width);
  }
  return d;
}
/** Even-odd test plus distance to the outline: negative inside, positive outside. */
function plotField(points: readonly GroundPoint[], x: number, y: number): number {
  let inside = false, d = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j]!, b = points[i]!, dx = b[0] - a[0], dy = b[1] - a[1];
    if ((b[1] > y) !== (a[1] > y) && x < (a[0] - b[0]) * (y - b[1]) / (a[1] - b[1]) + b[0]) inside = !inside;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return inside ? -d : d;
}
const edgeOf = (polygon: WaterPolygon, p: { x: number; y: number }) => nearestWaterEdge(p, polygon).distance;

/** Material, edge distance and district at world point (x, y) for `seed`. */
export function materialAt(seed: number, x: number, y: number): TerrainSample {
  const f = field(seed), p = { x, y }, cap = TERRAIN.edgeCap,
    biome = biomeAt(seed, Math.floor(x / CHUNK.width), Math.floor(y / CHUNK.height)).id,
    status = waterAt(seed, x, y),
    regions = waterRegionsNear(seed, x, y, cap);
  // Distances to every water boundary family nearby (shore, core, crossings).
  let shore = Infinity, core = Infinity, crossing = Infinity, deck = 0;
  for (const r of regions) {
    shore = Math.min(shore, edgeOf(r.shore, p));
    if (r.core.length) core = Math.min(core, edgeOf(r.core, p));
    for (const c of r.crossings) {
      const e = edgeOf(c.polygon, p);
      crossing = Math.min(crossing, e);
      if (inWaterPolygon(p, c.polygon)) deck = Math.max(deck, e);
    }
  }
  const clamp = (v: number) => Math.max(0, Math.min(cap, v));
  if (status === "bridge") return { material: "bridge", edge: clamp(deck), biome };
  if (status === "deep") return { material: "deep", edge: clamp(Math.min(core, crossing)), biome };
  if (status === "shallow") return { material: "shallow", edge: clamp(Math.min(shore, core, crossing)), biome };
  const road = roadField(f, x, y);
  if (road < 0) return { material: "road", edge: clamp(Math.min(-road, crossing)), biome };
  let soil = Infinity;
  for (const plot of f.plots) soil = Math.min(soil, plotField(plot, x, y));
  if (soil < 0) return { material: "soil", edge: clamp(Math.min(-soil, road, crossing)), biome };
  return { material: "grass", edge: clamp(Math.min(road, soil, shore, crossing)), biome };
}
