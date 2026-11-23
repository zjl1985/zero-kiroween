/**
 * The opening yard as baked voxel sprites (scripts/iso-art, FEAT-003): the
 * barn and two cottages on the horizon band, the four fence rails
 * (YARD_RAILS), the solid yard furniture (YARD_FURNITURE: log pile, planters,
 * tool rack), the walkable crop rows on the garden plots and a little
 * non-solid dressing north of playTop (hay bales, cart, well) plus a
 * scarecrow in the wheat.
 *
 * Every piece is placed at its world foot point; `base` (local world units
 * around the foot) is its world footprint. Solid pieces declare exactly the
 * ground the sim blocks: a furniture or rail capsule grown by its radius
 * (src/game/scenery.ts), and for the buildings the strip north of
 * WORLD.playTop that the sim's world clamp keeps the cat out of (tested in
 * tests/iso-yard.test.mjs). scripts/iso-art/build.py reads these bases
 * (scripts/iso-art/dump-inputs.mjs) and bakes each sprite inside its base.
 * Pure data: no canvas, no RNG.
 */
import { SOLID_SCENERY, YARD_FURNITURE, YARD_RAILS } from "../../game/scenery.js";
import { CROP_PATCHES, HOMESTEADS, YARD_EXTENSION_PLOTS, type GroundPoint } from "../homestead-layout.js";
import { plotDistance } from "../pixel-yard-garden.js";

/** A ground rectangle in local world units around a foot point. */
export interface YardBase {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly d: number;
}

/** One yard sprite at its world foot point. */
export interface IsoYardPiece {
  /** Piece identity; equal keys share one sprite. */
  readonly key: string;
  /** Baked sprite id in src/render/iso/gen/scenery-pixels.ts. */
  readonly sprite: string;
  readonly kind: "building" | "rail" | "furniture" | "crop" | "dressing" | "tree";
  readonly x: number;
  readonly y: number;
  /** Solid pieces block the cat (sim colliders or the playTop clamp). */
  readonly solid: boolean;
  /** Buildings fade when the cat stands behind them; low pieces stay opaque. */
  readonly fades: boolean;
  /** Extra culling margin (world units) for large pieces. */
  readonly reach: number;
  /** Ground footprint around the foot (local world units). */
  readonly base: YardBase;
}

