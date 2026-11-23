/**
 * The opening yard as code-modelled isometric volumes (plan step 4.2):
 * the barn and two cottages on the horizon band, the four fence rails
 * (YARD_RAILS), the solid yard furniture (YARD_FURNITURE: log pile,
 * planters, tool rack) and the walkable crop rows on the garden plots.
 *
 * Every model is built in local world units around its foot point (the
 * world point it is drawn at), so `base` offset by the foot is its world
 * footprint. Solid pieces declare exactly the ground the sim blocks:
 * a furniture or rail capsule grown by its radius (src/game/scenery.ts),
 * and for the buildings the strip north of WORLD.playTop that the sim's
 * world clamp keeps the cat out of (tested in tests/iso-yard.test.mjs).
 *
 * Face details are hand-painted in each face's local pixel grid (warm
 * windows, doors, shingles, timber framing, moss) with ramp steps only, so
 * the colours stay inside palette.ts. Pure data: no canvas, no RNG.
 */
import { SOLID_SCENERY, YARD_FURNITURE, YARD_RAILS } from "../../game/scenery.js";
import { CROP_PATCHES, HOMESTEADS, YARD_EXTENSION_PLOTS, type GroundPoint } from "../homestead-layout.js";
import { plotDistance } from "../pixel-yard-garden.js";
import { box, cylinder, gableRoof, hipRoof, isoModel, type Face, type FaceDetail, type FacePaint, type IsoModel, type Primitive, type Vec3 } from "./model.js";
import { ISO_FACE, type RampName } from "./palette.js";

/** One yard volume at its world foot point. */
export interface IsoYardPiece {
  /** Volume cache key; equal keys share one model. */
  readonly key: string;
  readonly kind: "building" | "rail" | "furniture" | "crop";
  readonly x: number;
  readonly y: number;
  /** Solid pieces sort by their footprint; crops are walkable and sort at their foot. */
  readonly solid: boolean;
  /** Buildings fade when the cat stands behind them; low furniture stays opaque. */
  readonly fades: boolean;
  /** Extra culling margin (world units) for large volumes. */
  readonly reach: number;
  readonly model: () => IsoModel;
  /**
   * Warm window glows for the light buffer (lighting.ts), local world units
   * from the foot with z the height of the pane centre. Derived from the
   * window rectangles painted below: a +y (front) face cell u sits at world
   * x = wall x0 + u, a +x (side) face cell u at y = wall y1 - u, and row v
   * at z = wall top - v.
   */
  readonly glows?: readonly Vec3[];
}

// ---------------------------------------------------------------- painters
const { top: TOP, lit: LIT, dark: DARK } = ISO_FACE;

/** Render-only integer hash in [0, 1). */
function h3(a: number, b: number, salt: number): number {
  let s = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b9);
  s = Math.imul(s ^ (s >>> 15), 0x85ebca6b);
  s ^= s >>> 13;
  return (s >>> 0) / 4294967296;
}

type Cell = (u: number, v: number) => readonly [RampName, number] | null;
/** A detail that decides every cell; `keepSeam` leaves the bottom row to the rasterizer's ground seam. */
function cells(cell: Cell, keepSeam = false): FaceDetail {
  return (p: FacePaint) => {
    const rows = keepSeam ? p.height - 1 : p.height;
    for (let v = 0; v < rows; v++)
      for (let u = 0; u < p.width; u++) {
        const c = cell(u, v);
        if (c) p.set(u, v, c[0], c[1]);
      }
  };
}

/** A warm window: dark frame, lit panes, a cross mullion and a sill. */
function window(p: FacePaint, u: number, v: number, w: number, h: number): void {
  p.rect(u - 1, v - 1, w + 2, h + 2, "wood", 1);
  p.rect(u, v, w, h, "wax", 4);
  p.rect(u, v + Math.floor(h / 2), w, h - Math.floor(h / 2), "wax", 3);
  p.rect(u + Math.floor(w / 2), v, 1, h, "wood", 2);
  p.rect(u, v + Math.floor(h / 2) - 1, w, 1, "wood", 2);
  p.rect(u - 2, v + h + 1, w + 4, 1, "wood", 3);
}

