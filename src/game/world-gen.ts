/**
 * The bounded night town, generated from the run seed. Pure data and pure
 * functions: no DOM and no sim RNG, so the sim and the renderer can both ask
 * for the same chunk and get the same answer.
 *
 * Layout choice: the world is 10 x 10 screens (9600 x 5400). The start yard
 * (the original 960 x 540 diorama, kept at its original coordinates 0..960 x
 * 0..540) sits in the middle of the north edge. North of the yard the paper
 * hills and the sky form the map's top boundary; the west, east and south
 * edges are a paper hedge. Everything else is explored southward and sideways.
 */
import { SOLID_SCENERY, type Capsule } from "./scenery.js";
import { MOON_LANTERN, PUMPKIN_SPOTS } from "./interactions.js";
import "../defs/world-index.js";
import { BIOME_DEFS, LANDMARK_DEFS, PROP_DEFS } from "../defs/registries.js";
import type { BiomeDef, DecorMix, LandmarkBuilder, LandmarkPlace, PropSpot, WaterCrossing, WaterRegion, WaterShape } from "../defs/types.js";
import { WATER, prepareWater, touchesWaterShore, waterBounds, waterOval } from "../defs/water.js";
import { BASE_DECOR, DISTRICTS } from "../defs/biomes/districts.js";
import { RIVER } from "../defs/landmarks/stone-bridge/def.js";

/** One screen in world units; matches the 960 x 540 view without importing render code. */
export const SCREEN = { width: 960, height: 540 } as const;
export const WORLD = {
  screensX: 10,
  screensY: 10,
  width: 10 * SCREEN.width,
  height: 10 * SCREEN.height,
  minX: -4.5 * SCREEN.width,
  maxX: 5.5 * SCREEN.width,
  minY: 0,
  maxY: 10 * SCREEN.height,
  /** Actors stay below the horizon band (the start yard's YARD_TOP). */
  playTop: 264,
  /** Width of the hedge on the west, east and south edges. */
  edge: 36,
} as const;
/** Chunks tile the world exactly: 20 columns x 10 rows. */
export const CHUNK = {
  width: 480,
  height: 540,
  minCx: WORLD.minX / 480,
  maxCx: WORLD.maxX / 480 - 1,
  minCy: 0,
  maxCy: WORLD.maxY / 540 - 1,
} as const;
export const CHUNK_COLS = CHUNK.maxCx - CHUNK.minCx + 1;
/** The two chunks holding the start yard. */
export const START_CHUNKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
];
/** Where the yard road leaves the start yard (pathCenter(540) in scene.ts). */
export const START_ROAD_EXIT = { x: 525.5, y: 540, width: 27 } as const;
/** The sim keeps interactables for chunks this close to the cat (rect distance). */
export const ACTIVE = { load: 1100, drop: 1500 } as const;
/**
 * Enemies arrive on a ring just outside the camera view: half a screen plus
 * a margin that covers the camera deadzone (src/render/camera.ts) and the
 * enemy's size. Non-Boss enemies left farther than `leash` are moved back.
 */
export const SPAWN_RING = { marginX: 90, marginY: 80, tries: 6, leash: 1500 } as const;

/** Registered landmark kinds (src/defs/landmarks), in hand-out order. */
export const LANDMARK_KINDS: readonly string[] = LANDMARK_DEFS.ids();
export type LandmarkKind = string;
export const LANDMARK = {
  /** One landmark per super-cell (5 x 5 cells of 1920 x 1080), except the start cell. */
  cols: 5,
  rows: 5,
  /** Distance kept from a cell's sides, so landmarks are at least 2 x margin apart. */
  margin: 360,
  /** Coming this close marks a landmark as found. */
  discoverRadius: 300,
  /** Kept between a landmark's edge and the road spine (which wobbles by up to 110). */
  spineClear: 300,
  /** Footprint radius per kind, from the landmark defs. */
  radius: Object.fromEntries(LANDMARK_DEFS.all().map((d) => [d.id, d.radius])) as Readonly<Record<string, number>>,
  /** The stone bridge's river band (src/defs/landmarks/stone-bridge/def.ts). */
  river: RIVER,
} as const;

export interface Landmark extends LandmarkPlace {
  /** Half length of a band through it (stone-bridge river), clipped to the map. */
  span?: number;
}
/**
 * Generic decor kinds (tree, cottage, bush, fence, stone, lamp, candles,
 * pumpkin, flowers, tuft, leaves) plus the pieces landmark art registers
 * (clock-tower, chapel, tomb, stall, lights, ...).
 */
