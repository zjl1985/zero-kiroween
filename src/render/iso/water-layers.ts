/**
 * Layered isometric water (plan step 3.5). Baked into the ground block:
 * shallow water shows its bed (lit pebbles with a dark underside, thicker
 * towards the shore), deep water darkens to a core away from its shelf, and
 * shores carry a broken foam line. Ripples are not baked into the ground:
 * each water block also bakes ISO_WATER.frames sparse overlay frames of
 * glints, and the view picks one by time (never re-baking per frame).
 * Reduced motion always shows frame 0. Pure functions of the screen pixel
 * and the field sample; no RNG.
 */
import { rampRgb, type Rgb } from "./palette.js";
import { surfaceStep, texHash } from "./surface-texture.js";
import type { TerrainMaterial, TerrainSample } from "./terrain-field.js";
import { borderWidth } from "./transitions.js";

export const ISO_WATER = {
  /** Cached ripple overlay frames per water block. */
  frames: 3,
  /** Seconds each ripple frame shows. */
  period: 0.5,
  /** Shallow bed: pebble chance at the shore and far from it (edge >= bedFade units). */
  bedNear: 0.2,
  bedFar: 0.04,
  bedFade: 24,
  /** Deep water darkens to its core this far inside the core edge; the shelf rim is lighter. */
  coreFrom: 14,
  rim: 4,
  /** Foam line width as a fraction of the irregular border width. */
  foam: 0.75,
  /** Ripple glints: cell size in screen px, chance per cell and frame, glint length. */
  cellW: 12,
  cellH: 6,
  shallowGlint: 0.22,
  deepGlint: 0.12,
  glintLength: 3,
  /** No glints this close to an edge (keeps foam and lips clean). */
  glintInset: 2,
} as const;

const isLand = (m: TerrainMaterial | undefined) => m === "grass" || m === "road" || m === "soil";

/** The ripple frame for presentation time `time`; reduced motion stays on frame 0. */
export function rippleFrame(time: number, reduced: boolean): number {
  if (reduced || !Number.isFinite(time)) return 0;
  const f = Math.floor(time / ISO_WATER.period) % ISO_WATER.frames;
  return f < 0 ? f + ISO_WATER.frames : f;
}

const pebble = (px: number, py: number, chance: number) => texHash(px >> 1, py, 83) < chance;

/**
 * Water colour of screen pixel (px, py) at world point (x, y) for a shallow
 * or deep sample `s` with neighbour `n`, or undefined to fall through to the
 * shared transitions (deck shadows, drop-off lips) and then the base surface.
 * Foam needs the shore, so it comes first.
 */
export function waterRgb(
  seed: number, px: number, py: number, x: number, y: number, s: TerrainSample, n: TerrainMaterial | undefined,
): Rgb | undefined {
  const e = s.edge;
  if (s.material === "shallow") {
    if (isLand(n)) {
      if (e < 1) return rampRgb("cloth", 4); // foam crest on the shore
      if (e < borderWidth(seed, x, y) * ISO_WATER.foam && texHash(px >> 1, py, 89) < 0.6) return rampRgb("shallow", 4);
    }
    if (n !== undefined) return undefined;
    const W = ISO_WATER, chance = W.bedFar + (W.bedNear - W.bedFar) * (1 - Math.min(e, W.bedFade) / W.bedFade);
    if (pebble(px, py, chance)) return rampRgb("shallow", 3); // lit pebble top
    if (pebble(px, py - 1, chance)) return rampRgb("shallow", 1); // its shadow
    return undefined;
  }
  if (s.material === "deep") {
    if (n !== undefined && n !== "shallow") return undefined;
    const step = surfaceStep(seed, "deep", px, py);
    if (e >= ISO_WATER.coreFrom) return rampRgb("deep", Math.max(0, step - 1)); // dark core
    if (e < ISO_WATER.rim) return rampRgb("deep", step + 1); // lighter shelf rim
    return undefined;
  }
  return undefined;
}

/** Ripple glint colour of screen pixel (px, py) in `frame` for sample `s`, or undefined (transparent). */
export function rippleRgb(px: number, py: number, frame: number, s: TerrainSample): Rgb | undefined {
  if ((s.material !== "shallow" && s.material !== "deep") || s.edge < ISO_WATER.glintInset) return undefined;
  const W = ISO_WATER, cx = Math.floor(px / W.cellW), cy = Math.floor(py / W.cellH), salt = 97 + frame * 13;
  if (texHash(cx, cy, salt) >= (s.material === "shallow" ? W.shallowGlint : W.deepGlint)) return undefined;
  const ox = Math.floor(texHash(cx, cy, salt + 4) * (W.cellW - W.glintLength)),
    oy = Math.floor(texHash(cx, cy, salt + 8) * W.cellH),
    lx = px - cx * W.cellW - ox;
  if (py - cy * W.cellH !== oy || lx < 0 || lx >= W.glintLength) return undefined;
  return rampRgb(s.material, 4);
}
