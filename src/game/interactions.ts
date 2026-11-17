/**
 * Interactive yard objects as data. The start yard's spots match the large
 * jack-o'-lanterns in YARD_PROPS and the lamp at LAMPS[3] (src/render/scene.ts)
 * so the sim and the drawing agree; tests/interactions.test.mjs checks the
 * match. More pumpkins and moon-lanterns come from the seeded landmarks in
 * src/game/world-gen.ts (pumpkin fields, moon hills, lantern markets).
 */
export const PUMPKIN_SPOTS: readonly { x: number; y: number; s: number }[] = [
  { x: 130, y: 318, s: 0.85 },
  { x: 820, y: 324, s: 1 },
  { x: 862, y: 478, s: 1.35 },
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
  /** The start yard's lantern. */
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
/** Fish treats appear now and then near the cat and restore a heart. */
export const FISH = {
  firstAt: 45,
  interval: 50,
  jitter: 10,
  life: 16,
  heal: 1,
  radius: 15,
  max: 1,
  /** Placed this far from the cat (world units), inside the map edge. */
  near: 180,
  far: 380,
} as const;
/**
 * Paper chests dropped by elites and the Eraser. Touching one opens a free
 * card choice (rolled by rollChoices, no XP spent); the Boss chest owes more
 * picks. FEAT-004 adds chest-triggered evolution on top.
 */
export const CHEST = {
  radius: 14,
  touchRadius: 18,
  /** Seconds after dropping before it can be opened (lets the drop land). */
  settle: 0.4,
  picks: 1,
  bigPicks: 2,
} as const;
