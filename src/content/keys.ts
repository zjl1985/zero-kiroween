export const MESSAGE_KEYS = [
  "title.name",
  "title.subtitle",
  "title.tagline",
  "title.start",
  "title.style_paper",
  "title.style_pixel",
  "title.language",
  "title.controls",
  "title.credit",
  "hud.time",
  "hud.hearts",
  "hud.dash",
  "hud.style_paper",
  "hud.style_pixel",
  "hud.pause",
  "hud.resume",
  "hud.back",
  "hud.style",
  "pause.title",
  "pause.hidden",
  "pause.continue",
  "result.win",
  "result.lose",
  "result.retry",
  "cat.zero.role",
  "cat.nicole.role",
  "touch.dash",
] as const;

export type MessageKey = (typeof MESSAGE_KEYS)[number];

export type Locale = "zh" | "en";

export type Messages = Record<MessageKey, string>;