/** Render-only integer hash in [0, 1). */
function h3(a: number, b: number, salt: number): number {
  let s = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b9);
  s = Math.imul(s ^ (s >>> 15), 0x85ebca6b);
  s ^= s >>> 13;
  return (s >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- buildings
/** Feet of the two homesteads: the same doorstep the old raster houses and HOUSE_WALKS used. */
const homeFoot = (h: (typeof HOMESTEADS)[number]) => ({ x: Math.round(h.x + 23 * h.s), y: Math.round(h.y + 29 * h.s) });
const BARN_AT = homeFoot(HOMESTEADS[0]);
const COTTAGE_AT = homeFoot(HOMESTEADS[1]);
/**
 * The second cottage (spec 4.2: barn and two cottages) stands in the west
 * horizon pocket, north of playTop and clear of the yard road, so no
 * collider changes.
 */
const WEST_COTTAGE_AT = { x: 180, y: 244 } as const;

export const YARD_BASES = {
  barn: { x: -48, y: -64, w: 96, d: 64 },
  cottage: { x: -37, y: -50, w: 74, d: 50 },
  "west-cottage": { x: -31, y: -44, w: 62, d: 44 },
  crop: { x: -6, y: -6, w: 12, d: 12 },
  tree: { x: -6, y: -6, w: 12, d: 12 },
  small: { x: -6, y: -6, w: 12, d: 12 },
  "hay-bales": { x: -14, y: -12, w: 28, d: 16 },
  cart: { x: -16, y: -14, w: 32, d: 16 },
  well: { x: -12, y: -14, w: 24, d: 18 },
  scarecrow: { x: -14, y: -4, w: 28, d: 8 },
} as const satisfies Record<string, YardBase>;

// ---------------------------------------------------------------- rails and furniture
/** Base of a capsule grown by its radius, relative to the foot (x, y). */
function capsuleBase(x: number, y: number, c: { x1: number; y1: number; x2: number; y2: number; radius: number }): YardBase {
  const x0 = Math.min(c.x1, c.x2) - c.radius, y0 = Math.min(c.y1, c.y2) - c.radius;
  return { x: x0 - x, y: y0 - y, w: Math.abs(c.x2 - c.x1) + 2 * c.radius, d: Math.abs(c.y2 - c.y1) + 2 * c.radius };
}
const RAIL_HALF = 34, RAIL_RISE = 2, RAIL_RADIUS = 3;
const railBase = capsuleBase(0, 0, { x1: -RAIL_HALF, y1: -RAIL_RISE, x2: RAIL_HALF, y2: RAIL_RISE, radius: RAIL_RADIUS });
function furnitureBase(p: (typeof YARD_FURNITURE)[number]): YardBase {
  const c = SOLID_SCENERY.find((s) => s.x1 === p.x + p.left && s.y1 === p.y + p.contactY && s.x2 === p.x + p.right)!;
  return capsuleBase(p.x, p.y, c);
}

// ---------------------------------------------------------------- crops
/** Crop feet: the authored rows of CROP_PATCHES and a loose grid on the plots south of the yard. */
function cropFeet(): { kind: "wheat" | "vegetable"; x: number; y: number }[] {
  const out: { kind: "wheat" | "vegetable"; x: number; y: number }[] = [];
  const inside = (outline: readonly GroundPoint[], x: number, y: number) => plotDistance(outline, x, y) < -4;
  for (const patch of CROP_PATCHES)
    for (const [x, y, n] of patch.rows)
      for (let i = 0; i < n; i++) {
        const px = x + i * 12, py = y + (i % 2);
        if (inside(patch.outline, px, py)) out.push({ kind: patch.kind, x: px, y: py });
      }
  YARD_EXTENSION_PLOTS.forEach((outline, i) => {
    const ys = outline.map((p) => p[1]), xs = outline.map((p) => p[0]);
    for (let y = Math.min(...ys) + 10; y < Math.max(...ys); y += 18)
      for (let x = Math.min(...xs) + 8 + (Math.floor(y / 18) % 2) * 7; x < Math.max(...xs); x += 15)
        if (inside(outline, x, y)) out.push({ kind: i % 2 ? "wheat" : "vegetable", x, y });
  });
  return out;
}

// ---------------------------------------------------------------- pieces
function buildPieces(): IsoYardPiece[] {
  const B = YARD_BASES;
  const pieces: IsoYardPiece[] = [
    { key: "yard:barn", sprite: "yard-barn", kind: "building", ...BARN_AT, solid: true, fades: true, reach: 140, base: B.barn },
    { key: "yard:cottage", sprite: "yard-cottage", kind: "building", ...COTTAGE_AT, solid: true, fades: true, reach: 120, base: B.cottage },
    { key: "yard:west-cottage", sprite: "yard-west-cottage", kind: "building", ...WEST_COTTAGE_AT, solid: true, fades: true, reach: 110, base: B["west-cottage"] },
  ];
  for (const r of YARD_RAILS)
    pieces.push({ key: "yard:rail", sprite: "yard-rail", kind: "rail", x: r.x, y: r.y, solid: true, fades: false, reach: 40, base: railBase });
  for (const f of YARD_FURNITURE)
    pieces.push({ key: `yard:${f.kind}`, sprite: `yard-${f.kind}`, kind: "furniture", x: f.x, y: f.y, solid: true, fades: false, reach: 40, base: furnitureBase(f) });
  // Dressing north of playTop (the cat never reaches it) and a scarecrow among the wheat.
  const dressing = [
    { name: "hay-bales", x: 486, y: 240 },
    { name: "cart", x: 340, y: 236 },
    { name: "well", x: 752, y: 238 },
    { name: "scarecrow", x: 338, y: 386 },
  ] as const;
  for (const d of dressing)
    pieces.push({ key: `yard:${d.name}`, sprite: `yard-${d.name}`, kind: "dressing", x: d.x, y: d.y, solid: false, fades: d.name !== "scarecrow", reach: 50, base: B[d.name] });
  // The tree pockets that frame the two homesteads and the west cottage (the old raster yard's trees).
  const trees = [[284, 233, 0.87], [316, 219, 0.67], [842, 200, 0.9], [872, 236, 0.72], [99, 247, 0.8], [910, 214, 0.78], [291, 254, 0.67], [612, 214, 0.65], [52, 222, 0.85]] as const;
  trees.forEach(([x, y, s], i) => {
    const size = s < 0.72 ? 0 : s < 0.85 ? 1 : 2, species = i % 3 === 1 ? "maple" : "oak";
    pieces.push({ key: `yard:tree:${i}`, sprite: `tree-${species}-${size}`, kind: "tree", x, y, solid: false, fades: true, reach: 80, base: B.tree });
  });
  // The east boulder stands on its SOLID_SCENERY capsule; two small stones and the yard's lights are dressing.
  const boulder = SOLID_SCENERY.find((c) => c.x1 === 906 && c.y1 === 371)!, bx = (boulder.x1 + boulder.x2) / 2, by = boulder.y1;
  pieces.push({ key: "yard:boulder", sprite: "yard-boulder", kind: "dressing", x: bx, y: by, solid: true, fades: false, reach: 30, base: capsuleBase(bx, by, boulder) });
  for (const [x, y, sprite] of [[892, 386, "rock-0"], [46, 398, "rock-0"], [540, 280, "pumpkin-0"], [846, 274, "pumpkin-1"], [112, 261, "candles"]] as const)
    pieces.push({ key: `yard:${sprite}:${x}`, sprite, kind: "dressing", x, y, solid: false, fades: false, reach: 20, base: B.small });
  for (const c of cropFeet()) {
    // Keep the scarecrow's own patch of ground free.
    if (Math.hypot(c.x - 338, c.y - 386) < 10) continue;
    const variant = Math.floor(h3(c.x, c.y, 131) * 3);
    const kind = c.kind === "wheat" ? "wheat" : h3(c.x, c.y, 133) > 0.72 ? "pumpkin" : "cabbage";
    pieces.push({ key: `yard:${kind}:${variant}`, sprite: `crop-${kind}-${variant}`, kind: "crop", x: c.x, y: c.y, solid: false, fades: false, reach: 0, base: B.crop });
  }
  return pieces;
}

let pieces: readonly IsoYardPiece[] | undefined;
/** Every opening-yard sprite (pure, built once). */
export function isoYardPieces(): readonly IsoYardPiece[] {
  return (pieces ??= buildPieces());
}
