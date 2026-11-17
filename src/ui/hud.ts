import { formatTime, t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import { STATS } from "../game/types.js";
import { inkReveal } from "./ink.js";
import { bossEnemy, enemyMaxHp, nightPhase } from "../game/sim.js";
import { characterCopy, paintPortrait } from "./character-panel.js";
import { paintSkillIcon } from "../render/combat-fx.js";
import { BUILD, playerStats, upgradeDef, type UpgradeId } from "../game/upgrades.js";
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
  chest: HTMLElement;
  boss: HTMLElement;
  bossName: HTMLElement;
  streak: HTMLElement;
  banner: HTMLElement;
  bannerKicker: HTMLElement;
  bannerName: HTMLElement;
  bannerLine: HTMLElement;
}
/** Kill-chain badge: a paper tag that bumps on every kill in the chain. */
function renderStreak(refs: HudRefs, locale: Locale, sim: SimState): void {
  const n = sim.streak.count,
    on = n >= STATS.streakShow;
  refs.streak.classList.toggle("hidden", !on);
  if (!on) {
    refs.streak.dataset.count = "";
    return;
  }
  text(refs.streak.querySelector("strong")!, t(locale, "hud.streak", { count: n }));
  text(refs.streak.querySelector("span")!, t(locale, "hud.streak_label"));
  refs.streak.classList.toggle("hot", n >= STATS.streakMilestone);
  if (refs.streak.dataset.count !== String(n)) {
    refs.streak.dataset.count = String(n);
    refs.streak.classList.remove("bump");
    void refs.streak.offsetWidth;
    refs.streak.classList.add("bump");
  }
}
/** Boss intro: a pleated pamphlet that unfolds while the arrival notice is up. */
function renderBanner(refs: HudRefs, locale: Locale, sim: SimState): void {
  const on = sim.notice?.kind === "boss-incoming";
  refs.banner.classList.toggle("hidden", !on);
  if (!on) return;
  text(refs.bannerKicker, t(locale, "boss.intro"));
  inkReveal(refs.bannerName, t(locale, "boss.name"));
  text(refs.bannerLine, t(locale, "boss.intro_line"));
}
/** Ribbon notices for phase changes; every new notice replays its pop-in. */
function renderNotice(refs: HudRefs, locale: Locale, sim: SimState): void {
  const n = sim.notice;
  refs.notice.classList.toggle("hidden", !n);
  if (!n) {
    refs.notice.dataset.kind = "";
    return;
  }
  text(refs.notice, t(locale, `notice.${n.kind}` as MessageKey));
  refs.notice.classList.toggle("ribbon", n.kind.startsWith("phase"));
  const key = `${n.kind}`,
    renewed = n.life > Number(refs.notice.dataset.life ?? 0) + 0.001;
  refs.notice.dataset.life = String(n.life);
  if (refs.notice.dataset.kind !== key || renewed) {
    refs.notice.dataset.kind = key;
    refs.notice.classList.remove("pop");
    void refs.notice.offsetWidth;
    refs.notice.classList.add("pop");
  }
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
/** One owned item (or an empty slot) as a small code-drawn emblem with its level. */
function slotItem(locale: Locale, sim: SimState, id: UpgradeId | undefined): HTMLElement {
  const item = document.createElement("span");
  if (!id) {
    item.className = "owned empty";
    return item;
  }
  const def = upgradeDef(id),
    icon = document.createElement("canvas"),
    lv = document.createElement("small"),
    level = sim.upgrades[id] ?? 0,
    evo = def?.slot === "evolution";
  item.className = evo ? "owned evolution" : "owned";
  item.title = upgradeName(locale, id);
  icon.width = 32;
  icon.height = 32;
  icon.setAttribute("aria-hidden", "true");
  paintUpgradeIcon(icon, id, true);
  lv.textContent = evo ? "★" : def && level >= def.maxLevel ? t(locale, "upgrade.max") : String(level);
  item.append(icon, lv);
  return item;
}
/** Weapon slots and passive slots as two rows, empty slots included. Temporary until the HUD redesign. */
function renderOwned(el: HTMLElement, locale: Locale, sim: SimState): void {
  const { weapons, passives } = sim.build,
    sig = `${locale}|${[...weapons, "|", ...passives].map((id) => `${id}:${sim.upgrades[id] ?? 0}`).join(",")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  const row = (label: MessageKey, ids: string[], slots: number) => {
    const r = document.createElement("div"),
      name = document.createElement("span");
    r.className = "slot-row";
    name.className = "slot-label";
    name.textContent = t(locale, label);
    r.append(
      name,
      ...Array.from({ length: slots }, (_, i) => slotItem(locale, sim, ids[i] as UpgradeId | undefined)),
    );
    return r;
  };
  el.replaceChildren(
    row("hud.weapons", weapons, BUILD.weaponSlots),
    row("hud.passives", passives, BUILD.passiveSlots),
  );
}
/** What the last chest gave, while state.chestReveal lasts. */
function renderChest(el: HTMLElement, locale: Locale, sim: SimState): void {
  const r = sim.chestReveal;
  el.classList.toggle("hidden", !r);
  if (!r) {
    el.dataset.sig = "";
    return;
  }
  const lines = [
    ...(r.evolved
      ? [t(locale, "chest.evolved", { name: upgradeName(locale, r.evolved as UpgradeId) })]
      : []),
    ...r.items.map((i) =>
      t(locale, "chest.level", { name: upgradeName(locale, i.id as UpgradeId), level: i.level }),
    ),
  ];
  const sig = `${locale}|${r.big}|${lines.join("|")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  const title = document.createElement("strong");
  title.textContent = t(locale, r.big ? "chest.big_title" : "chest.title");
  el.classList.toggle("evolved", !!r.evolved);
  el.replaceChildren(
    title,
    ...lines.map((line) => {
      const s = document.createElement("span");
      s.textContent = line;
      return s;
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
  renderChest(refs.chest, locale, sim);
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
  renderNotice(refs, locale, sim);
  renderStreak(refs, locale, sim);
  renderBanner(refs, locale, sim);
  text(
    refs.hint,
    t(locale, "hud.skill_hint", {
      skill: characterCopy(locale, p.id, "active.name"),
      tactic: characterCopy(locale, p.id, "tactic"),
    }),
  );
  refs.hint.classList.toggle("hint-dismissed", sim.elapsed > 14);
  document.body.classList.toggle("low-health", p.hp <= 2);
  document.body.classList.toggle("critical-health", p.hp <= 1 && sim.ended !== "won");
  // Glowcap: the paper moon flips to a sun as dawn arrives.
  document.body.classList.toggle(
    "is-dawn",
    sim.ended === "won" || nightPhase(sim) === 3,
  );
}