/** A plank door with a frame and a brass latch. */
function door(p: FacePaint, u: number, v: number, w: number, h: number, base: number): void {
  p.rect(u - 1, v - 1, w + 2, h + 1, "wood", 0);
  for (let i = 0; i < w; i++) p.rect(u + i, v, 1, h, "wood", i % 3 === 2 ? base - 1 : base);
  p.rect(u, v + 2, w, 1, "wood", base - 1);
  p.rect(u, v + h - 4, w, 1, "wood", base - 1);
  p.set(u + w - 2, v + Math.floor(h / 2), "wax", 4);
}

/** Vertical planks: seams every `pitch` columns, a little grain by hash. */
function planks(ramp: RampName, base: number, pitch: number, salt: number): Cell {
  return (u, v) => {
    if (u % pitch === 0) return [ramp, base - 1];
    if (h3(u, v >> 2, salt) > 0.9) return [ramp, base - 1];
    return [ramp, base];
  };
}

/** Stone courses: mortar lines every 2 rows, staggered joints. */
function stoneCourses(base: number): Cell {
  return (u, v) => {
    if (v % 3 === 2) return ["stone", base - 1];
    if ((u + (Math.floor(v / 3) % 2) * 3) % 6 === 0) return ["stone", base - 1];
    return ["stone", base];
  };
}

/**
 * Shingle courses for a roof face. Courses run parallel to the eave: along
 * world y (constant u) when the slope faces x, along x (constant v) when it
 * faces y. Moss gathers in clumps near the eave.
 */
function shingles(ramp: RampName, base: number, facesX: boolean, eaveAtEnd: boolean, salt: number): FaceDetail {
  return (p: FacePaint) => {
    const span = facesX ? p.width : p.height;
    for (let v = 0; v < p.height; v++)
      for (let u = 0; u < p.width; u++) {
        const across = facesX ? u : v, along = facesX ? v : u;
        const course = Math.floor(across / 4);
        const fromEave = eaveAtEnd ? span - 1 - across : across;
        let step = base;
        if (across % 4 === 3) step = base - 1;
        else if ((along + (course % 2) * 3) % 6 === 0) step = base - 1;
        else if (h3(u, v, salt) > 0.93) step = base + 1;
        p.set(u, v, ramp, step);
        // Moss: clumps by 3 x 3 cell blocks, denser toward the eave.
        const clump = h3(Math.floor(u / 3), Math.floor(v / 3), salt + 7);
        if (fromEave < 10 && clump > 0.78 + fromEave * 0.018) p.set(u, v, "grass", h3(u, v, salt + 3) > 0.5 ? 3 : 2);
      }
  };
}

/** Assign a roof face's detail from its outward normal (which way it slopes, lit or dark). */
function roofed(prim: Primitive, detail: (n: Vec3) => FaceDetail): Primitive {
  return {
    kind: prim.kind,
    faces: prim.faces.map((f): Face => (f.role === "roof" ? { ...f, detail: detail(f.normal) } : f)),
  };
}
/** Roof face lighting: the slope toward screen right (+x) carries the moon. */
const roofStep = (n: Vec3) => (n.x > 0.05 ? TOP : n.y > 0.05 ? LIT : TOP - 1);
/** In a roof face's grid, is the eave at the far end (largest u or v)? */
const eaveAtEnd = (n: Vec3, facesX: boolean) => (facesX ? n.x > 0 : n.y > 0);
function shingledRoof(prim: Primitive, ramp: RampName, salt: number): Primitive {
  return roofed(prim, (n) => {
    const facesX = Math.abs(n.x) > Math.abs(n.y);
    return shingles(ramp, roofStep(n), facesX, eaveAtEnd(n, facesX), salt);
  });
}

