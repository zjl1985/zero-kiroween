/**
 * Placing the existing world-space painters in the isometric view without
 * rewriting them. Both helpers expect `ctx` to already carry the camera
 * transform from isoProjection (pixel = offset + zoom * toScreen(world)).
 */
import { ISO, depthKey, snap, toScreen } from "./projection.js";

type Ctx = CanvasRenderingContext2D;

/**
 * Scale of the upright painters that were authored for the old k = 1 frame
 * (cats, enemies, props, lamps, yard volumes). They draw at half size,
 * nearest neighbour, until FEAT-003..006 replace them with native sprites.
 */
export const UPRIGHT_SCALE: number = ISO.k;

/**
 * Runs a painter that draws an upright sprite around world (x, y) so that
 * (x, y) lands on its projected foot point. The foot is an integer pixel; the
 * painter's own units are scaled by UPRIGHT_SCALE around it (no skew, no
 * rotation).
 */
export function atFoot(ctx: Ctx, x: number, y: number, paint: () => void): void {
  const s = toScreen(x, y);
  ctx.save();
  ctx.translate(snap(s.x), snap(s.y));
  if (UPRIGHT_SCALE !== 1) ctx.scale(UPRIGHT_SCALE, UPRIGHT_SCALE);
  ctx.translate(-snap(x), -snap(y));
  paint();
  ctx.restore();
}

/**
 * Runs a world-space ground painter through the projection's own affine
 * (a = k, b = k / 2, c = -k, d = k / 2), so its shapes land exactly on the
 * projected ground: squares become 2:1 diamonds, circles 2:1 ellipses. A
 * temporary placeholder for ground layers until they are rebuilt from
 * projected vertices; never used for upright sprites.
 */
export function onGround(ctx: Ctx, paint: () => void): void {
  ctx.save();
  ctx.transform(ISO.k, ISO.k / 2, -ISO.k, ISO.k / 2, 0, 0);
  paint();
  ctx.restore();
}

export interface DepthItem {
  /** depthKey of the foot point (plus any small bias). */
  key: number;
}

/** Sorts by depthKey, ties keep their insertion order (stable for every engine). */
export function depthSort<T extends DepthItem>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.key - b.item.key || a.index - b.index)
    .map((entry) => entry.item);
}

export { depthKey };
