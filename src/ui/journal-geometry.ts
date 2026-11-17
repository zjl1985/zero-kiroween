/**
 * Pure layout math for the night-watch journal HUD. No DOM and no Canvas, so
 * the tests can check it and the painters stay thin.
 */
import { STATS } from "../game/types.js";
import { CHUNK, SCREEN, WORLD, chunkIndex, chunkOf } from "../game/world-gen.js";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Stitches in one level of the XP seam. */
export const SEAM_STITCHES = 24;

export interface ArcPoint {
  /** Night progress 0..1. */
  t: number;
  /** Across the arc, 0 = left end, 1 = right end. */
  x: number;
  /** Height on the arc, 0 = top of the arc, 1 = the horizon. */
  y: number;
  /** Inside the last `dawnSeconds`: the moon has turned into the sun. */
  dawn: boolean;
}
/** Where the moon sits on the dotted arc: it starts high on the left, crests, then sinks to the right horizon. */
export function moonArc(
  elapsed: number,
  sessionSeconds: number,
  dawnSeconds: number = STATS.dawnSeconds,
): ArcPoint {
  const t = clamp01(sessionSeconds > 0 ? elapsed / sessionSeconds : 0);
  return {
    t,
    x: t,
    y: arcHeight(t),
    dawn: elapsed >= sessionSeconds - dawnSeconds,
  };
}
/** Arc height for progress t (the same curve the dotted path follows). */
export function arcHeight(t: number): number {
  return 1 - Math.sin(Math.PI * (0.15 + 0.85 * clamp01(t)));
}
/** Filled stitches of the XP seam for the current level. */
export function seamStitches(xp: number, next: number, count = SEAM_STITCHES): number {
  if (next <= 0) return 0;
  return Math.floor(clamp01(xp / next) * count);
}
/** Wick charge 0..1 from the skill cooldown left. */
export function wickCharge(cooldownLeft: number, cooldown: number): number {
  return cooldown > 0 ? clamp01(1 - cooldownLeft / cooldown) : 1;
}
/** A world point on a w x h minimap of the bounded town, clamped to the map. */
export function mapPoint(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: clamp01((x - WORLD.minX) / WORLD.width) * w,
    y: clamp01((y - WORLD.minY) / WORLD.height) * h,
  };
}
/** Chunk indices the camera view around (x, y) overlaps: what the cat has seen. */
export function viewChunks(x: number, y: number): number[] {
  const a = chunkOf(x - SCREEN.width / 2, y - SCREEN.height / 2),
    b = chunkOf(x + SCREEN.width / 2 - 1, y + SCREEN.height / 2 - 1),
    out: number[] = [];
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) out.push(chunkIndex(cx, cy));
  return out;
}
/** Chunk coordinates of a chunk index (inverse of chunkIndex). */
export function chunkCoords(index: number): { cx: number; cy: number } {
  const cols = CHUNK.maxCx - CHUNK.minCx + 1;
  return { cx: (index % cols) + CHUNK.minCx, cy: Math.floor(index / cols) + CHUNK.minCy };
}
/** Walked distance shown in the journal, in cat paces (one pace = one cat body). */
export function paces(distance: number): number {
  return Math.round(distance / (STATS.playerRadius * 2));
}
