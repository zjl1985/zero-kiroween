import { formatTime, t } from "../content/i18n.js";
import type { Locale } from "../content/keys.js";
import type { SimState, StyleMode } from "../game/types.js";

export interface HudRefs {
  time: HTMLElement;
  hearts: HTMLElement;
  dash: HTMLElement;
  style: HTMLElement;
  pause: HTMLButtonElement;
}

export function renderHud(
  refs: HudRefs,
  locale: Locale,
  style: StyleMode,
  sim: SimState,
): void {
  refs.time.innerHTML = `<span class="hud-moon" aria-hidden="true">☾</span><span class="hud-value">${formatTime(sim.timeLeft)}</span>`;
  const hearts = Array.from({ length: sim.player.maxHp }, (_, i) =>
    i < sim.player.hp ? `<span class="heart on">♥</span>` : `<span class="heart off">♥</span>`,
  ).join("");
  refs.hearts.innerHTML = `<span class="hearts">${hearts}</span>`;
  const ready = sim.player.dashCooldown <= 0;
  const dashText = ready ? "•" : formatTime(sim.player.dashCooldown).slice(3);
  refs.dash.innerHTML = `<span class="hud-label">${t(locale, "hud.dash")}</span><span class="hud-value${ready ? " is-ready" : ""}">${dashText}</span>`;
  refs.style.innerHTML = `<span class="hud-icon" title="${style === "paper" ? t(locale, "hud.style_pixel") : t(locale, "hud.style_paper")}">⚙</span>`;
  refs.pause.innerHTML = `<span class="hud-icon" title="${t(locale, "hud.pause")}">❚❚</span>`;
}