// ---------------------------------------------------------------- buildings
/** Feet of the two homesteads: the same doorstep the old raster houses and HOUSE_WALKS used. */
const homeFoot = (h: (typeof HOMESTEADS)[number]) => ({ x: Math.round(h.x + 23 * h.s), y: Math.round(h.y + 29 * h.s) });
const BARN_AT = homeFoot(HOMESTEADS[0]);
const COTTAGE_AT = homeFoot(HOMESTEADS[1]);
/**
 * The second cottage (spec 4.2: barn and two cottages). The old raster yard
 * had only one; this one stands in the west horizon pocket, north of
 * playTop and clear of the yard road, so no collider changes.
 */
const WEST_COTTAGE_AT = { x: 180, y: 244 } as const;

function barnModel(): IsoModel {
  const wallH = 32, plinth = 4, top = plinth + wallH;
  const front = cells((u, v) => {
    const c = planks("redTile", DARK, 4, 11)(u, v)!;
    // Corner and eave trim.
    if (u < 2 || u > 91 || v < 2) return ["cloth", DARK];
    return c;
  });
  const frontDetail: FaceDetail = (p) => {
    front(p);
    // Big double door, white X bracing, centred on the doorstep (x = 0, u = 47).
    const dw = 26, dh = 25, du = 47 - dw / 2, dv = wallH - dh;
    door(p, du, dv, dw / 2, dh, DARK);
    door(p, du + dw / 2, dv, dw / 2, dh, DARK);
    p.rect(du - 1, dv - 1, dw + 2, 1, "cloth", LIT);
    for (let i = 0; i < dh; i++) {
      const k = Math.floor((i * (dw / 2 - 1)) / (dh - 1));
      p.set(du + k, dv + i, "cloth", DARK + 1);
      p.set(du + dw / 2 - 1 - k, dv + i, "cloth", DARK + 1);
      p.set(du + dw / 2 + k, dv + i, "cloth", DARK + 1);
      p.set(du + dw - 1 - k, dv + i, "cloth", DARK + 1);
    }
    window(p, 12, 9, 8, 7);
    window(p, 74, 9, 8, 7);
  };
  const sideDetail: FaceDetail = (p) => {
    cells((u, v) => (u < 2 || u > p.width - 3 || v < 2 ? ["cloth", LIT] : planks("redTile", LIT, 4, 12)(u, v)))(p);
    window(p, 12, 10, 7, 7);
    window(p, 40, 10, 7, 7);
  };
  const gableDetail: FaceDetail = (p) => {
    cells(planks("redTile", DARK, 4, 13))(p);
    // Hayloft opening with straw, under a lit lintel.
    const u = Math.floor(p.width / 2) - 7, v = 14;
    p.rect(u - 1, v - 1, 16, 1, "cloth", LIT);
    p.rect(u, v, 14, 12, "ink", 1);
    p.rect(u + 1, v + 7, 12, 5, "wax", 3);
    for (let i = 0; i < 12; i += 2) p.set(u + 1 + i, v + 6, "wax", 4);
    p.rect(u - 1, v, 1, 12, "cloth", DARK);
    p.rect(u + 14, v, 1, 12, "cloth", DARK);
  };
  return isoModel(
    { x: -48, y: -64, w: 96, d: 64 },
    box(-48, -64, 0, 96, 64, plinth, {
      top: "stone",
      right: { ramp: "stone", detail: cells(stoneCourses(LIT), true) },
      left: { ramp: "stone", detail: cells(stoneCourses(DARK), true) },
    }),
    box(-47, -63, plinth, 94, 62, wallH, {
      top: "redTile",
      right: { ramp: "redTile", detail: sideDetail },
      left: { ramp: "redTile", detail: frontDetail },
    }),
    shingledRoof(gableRoof(-52, -63, top, 104, 62, 38, "y", { roof: "greyTile", gable: { ramp: "redTile", detail: gableDetail } }), "greyTile", 21),
    // Ridge vent.
    box(-5, -44, top + 36, 10, 20, 8, {
      top: { ramp: "greyTile", detail: cells(() => ["greyTile", TOP - 1]) },
      right: { ramp: "redTile", detail: cells((u) => (u % 3 === 0 ? ["ink", 2] : ["redTile", LIT])) },
      left: { ramp: "redTile", detail: cells((u) => (u % 3 === 0 ? ["ink", 2] : ["redTile", DARK])) },
    }),
  );
}

