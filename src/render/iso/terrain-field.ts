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
  /** Roads only: unit world direction of the deepest road capsule (road texture orientation). */
  tangent?: readonly [number, number];
  /** Roads only: true on a paved branch (see TERRAIN.pavedBiomes). */
  paved?: boolean;
}

export const TERRAIN = {
  /** Edge distances saturate here; transitions (3.3) only need the first few units. */
  edgeCap: 64,
  /** The opening yard road is sampled into capsules every `yardStep` world units of y. */
  yardStep: 4,
  yardTop: 222,
  yardBottom: 540,
  /** A landmark branch road whose landmark lies in one of these districts is paved with stone. */
  pavedBiomes: ["old-town"] as readonly string[],
} as const;

interface Capsule { ax: number; ay: number; dx: number; dy: number; len2: number; width: number; paved: boolean }
interface Field { seed: number; capsules: readonly Capsule[]; plots: readonly (readonly GroundPoint[])[] }

function capsule(a: { x: number; y: number }, b: { x: number; y: number }, width: number, paved = false): Capsule {
  const dx = b.x - a.x, dy = b.y - a.y;
  return { ax: a.x, ay: a.y, dx, dy, len2: dx * dx + dy * dy, width, paved };
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
  for (const [k, r] of roads(seed).entries()) {
    // The spine (road 0) stays a dirt track; branches into a paved district are stone.
    const end = r.points[r.points.length - 1]!,
      paved = k > 0 && TERRAIN.pavedBiomes.includes(biomeAt(seed, Math.floor(end.x / CHUNK.width), Math.floor(end.y / CHUNK.height)).id);
    for (let i = 1; i < r.points.length; i++) capsules.push(capsule(r.points[i - 1]!, r.points[i]!, r.width, paved));
  }
  capsules.push(...yardCapsules());
  memo = { seed, capsules, plots: [...CROP_PATCHES.map((p) => p.outline), ...YARD_EXTENSION_PLOTS] };
  return memo;
}

/**
 * Signed road field: negative inside the union of road capsules. Inside it is
 * the depth in the deepest capsule (a 1-Lipschitz lower bound of the true
 * union distance, exact on a single road); outside it is the exact distance.
 */
function roadField(f: Field, x: number, y: number): { d: number; best: Capsule | undefined } {
  let d = Infinity, best: Capsule | undefined;
  for (const s of f.capsules) {
    const t = s.len2 <= 1e-8 ? 0 : Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / s.len2)),
      v = Math.hypot(x - s.ax - t * s.dx, y - s.ay - t * s.dy) - s.width;
    if (v < d) { d = v; best = s; }
  }
  return { d, best };
}
/** Unit direction of a capsule; a degenerate capsule reads as world +x. */
function tangentOf(s: Capsule | undefined): readonly [number, number] {
  if (!s || s.len2 <= 1e-8) return [1, 0];
  const len = Math.sqrt(s.len2);
  return [s.dx / len, s.dy / len];
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
  const { d: road, best } = roadField(f, x, y);
  if (road < 0) return { material: "road", edge: clamp(Math.min(-road, crossing)), biome, tangent: tangentOf(best), paved: !!best?.paved };
  let soil = Infinity;
  for (const plot of f.plots) soil = Math.min(soil, plotField(plot, x, y));
  if (soil < 0) return { material: "soil", edge: clamp(Math.min(-soil, road, crossing)), biome };
  return { material: "grass", edge: clamp(Math.min(road, soil, shore, crossing)), biome };
}

/** A world-space box (inclusive), e.g. the AABB of one bake block. */
export interface FieldBox { x0: number; y0: number; x1: number; y1: number }

/** Same arithmetic as nearestWaterEdge(...).distance, without allocating a result per edge. */
function edgeDistance(x: number, y: number, polygon: WaterPolygon): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, dx = b.x - a.x, dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (len < 1e-8) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (len * len))),
      distance = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
    if (distance < best) best = distance;
  }
  return best;
}
function plotBounds(points: readonly GroundPoint[]): FieldBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}
const overlaps = (a: FieldBox, b: FieldBox, pad: number) =>
  a.x1 + pad >= b.x0 && a.x0 - pad <= b.x1 && a.y1 + pad >= b.y0 && a.y0 - pad <= b.y1;

/**
 * materialAt for many points inside `box`, with the road capsules, garden
 * plots and water regions filtered once to those that can reach the box
 * (within TERRAIN.edgeCap). Anything filtered out is farther than the cap,
 * so the clamped results equal materialAt's (tested on samples). Water
 * regions are still matched per point with the sim's own bounds rule
 * (waterRegionsNear's 24-unit bucket margin around a +-edgeCap box).
 */