export type DecorKind = string;
/** Flat decor is baked into the chunk ground cache; tall decor is y-sorted. */
export const FLAT_DECOR: ReadonlySet<DecorKind> = new Set<DecorKind>([
  "flowers",
  "tuft",
  "leaves",
]);
export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  s: number;
  seed: number;
}
export interface InteractSpot {
  kind: "pumpkin" | "lantern";
  x: number;
  y: number;
  s: number;
}
export interface Road {
  points: readonly { x: number; y: number }[];
  width: number;
}
export interface ChunkContent {
  key: string;
  cx: number;
  cy: number;
  /** Top-left corner and size in world units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The start yard; its art comes from the legacy yard data. */
  start: boolean;
  /** Generic decor plus the parts of a landmark centred in this chunk. */
  decor: Decor[];
  /** Static colliders only; props bring their own (PropDef.colliders) while not scraps. */
  colliders: Capsule[];
  landmark: Landmark | null;
  spots: InteractSpot[];
  /** Tearable / burnable props (src/defs/props), ids "cx,cy#i". */
  props: PropSpot[];
  /** District biome id (src/defs/biomes). */
  biome: string;
}

/** Clear ground kept around a road's edge. */
const ROAD_CLEAR = 34;

// ---------------------------------------------------------------- hashing
function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
/** Pure hash of (seed, cx, cy, salt) to [0, 1). */
export function hash2(seed: number, cx: number, cy: number, salt: number): number {
  let h = fmix((seed | 0) ^ 0x9e3779b9);
  h = fmix(h ^ Math.imul(cx | 0, 0x27d4eb2f));
  h = fmix(h ^ Math.imul(cy | 0, 0x165667b1));
  h = fmix(h ^ Math.imul(salt | 0, 0x61c88647));
  return h / 4294967296;
}

// ---------------------------------------------------------------- geometry
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax,
    dy = by - ay,
    d = dx * dx + dy * dy,
    t = d <= 1e-8 ? 0 : clampN(((px - ax) * dx + (py - ay) * dy) / d, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}
export function chunkOf(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: clampN(Math.floor(x / CHUNK.width), CHUNK.minCx, CHUNK.maxCx),
    cy: clampN(Math.floor(y / CHUNK.height), CHUNK.minCy, CHUNK.maxCy),
  };
}
export function inChunkRange(cx: number, cy: number): boolean {
  return cx >= CHUNK.minCx && cx <= CHUNK.maxCx && cy >= CHUNK.minCy && cy <= CHUNK.maxCy;
}
/** Stable 0-based chunk index, used for interactable ids. */
export function chunkIndex(cx: number, cy: number): number {
  return (cy - CHUNK.minCy) * CHUNK_COLS + (cx - CHUNK.minCx);
}
export function isStartChunk(cx: number, cy: number): boolean {
  return START_CHUNKS.some(([x, y]) => x === cx && y === cy);
}
/** Distance from a point to a chunk's rectangle (0 inside). */
export function chunkDistance(cx: number, cy: number, x: number, y: number): number {
  const x0 = cx * CHUNK.width,
    y0 = cy * CHUNK.height,
    dx = Math.max(x0 - x, 0, x - (x0 + CHUNK.width)),
    dy = Math.max(y0 - y, 0, y - (y0 + CHUNK.height));
  return Math.hypot(dx, dy);
}
/** Chunk coords whose rectangles lie within `radius` of (x, y), row-major. */
export function chunksNear(x: number, y: number, radius: number): { cx: number; cy: number }[] {
  const out: { cx: number; cy: number }[] = [];
  const c0 = chunkOf(x - radius, y - radius),
    c1 = chunkOf(x + radius, y + radius);
  for (let cy = c0.cy; cy <= c1.cy; cy++)
    for (let cx = c0.cx; cx <= c1.cx; cx++)
      if (chunkDistance(cx, cy, x, y) <= radius) out.push({ cx, cy });
  return out;
}
/** Keeps an actor of `radius` inside the playable world. */
export function clampToWorld(x: number, y: number, radius: number): { x: number; y: number } {
  return {
    x: clampN(x, WORLD.minX + WORLD.edge + radius, WORLD.maxX - WORLD.edge - radius),
    y: clampN(y, WORLD.minY + WORLD.playTop + radius, WORLD.maxY - WORLD.edge - radius),
  };
}
export function insideWorld(x: number, y: number, radius = 0): boolean {
  const c = clampToWorld(x, y, radius);
  return c.x === x && c.y === y;
}
/** Centre of a full screen around (x, y) that never shows outside the world. */
export function viewCentre(x: number, y: number): { x: number; y: number } {
  return {
    x: clampN(x, WORLD.minX + SCREEN.width / 2, WORLD.maxX - SCREEN.width / 2),
    y: clampN(y, WORLD.minY + SCREEN.height / 2, WORLD.maxY - SCREEN.height / 2),
  };
}

