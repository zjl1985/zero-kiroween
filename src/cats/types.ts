/** Palette and grid types, ported from the Meow Wall mascot methodology. */

export interface MascotPalette {
  head: string;
  headDark: string;
  headLight: string;
  earInner: string;
  ink: string;
  blush: string;
  nose: string;
  white: string;
  /** Extra hue used only by markings (token `M`). */
  mark?: string;
}

/** Sparse pixel overlay: rowIndex → 32-char token string; `.` is transparent. */
export type Overlay = Readonly<Record<number, string>>;

export type PixelToken = "K" | "D" | "H" | "L" | "R" | "B" | "W" | "N" | "M";

export type AccessoryId = "sunglasses" | "glasses" | "gold-chain";

export type CatId = "zero" | "nicole";

export interface CatDef {
  id: CatId;
  palette: MascotPalette;
  markings: Overlay;
  accessories: readonly AccessoryId[];
  /** Shirt / collar colour used by the programmable body under the head. */
  bodyFill: string;
  bodyInk: string;
}

export const GRID_SIZE = 32;
