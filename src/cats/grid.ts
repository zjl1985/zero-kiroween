/**
 * Shared 32×32 cat-head body. Each character is one cell; `.` is transparent.
 * Face marks (eyes, blush, nose, mouth) live in FACE_OVERLAY so every skin
 * keeps a readable muzzle. Markings may not paint over the inner face.
 */
export const CAT_GRID: readonly string[] = [
  "................................",
  "................................",
  "................................",
  "................................",
  ".....KKK................KKK.....",
  "....KDDHK..............KHDDK....",
  "....KRRHHK............KHHRRK....",
  "...KHRRRLHK..........KHLRRRHK...",
  "...KHRRRRHHK........KHHRRRRHK...",
  "...KHHRRRRDHKKKKKKKKHDRRRRHHK...",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  "....KDHHLLLHHHHHHHHHHLLLHHDK....",
  "....KDHHHHHHHHLHHLHHHHHHHHDK....",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  ".KKKKDHHHHHHHHHHHHHHHHHHHHDKKKK.",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  ".KKKKDHHHHHHHHHHHHHHHHHHHHDKKKK.",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  "....KDHHHHHHHHHHHHHHHHHHHHDK....",
  ".....KDHHHHHHHHHHHHHHHHHHDK.....",
  ".....KDDDDDDDDDDDDDDDDDDDDK.....",
  "......KDDDDDDDDDDDDDDDDDDK......",
  ".......KKKKKKKKKKKKKKKKKK.......",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
];

/**
 * Shared idle face, authored on the same 32 grid. Eyes sit where the Meow Wall
 * sunglasses / glasses overlays land (rows 15–17).
 */
export const FACE_OVERLAY: Readonly<Record<number, string>> = {
  15: ".........KK..........KK.........",
  16: ".........KW..........WK.........",
  17: ".........KK..........KK.........",
  19: ".......B................B.......",
  20: "...............NN...............",
  21: "..............NKKN..............",
  22: "..............K..K..............",
  23: "...............KK...............",
};

/**
 * Inner muzzle / eye box. Side hair may still paint past this box so Nicole's
 * long hair and Zero's shirt collar stay readable at game size.
 * Protected: rows 15–23, columns 8–22.
 */
export function isFaceProtected(x: number, y: number): boolean {
  return y >= 15 && y <= 23 && x >= 8 && x <= 22;
}

export function emptyGrid(fill = "."): string[][] {
  return Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => fill));
}
