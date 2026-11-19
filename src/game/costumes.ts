/**
 * Costume unlock progress: pure and DOM-free. The UI keeps the progress (in
 * the saved prefs) and asks here, once per finished night, which costumes
 * that night unlocked. Every def's `unlock` is pure data, checked in wardrobe
 * (registration) order. No costume is unlocked at the very start; the plain
 * look (no costume) is always available and is not a costume id.
 */
import "../defs/index.js";
import { COSTUME_DEFS } from "../defs/registries.js";
import type { CostumeId, CostumeUnlock } from "../defs/types.js";
import type { SimState } from "./types.js";

export interface CostumeProgress {
  /** Nights finished (any end). */
  nights: number;
  /** Nights won at dawn. */
  wins: number;
  /** Unlocked costume ids, in wardrobe order. */
  unlocked: CostumeId[];
}
/** What a finished night contributes to unlocks. */
export type FinishedNight = Pick<SimState, "stats" | "level" | "endReason">;

export function emptyProgress(): CostumeProgress {
  return { nights: 0, wins: 0, unlocked: [] };
}

/** The value an unlock condition reads after this night (booleans count as 0 / 1). */
function unlockValue(unlock: CostumeUnlock, night: FinishedNight, progress: CostumeProgress): number {
  if (unlock.stat === "nights") return progress.nights;
  if (unlock.stat === "wins") return progress.wins;
  if (unlock.stat === "level") return night.level;
  if (unlock.stat === "dawn") return night.endReason === "dawn" || night.endReason === "boss-escaped" ? 1 : 0;
  return Number(night.stats[unlock.stat]) || 0;
}

/**
 * Counts the finished night into the lifetime totals (a "dawn" end is a win)
 * and unlocks every costume whose condition now holds. Returns the new
 * progress and the newly unlocked ids in wardrobe order; the input is not changed.
 */
export function unlocksAfter(
  progress: CostumeProgress,
  night: FinishedNight,
): { progress: CostumeProgress; newly: CostumeId[] } {
  const next: CostumeProgress = {
    nights: progress.nights + 1,
    wins: progress.wins + (night.endReason === "dawn" ? 1 : 0),
    unlocked: [...progress.unlocked],
  };
  const newly: CostumeId[] = [];
  for (const def of COSTUME_DEFS.all()) {
    if (next.unlocked.includes(def.id)) continue;
    if (unlockValue(def.unlock, night, next) < def.unlock.at) continue;
    newly.push(def.id);
  }
  if (newly.length) {
    const have = new Set([...next.unlocked, ...newly]);
    next.unlocked = COSTUME_DEFS.ids().filter((id) => have.has(id));
  }
  return { progress: next, newly };
}

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Progress from untrusted saved data: bad or negative counts become 0, wins
 * never exceed nights, unknown or repeated ids are dropped and the rest are
 * kept in wardrobe order.
 */
export function sanitizeProgress(raw: unknown): CostumeProgress {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>,
    nights = count(r.nights),
    saved = new Set(Array.isArray(r.unlocked) ? r.unlocked.filter((id) => typeof id === "string") : []);
  return {
    nights,
    wins: Math.min(count(r.wins), nights),
    unlocked: COSTUME_DEFS.ids().filter((id) => saved.has(id)),
  };
}

export function isUnlocked(progress: CostumeProgress, id: CostumeId): boolean {
  return progress.unlocked.includes(id);
}
