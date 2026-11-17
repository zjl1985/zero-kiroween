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

export const LANDMARK_KINDS = [
  "clock-tower",
  "pumpkin-field",
  "stone-bridge",
  "graveyard",
  "lantern-market",
  "moon-hill",
] as const;
export type LandmarkKind = (typeof LANDMARK_KINDS)[number];
export const LANDMARK = {
  /** One landmark per super-cell (5 x 3 cells of 1920 x 1800), except the start cell. */
  cols: 5,
  rows: 3,
  /** Distance kept from a cell's sides, so landmarks are at least 2 x margin apart. */
  margin: 360,
  /** Coming this close marks a landmark as found. */
  discoverRadius: 300,
  /** Kept between a landmark's edge and the road spine (which wobbles by up to 110). */
  spineClear: 300,
  radius: {
    "clock-tower": 150,
    "pumpkin-field": 200,
    "stone-bridge": 160,
    graveyard: 200,
    "lantern-market": 210,
    "moon-hill": 190,
  } satisfies Record<LandmarkKind, number>,
  /** halfLength stays under one chunk width so the 3 x 3 collider window always covers it. */
  river: { halfLength: 420, halfWidth: 30, bridgeHalf: 100, deckHalf: 70 },
} as const;

export interface Landmark {
  /** Stable id, e.g. "lm-3-1". */
  id: string;
  kind: LandmarkKind;
  x: number;
  y: number;
  radius: number;
  seed: number;
  /** stone-bridge: half length of the river band, clipped to the map. */
  span?: number;
}
export type DecorKind =
  | "tree"
  | "cottage"
  | "bush"
  | "fence"
  | "stone"
  | "lamp"
  | "candles"
  | "pumpkin"
  | "flowers"
  | "tuft"
  | "leaves"
  | "clock-tower"
  | "chapel"
  | "tomb"
  | "stall"
  | "lights";
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
  colliders: Capsule[];
  landmark: Landmark | null;
  spots: InteractSpot[];
}

