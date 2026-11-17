/**
 * Facade over the registered cats (src/defs/cats/<id>/). Combat numbers and
 * UI values share this source. Neither character is a companion.
 */
import "../defs/index.js";
import { CATS } from "../defs/registries.js";
import type { CatBaseStats, CatId, CharacterStatsMap } from "../defs/types.js";

/** Every registered cat's numbers by id, in registration order. */
export const CHARACTERS = Object.fromEntries(
  CATS.all().map((c) => [c.id, c.stats]),
) as unknown as CharacterStatsMap & Readonly<Record<CatId, CatBaseStats>>;

export function character(id: CatId): CatBaseStats {
  return CATS.get(id).stats;
}
