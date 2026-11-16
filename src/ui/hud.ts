import { formatTime, t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import { bossEnemy, enemyMaxHp, nightPhase } from "../game/sim.js";
import { characterCopy, paintPortrait } from "./character-panel.js";
import { paintSkillIcon } from "../render/combat-fx.js";
import { playerStats, UPGRADES } from "../game/upgrades.js";
import { paintUpgradeIcon } from "../render/upgrade-icons.js";
import { upgradeName } from "./upgrade-cards.js";
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
  level: HTMLElement;
  xp: HTMLElement;
  upgrades: HTMLElement;
  boss: HTMLElement;
  bossName: HTMLElement;
}
/** The Eraser's paper-strip HP bar, shown only while it is on the page. */
function renderBoss(refs: HudRefs, locale: Locale, sim: SimState): void {
  const boss = bossEnemy(sim);
  refs.boss.classList.toggle("hidden", !boss);
  if (!boss) return;
  const max = enemyMaxHp(boss),
    name = t(locale, "boss.name");
  text(refs.bossName, name);
  refs.boss.style.setProperty("--boss", `${(boss.hp / max) * 100}%`);
  refs.boss.classList.toggle("boss-winding", !!boss.act && boss.act.t > 0);
  refs.boss.setAttribute(
    "aria-label",
    t(locale, "hud.boss", { name, hp: Math.ceil(boss.hp), max }),
  );
}
/** Owned cards as small code-drawn emblems with their level. */
function renderOwned(el: HTMLElement, locale: Locale, sim: SimState): void {
  const owned = UPGRADES.filter((u) => (sim.upgrades[u.id] ?? 0) > 0 && !u.filler),
    sig = `${locale}|${owned.map((u) => `${u.id}:${sim.upgrades[u.id]}`).join(",")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  el.replaceChildren(
    ...owned.map((u) => {
      const item = document.createElement("span"),
        icon = document.createElement("canvas"),
        lv = document.createElement("small");
      item.className = u.evolution ? "owned evolution" : "owned";
      item.title = upgradeName(locale, u.id);
      icon.width = 32;
      icon.height = 32;
      icon.setAttribute("aria-hidden", "true");
      paintUpgradeIcon(icon, u.id, true);
      lv.textContent = u.evolution ? "★" : String(sim.upgrades[u.id]);
      item.append(icon, lv);
      return item;
    }),
  );
}
function text(el: HTMLElement, value: string) {
  if (el.textContent !== value) el.textContent = value;
}
function html(el: HTMLElement, value: string) {
  if (el.innerHTML !== value) el.innerHTML = value;
}
export function renderHud(refs: HudRefs, locale: Locale, sim: SimState): void {
  const p = sim.player,
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
  text(refs.level, t(locale, "hud.level", { level: sim.level }));
  refs.xp.style.setProperty(
    "--xp",
    `${Math.min(100, (sim.xp / sim.xpToNext) * 100)}%`,
  );
  refs.xp.setAttribute(
    "aria-label",
    t(locale, "hud.xp", { xp: Math.floor(sim.xp), next: sim.xpToNext }),
  );
  renderOwned(refs.upgrades, locale, sim);
  renderBoss(refs, locale, sim);
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
    `${Math.max(0, 1 - p.dashCooldown / playerStats(sim).cooldown) * 100}%`,
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
