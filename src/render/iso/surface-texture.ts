/**
 * Seamless 64 x 32 diamond ground textures (plan step 3.2, docs/iso-art-spec.md
 * section 2). Every surface is a pure pixel function of the screen pixel, so
 * the texture phase is the screen coordinate and any bake block lines up with
 * its neighbours. Each 32-unit world tile picks one of a few variants with the
 * world hash `hash2` (never the sim RNG). Variants only add detail away from
 * the diamond edge, so mixed variants still meet without a seam.
 */
import { hash2 } from "../../game/world-gen.js";
import { ISO } from "./projection.js";
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

export interface DiamondPixel {
  /** World tile indices (32-unit tiles). */
  i: number;
  j: number;
  /** Pixel relative to the tile's top vertex: lx in [-32, 32), ly in [0, 32). */
  lx: number;
  ly: number;
  /** World-unit distance from the pixel centre to the diamond edge. */
  edge: number;
}

/** The diamond holding screen pixel (px, py) (integer pixel, sampled at its centre). */
export function diamondPixel(px: number, py: number): DiamondPixel {
  const sx = px + 0.5, sy = py + 0.5, T = ISO.tile,
    wx = sx / 2 + sy, wy = sy - sx / 2,
    i = Math.floor(wx / T), j = Math.floor(wy / T),
    fu = wx / T - i, fv = wy / T - j;
  return {
    i, j, lx: px - (T * (i - j)), ly: py - (T / 2) * (i + j),
    edge: T * Math.min(fu, 1 - fu, fv, 1 - fv),
  };
}

/** Render-only integer hash of a local texel to [0, 1). */
function texHash(a: number, b: number, salt: number): number {
  let s = Math.imul(a | 0, 0x27d4eb2f) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b9);
  s = Math.imul(s ^ (s >>> 15), 0x85ebca6b);
  s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}
const mod = (v: number, n: number) => ((v % n) + n) % n;

/** Base pattern: a function of the canonical local texel only, so it tiles on the diamond lattice. */
function baseStep(surface: Surface, lx: number, ly: number): number {
  const id = SURFACE_ID[surface],
    pair = texHash(Math.floor((lx + 64) / 2), ly, id), // 2 x 1 clusters read as iso pixels
    dot = texHash(lx, ly, id + 40);
  switch (surface) {
    case "grass": return pair < 0.14 ? 3 : pair > 0.94 ? 1 : 2;
    case "dirt": return dot < 0.08 ? 3 : pair > 0.9 ? 1 : 2;
    case "stone": {
      // Paving joints follow the diamond lattice (period 16 x 8, half a tile).
      if (mod(lx - 2 * ly, 32) === 0 || mod(lx + 2 * ly, 32) === 0) return 1;
      return pair < 0.3 ? 2 : 3;
    }
    case "soil": return mod(lx + 2 * ly, 8) === 0 ? 1 : dot < 0.06 ? 3 : 2;
    case "shallow": return dot < 0.03 ? 3 : pair > 0.93 ? 1 : 2;
    case "deep": return pair < 0.05 ? 2 : 1;
    case "wood": return mod(lx - 2 * ly, 16) === 0 ? 1 : pair < 0.12 ? 2 : 3;
  }
}
/** Variant detail around a hashed interior anchor; variant 0 is plain. */
function detailStep(surface: Surface, variant: number, lx: number, ly: number): number | undefined {
  if (variant === 0) return undefined;
  const id = SURFACE_ID[surface],
    ax = Math.floor((texHash(variant, 1, id) - 0.5) * 16), ay = 10 + Math.floor(texHash(variant, 2, id) * 12),
    dx = lx - ax, dy = ly - ay;
  switch (surface) {
    case "grass": // a blade tuft: two short lit strokes over a dark root
      if ((dx === 0 || dx === 3) && dy >= -2 && dy <= 0) return 4;
      if (dy === 1 && dx >= -1 && dx <= 4) return 1;
      return undefined;
    case "dirt": case "shallow": // a pebble with its shadow under it
      if (dy === 0 && dx >= 0 && dx <= 1) return 4;
      if (dy === 1 && dx >= 0 && dx <= 2) return 1;
      return undefined;
    case "stone": // a hairline crack
      return dy === Math.floor(dx / 2) && dx >= 0 && dx < 6 ? 1 : undefined;
    case "soil": // a lit clod
      if (dy === 0 && dx >= 0 && dx <= 2) return 3;
      if (dy === 1 && dx >= 0 && dx <= 2) return 0;
      return undefined;
    case "deep": // a dark hole in the bed
      return dy === 0 && dx >= 0 && dx <= 3 ? 0 : undefined;
    case "wood": // a knot
      return dy === 0 && dx >= 0 && dx <= 1 ? 1 : undefined;
  }
}

/** Ramp step of `surface` in `variant` at screen pixel (px, py). */
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

/** Ramp step at screen pixel (px, py) with the tile's hashed variant. */
export function surfaceStep(seed: number, surface: Surface, px: number, py: number): number {
  const d = diamondPixel(px, py);
  return texelStep(surface, tileVariant(seed, surface, d.i, d.j), px, py);
}

/** Pixel colour for bake loops. */
export function surfaceRgb(seed: number, surface: Surface, px: number, py: number): Rgb {
  return rampRgb(SURFACE_RAMP[surface], surfaceStep(seed, surface, px, py));
}