/** Decor tuning per generic chunk: [chance or count range, clearance]. */
const DECOR = {
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
  /** Clear ground kept around a road's edge. */
  roadClear: 34,
} as const;

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
        radius = LANDMARK.radius[kind],
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
      if (kind === "stone-bridge")
        l.span = Math.min(
          LANDMARK.river.halfLength,
          x - (WORLD.minX + WORLD.edge + 20),
          WORLD.maxX - WORLD.edge - 20 - x,
          Math.abs(x - START_ROAD_EXIT.x) - LANDMARK.spineClear / 2,
        );
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
function inLandmark(seed: number, x: number, y: number, pad: number): boolean {
  for (const l of landmarks(seed)) {
    if (Math.hypot(x - l.x, y - l.y) < l.radius + pad) return true;
    if (
      l.kind === "stone-bridge" &&
      Math.abs(y - l.y) < LANDMARK.river.halfWidth + pad + 10 &&
      Math.abs(x - l.x) < (l.span ?? 0) + pad
    )
      return true;
  }
  return false;
}
/** Decor, colliders and interaction spots of one landmark, relative to its centre. */
function landmarkParts(l: Landmark): Pick<ChunkContent, "decor" | "colliders" | "spots"> {
  const { x, y, seed } = l,
    decor: Decor[] = [],
    colliders: Capsule[] = [],
    spots: InteractSpot[] = [];
  const add = (kind: DecorKind, dx: number, dy: number, s: number, salt = 0) =>
    decor.push({ kind, x: x + dx, y: y + dy, s, seed: seed + salt });
  const wall = (dx1: number, dy1: number, dx2: number, dy2: number, radius: number) =>
    colliders.push({ x1: x + dx1, y1: y + dy1, x2: x + dx2, y2: y + dy2, radius });
  switch (l.kind) {
    case "clock-tower":
      add("clock-tower", 0, 0, 1);
      wall(-34, -8, 34, -8, 18);
      add("lamp", -96, 44, 0.95, 1);
      add("lamp", 96, 44, 0.95, 2);
      add("bush", -62, 10, 0.9, 3);
      add("bush", 64, 12, 0.85, 4);
      add("flowers", -40, 70, 1, 5);
      add("flowers", 48, 76, 1, 6);
      break;
    case "pumpkin-field":
      for (const [dx, dy, s] of [
        [-74, -34, 1.1],
        [82, 8, 1.2],
        [-8, 72, 1],
      ] as const) {
        add("pumpkin", dx, dy, s, 1);
        spots.push({ kind: "pumpkin", x: x + dx, y: y + dy, s });
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        add("pumpkin", Math.cos(a) * 140, Math.sin(a) * 78, 0.45 + (i % 3) * 0.1, 10 + i * 4);
      }
      add("fence", -118, -112, 1, 2);
      add("fence", 118, -112, 1, 3);
      wall(-157, -115, -78, -118, 3);
      wall(79, -115, 158, -118, 3);
      add("leaves", -30, 20, 1, 4);
      add("tuft", 40, -50, 1, 5);
      break;
    case "stone-bridge": {
      const r = LANDMARK.river,
        span = l.span ?? r.halfLength,
        bank = r.halfWidth + 4;
      wall(-span, 0, -r.bridgeHalf, 0, bank);
      wall(r.bridgeHalf, 0, span, 0, bank);
      wall(-r.deckHalf, -bank, -r.deckHalf, bank, 4);
      wall(r.deckHalf, -bank, r.deckHalf, bank, 4);
      add("lamp", -r.deckHalf - 22, -64, 0.95, 1);
      add("lamp", r.deckHalf + 22, 70, 0.95, 2);
      add("stone", -150, 52, 0.9, 3);
      add("stone", 170, -50, 0.7, 4);
      add("bush", -210, -60, 0.9, 5);
      add("tuft", 120, 54, 1, 6);
      add("tuft", -110, -50, 1, 7);
      break;
    }
    case "graveyard":
      add("chapel", 0, -60, 1);
      wall(-52, -70, 52, -70, 18);
      for (let i = 0; i < 7; i++) {
        const dx = -120 + i * 40,
          dy = 34 + (i % 2) * 34 + hash2(seed, i, 0, 31) * 10;
        add("tomb", dx, dy, 0.8 + (i % 3) * 0.12, i);
        wall(dx - 6, dy - 2, dx + 6, dy - 2, 6);
      }
      add("candles", -150, -20, 0.75, 1);
      add("candles", 150, -14, 0.7, 2);
      add("lamp", 120, 112, 0.9, 3);
      add("tree", -170, -90, 0.95, 4);
      add("leaves", 30, 120, 1, 5);
      break;
    case "lantern-market":
      for (const [dx, dy] of [
        [-118, -24],
        [0, -56],
        [118, -24],
      ] as const) {
        add("stall", dx, dy, 1, dx);
        wall(dx - 40, dy - 6, dx + 40, dy - 6, 10);
      }
      add("lights", 0, -96, 1, 1);
      add("lamp", 0, 62, 0.95, 2);
      spots.push({ kind: "lantern", x, y: y + 62, s: 0.95 });
      add("pumpkin", -70, 70, 0.55, 3);
      add("pumpkin", 82, 64, 0.5, 5);
      add("candles", -160, 40, 0.7, 4);
      add("flowers", 150, 60, 1, 6);
      break;
    case "moon-hill":
      add("lamp", 0, -8, 1.05, 1);
      spots.push({ kind: "lantern", x, y: y - 8, s: 1.05 });
      for (const [dx, dy, s] of [
        [-110, 40, 1.1],
        [96, -46, 0.9],
        [130, 58, 0.75],
        [-70, -70, 0.6],
      ] as const) {
        add("stone", dx, dy, s, dx);
        if (s > 0.8) wall(dx - 8 * s, dy - 3, dx + 8 * s, dy - 3, 9 * s);
      }
      add("bush", -150, -20, 1, 2);
      add("bush", 160, 20, 0.9, 3);
      add("flowers", 30, 60, 1, 4);
      add("tuft", -40, 50, 1, 5);
      break;
  }
  return { decor, colliders, spots };
}

