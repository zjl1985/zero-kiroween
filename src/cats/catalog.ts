import { NICOLE } from "./nicole.js";
import type { CatDef, CatId } from "./types.js";
import { ZERO } from "./zero.js";

const CATS: Record<CatId, CatDef> = {
  zero: ZERO,
  nicole: NICOLE,
};

export function getCat(id: CatId): CatDef {
  return CATS[id];
}

export function allCats(): readonly CatDef[] {
  return [ZERO, NICOLE];
}
