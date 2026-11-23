/**
 * Seamless 32 x 16 diamond ground textures for the low native frame
 * (docs/iso-art-spec.md section 2). Two layers:
 *
 * - `texelStep`: a tile-periodic pattern (period one 32 x 16 diamond, phase
 *   the absolute screen pixel) with 4 hashed variants of interior detail
 *   (clods, cracks, knots). Variants only differ away from the diamond edge.
 * - `surfaceStep`: the texel shifted by soft, pixel-stepped meadow patches
 *   (world value noise quantised with a 4 x 4 Bayer dither) plus clumped
 *   grass tufts and pebbles scattered on a screen grid. Both are pure
 *   functions of (seed, screen pixel), so baked blocks meet without seams.
 *
 * `accentRgb` adds sparse flower and pebble clusters in other ramps. Variants
 * come from `hash2` (never the sim RNG); the scatter uses `texHash`.
 */
import { hash2 } from "../../game/world-gen.js";
import { bayer } from "../pixelfx/math.js";
import { ISO, toWorld } from "./projection.js";
import { ISO_RAMPS, rampRgb, type RampName, type Rgb } from "./palette.js";
import type { TerrainMaterial } from "./terrain-field.js";

export type Surface = "grass" | "dirt" | "stone" | "soil" | "shallow" | "deep" | "wood";

export const SURFACE_TEXTURE = {
  /** Variant detail stays this many world units inside the diamond edge. */
  inset: 3,
  /** Variants per surface (spec: 3 to 5). */
  variants: 4,
  /** hash2 salt base for variant picks. */
  salt: 911,
  /** Meadow patches: world value-noise cells (two octaves) and the Bayer band around each tone step. */
  patch: { cell: 150, detail: 58, dither: 0.14 },
  /** Grass tufts (+1 blade, +2 tip, -1 root): screen scatter cell (px), clump noise cell (world units), density range. */
  tuft: { cellW: 7, cellH: 5, clump: 44, min: 0, max: 0.5 },
  /** Accent clusters per 32-unit tile: flowers on grass, pebbles on grass and dirt. */
  flowers: 0.05,
  pebbles: 0.05,
} as const;

/** Terrain field material -> the surface that textures it. */
export const MATERIAL_SURFACE: Readonly<Record<TerrainMaterial, Surface>> = {
  grass: "grass", road: "dirt", soil: "soil", shallow: "shallow", deep: "deep", bridge: "wood",
};
/** Surface -> palette ramp. */
export const SURFACE_RAMP: Readonly<Record<Surface, RampName>> = {
  grass: "grass", dirt: "dirt", stone: "stone", soil: "soil", shallow: "shallow", deep: "deep", wood: "wood",
};
const SURFACE_ID: Readonly<Record<Surface, number>> = { grass: 1, dirt: 2, stone: 3, soil: 4, shallow: 5, deep: 6, wood: 7 };

const TW = ISO.tileW, TH = ISO.tileH;

export interface DiamondPixel {
  /** World tile indices (32-unit tiles). */
  i: number;
  j: number;
  /** Pixel relative to the tile's top vertex: lx in [-TW/2, TW/2), ly in [0, TH). */
  lx: number;
  ly: number;
  /** World-unit distance from the pixel centre to the diamond edge. */
  edge: number;
}

/** The diamond holding screen pixel (px, py) (integer pixel, sampled at its centre). */
export function diamondPixel(px: number, py: number): DiamondPixel {
  const T = ISO.tile, w = toWorld(px + 0.5, py + 0.5),
    i = Math.floor(w.x / T), j = Math.floor(w.y / T),
    fu = w.x / T - i, fv = w.y / T - j;
  return {
    i, j, lx: px - (TW / 2) * (i - j), ly: py - (TH / 2) * (i + j),
    edge: T * Math.min(fu, 1 - fu, fv, 1 - fv),
  };
}

/** Render-only integer hash of a local texel to [0, 1). */
export function texHash(a: number, b: number, salt: number): number {
  let s = Math.imul(a | 0, 0x27d4eb2f) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b9);
  s = Math.imul(s ^ (s >>> 15), 0x85ebca6b);
  s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}
const mod = (v: number, n: number) => ((v % n) + n) % n;

