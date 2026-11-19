/**
 * Saved preferences in localStorage `midnight-meow-prefs`: pure reading and
 * sanitising (DOM-free, tested). main.ts does the storage calls.
 */
import type { CatId } from "../cats/types.js";
import { DEFAULT_LOCALE, isLocale } from "../content/i18n.js";
import type { Locale } from "../content/keys.js";
import { CATS, COSTUME_DEFS } from "../defs/index.js";
import type { CostumeId } from "../defs/types.js";
import { isUnlocked, sanitizeProgress, type CostumeProgress } from "../game/costumes.js";

export const PREF_KEY = "midnight-meow-prefs";
export interface Prefs {
  locale: Locale;
  cat: CatId;
  muted: boolean;
  /** Costume worn next night; null is the plain look. */
  costume: CostumeId | null;
  /** Lifetime nights, wins and unlocked costumes. */
  progress: CostumeProgress;
}

/**
 * Prefs from untrusted saved data (already JSON-parsed). Old saves without
 * costume fields load as plain with no progress; a saved costume that is
 * unknown or not unlocked falls back to plain.
 */
export function readPrefs(raw: unknown): Prefs {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>,
    progress = sanitizeProgress(v.progress),
    costume = typeof v.costume === "string" && COSTUME_DEFS.has(v.costume) && isUnlocked(progress, v.costume)
      ? v.costume
      : null;
  return {
    locale: typeof v.locale === "string" && isLocale(v.locale) ? v.locale : DEFAULT_LOCALE,
    cat: typeof v.cat === "string" && CATS.has(v.cat) ? v.cat : CATS.ids()[0]!,
    muted: v.muted === true,
    costume,
    progress,
  };
}
