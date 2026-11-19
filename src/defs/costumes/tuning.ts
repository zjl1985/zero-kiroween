/**
 * Numbers shared by every costume skill. Each costume's own skill numbers
 * live in its def file (src/defs/costumes/<id>/def.ts).
 */
export const COSTUME = {
  /** Most live costume zones (lanes, circles, pads, turrets, bursts) at once; the oldest goes first. */
  maxZones: 6,
} as const;