/** Smooth value noise in [0, 1) on a `cell`-unit lattice. */
export function valueNoise(x: number, y: number, cell: number, salt: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy,
    h = (i: number, j: number) => texHash(i, j, salt),
    sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy),
    top = h(gx, gy) + (h(gx + 1, gy) - h(gx, gy)) * sx,
    bottom = h(gx, gy + 1) + (h(gx + 1, gy + 1) - h(gx, gy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** Base pattern: a function of the canonical local texel only, so it tiles on the diamond lattice. */
function baseStep(surface: Surface, lx: number, ly: number): number {
  const id = SURFACE_ID[surface],
    pair = texHash(Math.floor((lx + TW) / 2), ly, id), // 2 x 1 clusters read as iso pixels
    dot = texHash(lx, ly, id + 40);
  switch (surface) {
    case "grass": return pair < 0.025 ? 3 : pair > 0.975 ? 1 : 2;
    case "dirt": return dot < 0.06 ? 3 : pair > 0.92 ? 1 : 2;
    case "stone": {
      // Paving joints follow the diamond lattice (half a tile).
      if (mod(lx - 2 * ly, TW / 2) === 0 || mod(lx + 2 * ly, TW / 2) === 0) return 1;
      return pair < 0.3 ? 2 : 3;
    }
    case "soil": { // furrow rows along the world-x diagonal: dark furrow, lit ridge
      const r = mod(lx + 2 * ly, 8);
      return r === 0 || r === 1 ? 1 : r === 3 ? 3 : dot < 0.05 ? 3 : 2;
    }
    case "shallow": return dot < 0.03 ? 3 : pair > 0.94 ? 1 : 2;
    case "deep": return pair < 0.04 ? 2 : 1;
    case "wood": { // planks across the deck, a dark joint every 4 px
      const r = mod(lx + 2 * ly, 8);
      return r === 0 ? 1 : r === 1 ? 4 : pair < 0.12 ? 2 : 3;
    }
  }
}
/** Variant detail around a hashed interior anchor; variant 0 is plain. */
function detailStep(surface: Surface, variant: number, lx: number, ly: number): number | undefined {
  if (variant === 0) return undefined;
  const id = SURFACE_ID[surface],
    ax = Math.floor((texHash(variant, 1, id) - 0.5) * 8), ay = 5 + Math.floor(texHash(variant, 2, id) * 6),
    dx = lx - ax, dy = ly - ay;
  switch (surface) {
    case "grass": // a dark root under a short lit blade pair
      if ((dx === 0 || dx === 2) && dy === -1) return 4;
      if (dy === 0 && dx >= 0 && dx <= 2) return 1;
      return undefined;
    case "dirt": case "shallow": // a pebble with its shadow under it
      if (dy === 0 && dx >= 0 && dx <= 1) return 4;
      if (dy === 1 && dx >= 0 && dx <= 1) return 0;
      return undefined;
    case "stone": // a hairline crack
      return dy === Math.floor(dx / 2) && dx >= 0 && dx < 4 ? 1 : undefined;
    case "soil": // a lit clod
      if (dy === 0 && dx >= 0 && dx <= 1) return 4;
      if (dy === 1 && dx >= 0 && dx <= 1) return 0;
      return undefined;
    case "deep": // a dark hole in the bed
      return dy === 0 && dx >= 0 && dx <= 2 ? 0 : undefined;
    case "wood": // a knot
      return dy === 0 && dx === 0 ? 1 : undefined;
  }
}

/** Ramp step of `surface` in `variant` at screen pixel (px, py) (tile-periodic). */
export function texelStep(surface: Surface, variant: number, px: number, py: number): number {
  const d = diamondPixel(px, py);
  const detail = d.edge >= SURFACE_TEXTURE.inset ? detailStep(surface, variant, d.lx, d.ly) : undefined;
  const step = detail ?? baseStep(surface, d.lx, d.ly);
  return Math.min(ISO_RAMPS[SURFACE_RAMP[surface]].length - 1, step);
}

/** The variant of world tile (i, j) for `surface`, from the world hash. */
export function tileVariant(seed: number, surface: Surface, i: number, j: number): number {
  return Math.floor(hash2(seed, i, j, SURFACE_TEXTURE.salt + SURFACE_ID[surface]) * SURFACE_TEXTURE.variants);
}

/**
 * Meadow patch offset at screen pixel (px, py): -1, 0 or +1 ramp steps from
 * two octaves of world value noise, with a Bayer-dithered band at each step
 * so patches read soft but stay pixel-stepped.
 */
export function patchOffset(seed: number, px: number, py: number): number {
  const P = SURFACE_TEXTURE.patch, w = toWorld(px + 0.5, py + 0.5),
    n = 0.7 * valueNoise(w.x, w.y, P.cell, seed * 31 + 5) + 0.3 * valueNoise(w.x, w.y, P.detail, seed * 31 + 6),
    v = (n - 0.5) * 3.4 + (bayer(px, py) - 0.5) * P.dither * 2;
  return v < -0.62 ? -1 : v > 0.62 ? 1 : 0;
}

/**
 * Grass tuft at screen pixel (px, py): a ramp step delta (+1 lit blade,
 * -1 root shadow) or 0. Tufts scatter on a staggered screen grid and clump
 * where a world value noise is high.
 */
export function tuftDelta(seed: number, px: number, py: number): number {
  const T = SURFACE_TEXTURE.tuft;
  // A tuft spans 4 x 3 px from its anchor; look at the cells it can come from.
  for (let oy = 0; oy <= 1; oy++) {
    const cy = Math.floor(py / T.cellH) + oy, shift = mod(cy, 2) * (T.cellW / 2);
    for (let ox = -1; ox <= 0; ox++) {
      const cx = Math.floor((px - shift) / T.cellW) + ox, h = texHash(cx, cy, 1301 + seed);
      const ax = cx * T.cellW + shift + Math.floor(texHash(cx, cy, 1307) * (T.cellW - 3)),
        ay = cy * T.cellH + Math.floor(texHash(cx, cy, 1311) * (T.cellH - 1)),
        dx = px - ax, dy = py - ay;
      if (dx < -1 || dx > 3 || dy < -2 || dy > 0) continue;
      const w = toWorld(ax + 0.5, ay + 0.5), c = valueNoise(w.x, w.y, T.clump, seed * 17 + 3),
        density = T.min + (T.max - T.min) * Math.max(0, Math.min(1, (c - 0.3) / 0.45));
      if (h >= density) continue;
      // Two shapes: a "v" pair of blades and a three-blade fan, both over a dark root.
      const fan = texHash(cx, cy, 1319) < 0.45;
      if (dy === 0) return dx >= 0 && dx <= 2 ? -1 : 0;
      if (dy === -1) return fan ? (dx >= 0 && dx <= 2 ? 1 : 0) : (dx === 0 || dx === 2 ? 1 : 0);
      if (dy === -2) return fan ? (dx === -1 || dx === 1 || dx === 3 ? 2 : 0) : (dx === -1 || dx === 3 ? 2 : 0);
    }
  }
  return 0;
}

/** Ramp step at screen pixel (px, py) with the tile's hashed variant, meadow patches and tufts. */
export function surfaceStep(seed: number, surface: Surface, px: number, py: number): number {
  const d = diamondPixel(px, py), top = ISO_RAMPS[SURFACE_RAMP[surface]].length - 1;
  let step = texelStep(surface, tileVariant(seed, surface, d.i, d.j), px, py);
  if (surface === "grass") {
    const base = 2 + patchOffset(seed, px, py), tuft = tuftDelta(seed, px, py);
    // The texel's own speckle stays a one-step accent around the patch tone.
    step = tuft ? base + tuft : base + (step - 2);
  } else if (surface === "dirt" || surface === "soil") {
    step += patchOffset(seed + 3, px, py) < 0 ? -1 : 0;
  }
  return Math.max(0, Math.min(top, step));
}

/**
 * Sparse accent clusters at screen pixel (px, py): small flowers on grass
 * (a bright petal over a dark stem) and pebbles on grass and dirt. One
 * cluster at most per 32-unit tile, kept inside the diamond.
 */
export function accentRgb(seed: number, surface: Surface, px: number, py: number): Rgb | undefined {
  if (surface !== "grass" && surface !== "dirt") return undefined;
  const d = diamondPixel(px, py);
  if (d.edge < SURFACE_TEXTURE.inset + 2) return undefined;
  const roll = hash2(seed, d.i, d.j, 1777);
  const flowers = surface === "grass" && roll < SURFACE_TEXTURE.flowers,
    pebbles = !flowers && roll >= 1 - SURFACE_TEXTURE.pebbles * (surface === "dirt" ? 3 : 1);
  if (!flowers && !pebbles) return undefined;
  const kind = Math.floor(hash2(seed, d.i, d.j, 1783) * 3);
  // Three points around the tile centre (lx 0, ly TH / 2), each a 1 px head over a 1 px base.
  for (let k = 0; k < 3; k++) {
    const ax = Math.floor((hash2(seed, d.i, d.j, 1789 + k) - 0.5) * 12), ay = 4 + Math.floor(hash2(seed, d.i, d.j, 1801 + k) * 8);
    const dx = d.lx - ax, dy = d.ly - ay;
    if (flowers) {
      const petal: RampName = kind === 0 ? "wax" : kind === 1 ? "cloth" : "redTile";
      if (dx === 0 && dy === 0) return rampRgb(petal, 4);
      if (dx === 0 && dy === 1) return rampRgb("grass", 0);
    } else {
      if (dy === 0 && (dx === 0 || (k === 0 && dx === 1))) return rampRgb("stone", 3);
      if (dy === 1 && (dx === 0 || (k === 0 && dx === 1))) return rampRgb(surface === "dirt" ? "dirt" : "grass", 0);
    }
  }
  return undefined;
}

/** Pixel colour for bake loops. */
export function surfaceRgb(seed: number, surface: Surface, px: number, py: number): Rgb {
  return accentRgb(seed, surface, px, py) ?? rampRgb(SURFACE_RAMP[surface], surfaceStep(seed, surface, px, py));
}
