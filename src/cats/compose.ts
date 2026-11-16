import { ACCESSORIES } from "./accessories.js";
import { CAT_GRID, FACE_OVERLAY, isFaceProtected } from "./grid.js";
import { isPixelToken } from "./tokens.js";
import type { AccessoryId, CatDef, Overlay, PixelToken } from "./types.js";
import { GRID_SIZE } from "./types.js";

export interface ComposedCat {
  id: CatDef["id"];
  def: CatDef;
  /** 32×32 tokens after markings + visible face; `.` is empty. */
  cells: string[][];
  /** Accessory layer only; drawn on top of cells. */
  accessory: string[][];
}

export function applyOverlay(
  grid: string[][],
  overlay: Overlay,
  canPaint?: (x: number, y: number, current: string, token: PixelToken) => boolean,
): void {
  for (const [rowKey, row] of Object.entries(overlay)) {
    const y = Number(rowKey);
    if (y < 0 || y >= GRID_SIZE || !row) continue;
    const dest = grid[y];
    if (!dest) continue;
    for (let x = 0; x < row.length && x < GRID_SIZE; x += 1) {
      const ch = row[x];
      if (!ch || ch === "." || !isPixelToken(ch)) continue;
      const current = dest[x] ?? ".";
      if (canPaint && !canPaint(x, y, current, ch)) continue;
      dest[x] = ch;
    }
  }
}

export function parseGrid(rows: readonly string[]): string[][] {
  if (rows.length !== GRID_SIZE) {
    throw new Error(`expected ${GRID_SIZE} grid rows, got ${rows.length}`);
  }
  return rows.map((row, y) => {
    if (row.length !== GRID_SIZE) {
      throw new Error(`row ${y} length ${row.length} !== ${GRID_SIZE}`);
    }
    return row.split("");
  });
}

/**
 * Composite the shared head, skin markings, face, and accessories.
 * Markings cannot overwrite ink outlines or the inner face box; they may
 * still paint side hair and the collar / shirt rows below the muzzle.
 */
export function composeCat(def: CatDef): ComposedCat {
  const cells = parseGrid(CAT_GRID);
  applyOverlay(cells, def.markings, (x, y, current) => {
    // Neck, shirt and trailing hair sit on the empty rows under the chin.
    // Allow those markings to paint empty cells and the chin ink outline.
    if (y >= 24) return true;
    if (current === "K") return false;
    if (current === ".") return false;
    if (isFaceProtected(x, y)) return false;
    return true;
  });

  const hideEyes = def.accessories.includes("sunglasses");
  applyOverlay(cells, FACE_OVERLAY, (_x, y, current, token) => {
    if (current === ".") return false;
    if (hideEyes && (token === "K" || token === "W") && y >= 15 && y <= 17) {
      return false;
    }
    return true;
  });

  const accessory = parseGrid(Array.from({ length: GRID_SIZE }, () => ".".repeat(GRID_SIZE)));
  for (const id of def.accessories) {
    applyOverlay(accessory, ACCESSORIES[id as AccessoryId]);
  }

  return { id: def.id, def, cells, accessory };
}

export function tokenAt(
  layer: string[][],
  x: number,
  y: number,
  facing: 1 | -1,
): string {
  const col = facing === -1 ? GRID_SIZE - 1 - x : x;
  return layer[y]?.[col] ?? ".";
}

export function isOccupied(composed: ComposedCat, x: number, y: number, facing: 1 | -1): boolean {
  const cell = tokenAt(composed.cells, x, y, facing);
  const acc = tokenAt(composed.accessory, x, y, facing);
  return isPixelToken(cell) || isPixelToken(acc);
}
