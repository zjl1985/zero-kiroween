import { formatTime, t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import { STATS } from "../game/types.js";
import { inkReveal } from "./ink.js";
import { bossEnemy, enemyMaxHp, nightPhase } from "../game/sim.js";
import { catName, characterCopy, paintPortrait } from "./character-panel.js";
import { catArt } from "../render/art-index.js";
import type { Camera } from "../render/camera.js";
import { BUILD, upgradeDef, type UpgradeId } from "../game/upgrades.js";
import { paintUpgradeIcon } from "../render/upgrade-icons.js";
import { paintUpgradeCardArt } from "../render/upgrade-card-art.js";
import { upgradeName } from "./upgrade-cards.js";
import { landmarks } from "../game/world-gen.js";
import { moonArc, SEAM_STITCHES, seamStitches, viewChunks } from "./journal-geometry.js";
import { lanternWidth, paintLanterns, paintMinimap, paintSkyArc } from "../render/journal-ui.js";
import { DEAL } from "../render/timeline.js";
import { environmentCopy } from "./environment-copy.js";
import { COSTUME_DEFS } from "../defs/index.js";
import { costumeCharge, costumeCopy } from "./wardrobe.js";

export interface HudRefs {
  time: HTMLElement;
  phase: HTMLElement;
  sky: HTMLCanvasElement;
  hearts: HTMLCanvasElement;
  name: HTMLElement;
  portrait: HTMLCanvasElement;
  kills: HTMLElement;
  buff: HTMLElement;
  map: HTMLCanvasElement;
  pause: HTMLButtonElement;
  hint: HTMLElement;
  level: HTMLElement;
  xp: HTMLElement;
  upgrades: HTMLElement;
  chest: HTMLElement;
  notice: HTMLElement;
  boss: HTMLElement;
  bossName: HTMLElement;
  streak: HTMLElement;
  banner: HTMLElement;
  bannerKicker: HTMLElement;
  bannerName: HTMLElement;
  bannerLine: HTMLElement;
  /** The worn costume's skill tag (hidden on a plain run). */
  costume: HTMLElement;
}
/** The worn costume's skill tag with a recharge fill; stays hidden on a plain run. */
function renderCostume(el: HTMLElement, locale: Locale, sim: SimState): void {
  const worn = sim.costume;
  if (!worn) {
    if (!el.classList.contains("hidden")) el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  const def = COSTUME_DEFS.get(worn.id),
    charge = costumeCharge(worn.timer, def.skill.cooldown),
    skill = costumeCopy(locale, worn.id, "skill");
  text(el, skill);
  const fill = `${Math.round(charge * 100)}%`;
  if (el.style.getPropertyValue("--charge") !== fill) el.style.setProperty("--charge", fill);
  el.classList.toggle("ready", charge >= 1);
  el.title = `${costumeCopy(locale, worn.id, "name")} · ${skill}`;
}
/** Keep the combat badge for actual state; the title already introduces the cat's role. */
function statusLine(locale: Locale, sim: SimState): string {
  const key = catArt(sim.player.id).status?.(sim);
  return key ? t(locale, key) : "";
}
/** Chunks each run has seen, kept outside the sim (presentation state only). */
const explored = new WeakMap<SimState, Set<number>>();
let motion: MediaQueryList | null = null;
function reduced(): boolean {
  motion ??= matchMedia("(prefers-reduced-motion: reduce)");
  return motion.matches;
}
/** Repaints a canvas only when its signature changes. */
function paintIf(canvas: HTMLCanvasElement, sig: string, paint: () => void): void {
  if (canvas.dataset.sig === sig) return;
  canvas.dataset.sig = sig;
  paint();
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
/** The Eraser as a worn eraser strip: its paper sleeve carries the name, the rubber wears down with its HP. */
function renderBoss(refs: HudRefs, locale: Locale, sim: SimState): void {
  const boss = bossEnemy(sim);
  refs.boss.classList.toggle("hidden", !boss);
  if (!boss) return;
  const max = enemyMaxHp(boss),
    name = t(locale, "boss.name");
  text(refs.bossName, name);
  refs.boss.style.setProperty("--boss", `${(boss.hp / max) * 100}%`);
  refs.boss.classList.toggle("boss-winding", !!boss.act && boss.act.t > 0);
  refs.boss.setAttribute("aria-label", t(locale, "hud.boss", { name, hp: Math.ceil(boss.hp), max }));
}
/** One owned item (or an empty slot) as a paper tag hanging from the seam. */
function slotTag(locale: Locale, sim: SimState, id: UpgradeId | undefined, slot: "weapon" | "passive"): HTMLElement {
  const tag = document.createElement("span");
  tag.className = `seam-tag ${slot}`;
  if (!id) {
    tag.classList.add("empty");
    return tag;
  }
  const def = upgradeDef(id),
    icon = document.createElement("canvas"),
    lv = document.createElement("small"),
    level = sim.upgrades[id] ?? 0,
    evo = def?.slot === "evolution";
  tag.classList.toggle("evolution", evo);
  tag.title = upgradeName(locale, id);
  icon.width = 32;
  icon.height = 32;
  icon.setAttribute("aria-hidden", "true");
  paintUpgradeIcon(icon, id, true);
  lv.textContent = evo ? "★" : def && level >= def.maxLevel ? t(locale, "upgrade.max") : String(level);
  tag.append(icon, lv);
  return tag;
}
/** Weapon tags then passive tags along the seam, empty slots included. */
function renderOwned(el: HTMLElement, locale: Locale, sim: SimState): void {
  const { weapons, passives } = sim.build,
    sig = `${locale}|${[...weapons, "|", ...passives].map((id) => `${id}:${sim.upgrades[id] ?? 0}`).join(",")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  const group = (label: MessageKey, ids: string[], slots: number, slot: "weapon" | "passive") => {
    const g = document.createElement("span");
    g.className = `tag-group ${slot}`;
    g.setAttribute("role", "group");
    g.setAttribute("aria-label", t(locale, label));
    g.append(...Array.from({ length: slots }, (_, i) => slotTag(locale, sim, ids[i] as UpgradeId | undefined, slot)));
    return g;
  };
  el.replaceChildren(
    group("hud.weapons", weapons, BUILD.weaponSlots, "weapon"),
    group("hud.passives", passives, BUILD.passiveSlots, "passive"),
  );
}
/** What the last chest gave, while state.chestReveal lasts; every reward shows its full-colour icon. */
function renderChest(el: HTMLElement, locale: Locale, sim: SimState): void {
  const r = sim.chestReveal;
  el.classList.toggle("hidden", !r);
  if (!r) {
    el.dataset.sig = "";
    el.classList.remove("dealt");
    return;
  }
  const entries: { id: UpgradeId; label: string; evolved?: boolean }[] = [
    ...(r.evolved
      ? [{ id: r.evolved as UpgradeId, label: t(locale, "chest.evolved", { name: upgradeName(locale, r.evolved as UpgradeId) }), evolved: true }]
      : []),
    ...r.items.map((i) => ({
      id: i.id as UpgradeId,
      label: t(locale, "chest.level", { name: upgradeName(locale, i.id as UpgradeId), level: i.level }),
    })),
    ...(r.healed && r.healed > 0
      ? [{ id: "vitality" as UpgradeId, label: t(locale, "chest.heal", { amount: r.healed }) }]
      : []),
  ];
  const sig = `${locale}|${r.big}|${sim.stats.chestsOpened}|${entries.map((e) => e.label).join("|")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  const title = document.createElement("strong");
  title.textContent = t(locale, r.big ? "chest.big_title" : "chest.title");
  const list = document.createElement("div");
  list.className = "chest-rows";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = entry.evolved ? "chest-row chest-row-evolved" : "chest-row";
    const icon = document.createElement("canvas");
    icon.className = "chest-icon";
    icon.width = icon.height = 64;
    icon.dataset.id = entry.id;
    icon.setAttribute("aria-hidden", "true");
    paintUpgradeCardArt(icon, entry.id);
    const label = document.createElement("span");
    label.textContent = entry.label;
    row.append(icon, label);
    list.append(row);
  }
  el.classList.toggle("evolved", !!r.evolved);
  el.classList.toggle("big", r.big);
  el.replaceChildren(title, list);
  el.style.setProperty("--stagger", `${DEAL.staggerMs}ms`);
  el.classList.remove("dealt");
  void el.offsetWidth;
  el.classList.add("dealt");
}
/** XP as a seam sewn stitch by stitch; the level sits in a paper button. */
function renderSeam(refs: HudRefs, locale: Locale, sim: SimState): void {
  text(refs.level, t(locale, "hud.level", { level: sim.level }));
  refs.level.setAttribute("aria-label", t(locale, "hud.level", { level: sim.level }));
  if (refs.xp.childElementCount !== SEAM_STITCHES)
    refs.xp.replaceChildren(...Array.from({ length: SEAM_STITCHES }, () => document.createElement("b")));
  const sewn = seamStitches(sim.xp, sim.xpToNext);
  if (refs.xp.dataset.sewn !== String(sewn)) {
    refs.xp.dataset.sewn = String(sewn);
    Array.from(refs.xp.children).forEach((b, i) => b.classList.toggle("on", i < sewn));
  }
  const label = t(locale, "hud.xp", { xp: Math.floor(sim.xp), next: sim.xpToNext });
  refs.xp.dataset.label = label;
  refs.xp.setAttribute("aria-label", label);
  refs.xp.setAttribute("aria-valuemin", "0");
  refs.xp.setAttribute("aria-valuemax", String(sim.xpToNext));
  refs.xp.setAttribute("aria-valuenow", String(Math.min(sim.xp, sim.xpToNext)));
}
/** Folded paper minimap: explored chunks, landmarks, chests and the Eraser. */
function renderMap(refs: HudRefs, locale: Locale, sim: SimState, camera: Camera): void {
  const p = sim.player;
  let seen = explored.get(sim);
  if (!seen) explored.set(sim, (seen = new Set()));
  for (const i of viewChunks(camera.x, camera.y, camera.width, camera.height)) seen.add(i);
  const boss = bossEnemy(sim),
    chests = sim.chests.filter((c) => c.alive),
    sig = [
      sim.seed,
      camera.width, camera.height,
      Math.round(camera.x / 40), Math.round(camera.y / 40),
      Math.round(p.x / 40),
      Math.round(p.y / 40),
      seen.size,
      sim.landmarksFound.length,
      chests.map((c) => c.id).join("."),
      boss ? `${Math.round(boss.x / 40)},${Math.round(boss.y / 40)}` : "",
      p.id,
    ].join("|");
  paintIf(refs.map, sig, () =>
    paintMinimap(refs.map, {
      player: p,
      camera,
      accent: catArt(p.id).colors.hud,
      explored: seen,
      landmarks: landmarks(sim.seed),
      found: sim.landmarksFound,
      chests,
      boss: boss ? { x: boss.x, y: boss.y } : null,
    }),
  );
  refs.map.setAttribute(
    "aria-label",
    t(locale, "hud.map", { found: sim.landmarksFound.length, total: landmarks(sim.seed).length }),
  );
}
function text(el: HTMLElement, value: string) {
  if (el.textContent !== value) el.textContent = value;
}
export function renderHud(refs: HudRefs, locale: Locale, sim: SimState, camera: Camera = sim.player): void {
  const p = sim.player,
    still = reduced(),
    clock = still ? 0 : sim.elapsed;
  // Moon arc: the moon walks the dotted arc and turns into the sun at dawn.
  const arc = moonArc(sim.elapsed, sim.sessionSeconds),
    dawnShare = Math.min(1, STATS.dawnSeconds / sim.sessionSeconds);
  text(refs.time, formatTime(sim.timeLeft));
  refs.time.setAttribute("aria-label", `${t(locale, "hud.time")} ${formatTime(sim.timeLeft)}`);
  text(refs.phase, t(locale, arc.dawn ? "hud.dawn" : (`hud.phase${nightPhase(sim)}` as MessageKey)));
  paintIf(refs.sky, `${arc.dawn}|${Math.round(arc.t * 480)}`, () => paintSkyArc(refs.sky, arc, dawnShare));
  // Lantern string: one lantern per max heart, unlit when lost; shield charges as paper rings.
  const critical = p.hp <= 1 && sim.ended !== "won",
    lw = lanternWidth(p.maxHp, p.shield);
  if (refs.hearts.width !== lw * 2) {
    refs.hearts.width = lw * 2;
    refs.hearts.height = 80;
    refs.hearts.dataset.sig = "";
  }
  paintIf(
    refs.hearts,
    `${p.hp}|${p.maxHp}|${p.shield}|${critical}|${Math.floor(clock * 12)}`,
    () => paintLanterns(refs.hearts, { hp: p.hp, maxHp: p.maxHp, shield: p.shield, critical, time: clock }),
  );
  refs.hearts.setAttribute(
    "aria-label",
    `${t(locale, "hud.hearts")} ${p.hp}/${p.maxHp}${p.shield > 0 ? ` · ${t(locale, "hud.shield", { count: p.shield })}` : ""}`,
  );
  text(refs.name, catName(locale, p.id).toUpperCase());
  const look = sim.costume ? `${p.id}|${sim.costume.id}` : p.id;
  if (refs.portrait.dataset.cat !== look) {
    paintPortrait(refs.portrait, p.id, sim.costume?.id);
    refs.portrait.dataset.cat = look;
  }
  renderCostume(refs.costume, locale, sim);
  text(refs.kills, `${t(locale, "hud.kills")} ${sim.stats.kills}`);
  const environment = environmentCopy(locale, sim);
  const buff = environment.status ?? (
    p.shield > 0
      ? t(locale, "hud.shield", { count: p.shield })
      : p.empowerTime > 0
        ? t(locale, "hud.empowered", { time: p.empowerTime.toFixed(1) })
        : statusLine(locale, sim));
  text(refs.buff, buff);
  refs.buff.classList.toggle("hidden", !buff);
  refs.buff.classList.toggle("buff-burning", environment.danger);
  refs.buff.classList.toggle("buff-wet", (p.wetTime ?? 0) > 0);
  refs.buff.classList.toggle("buff-active", p.shield > 0 || p.empowerTime > 0);
  renderSeam(refs, locale, sim);
  renderOwned(refs.upgrades, locale, sim);
  renderChest(refs.chest, locale, sim);
  renderBoss(refs, locale, sim);
  renderMap(refs, locale, sim, camera);
  refs.pause.setAttribute("aria-label", t(locale, "hud.pause"));
  renderNotice(refs, locale, sim);
  renderStreak(refs, locale, sim);
  renderBanner(refs, locale, sim);
  text(
    refs.hint,
    environment.hint ?? characterCopy(locale, p.id, "tactic"),
  );
  refs.hint.classList.toggle("context-hint", !!environment.hint);
  refs.hint.classList.toggle("danger-hint", environment.danger);
  refs.hint.classList.toggle("hint-dismissed", !environment.hint && sim.elapsed > 14);
  document.body.classList.toggle("low-health", p.hp <= 2);
  document.body.classList.toggle("critical-health", critical);
  document.body.classList.toggle("is-hurt", p.invuln > 0 && sim.ended === "playing");
  document.body.classList.toggle("is-dawn", sim.ended === "won" || arc.dawn);
}
