import type { CatId } from "../cats/types.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import { CATS } from "../defs/index.js";
import { catArt } from "../render/art-index.js";
import { paintSkillIcon } from "../render/combat-fx.js";
import { paintPaw } from "../render/journal-ui.js";
import { paintPlaybillPortrait } from "../render/playbill-stage.js";
import { evolutionDef, type UpgradeId } from "../game/upgrades.js";
import type { CostumeId } from "../defs/types.js";
import type { CostumeProgress } from "../game/costumes.js";
import { paintCatPortrait, paintCostumeGlyph, paintLockedCover } from "../render/wardrobe-art.js";
import { costumeCopy, wardrobeEntries } from "./wardrobe.js";

/** The cat's display name, through i18n (`<prefix>.name`). */
export function catName(locale: Locale, id: CatId): string {
  return t(locale, `${CATS.get(id).i18n}.name` as MessageKey);
}
/** Numbers the kit copy cites: the cat's base stats plus every cat's copy params. */
export function characterValues(locale: Locale, id: CatId): Record<string, string | number> {
  const d = CATS.get(id).stats,
    values: Record<string, string | number> = {
      name: catName(locale, id),
      hp: d.maxHp,
      speed: d.speed,
      cooldown: d.cooldown,
    };
  for (const cat of CATS.all()) Object.assign(values, cat.copyParams?.());
  return values;
}
export function characterCopy(
  locale: Locale,
  id: CatId,
  part:
    | "role"
    | "story"
    | "tactic"
    | "attack.name"
    | "attack.desc"
    | "active.short"
    | "active.name"
    | "active.desc"
    | "passive.name"
    | "passive.desc",
): string {
  return t(locale, `${CATS.get(id).i18n}.${part}` as MessageKey, characterValues(locale, id));
}
/** The evolution path uses the registered base weapon and matching passive. */
export function buildPath(locale: Locale, id: CatId): string {
  const evo = evolutionDef(id),
    name = (u: UpgradeId) => t(locale, `upgrade.${u}.name` as MessageKey);
  return `${t(locale, "selector.evolution")} · ${name(evo.id)} · ${t(locale, "evolution.rule", {
    weapon: name(evo.weapon),
    passive: name(evo.passive),
  })}`;
}
export function paintPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: CostumeId | null): void {
  paintCatPortrait(canvas, id, costume);
}
/**
 * One playbill ticket per registered cat, in registration order, inside the
 * `.cat-choices` group. Safe to call again; existing tickets are kept.
 */
export function buildCatTickets(): readonly HTMLButtonElement[] {
  const group = document.querySelector<HTMLElement>(".cat-choices")!;
  return CATS.all().map((cat, i) => {
    const id = `btn-cat-${cat.id}`;
    let b = document.getElementById(id) as HTMLButtonElement | null;
    if (b) return b;
    b = document.createElement("button");
    b.type = "button";
    b.id = id;
    b.className = "cat-choice ticket";
    b.dataset.cat = cat.id;
    b.style.setProperty("--ticket-tone", catArt(cat.id).colors.hud);
    b.setAttribute("aria-pressed", String(i === 0));
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 52;
    canvas.className = "choice-portrait";
    canvas.setAttribute("aria-hidden", "true");
    const label = document.createElement("span"),
      name = document.createElement("strong"),
      role = document.createElement("small"),
      seal = document.createElement("canvas");
    name.className = "choice-name";
    role.className = "choice-role";
    label.append(name, role);
    seal.className = "choice-seal";
    seal.width = seal.height = 64;
    seal.setAttribute("aria-hidden", "true");
    paintPaw(seal, "#9b3e36", i + 2);
    b.append(canvas, label, seal);
    group.append(b);
    return b;
  });
}
export function paintCharacterPanel(
  locale: Locale,
  id: CatId,
  costume: CostumeId | null = null,
  progress?: CostumeProgress,
): void {
  const set = (key: string, text: string) => {
    document.getElementById(key)!.textContent = text;
  };
  const stats = CATS.get(id).stats;
  document.body.dataset.cat = id;
  set("cat-choice-label", t(locale, "selector.title"));
  set("selector-kicker", t(locale, "selector.kicker"));
  set("profile-name", catName(locale, id));
  set("profile-role", characterCopy(locale, id, "role"));
  set("profile-story", characterCopy(locale, id, "story"));
  set("profile-hp", `${t(locale, "selector.hp")}  ${"♥".repeat(stats.maxHp)}`);
  set("profile-speed", `${t(locale, "selector.speed")}  ${stats.speed}`);
  set("profile-tactic", characterCopy(locale, id, "tactic"));
  set("profile-build", buildPath(locale, id));
  set("hero-name", catName(locale, id).toUpperCase());
  set("hero-role", characterCopy(locale, id, "role"));
  for (const b of buildCatTickets()) {
    const candidate = b.dataset.cat!;
    b.setAttribute("aria-pressed", String(candidate === id));
    b.querySelector(".choice-name")!.textContent = t(locale, `cat.${candidate}.choice` as MessageKey);
    b.querySelector(".choice-role")!.textContent = characterCopy(locale, candidate, "role");
    const portrait = b.querySelector<HTMLCanvasElement>(".choice-portrait")!;
    if (!portrait.dataset.cat) {
      paintPortrait(portrait, candidate);
      portrait.dataset.cat = candidate;
    }
  }
  const stage = document.getElementById("profile-portrait") as HTMLCanvasElement,
    stageSig = costume ? `${id}|${costume}` : id;
  if (stage.dataset.cat !== stageSig) {
    paintPlaybillPortrait(stage, id, costume);
    stage.dataset.cat = stageSig;
  }
  if (progress) paintWardrobe(locale, id, costume, progress);
  for (const kind of ["attack", "passive"] as const) {
    set(`skill-${kind}-type`, t(locale, `selector.${kind}`));
    set(`skill-${kind}-name`, characterCopy(locale, id, `${kind}.name`));
    set(`skill-${kind}-desc`, characterCopy(locale, id, `${kind}.desc`));
    paintSkillIcon(document.getElementById(`icon-${kind}`) as HTMLCanvasElement, id, kind);
  }
  set("btn-start", t(locale, "title.start", characterValues(locale, id)));
}