// ---------------------------------------------------------------- caches
// Pure memoisation: the same seed always rebuilds the same values.
const landmarkMemo = new Map<number, Landmark[]>();
const roadMemo = new Map<number, Road[]>();
const chunkMemo = new Map<string, ChunkContent>();
const colliderMemo = new Map<string, Capsule[]>();
const staticMemo = new Map<string, Capsule[]>();
const propMemo = new Map<string, PropSpot[]>();
const siteMemo = new Map<number, DistrictSite[]>();
const waterMemo = new Map<number, Map<string, readonly WaterRegion[]>>();
function remember<K, V>(map: Map<K, V>, key: K, make: () => V, cap = 900): V {
  let v = map.get(key);
  if (v === undefined) {
    if (map.size >= cap) map.clear();
    v = make();
    map.set(key, v);
  }
  return v;
}
/** Drops the memo tables; results are pure, so this only costs time. For tests. */
export function clearWorldCache(): void {
  landmarkMemo.clear();
  roadMemo.clear();
  chunkMemo.clear();
  colliderMemo.clear();
  staticMemo.clear();
  propMemo.clear();
  siteMemo.clear();
  waterMemo.clear();
}

// ---------------------------------------------------------------- districts
export interface DistrictSite {
  /** Chunk the site sits on (its centre). */
  cx: number;
  cy: number;
  biome: string;
}
/** District sites of a seed: one per DISTRICTS grid cell, each biome at least once. */
export function districtSites(seed: number): readonly DistrictSite[] {
  return remember(siteMemo, seed, () => {
    const cols = DISTRICTS.cols,
      rows = DISTRICTS.rows,
      biomes = BIOME_DEFS.ids(),
      sites: { cx: number; cy: number; order: number; col: number; row: number }[] = [];
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        // Each grid cell owns a disjoint block of chunks; the site is one of them.
        const c0 = CHUNK.minCx + Math.floor((col * CHUNK_COLS) / cols),
          c1 = CHUNK.minCx + Math.floor(((col + 1) * CHUNK_COLS) / cols),
          r0 = Math.floor((row * (CHUNK.maxCy + 1)) / rows),
          r1 = Math.floor(((row + 1) * (CHUNK.maxCy + 1)) / rows),
          cx = c0 + Math.floor(hash2(seed, col, row, 41) * (c1 - c0));
        let cy = r0 + Math.floor(hash2(seed, col, row, 42) * (r1 - r0));
        if (isStartChunk(cx, cy)) cy = Math.min(r1 - 1, cy + 1);
        sites.push({ cx, cy, order: hash2(seed, col, row, 43), col, row });
      }
    const ordered = [...sites].sort((a, b) => a.order - b.order);
    return ordered.map((site, i) => ({
      cx: site.cx,
      cy: site.cy,
      biome:
        i < biomes.length ? biomes[i]! : biomes[Math.floor(hash2(seed, site.col, site.row, 44) * biomes.length)]!,
    }));
  });
}
/** The district biome of chunk (cx, cy): its nearest site; the start yard is DISTRICTS.start. */
export function biomeAt(seed: number, cx: number, cy: number): BiomeDef {
  if (isStartChunk(cx, cy) || !inChunkRange(cx, cy)) return BIOME_DEFS.get(DISTRICTS.start);
  let best = "",
    bestD = Infinity;
  for (const s of districtSites(seed)) {
    // Chunks are taller than wide; distances are measured in world units.
    const d = Math.hypot((s.cx - cx) * CHUNK.width, (s.cy - cy) * CHUNK.height);
    if (d < bestD) {
      bestD = d;
      best = s.biome;
    }
  }
  return BIOME_DEFS.get(best);
}

