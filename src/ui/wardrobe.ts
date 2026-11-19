/**
 * Wardrobe copy and entries: pure and DOM-free (tested). The plain look is
 * the first entry (id null), then every registered costume in wardrobe order.
 */
import { t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { COSTUME_DEFS } from "../defs/index.js";
import type { CostumeId } from "../defs/types.js";
import { isUnlocked, type CostumeProgress } from "../game/costumes.js";

export interface WardrobeEntry {
  readonly id: CostumeId | null;
  readonly unlocked: boolean;
}
export function wardrobeEntries(progress: CostumeProgress): WardrobeEntry[] {
  return [
    { id: null, unlocked: true },
    ...COSTUME_DEFS.ids().map((id) => ({ id, unlocked: isUnlocked(progress, id) })),
  ];
}
type Part = "name" | "skill" | "desc" | "line" | "unlock";
/** Costume copy (`costume.<id>.<part>`) with the def's numbers; null is the plain look. */
export function costumeCopy(locale: Locale, id: CostumeId | null, part: Part): string {
  if (id === null) return part === "name" ? t(locale, "costume.none.name") : "";
  const def = COSTUME_DEFS.get(id);
  return t(locale, `${def.i18n}.${part}` as MessageKey, {
    cooldown: def.skill.cooldown,
    ...def.copyParams?.(),
    at: def.unlock.at,
  });
}
/** Result page lines for costumes this night unlocked, in wardrobe order. */
export function unlockedLines(locale: Locale, ids: readonly CostumeId[]): string[] {
  return ids.map((id) => t(locale, "result.unlocked", { name: costumeCopy(locale, id, "name") }));
}
/** How far the worn costume's skill has recharged, 0..1. */
export function costumeCharge(timer: number, cooldown: number): number {
  if (cooldown <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - timer / cooldown));
}
