/**
 * Seeded variants: one placed seed (world-gen prop or decor seed, or a
 * sprite variant index) turns into a stable look, so repeated props differ
 * in colour, size, tilt, wear and facing. Uses the render-only visHash, never
 * the sim RNG, and never writes to SimState. Import-safe in Node.
 */
import { visHash } from "./hash.js";
import { mix } from "./paper-material.js";

export type Range = readonly [min: number, max: number];
/** What may vary and by how much. Omitted fields stay neutral. */
export interface VariantBase {
  /** Colours to pick from (#rrggbb). */
  readonly palette: readonly string[];
  /** Up to this fraction (0..1) the pick is blended toward its palette neighbour (default 0.3). */
  readonly shift?: number;
  /** Size factor range (default [1, 1]). */
  readonly scale?: Range;
  /** Tilt range in radians (default [0, 0]). */
  readonly angle?: Range;
  /** Edge wear range, 0..1 (default [0, 0]). */
  readonly wear?: Range;
  /** May be mirrored horizontally (default false). */
  readonly flip?: boolean;
}
export interface Variant {
  /** Index of the palette pick. */
  readonly index: number;
  readonly color: string;
  readonly scale: number;
  readonly angle: number;
  readonly wear: number;
  /** 1 or -1, multiply x by it. */
  readonly flip: 1 | -1;
}

const pick = (seed: number, salt: number) => visHash(Math.imul(seed | 0, 0x2c1b3c6d) + salt * 0x51ed27);
const within = (r: Range | undefined, k: number, neutral: number) => (r ? r[0] + (r[1] - r[0]) * k : neutral);

/** The deterministic look of `seed` under `base`: same seed, same variant. */
export function variant(seed: number, base: VariantBase): Variant {
  const n = base.palette.length,
    index = n ? Math.min(n - 1, Math.floor(pick(seed, 1) * n)) : 0,
    own = base.palette[index] ?? "#808080",
    next = base.palette[(index + 1) % Math.max(1, n)] ?? own,
    color = n > 1 ? mix(own, next, pick(seed, 2) * (base.shift ?? 0.3)) : own;
  return {
    index,
    color,
    scale: within(base.scale, pick(seed, 3), 1),
    angle: within(base.angle, pick(seed, 4), 0),
    wear: within(base.wear, pick(seed, 5), 0),
    flip: base.flip && pick(seed, 6) < 0.5 ? -1 : 1,
  };
}