/** Timber-framed plaster: posts, a mid rail and braces, with openings painted after. */
function timber(width: number, height: number, base: number, posts: readonly number[]): Cell {
  return (u, v) => {
    if (v < 2 || v === Math.floor(height / 2) || u < 2 || u > width - 3 || posts.includes(u) || posts.includes(u - 1)) return ["wood", base - 1];
    // A brace in the lower panel next to each post.
    for (const p of posts) if (v > height / 2 && u - p - 2 === v - Math.floor(height / 2)) return ["wood", base - 1];
    return h3(u, v, 31) > 0.94 ? ["cloth", base - 1] : ["cloth", base];
  };
}

function cottageModel(): IsoModel {
  const wallH = 28, plinth = 4, top = plinth + wallH;
  const frontDetail: FaceDetail = (p) => {
    cells(timber(p.width, p.height, DARK + 1, [22, 48]))(p);
    door(p, 32, wallH - 20, 9, 20, DARK + 1);
    window(p, 8, 7, 9, 8);
    window(p, 55, 7, 9, 8);
    // Window box with flowers under the east window.
    p.rect(54, 17, 11, 2, "wood", DARK);
    for (let i = 0; i < 11; i += 2) p.set(54 + i, 16, i % 4 ? "redTile" : "wax", 4);
  };
  const sideDetail: FaceDetail = (p) => {
    cells(timber(p.width, p.height, LIT + 1, [24]))(p);
    window(p, 9, 8, 8, 8);
    window(p, 32, 8, 8, 8);
  };
  const gableDetail: FaceDetail = (p) => {
    cells((u, v) => (v % 5 === 4 ? ["wood", LIT - 1] : ["wood", LIT]))(p);
    window(p, Math.floor(p.width / 2) - 3, 12, 6, 6);
  };
  return isoModel(
    { x: -37, y: -50, w: 74, d: 50 },
    box(-37, -50, 0, 74, 50, plinth, {
      top: "stone",
      right: { ramp: "stone", detail: cells(stoneCourses(LIT), true) },
      left: { ramp: "stone", detail: cells(stoneCourses(DARK), true) },
    }),
    box(-36, -49, plinth, 72, 48, wallH, {
      top: "cloth",
      right: { ramp: "cloth", detail: sideDetail },
      left: { ramp: "cloth", detail: frontDetail },
    }),
    shingledRoof(gableRoof(-36, -53, top, 72, 56, 28, "x", { roof: "redTile", gable: { ramp: "wood", detail: gableDetail } }), "redTile", 41),
    // Stone chimney through the back slope.
    box(14, -38, top + 6, 9, 9, 30, {
      top: { ramp: "ink", detail: cells((u, v) => (u > 1 && v > 1 && u < 7 && v < 7 ? ["ink", 1] : ["stone", TOP])) },
      right: { ramp: "stone", detail: cells(stoneCourses(LIT)) },
      left: { ramp: "stone", detail: cells(stoneCourses(DARK)) },
    }),
  );
}

