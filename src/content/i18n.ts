import { EN } from "./en.js";
import {
  MESSAGE_KEYS,
  type Locale,
  type MessageKey,
  type Messages,
} from "./keys.js";
import { ZH } from "./zh.js";

export const DEFAULT_LOCALE: Locale = "en";

const PACKS: Record<Locale, Messages> = { zh: ZH, en: EN };

export function isLocale(value: string): value is Locale {
  return value === "zh" || value === "en";
}

export function t(
  locale: Locale,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  const pack = PACKS[locale];
  const text = pack[key];
  if (typeof text === "string" && text.length > 0)
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  return `[missing: ${key}]`;
}

export function missingKeys(locale: Locale): MessageKey[] {
  const pack = PACKS[locale];
  return MESSAGE_KEYS.filter((key) => !pack[key]);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