/** Ticket element id of a wardrobe entry (null is the plain look). */
export const wardrobeTicketId = (costume: CostumeId | null) => `btn-costume-${costume ?? "none"}`;
/**
 * One wardrobe ticket per entry (plain first, then the costumes in wardrobe
 * order) inside `.wardrobe-strip`. Safe to call again; existing tickets are kept.
 * `dataset.costume` is the costume id, empty for the plain look.
 */
export function buildWardrobe(): readonly HTMLButtonElement[] {
  const strip = document.querySelector<HTMLElement>(".wardrobe-strip")!;
  return wardrobeEntries({ nights: 0, wins: 0, unlocked: [] }).map(({ id: costume }) => {
    const id = wardrobeTicketId(costume);
    let b = document.getElementById(id) as HTMLButtonElement | null;
    if (b) return b;
    b = document.createElement("button");
    b.type = "button";
    b.id = id;
    b.className = "wardrobe-ticket";
    b.dataset.costume = costume ?? "";
    const portrait = document.createElement("canvas");
    portrait.width = 64;
    portrait.height = 52;
    portrait.className = "wardrobe-portrait";
    portrait.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span"),
      name = document.createElement("strong"),
      skill = document.createElement("small"),
      desc = document.createElement("small");
    copy.className = "wardrobe-copy";
    name.className = "wardrobe-name";
    skill.className = "wardrobe-skill";
    desc.className = "wardrobe-desc";
    copy.append(name, skill, desc);
    b.append(portrait, copy);
    if (costume) {
      const glyph = document.createElement("canvas");
      glyph.width = glyph.height = 64;
      glyph.className = "wardrobe-glyph";
      glyph.setAttribute("aria-hidden", "true");
      paintCostumeGlyph(glyph, costume);
      b.append(glyph);
    }
    strip.append(b);
    return b;
  });
}
/** Wardrobe copy, pressed / locked states and portraits of the chosen cat in each costume. */
export function paintWardrobe(locale: Locale, cat: CatId, worn: CostumeId | null, progress: CostumeProgress): void {
  document.getElementById("wardrobe-label")!.textContent = t(locale, "selector.wardrobe");
  const entries = wardrobeEntries(progress),
    tickets = buildWardrobe();
  tickets.forEach((b, i) => {
    const { id, unlocked } = entries[i]!,
      name = costumeCopy(locale, id, "name"),
      skill = id === null ? characterCopy(locale, cat, "role") : unlocked ? costumeCopy(locale, id, "skill") : t(locale, "costume.locked"),
      desc = id === null ? "" : unlocked ? costumeCopy(locale, id, "desc") : costumeCopy(locale, id, "unlock");
    b.setAttribute("aria-pressed", String(id === worn));
    b.setAttribute("aria-disabled", String(!unlocked));
    b.classList.toggle("locked", !unlocked);
    b.querySelector(".wardrobe-name")!.textContent = name;
    b.querySelector(".wardrobe-skill")!.textContent = skill;
    b.querySelector(".wardrobe-desc")!.textContent = desc;
    b.setAttribute("aria-label", [name, skill, desc].filter(Boolean).join(" · "));
    const portrait = b.querySelector<HTMLCanvasElement>(".wardrobe-portrait")!,
      sig = unlocked ? `${cat}|${id ?? ""}` : "locked";
    if (portrait.dataset.sig !== sig) {
      portrait.dataset.sig = sig;
      if (unlocked) paintPortrait(portrait, cat, id);
      else paintLockedCover(portrait);
    }
  });
}