function westCottageModel(): IsoModel {
  const wallH = 24, plinth = 3, top = plinth + wallH;
  const logs = (base: number): Cell => (u, v) => (v % 4 === 3 ? ["wood", base - 1] : h3(u >> 1, v >> 2, 51) > 0.9 ? ["wood", base + 1] : ["wood", base]);
  const frontDetail: FaceDetail = (p) => {
    cells(logs(DARK))(p);
    door(p, 26, wallH - 17, 8, 17, DARK + 1);
    window(p, 9, 6, 8, 7);
    window(p, 44, 6, 8, 7);
  };
  const sideDetail: FaceDetail = (p) => {
    cells(logs(LIT))(p);
    window(p, 17, 7, 9, 7);
  };
  return isoModel(
    { x: -31, y: -44, w: 62, d: 44 },
    box(-31, -44, 0, 62, 44, plinth, {
      top: "stone",
      right: { ramp: "stone", detail: cells(stoneCourses(LIT), true) },
      left: { ramp: "stone", detail: cells(stoneCourses(DARK), true) },
    }),
    box(-30, -43, plinth, 60, 42, wallH, {
      top: "wood",
      right: { ramp: "wood", detail: sideDetail },
      left: { ramp: "wood", detail: frontDetail },
    }),
    shingledRoof(hipRoof(-33, -46, top, 66, 48, 22, "greyTile"), "greyTile", 61),
    box(-18, -30, top + 8, 7, 7, 22, {
      top: { ramp: "ink", detail: cells((u, v) => (u > 1 && v > 1 && u < 5 && v < 5 ? ["ink", 1] : ["stone", TOP])) },
      right: { ramp: "stone", detail: cells(stoneCourses(LIT)) },
      left: { ramp: "stone", detail: cells(stoneCourses(DARK)) },
    }),
  );
}

// ---------------------------------------------------------------- rails and furniture
type Rail = (typeof YARD_RAILS)[number];
type Furniture = (typeof YARD_FURNITURE)[number];
/** The capsule of a yard rail, as SOLID_SCENERY builds it (x1 < x2). */
const RAIL_HALF = 34, RAIL_RISE = 2, RAIL_RADIUS = 3;

/** Base of a capsule grown by its radius, relative to the foot (x, y). */
function capsuleBase(x: number, y: number, c: { x1: number; y1: number; x2: number; y2: number; radius: number }) {
  const x0 = Math.min(c.x1, c.x2) - c.radius, y0 = Math.min(c.y1, c.y2) - c.radius;
  return { x: x0 - x, y: y0 - y, w: Math.abs(c.x2 - c.x1) + 2 * c.radius, d: Math.abs(c.y2 - c.y1) + 2 * c.radius };
}

function railModel(): IsoModel {
  const grain = (base: number) => ({ ramp: "wood" as const, detail: cells((u, v) => (h3(u, v, 71) > 0.85 ? ["wood", base - 1] : ["wood", base])) });
  const parts: Primitive[] = [];
  const posts = [-34, -17, 0, 17, 34];
  const yAt = (x: number) => Math.round((x / RAIL_HALF) * RAIL_RISE);
  for (const px of posts)
    parts.push(box(px - 1, yAt(px) - 1, 0, 3, 3, 14, { top: "wood", right: grain(LIT), left: grain(DARK) }));
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i]!;
    for (const z of [5, 10]) parts.push(box(a + 2, yAt(a), z, 15, 2, 2, { top: "wood", right: "wood", left: grain(DARK) }));
  }
  return isoModel(capsuleBase(0, 0, { x1: -RAIL_HALF, y1: -RAIL_RISE, x2: RAIL_HALF, y2: RAIL_RISE, radius: RAIL_RADIUS }), ...parts);
}

/** End grain of a log on its lit face: bark rim, pale rings, dark heart. */
const endGrain: FaceDetail = cells((u, v) => {
  if (u === 0 || v === 0 || u === 5 || v === 5) return ["wood", DARK];
  if (u >= 2 && u <= 3 && v >= 2 && v <= 3) return ["wax", 2];
  return ["wax", 3];
});
const bark = (base: number): FaceDetail => cells((u, v) => (h3(u >> 1, v, 81) > 0.7 ? ["wood", base - 1] : ["wood", base]));