// ---------------------------------------------------------------- chunks
const EMPTY: Pick<ChunkContent, "decor" | "colliders" | "spots"> = { decor: [], colliders: [], spots: [] };
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
/** Deterministic generic decor of one chunk. */
function genericDecor(seed: number, cx: number, cy: number): Pick<ChunkContent, "decor" | "colliders"> {
  const x0 = cx * CHUNK.width,
    y0 = cy * CHUNK.height,
    decor: Decor[] = [],
    colliders: Capsule[] = [],
    tall: { x: number; y: number; r: number }[] = [];
  let salt = 100;
  const h = () => hash2(seed, cx, cy, salt++);
  const range = (r: readonly [number, number]) => r[0] + Math.floor(h() * (r[1] - r[0] + 1));
  const place = (kind: DecorKind, count: number, clear: number, s0: number, s1: number, yMin: number) => {
    for (let n = 0, tries = 0; n < count && tries < count * 8; tries++) {
      const x = x0 + 30 + h() * (CHUNK.width - 60),
        y = y0 + 30 + h() * (CHUNK.height - 60),
        s = s0 + h() * (s1 - s0),
        seedN = Math.floor(h() * 1e6);
      if (y < yMin) continue;
      if (x < WORLD.minX + 90 || x > WORLD.maxX - 90 || y > WORLD.maxY - 90) continue;
      if (y < SCREEN.height + clear && x > -clear && x < SCREEN.width + clear) continue;
      if (nearRoad(seed, x, y, DECOR.roadClear + clear * 0.5)) continue;
      if (inLandmark(seed, x, y, clear)) continue;
      const flat = FLAT_DECOR.has(kind);
      if (!flat && tall.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + clear)) continue;
      decor.push({ kind, x: Math.round(x), y: Math.round(y), s: Math.round(s * 100) / 100, seed: seedN });
      if (!flat) tall.push({ x, y, r: clear });
      n++;
    }
  };
  // Trees and cottages may stand in the horizon band (as the yard's do); the rest stay on the ground.
  const back = WORLD.playTop - 40,
    ground = WORLD.playTop + 20;
  if (h() < DECOR.cottageChance) place("cottage", 1, 130, 0.72, 0.95, back);
  place("tree", range(DECOR.trees), 60, 0.82, 1.15, back);
  if (h() < DECOR.lampChance) place("lamp", 1, 40, 0.85, 1.05, ground);
  if (h() < DECOR.fenceChance) place("fence", 1 + Math.floor(h() * 2), 52, 0.9, 1.15, ground);
  place("stone", range(DECOR.stones), 26, 0.55, 1.3, ground);
  place("bush", range(DECOR.bushes), 36, 0.7, 1.2, ground);
  if (h() < DECOR.candlesChance) place("candles", 1, 26, 0.7, 0.85, ground);
  if (h() < DECOR.pumpkinChance) place("pumpkin", 1 + Math.floor(h() * 2), 22, 0.45, 0.8, ground);
  place("flowers", range(DECOR.flowers), 30, 0.9, 1.1, ground);
  place("tuft", range(DECOR.tufts), 14, 0.7, 1.1, ground);
  place("leaves", range(DECOR.leaves), 30, 0.9, 1.1, ground);
  for (const d of decor) {
    const s = d.s;
    if (d.kind === "cottage")
      colliders.push({ x1: d.x - 96 * s, y1: d.y - 14 * s, x2: d.x + 86 * s, y2: d.y - 14 * s, radius: 16 * s });
    else if (d.kind === "tree") colliders.push({ x1: d.x - 5 * s, y1: d.y - 2, x2: d.x + 5 * s, y2: d.y - 2, radius: 7 * s });
    else if (d.kind === "fence")
      colliders.push({ x1: d.x - 39 * s, y1: d.y - 3, x2: d.x + 40 * s, y2: d.y - 3, radius: 3 });
    else if (d.kind === "stone" && s > 0.9)
      colliders.push({ x1: d.x - 6 * s, y1: d.y - 3, x2: d.x + 6 * s, y2: d.y - 3, radius: 8 * s });
    else if (d.kind === "lamp") colliders.push({ x1: d.x, y1: d.y - 1, x2: d.x, y2: d.y - 1, radius: 4 });
  }
  return { decor, colliders };
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
    if (!inChunkRange(cx, cy)) return { ...base, start: false, landmark: null, ...EMPTY };
    if (isStartChunk(cx, cy)) return { ...base, start: true, landmark: null, ...startParts(cx) };
    const landmark =
      landmarks(seed).find((l) => {
        const c = chunkOf(l.x, l.y);
        return c.cx === cx && c.cy === cy;
      }) ?? null;
    const generic = genericDecor(seed, cx, cy),
      parts = landmark ? landmarkParts(landmark) : EMPTY;
    return {
      ...base,
      start: false,
      landmark,
      decor: [...generic.decor, ...parts.decor],
      colliders: [...generic.colliders, ...parts.colliders],
      spots: [...parts.spots],
    };
  });
}
/** Colliders of the 3 x 3 chunks around (x, y); the culling for scenery collision. */
export function nearColliders(seed: number, x: number, y: number): readonly Capsule[] {
  const { cx, cy } = chunkOf(x, y);
  return remember(colliderMemo, `${seed}:${cx},${cy}`, () => {
    const out: Capsule[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) out.push(...chunkContent(seed, cx + dx, cy + dy).colliders);
    return out;
  });
}
