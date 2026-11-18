import { t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { LANDMARK_DEFS } from "../defs/registries.js";
import { landmarkActivityPoint } from "../defs/landmark-activities.js";
import type { SimState } from "../game/types.js";
import { landmarks } from "../game/world-gen.js";
import { WASH } from "../defs/wash.js";
import { washLevelAt } from "../game/wash.js";

/** Pure status/help copy shared by desktop and touch HUDs, independent of drawing. */
export function environmentCopy(locale: Locale, state: SimState): { status: string | null; hint: string | null; danger: boolean } {
  const p = state.player;
  if ((p.burnTime ?? 0) > 0) return {
    status: t(locale, "hud.burning", { seconds: Math.ceil(p.burnTime!) }),
    hint: t(locale, "hint.burning"), danger: true,
  };
  const status = (p.wetTime ?? 0) > 0 ? t(locale, "hud.wet", { seconds: Math.ceil(p.wetTime!) }) : null;
  let nearby: (ReturnType<typeof landmarks>)[number] | undefined, nearest = Infinity;
  for (const l of landmarks(state.seed)) {
    const activity = LANDMARK_DEFS.get(l.kind).activity;
    if (!activity) continue;
    const point = landmarkActivityPoint(l), distance = Math.hypot(p.x - point.x, p.y - point.y);
    if (distance > activity.radius + 44 || distance >= nearest) continue;
    nearby = l;
    nearest = distance;
  }
  if (nearby) {
    const activity = LANDMARK_DEFS.get(nearby.kind).activity!, event = state.landmarkEvents[nearby.id];
    return { status, danger: false, hint: event && event.cooldown > 0
      ? t(locale, "activity.cooldown", { name: t(locale, `landmark.${nearby.kind}` as MessageKey), seconds: Math.ceil(event.cooldown) })
      : t(locale, `activity.${activity.notice}` as MessageKey) };
  }
  if (washLevelAt(state, p.x, p.y) >= WASH.colourless) return { status, danger: false, hint: t(locale, "hint.washed") };
  return { status, danger: false, hint: status ? t(locale, "hint.wet")
    : state.elapsed >= 6 && state.elapsed < 30 ? t(locale, "hint.paper-world") : null };
}
