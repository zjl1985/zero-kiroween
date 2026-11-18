/**
 * Wash-out numbers. Spilled water lifts the colour off the page: a cell of the
 * sparse wash grid goes from painted (level 0, not stored) to colourless
 * (raw cream paper with the pencil underdrawing, level 1). The Eraser rubs
 * cells blank (no colour and no pencil). Pigment brings the colour back.
 * Rolls use hash2(seed, cell, tick), never the step RNG.
 */
export const WASH = {
  /** Cell size in world units. */
  cell: 32,
  /** Most cells stored at once; fully painted cells are forgotten first. */
  maxCells: 600,
  /** From this level on a cell counts as colourless (pencil showing). */
  colourless: 0.5,
  /** Seconds the watercolour bloom / tide line takes to settle (render reads changedAt). */
  bloom: 0.6,
  /** A freshly washed cell stays wet this long: it slows, soaks and stops fire. */
  wetSeconds: 7,
  /** Speed factor on wet washed paper; never stacks with shallow water or a smudge puddle slow. */
  wetSlow: 0.8,
  /** Tearing damage multiplier on soaked props or props standing on wet cells. */
  tearEase: 1.6,
  /** Seconds a prop stays soaked after a water hit. */
  soakSeconds: 8,
  /** The wash grid updates (splashes, repaint, sketch rolls, dawn) on this beat. */
  tick: 0.25,
  /** Wading actors splash the cells around them. */
  splash: { radius: 34, amount: 0.45, perTick: 4 },
  /** A defeated enemy splashes its own pigment back onto the page. */
  pigment: { radius: 44, amount: 0.8 },
  /** Lit pumpkins and full moon-lanterns slowly repaint their light. */
  lantern: { radius: 96, rate: 0.35 },
  pumpkin: { radius: 84, rate: 0.5 },
  /** A torn water bucket spills over this radius. */
  bucket: { radius: 64, amount: 1 },
  /** Smudge drops leave a faded wash stain under the ink puddle (below `colourless`: no pencil, no sketch fuel). */
  smudgeStain: 0.3,
  /** Large cut hits through colourless paper mark white cut holes for a moment; painted paper and small shots never. */
  cut: { seconds: 2.5, minRadius: 10 },
  /** Large fold hits protect the page from water for a while (at most `maxZones` circles); small shots never do. */
  fold: { seconds: 6, minRadius: 10, maxZones: 12 },
  /**
   * Paper rain: one mid-night spell (fractions of the night) of a few
   * diagonal bands of water around the cat, every `every` seconds.
   */
  rain: { at: 0.5, until: 0.54, every: 3, bands: 3, width: 44, length: 380, reach: 320, amount: 0.8 },
  /** Dawn repaints everything over this share of STATS.dawnSeconds. */
  dawnShare: 0.8,
  /**
   * Sketch enemies wake on colourless (not blank) cells near the cat. Chance
   * per roll = washed fraction x weight, capped by `cap` alive.
   */
  sketch: { every: 1.5, radius: 300, minDistance: 90, minFraction: 0.04, weight: 2.4, cap: 10 },
} as const;
