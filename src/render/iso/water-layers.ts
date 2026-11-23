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
import { borderWidth, TRANSITION } from "./transitions.js";
import { bayer } from "../pixelfx/math.js";

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
  cellW: 10,
  cellH: 5,
  shallowGlint: 0.26,
  deepGlint: 0.1,
  glintLength: 3,
  /** No glints this close to an edge (keeps foam and lips clean). */
  glintInset: 4,
  /** Deep water: sparse cold reflection streaks (screen cell, chance). */
  streakW: 14,
  streakH: 6,
  streaks: 0.12,
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
      const L = TRANSITION.lip, w = borderWidth(seed, x, y);
      if (e < L) return rampRgb("cloth", 4); // foam crest on the shore
      if (e < L + w * ISO_WATER.foam && bayer(px, py) < 0.6) return rampRgb("shallow", 4); // dithered foam lip
      if (e < 2 * L + w && bayer(px + 1, py + 2) < 0.3) return rampRgb("shallow", 3);
    }
    if (n !== undefined) return undefined;
    const W = ISO_WATER, chance = W.bedFar + (W.bedNear - W.bedFar) * (1 - Math.min(e, W.bedFade) / W.bedFade);
    if (pebble(px, py, chance)) return rampRgb("shallow", 3); // lit pebble top
    if (pebble(px, py - 1, chance)) return rampRgb("shallow", 1); // its shadow
    return undefined;
  }
  if (s.material === "deep") {
    if (n !== undefined && n !== "shallow") return undefined;
    const step = surfaceStep(seed, "deep", px, py), W = ISO_WATER;
    // Sparse cold reflections: a 3 px streak with a darker tail.
    const cx = Math.floor(px / W.streakW), cy = Math.floor(py / W.streakH);
    if (e >= W.coreFrom && texHash(cx, cy, 131 + seed) < W.streaks) {
      const ax = cx * W.streakW + Math.floor(texHash(cx, cy, 137) * (W.streakW - 4)), ay = cy * W.streakH + Math.floor(texHash(cx, cy, 139) * W.streakH);
      if (py === ay && px >= ax && px < ax + 3) return rampRgb("deep", 3);
      if (py === ay && px === ax + 3) return rampRgb("deep", 2);
    }
    if (e >= ISO_WATER.coreFrom + 4) return rampRgb("deep", Math.max(0, step - 1)); // dark core
    if (e >= ISO_WATER.coreFrom) return rampRgb("deep", bayer(px, py) < 0.5 ? Math.max(0, step - 1) : step); // dithered step to the core
    if (e < ISO_WATER.rim) return rampRgb("deep", step + 1); // lighter shelf rim
    if (e < ISO_WATER.rim + 2 && bayer(px, py) < 0.5) return rampRgb("deep", step + 1);
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
