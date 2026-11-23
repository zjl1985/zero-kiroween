/**
 * Isometric occlusion (plan step 2.5). Replaces the top-down
 * paperOccludesActor test for the iso view. Upright sprites are drawn atFoot,
 * so a painter's art bounds (offsets from its world foot) become a screen
 * box around the projected foot. An occluder fades only when that box
 * overlaps the cat's projected sprite box and its footprint stands in front
 * of the cat; the renderer then draws it after the cat at ISO_DEPTH.fade.
 * Presentation only: reads positions, never SimState.
 */
import { depthKey, toScreen, type Vec } from "./projection.js";

/** Painter-space art bounds around the foot (left, right, top, bottom), at scale 1. */
export interface Bounds {
  l: number;
  r: number;
  t: number;
  b: number;
}
/** A world-space ground footprint (axis-aligned in world units). */
export interface Footprint {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** A projected screen box. */
export interface ScreenBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const ISO_DEPTH = {
  /** The cat's projected sprite box around its foot point (screen pixels). */
  cat: { halfWidth: 26, top: 68, bottom: 8 },
  /** Alpha of an occluder drawn over the cat. */
  fade: 0.48,
} as const;

/** Screen box of an upright painter drawn atFoot at (x, y) with bounds `b` scaled by `s`. */
export function artBox(x: number, y: number, s: number, b: Bounds): ScreenBox {
  const p = toScreen(x, y);
  return { x0: p.x + b.l * s, x1: p.x + b.r * s, y0: p.y + b.t * s, y1: p.y + b.b * s };
}

/** The cat's projected sprite box. */
export function actorBox(actor: Vec): ScreenBox {
  const p = toScreen(actor.x, actor.y), c = ISO_DEPTH.cat;
  return { x0: p.x - c.halfWidth, x1: p.x + c.halfWidth, y0: p.y - c.top, y1: p.y + c.bottom };
}

export function boxesOverlap(a: ScreenBox, b: ScreenBox): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** A single-point footprint at the foot. */
export function pointFootprint(x: number, y: number): Footprint {
  return { x0: x, y0: y, x1: x, y1: y };
}

/** Sort key of a footprint: depthKey of its front-most (south-east, largest x + y) corner. */
export function footprintKey(fp: Footprint): number {
  return depthKey(fp.x1, fp.y1);
}

/**
 * Is the actor behind (north of) the footprint? A point footprint compares
 * depthKey (ties count as behind, matching the old inclusive test). A real
 * box uses the separating axes: the actor is in front only when it is past
 * the box's front edge on either world axis.
 */
export function actorBehind(fp: Footprint, actor: Vec): boolean {
  if (fp.x0 === fp.x1 && fp.y0 === fp.y1) return depthKey(actor.x, actor.y) <= depthKey(fp.x1, fp.y1);
  return !(actor.x > fp.x1 || actor.y > fp.y1);
}

/**
 * Can an upright piece at (x, y) cover the cat? Its projected art box must
 * overlap the cat's sprite box and its footprint must stand in front of the cat.
 */
export function isoOccludesActor(
  x: number,
  y: number,
  s: number,
  b: Bounds,
  actor: Vec,
  footprint: Footprint = pointFootprint(x, y),
): boolean {
  return actorBehind(footprint, actor) && boxesOverlap(artBox(x, y, s, b), actorBox(actor));
}

/**
 * Render-side ground footprints of multi-tile decor, as offsets from the foot
 * at scale 1 (they follow the art's wall line, not a gameplay number).
 */
const DECOR_FOOTPRINT: Readonly<Record<string, Bounds>> = {
  cottage: { l: -112, r: 102, t: -30, b: 2 },
};

/** World footprint of a decor piece, or null when it stands on a single point. */
export function decorFootprint(kind: string, x: number, y: number, s: number): Footprint | null {
  const f = DECOR_FOOTPRINT[kind];
  return f ? { x0: x + f.l * s, x1: x + f.r * s, y0: y + f.t * s, y1: y + f.b * s } : null;
}
