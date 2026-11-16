import { formatTime, t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import { character } from "../game/characters.js";
import { nightPhase } from "../game/sim.js";
import { characterCopy, paintPortrait } from "./character-panel.js";
import { paintSkillIcon } from "../render/combat-fx.js";
export interface HudRefs {
  time: HTMLElement;
  hearts: HTMLElement;
  dash: HTMLElement;
  pause: HTMLButtonElement;
  name: HTMLElement;
  portrait: HTMLCanvasElement;
  phase: HTMLElement;
  progress: HTMLElement;
  kills: HTMLElement;
  buff: HTMLElement;
  skill: HTMLButtonElement;
  skillName: HTMLElement;
  skillKey: HTMLElement;
  skillIcon: HTMLCanvasElement;
  notice: HTMLElement;
  hint: HTMLElement;
}
function text(el: HTMLElement, value: string) {
  if (el.textContent !== value) el.textContent = value;
}
function html(el: HTMLElement, value: string) {
  if (el.innerHTML !== value) el.innerHTML = value;
}
export function renderHud(refs: HudRefs, locale: Locale, sim: SimState): void {
  const p = sim.player,
    def = character(p.id),
    ready = p.dashCooldown <= 0;
  text(refs.time, formatTime(sim.timeLeft));
  refs.time.setAttribute(
    "aria-label",
    `${t(locale, "hud.time")} ${formatTime(sim.timeLeft)}`,
  );
  text(refs.name, p.id === "zero" ? "ZERO" : "NICOLE");
  if (refs.portrait.dataset.cat !== p.id) {
    paintPortrait(refs.portrait, p.id);
    paintSkillIcon(refs.skillIcon, p.id, "active");
    refs.portrait.dataset.cat = p.id;
  }
  html(
    refs.hearts,
    Array.from(
      { length: p.maxHp },
      (_, i) =>
        `<span class="heart ${i < p.hp ? "on" : "off"}" aria-hidden="true">♥</span>`,
    ).join(""),
  );
  refs.hearts.setAttribute(
    "aria-label",
    `${t(locale, "hud.hearts")} ${p.hp}/${p.maxHp}`,
  );
  text(refs.kills, `${t(locale, "hud.kills")}  ${sim.stats.kills}`);
  text(refs.phase, t(locale, `hud.phase${nightPhase(sim)}` as MessageKey));
  refs.progress.style.setProperty(
    "--dawn",
    `${(sim.elapsed / sim.sessionSeconds) * 100}%`,
  );
  const buff =
    p.shield > 0
      ? t(locale, "hud.shield", { count: p.shield })
      : p.empowerTime > 0
        ? t(locale, "hud.empowered", { time: p.empowerTime.toFixed(1) })
        : p.id === "nicole"
          ? t(locale, p.rescueUsed ? "hud.rescue_used" : "hud.rescue_ready")
          : characterCopy(locale, p.id, "role");
  text(refs.buff, buff);
  refs.buff.classList.toggle("buff-active", p.shield > 0 || p.empowerTime > 0);
  text(refs.skillName, characterCopy(locale, p.id, "active.name"));
  text(refs.skillKey, t(locale, "hud.space"));
  text(
    refs.dash,
    ready ? t(locale, "hud.ready") : `${p.dashCooldown.toFixed(1)}s`,
  );
  refs.skill.style.setProperty(
    "--charge",
    `${Math.max(0, 1 - p.dashCooldown / def.cooldown) * 100}%`,
  );
  refs.skill.classList.toggle("ready", ready);
  refs.skill.disabled = !ready;
  refs.skill.setAttribute(
    "aria-label",
    `${characterCopy(locale, p.id, "active.name")} · ${refs.dash.textContent}`,
  );
  refs.pause.setAttribute("aria-label", t(locale, "hud.pause"));
  refs.notice.classList.toggle("hidden", !sim.notice);
  if (sim.notice)
    text(refs.notice, t(locale, `notice.${sim.notice.kind}` as MessageKey));
  text(
    refs.hint,
    t(locale, "hud.skill_hint", {
      skill: characterCopy(locale, p.id, "active.name"),
      tactic: characterCopy(locale, p.id, "tactic"),
    }),
  );
  refs.hint.classList.toggle("hint-dismissed", sim.elapsed > 14);
  document.body.classList.toggle("low-health", p.hp <= 2);
}