// ---------------------------------------------------------------- landmarks
/** All landmarks of a seed: one per super-cell, every kind at least once. */
export function landmarks(seed: number): readonly Landmark[] {
  return remember(landmarkMemo, seed, () => {
    const cellW = WORLD.width / LANDMARK.cols,
      cellH = WORLD.height / LANDMARK.rows,
      startCol = Math.floor((SCREEN.width / 2 - WORLD.minX) / cellW),
      cells: { col: number; row: number; order: number }[] = [];
    for (let row = 0; row < LANDMARK.rows; row++)
      for (let col = 0; col < LANDMARK.cols; col++)
        if (!(row === 0 && col === startCol))
          cells.push({ col, row, order: hash2(seed, col, row, 11) });
    // A seeded shuffle hands out one of each kind first.
    const ordered = [...cells].sort((a, b) => a.order - b.order);
    const kindOf = new Map<string, LandmarkKind>();
    ordered.forEach((c, i) => {
      const k =
        i < LANDMARK_KINDS.length
          ? LANDMARK_KINDS[i]!
          : LANDMARK_KINDS[Math.floor(hash2(seed, c.col, c.row, 12) * LANDMARK_KINDS.length)]!;
      kindOf.set(`${c.col},${c.row}`, k);
    });
    return cells.map(({ col, row }) => {
      const kind = kindOf.get(`${col},${row}`)!,
        m = LANDMARK.margin,
        x0 = WORLD.minX + col * cellW,
        y0 = WORLD.minY + row * cellH,
        def = LANDMARK_DEFS.get(kind),
        radius = def.radius,
        y = Math.max(
          WORLD.playTop + radius + 80,
          Math.round(y0 + m + hash2(seed, col, row, 14) * (cellH - 2 * m)),
        );
      let x = Math.round(x0 + m + hash2(seed, col, row, 13) * (cellW - 2 * m));
      // The road spine south of the yard stays open: landmarks step aside.
      const off = x - START_ROAD_EXIT.x,
        clear = radius + LANDMARK.spineClear;
      if (Math.abs(off) < clear) x = Math.round(START_ROAD_EXIT.x + (off < 0 ? -clear : clear));
      const l: Landmark = {
        id: `lm-${col}-${row}`,
        kind,
        x,
        y,
        radius,
        seed: Math.floor(hash2(seed, col, row, 15) * 1e6),
      };
      if (def.span)
        l.span = def.span(l, {
          west: WORLD.minX + WORLD.edge + 20,
          east: WORLD.maxX - WORLD.edge - 20,
          spineX: START_ROAD_EXIT.x,
          spineClear: LANDMARK.spineClear,
        });
      return l;
    });
  });
}
/** The road network: a spine south from the yard and a branch to every landmark. */
export function roads(seed: number): readonly Road[] {
  return remember(roadMemo, seed, () => {
    const spine: { x: number; y: number }[] = [{ x: START_ROAD_EXIT.x, y: START_ROAD_EXIT.y }];
    for (let y = START_ROAD_EXIT.y + 540; y < WORLD.maxY - 200; y += 540)
      spine.push({ x: START_ROAD_EXIT.x + (hash2(seed, 0, y, 21) - 0.5) * 220, y });
    spine.push({ x: spine[spine.length - 1]!.x, y: WORLD.maxY - WORLD.edge - 40 });
    const spineX = (y: number) => {
      for (let i = 0; i < spine.length - 1; i++) {
        const a = spine[i]!,
          b = spine[i + 1]!;
        if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
      }
      return spine[spine.length - 1]!.x;
    };
    const out: Road[] = [{ points: spine, width: START_ROAD_EXIT.width }];
    for (const l of landmarks(seed)) {
      const sy = clampN(l.y, START_ROAD_EXIT.y + 60, WORLD.maxY - 300),
        start = { x: spineX(sy), y: sy },
        dir = Math.sign(l.x - start.x) || 1,
        end = { x: l.x - dir * l.radius * 0.55, y: l.y + l.radius * 0.35 },
        bend = (hash2(seed, l.x, l.y, 22) - 0.5) * 160;
      out.push({
        points: [
          start,
          { x: start.x + (end.x - start.x) * 0.35, y: start.y + (end.y - start.y) * 0.2 + bend },
          { x: start.x + (end.x - start.x) * 0.72, y: start.y + (end.y - start.y) * 0.75 - bend * 0.5 },
          end,
        ],
        width: 20,
      });
    }
    return out;
  });
}
function nearRoad(seed: number, x: number, y: number, clear: number): boolean {
  for (const r of roads(seed)) {
    const pts = r.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!,
        b = pts[i + 1]!;
      if (segDist(x, y, a.x, a.y, b.x, b.y) < r.width + clear) return true;
    }
  }
  return false;
}
/** Points along the roads inside one chunk, with the road normal, every 40 units. */
function roadSlots(seed: number, x0: number, y0: number): { x: number; y: number; nx: number; ny: number; width: number }[] {
  const out: { x: number; y: number; nx: number; ny: number; width: number }[] = [];
  for (const r of roads(seed))
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = r.points[i]!,
        b = r.points[i + 1]!,
        len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      for (let k = 20; k < len; k += 40) {
        const x = a.x + ((b.x - a.x) * k) / len,
          y = a.y + ((b.y - a.y) * k) / len;
        if (x >= x0 && x < x0 + CHUNK.width && y >= y0 && y < y0 + CHUNK.height)
          out.push({ x, y, nx: -(b.y - a.y) / len, ny: (b.x - a.x) / len, width: r.width });
      }
    }
  return out;
}
function inLandmark(seed: number, x: number, y: number, pad: number): boolean {
  for (const l of landmarks(seed)) {
    if (Math.hypot(x - l.x, y - l.y) < l.radius + pad) return true;
    if (LANDMARK_DEFS.get(l.kind).keepOut?.(l, x, y, pad)) return true;
  }
  return false;
}
// Water generation never calls chunkContent: decor may consult it without a cycle.
function roadCrossings(shape: WaterShape, rs: readonly Road[]): WaterCrossing[] {
  const bounds = waterBounds(shape.shore), out: WaterCrossing[] = [...shape.crossings];
  for (let ri = 0; ri < rs.length; ri++) {
    const road = rs[ri]!, w = road.width;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i]!, b = road.points[i + 1]!, dx = b.x - a.x, dy = b.y - a.y,
        len = Math.hypot(dx, dy);
      if (len < 1e-8) continue;
      // Clip a strip to the shore's padded bounds, not to an invisible road exception.
      let lo = -w / len, hi = 1 + w / len;
      for (const [p, d, min, max] of [[a.x, dx, bounds.minX - w - 8, bounds.maxX + w + 8],
        [a.y, dy, bounds.minY - w - 8, bounds.maxY + w + 8]]) {
        if (Math.abs(d) < 1e-8) { if (p < min || p > max) hi = -Infinity; }
        else {
          const t0 = (min - p) / d, t1 = (max - p) / d;
          lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
        }
      }
      if (lo >= hi) continue;
      const ax = a.x + dx * lo, ay = a.y + dy * lo, bx = a.x + dx * hi, by = a.y + dy * hi,
        nx = -dy / len * w, ny = dx / len * w;
      out.push({ id: `${shape.id}:road-${ri}-${i}`, polygon: [
        { x: ax - nx, y: ay - ny }, { x: bx - nx, y: by - ny },
        { x: bx + nx, y: by + ny }, { x: ax + nx, y: ay + ny },
      ] });
    }
  }
  return out;
}
function waterIndex(seed: number): Map<string, readonly WaterRegion[]> {
  return remember(waterMemo, seed, () => {
    const basin = WATER.startBasin,
      shapes: WaterShape[] = [{ id: "start-basin", seed: 0,
        shore: waterOval(basin.x, basin.y, basin.rx, basin.ry), core: [], crossings: [],
      }];
    for (const l of landmarks(seed)) shapes.push(...(LANDMARK_DEFS.get(l.kind).water?.(l) ?? []));
    for (let cy = CHUNK.minCy; cy <= CHUNK.maxCy; cy++)
      for (let cx = CHUNK.minCx; cx <= CHUNK.maxCx; cx++) {
        const candidates = biomeAt(seed, cx, cy).water?.({ x: cx * CHUNK.width, y: cy * CHUNK.height,
          width: CHUNK.width, height: CHUNK.height, hash: (salt) => hash2(seed, cx, cy, salt) }) ?? [];
        for (const shape of candidates) {
          const b = waterBounds(shape.shore), x = (b.minX + b.maxX) / 2, y = (b.minY + b.maxY) / 2,
            pad = Math.max(b.maxX - x, b.maxY - y) + 30;
          if (b.minX < WORLD.minX + WORLD.edge || b.maxX > WORLD.maxX - WORLD.edge ||
            b.minY < WORLD.playTop + 20 || b.maxY > WORLD.maxY - WORLD.edge) continue;
          if (b.minY < SCREEN.height + 40 && b.maxX > -40 && b.minX < SCREEN.width + 40) continue;
          if (inLandmark(seed, x, y, pad)) continue;
          if (shapes.some((s) => {
            const q = waterBounds(s.shore);
            return b.minX < q.maxX + 30 && b.maxX > q.minX - 30 && b.minY < q.maxY + 30 && b.maxY > q.minY - 30;
          })) continue;
          shapes.push(shape);
        }
      }
    const index = new Map<string, WaterRegion[]>(), rs = roads(seed);
    for (const shape of shapes) {
      const prepared = prepareWater({ ...shape, crossings: roadCrossings(shape, rs) });
      // Include crossing ends and bank art in the spatial buckets, including negative chunks.
      const extent = waterBounds([...prepared.shore, ...prepared.crossings.flatMap((c) => c.polygon)]),
        r: WaterRegion = { ...prepared, bounds: extent };
      for (let cy = Math.floor((extent.minY - 24) / CHUNK.height); cy <= Math.floor((extent.maxY + 24) / CHUNK.height); cy++)
        for (let cx = Math.floor((extent.minX - 24) / CHUNK.width); cx <= Math.floor((extent.maxX + 24) / CHUNK.width); cx++) {
          const key = chunkKey(cx, cy), bucket = index.get(key) ?? [];
          bucket.push(r); index.set(key, bucket);
        }

    }
    return index;
  }, WATER.cachedSeeds);
}
/** Local cached convex polygons, shared by water simulation and chunk-ground rendering. */
export function waterRegionsNear(seed: number, x: number, y: number, reach: number): readonly WaterRegion[] {
  const index = waterIndex(seed), found = new Map<string, WaterRegion>(), r = Math.max(0, reach);
  const x0 = Math.max(CHUNK.minCx, Math.floor((x - r) / CHUNK.width)),
    x1 = Math.min(CHUNK.maxCx, Math.floor((x + r) / CHUNK.width)),
    y0 = Math.max(CHUNK.minCy, Math.floor((y - r) / CHUNK.height)),
    y1 = Math.min(CHUNK.maxCy, Math.floor((y + r) / CHUNK.height));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++)
    for (const region of index.get(chunkKey(cx, cy)) ?? []) {
      const b = region.bounds;
      if (x + r >= b.minX - 24 && x - r <= b.maxX + 24 && y + r >= b.minY - 24 && y - r <= b.maxY + 24)
        found.set(region.id, region);
    }
  return [...found.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Decor, colliders and interaction spots of one landmark, from its def's layout. */
export function landmarkParts(l: Landmark): Pick<ChunkContent, "decor" | "colliders" | "spots"> {
  const { x, y, seed } = l,
    decor: Decor[] = [],
    colliders: Capsule[] = [],
    spots: InteractSpot[] = [];
  const b: LandmarkBuilder = {
    add: (kind, dx, dy, s, salt = 0) => decor.push({ kind, x: x + dx, y: y + dy, s, seed: seed + salt }),
    wall: (dx1, dy1, dx2, dy2, radius) => colliders.push({ x1: x + dx1, y1: y + dy1, x2: x + dx2, y2: y + dy2, radius }),
    spot: (kind, dx, dy, s) => spots.push({ kind, x: x + dx, y: y + dy, s }),
    hash: (a, c, salt) => hash2(seed, a, c, salt),
  };
  LANDMARK_DEFS.get(l.kind).layout(l, b);
  return { decor, colliders, spots };
}

// ---------------------------------------------------------------- chunks
const EMPTY: Pick<ChunkContent, "decor" | "colliders" | "spots"> = { decor: [], colliders: [], spots: [] };
interface Placed {
  kind: string;
  x: number;
  y: number;
  s: number;
  seed: number;
}
function startParts(cx: number): Pick<ChunkContent, "decor" | "colliders" | "spots"> {
  const x0 = cx * CHUNK.width,
    x1 = x0 + CHUNK.width,
    inside = (x: number) => x >= x0 && x < x1;
  const spots: InteractSpot[] = PUMPKIN_SPOTS.filter((p) => inside(p.x)).map((p) => ({
    kind: "pumpkin",
    x: p.x,
    y: p.y,
    s: p.s,
  }));
  if (inside(MOON_LANTERN.x))
    spots.push({ kind: "lantern", x: MOON_LANTERN.x, y: MOON_LANTERN.y, s: 0.9 });
  return {
    decor: [],
    colliders: SOLID_SCENERY.filter((o) => inside((o.x1 + o.x2) / 2)),
    spots,
  };
}
/** Deterministic generic decor and props of one chunk, mixed by its district biome. */
function genericDecor(seed: number, cx: number, cy: number, biome: BiomeDef): Pick<ChunkContent, "decor" | "colliders" | "props"> {
  const x0 = cx * CHUNK.width,
    y0 = cy * CHUNK.height,
    placed: Placed[] = [],
    colliders: Capsule[] = [],
    tall: { x: number; y: number; r: number }[] = [],
    mix: DecorMix = { ...BASE_DECOR, ...biome.decor };
  let salt = 100;
  const h = () => hash2(seed, cx, cy, salt++);
  const range = (r: readonly [number, number]) => r[0] + Math.floor(h() * (r[1] - r[0] + 1));
  const place = (
    kind: string,
    count: number,
    clear: number,
    s0: number,
    s1: number,
    yMin: number,
    flat = FLAT_DECOR.has(kind as DecorKind),
    roadside = false,
  ) => {
    const slots = roadside ? roadSlots(seed, x0, y0) : null;
    if (slots && !slots.length) return;
    for (let n = 0, tries = 0; n < count && tries < count * 8; tries++) {
      let x = x0 + 30 + h() * (CHUNK.width - 60),
        y = y0 + 30 + h() * (CHUNK.height - 60);
      const s = s0 + h() * (s1 - s0),
        seedN = Math.floor(h() * 1e6);
      if (slots) {
        // Roadside pieces stand just beyond the road's clear ground, on either side.
        const slot = slots[Math.floor(((x - x0 - 30) / (CHUNK.width - 60)) * slots.length)]!,
          side = y - y0 < CHUNK.height / 2 ? 1 : -1,
          off = slot.width + ROAD_CLEAR + clear * 0.5 + 4 + (h() * DISTRICTS.roadsideBand) / 2;
        x = slot.x + slot.nx * off * side;
        y = slot.y + slot.ny * off * side;
        if (x < x0 || x >= x0 + CHUNK.width || y < y0 || y >= y0 + CHUNK.height) continue;
      }
      if (y < yMin) continue;
      if (x < WORLD.minX + 90 || x > WORLD.maxX - 90 || y > WORLD.maxY - 90) continue;
      if (y < SCREEN.height + clear && x > -clear && x < SCREEN.width + clear) continue;
      if (nearRoad(seed, x, y, ROAD_CLEAR + clear * 0.5)) continue;
      if (inLandmark(seed, x, y, clear)) continue;
      if (waterRegionsNear(seed, x, y, clear + 2).some((r) => touchesWaterShore(r, x, y, clear + 2))) continue;
      if (!flat && tall.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + clear)) continue;
      placed.push({ kind, x: Math.round(x), y: Math.round(y), s: Math.round(s * 100) / 100, seed: seedN });
      if (!flat) tall.push({ x, y, r: clear });
      n++;
    }
  };
  // Trees and cottages may stand in the horizon band (as the yard's do); the rest stay on the ground.
  const back = WORLD.playTop - 40,
    ground = WORLD.playTop + 20;
  if (h() < mix.cottageChance) place("cottage", 1, 130, 0.72, 0.95, back);
  place("tree", range(mix.trees), 60, 0.82, 1.15, back);
  if (h() < mix.lampChance) place("lamp", 1, 40, 0.85, 1.05, ground);
  if (h() < mix.fenceChance) place("fence", 1 + Math.floor(h() * 2), 52, 0.9, 1.15, ground);
  place("stone", range(mix.stones), 26, 0.55, 1.3, ground);
  place("bush", range(mix.bushes), 36, 0.7, 1.2, ground);
  if (h() < mix.candlesChance) place("candles", 1, 26, 0.7, 0.85, ground);
  if (h() < mix.pumpkinChance) place("pumpkin", 1 + Math.floor(h() * 2), 22, 0.45, 0.8, ground);
  place("flowers", range(mix.flowers), 30, 0.9, 1.1, ground);
  place("tuft", range(mix.tufts), 14, 0.7, 1.1, ground);
  place("leaves", range(mix.leaves), 30, 0.9, 1.1, ground);
  // The district's props roll after every decor roll.
  for (const bp of biome.props) {
    const def = PROP_DEFS.get(bp.prop),
      sp = def.spawn,
      count = bp.count ?? sp.count;
    if (!count || h() >= (bp.chance ?? sp.chance ?? 1)) continue;
    const [s0, s1] = sp.scale ?? [1, 1];
    place(def.id, range(count), sp.clear ?? 30, s0, s1, ground, !!sp.flat, !!bp.roadside);
  }
  // Decor kinds a prop takes over (fences, bushes) become that prop in place.
  const from = new Map(PROP_DEFS.all().filter((d) => d.spawn.from).map((d) => [d.spawn.from!, d.id]));
  const decor: Decor[] = [],
    props: PropSpot[] = [];
  for (const d of placed) {
    const kind = from.get(d.kind) ?? (PROP_DEFS.has(d.kind) ? d.kind : null);
    if (!kind) decor.push(d as Decor);
    // Past the cap, extra props are simply not made (decor is unaffected).
    else if (props.length < DISTRICTS.propCap)
      props.push({ id: `${cx},${cy}#${props.length}`, kind, x: d.x, y: d.y, s: d.s, seed: d.seed });
  }
  for (const d of decor) {
    const s = d.s;
    if (d.kind === "cottage")
      colliders.push({ x1: d.x - 96 * s, y1: d.y - 14 * s, x2: d.x + 86 * s, y2: d.y - 14 * s, radius: 16 * s });
    else if (d.kind === "tree") colliders.push({ x1: d.x - 5 * s, y1: d.y - 2, x2: d.x + 5 * s, y2: d.y - 2, radius: 7 * s });
    else if (d.kind === "stone" && s > 0.9)
      colliders.push({ x1: d.x - 6 * s, y1: d.y - 3, x2: d.x + 6 * s, y2: d.y - 3, radius: 8 * s });
    else if (d.kind === "lamp") colliders.push({ x1: d.x, y1: d.y - 1, x2: d.x, y2: d.y - 1, radius: 4 });
  }
  return { decor, colliders, props };
}
/** Everything in chunk (cx, cy) for `seed`. Chunks outside the bounds are empty. */
export function chunkContent(seed: number, cx: number, cy: number): ChunkContent {
  return remember(chunkMemo, `${seed}:${cx},${cy}`, () => {
    const base = {
      key: chunkKey(cx, cy),
      cx,
      cy,
      x: cx * CHUNK.width,
      y: cy * CHUNK.height,
      w: CHUNK.width,
      h: CHUNK.height,
    };
    const biome = biomeAt(seed, cx, cy);
    if (!inChunkRange(cx, cy)) return { ...base, start: false, landmark: null, ...EMPTY, props: [], biome: biome.id };
    if (isStartChunk(cx, cy)) return { ...base, start: true, landmark: null, ...startParts(cx), props: [], biome: biome.id };
    const landmark =
      landmarks(seed).find((l) => {
        const c = chunkOf(l.x, l.y);
        return c.cx === cx && c.cy === cy;
      }) ?? null;
    const generic = genericDecor(seed, cx, cy, biome),
      parts = landmark ? landmarkParts(landmark) : EMPTY;
    return {
      ...base,
      start: false,
      landmark,
      decor: [...generic.decor, ...parts.decor],
      colliders: [...generic.colliders, ...parts.colliders],
      spots: [...parts.spots],
      props: generic.props,
      biome: biome.id,
    };
  });
}
/** Static colliders of the 3 x 3 chunks around (x, y); props are added by the sim while standing. */
export function nearStaticColliders(seed: number, x: number, y: number): readonly Capsule[] {
  const { cx, cy } = chunkOf(x, y);
  return remember(staticMemo, `${seed}:${cx},${cy}`, () => {
    const out: Capsule[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) out.push(...chunkContent(seed, cx + dx, cy + dy).colliders);
    return out;
  });
}
/** Props of the 3 x 3 chunks around (x, y), row-major. */
export function nearProps(seed: number, x: number, y: number): readonly PropSpot[] {
  const { cx, cy } = chunkOf(x, y);
  return remember(propMemo, `${seed}:${cx},${cy}`, () => {
    const out: PropSpot[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) out.push(...chunkContent(seed, cx + dx, cy + dy).props);
    return out;
  });
}
/** Colliders of the 3 x 3 chunks around (x, y) with every prop standing (a fresh world). */
export function nearColliders(seed: number, x: number, y: number): readonly Capsule[] {
  const { cx, cy } = chunkOf(x, y);
  return remember(colliderMemo, `${seed}:${cx},${cy}`, () => {
    const out: Capsule[] = [...nearStaticColliders(seed, x, y)];
    for (const p of nearProps(seed, x, y)) out.push(...(PROP_DEFS.get(p.kind).colliders?.(seed, p.x, p.y, p.s) ?? []));
    return out;
  });
}
