/**
 * Shared placement and talk numbers of the neutral townsfolk
 * (src/game/townsfolk.ts). Per-kind numbers live in each townsfolk def.
 */
export const TOWNSFOLK = {
  /** At most this many townsfolk in a whole town (the first eligible landmarks). */
  cap: 12,
  /** Home tries per landmark before it simply stays empty. */
  tries: 12,
  /** Home distance from the landmark centre, as a share of its radius. */
  ring: [0.6, 1.05],
  /** Extra stroll waypoints after home. */
  waypoints: 3,
  /** Waypoint tries per waypoint. */
  waypointTries: 4,
  /** Body clearance kept from colliders and water. */
  body: 12,
  /** Kept clear of a landmark court's activity circle. */
  courtPad: 18,
  /** Kept clear of pumpkins and lanterns. */
  spotPad: 26,
  /** Path samples every this many units when checking a stroll leg. */
  sample: 8,
  /** Seconds each tip stays before the next one. */
  tipSeconds: 7,
} as const;