function furnitureModel(p: Furniture): IsoModel {
  const c = SOLID_SCENERY.find((s) => s.x1 === p.x + p.left && s.y1 === p.y + p.contactY && s.x2 === p.x + p.right)!;
  const base = capsuleBase(p.x, p.y, c), cy = p.contactY;
  if (p.kind === "woodpile") {
    const log = (y: number, z: number) => box(-29, y, z, 56, 6, 6, { top: { ramp: "wood", detail: bark(TOP - 1) }, right: { ramp: "wax", detail: endGrain }, left: { ramp: "wood", detail: bark(DARK) } });
    return isoModel(
      base,
      log(cy - 9, 0), log(cy - 3, 0), log(cy + 3, 0),
      log(cy - 6, 6), log(cy, 6),
      log(cy - 3, 12),
      // Chopping stump with a pale cut top.
      cylinder(32, cy, 0, 5, 7, { side: { ramp: "wood", detail: bark(DARK + 1) }, top: { ramp: "wax", detail: cells((u, v) => ((u + v) % 4 === 0 ? ["wax", 2] : ["wax", 3])) } }, 10),
    );
  }
  if (p.kind === "tool-rack") {
    const y0 = cy - 2;
    return isoModel(
      base,
      box(-12, cy - 5, 0, 28, 3, 22, { top: "wood", right: { ramp: "wood", detail: cells(planks("wood", LIT, 4, 91)) }, left: { ramp: "wood", detail: cells(planks("wood", DARK, 4, 92)) } }),
      box(-13, cy - 5, 22, 30, 4, 2, "wood"),
      // Rake, hoe and shovel hung in front of the board.
      box(-8, y0, 3, 1, 1, 17, "wood"), box(-10, y0, 17, 5, 1, 2, "stone"),
      box(-1, y0, 2, 1, 1, 18, "wood"), box(-2, y0, 2, 3, 1, 4, "stone"),
      box(8, y0, 4, 1, 1, 16, "wood"), box(6, y0, 17, 4, 1, 3, "stone"),
      box(12, y0, 0, 3, 3, 6, { top: "wax", right: "redTile", left: "redTile" }),
    );
  }
  // Two planters with soil and a few greens.
  const west = p.kind === "west-planter";
  const boxes = west ? [[-17, 16], [1, 18]] : [[-14, 13], [1, 14]];
  const parts: Primitive[] = [];
  const by = cy - 3;
  for (const [x, w] of boxes) {
    parts.push(box(x!, by, 0, w!, 7, 7, {
      top: { ramp: "soil", detail: cells((u, v) => (u === 0 || v === 0 || u === w! - 1 || v === 6 ? ["wood", TOP - 1] : ["soil", h3(u, v, 101) > 0.7 ? 3 : 2])) },
      right: { ramp: "wood", detail: cells(planks("wood", LIT, 3, 102)) },
      left: { ramp: "wood", detail: cells(planks("wood", DARK, 3, 103)) },
    }));
    for (let i = 2; i < w! - 2; i += 5) {
      const tall = 3 + Math.floor(h3(x! + i, by, 104) * 4);
      parts.push(box(x! + i, by + 2, 7, 3, 3, tall, { top: "grass", right: "grass", left: "grass" }));
      if (h3(x! + i, by, 105) > 0.5) parts.push(box(x! + i + 1, by + 2, 7 + tall, 1, 1, 1, west ? "redTile" : "wax"));
    }
  }
  return isoModel(base, ...parts);
}