export function prepareTerrainField(seed: number, box: FieldBox): (x: number, y: number) => TerrainSample {
  const f = field(seed), cap = TERRAIN.edgeCap,
    capsules = f.capsules.filter((s) => overlaps({
      x0: Math.min(s.ax, s.ax + s.dx), y0: Math.min(s.ay, s.ay + s.dy),
      x1: Math.max(s.ax, s.ax + s.dx), y1: Math.max(s.ay, s.ay + s.dy),
    }, box, s.width + cap)),
    plots = f.plots.filter((p) => overlaps(plotBounds(p), box, cap)),
    cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2,
    regions = waterRegionsNear(seed, cx, cy, Math.max(box.x1 - cx, box.y1 - cy) + cap),
    biomes = new Map<number, string>(), clamp = (v: number) => Math.max(0, Math.min(cap, v));
  // Per point, a capsule or plot whose box grown by the cap misses the point is farther than the cap: skip it.
  const capsuleBoxes = capsules.map((s) => ({
      x0: Math.min(s.ax, s.ax + s.dx) - s.width - cap, y0: Math.min(s.ay, s.ay + s.dy) - s.width - cap,
      x1: Math.max(s.ax, s.ax + s.dx) + s.width + cap, y1: Math.max(s.ay, s.ay + s.dy) + s.width + cap,
    })),
    plotBoxes = plots.map((p) => { const b = plotBounds(p); return { x0: b.x0 - cap, y0: b.y0 - cap, x1: b.x1 + cap, y1: b.y1 + cap }; });
  let nearest: Capsule | undefined;
  const roadNear = (x: number, y: number) => {
    let d = Infinity;
    nearest = undefined;
    for (let i = 0; i < capsules.length; i++) {
      const b = capsuleBoxes[i]!;
      if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
      const s = capsules[i]!,
        t = s.len2 <= 1e-8 ? 0 : Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / s.len2));
      const v = Math.hypot(x - s.ax - t * s.dx, y - s.ay - t * s.dy) - s.width;
      if (v < d) { d = v; nearest = s; }
    }
    return d;
  };
  const biomeOf = (x: number, y: number) => {
    const bx = Math.floor(x / CHUNK.width), by = Math.floor(y / CHUNK.height), key = bx * 4096 + by;
    let id = biomes.get(key);
    if (id === undefined) { id = biomeAt(seed, bx, by).id; biomes.set(key, id); }
    return id;
  };
  return (x, y) => {
    const p = { x, y }, biome = biomeOf(x, y);
    let shore = Infinity, core = Infinity, crossing = Infinity, deck = 0,
      onCrossing = false, inCore = false, inShore = false;
    for (const r of regions) {
      const b = r.bounds;
      // waterRegionsNear(seed, x, y, cap): touchesWaterBounds against the +-cap box.
      if (!(x + cap >= b.minX - 24 && x - cap <= b.maxX + 24 && y + cap >= b.minY - 24 && y - cap <= b.maxY + 24)) continue;
      shore = Math.min(shore, edgeDistance(x, y, r.shore));
      if (r.core.length) {
        core = Math.min(core, edgeDistance(x, y, r.core));
        if (!inCore && inWaterPolygon(p, r.core)) inCore = true;
      }
      if (!inShore && inWaterPolygon(p, r.shore)) inShore = true;
      for (const c of r.crossings) {
        const e = edgeDistance(x, y, c.polygon);
        crossing = Math.min(crossing, e);
        if (inWaterPolygon(p, c.polygon)) { onCrossing = true; deck = Math.max(deck, e); }
      }
    }
    if (onCrossing) return { material: "bridge", edge: clamp(deck), biome };
    if (inCore) return { material: "deep", edge: clamp(Math.min(core, crossing)), biome };
    if (inShore) return { material: "shallow", edge: clamp(Math.min(shore, core, crossing)), biome };
    const road = roadNear(x, y);
    if (road < 0) return { material: "road", edge: clamp(Math.min(-road, crossing)), biome, tangent: tangentOf(nearest), paved: !!nearest?.paved };
    let soil = Infinity;
    for (let i = 0; i < plots.length; i++) {
      const b = plotBoxes[i]!;
      if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
      soil = Math.min(soil, plotField(plots[i]!, x, y));
    }
    if (soil < 0) return { material: "soil", edge: clamp(Math.min(-soil, road, crossing)), biome };
    return { material: "grass", edge: clamp(Math.min(road, soil, shore, crossing)), biome };
  };
}
