/**
 * Interactive yard objects as data. Positions match the large jack-o'-lanterns
 * in YARD_PROPS and the lamp at LAMPS[3] (src/render/scene.ts) so the sim and
 * the drawing agree; tests/interactions.test.mjs checks the match.
 */
export const PUMPKIN_SPOTS: readonly { x: number; y: number }[] = [
  { x: 130, y: 318 },
  { x: 820, y: 324 },
  { x: 862, y: 478 },
];
/** A touched pumpkin glows, scorching and pushing nearby ink, then recharges. */
export const PUMPKIN = {
  touchRadius: 24,
  litTime: 6,
  recharge: 14,
  auraRadius: 80,
  tick: 0.5,
  damage: 1,
  push: 10,
} as const;
/** The moon-lantern charges over time; touching it when full stuns the page. */
export const MOON_LANTERN = {
  x: 446,
  y: 330,
  touchRadius: 24,
  chargeTime: 40,
  /** Starts part charged so the first pulse is reachable mid-night. */
  startCharge: 0.25,
  stunTime: 2.4,
  bossStun: 0.9,
  damage: 2,
} as const;
/** Fish treats appear now and then and restore a heart. */
export const FISH = {
  firstAt: 35,
  interval: 42,
  jitter: 10,
  life: 16,
  heal: 1,
  radius: 15,
  max: 1,
  /** Kept clear of the frame and the cat when placed. */
  margin: 60,
  avoidPlayer: 90,
} as const;