// ---------------------------------------------------------------- crops
function cropModel(kind: "wheat" | "vegetable", variant: number): IsoModel {
  if (kind === "wheat") {
    const h = 7 + variant * 2;
    return isoModel(
      { x: -3, y: -3, w: 6, d: 6 },
      box(-2, -1, 0, 1, 1, h, { top: "wax", right: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 4] : ["grass", 3])) }, left: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 3] : ["grass", 2])) } }),
      box(0, -2, 0, 1, 1, h - 2, { top: "wax", right: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 4] : ["grass", 3])) }, left: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 3] : ["grass", 2])) } }),
      box(1, 0, 0, 1, 1, h - 1, { top: "wax", right: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 4] : ["grass", 3])) }, left: { ramp: "wax", detail: cells((_u, v) => (v < 3 ? ["wax", 3] : ["grass", 2])) } }),
    );
  }
  const leaf = { top: { ramp: "grass" as const, detail: cells((u, v) => ((u + v) % 3 === 0 ? ["grass", 3] : ["grass", 4])) }, right: "grass" as const, left: "grass" as const };
  const parts = [box(-3, -3, 0, 6, 6, 3 + variant, leaf)];
  if (variant === 2) parts.push(box(-1, -1, 3 + variant, 3, 3, 2, { top: "redTile", right: "redTile", left: "redTile" }));
  return isoModel({ x: -3, y: -3, w: 6, d: 6 }, ...parts);
}

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

// ---------------------------------------------------------------- window glows
/** Barn: wall x -47..47, y -63..-1, top z 36; front windows u 12 / 74 (w 8, v 9), side u 12 / 40 (w 7, v 10). */
const BARN_GLOWS: readonly Vec3[] = [
  { x: -31, y: -1, z: 24 }, { x: 31, y: -1, z: 24 },
  { x: 47, y: -16.5, z: 22.5 }, { x: 47, y: -44.5, z: 22.5 },
];
/** Cottage: wall x -36..36, y -49..-1, top z 32; front u 8 / 55 (w 9, v 7), side u 9 / 32 (w 8, v 8). */
const COTTAGE_GLOWS: readonly Vec3[] = [
  { x: -23.5, y: -1, z: 21 }, { x: 23.5, y: -1, z: 21 },
  { x: 36, y: -14, z: 20 }, { x: 36, y: -37, z: 20 },
];
/** West cottage: wall x -30..30, y -43..-1, top z 27; front u 9 / 44 (w 8, v 6), side u 17 (w 9, v 7). */
const WEST_COTTAGE_GLOWS: readonly Vec3[] = [
  { x: -17, y: -1, z: 17.5 }, { x: 18, y: -1, z: 17.5 },
  { x: 30, y: -22.5, z: 16.5 },
];

// ---------------------------------------------------------------- pieces
function buildPieces(): IsoYardPiece[] {
  const pieces: IsoYardPiece[] = [
    { key: "yard:barn", kind: "building", ...BARN_AT, solid: true, fades: true, reach: 120, model: barnModel, glows: BARN_GLOWS },
    { key: "yard:cottage", kind: "building", ...COTTAGE_AT, solid: true, fades: true, reach: 100, model: cottageModel, glows: COTTAGE_GLOWS },
    { key: "yard:west-cottage", kind: "building", ...WEST_COTTAGE_AT, solid: true, fades: true, reach: 90, model: westCottageModel, glows: WEST_COTTAGE_GLOWS },
  ];
  for (const r of YARD_RAILS as readonly Rail[])
    pieces.push({ key: "yard:rail", kind: "rail", x: r.x, y: r.y, solid: true, fades: false, reach: 40, model: railModel });
  for (const f of YARD_FURNITURE as readonly Furniture[])
    pieces.push({ key: `yard:${f.kind}`, kind: "furniture", x: f.x, y: f.y, solid: true, fades: false, reach: 40, model: () => furnitureModel(f) });
  for (const c of cropFeet()) {
    const variant = Math.floor(h3(c.x, c.y, 131) * 3);
    pieces.push({ key: `yard:${c.kind}:${variant}`, kind: "crop", x: c.x, y: c.y, solid: false, fades: false, reach: 0, model: () => cropModel(c.kind, variant) });
  }
  return pieces;
}

let pieces: readonly IsoYardPiece[] | undefined;
/** Every opening-yard volume (pure, built once). */
export function isoYardPieces(): readonly IsoYardPiece[] {
  return (pieces ??= buildPieces());
}
