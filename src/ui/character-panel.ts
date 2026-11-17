import type { CatId } from "../cats/types.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import { CATS } from "../defs/index.js";
import { catArt } from "../render/art-index.js";
import { paintSkillIcon } from "../render/combat-fx.js";
import { evolutionDef, START_WEAPON, type UpgradeId } from "../game/upgrades.js";

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
/** Starting weapon and evolution path, read from START_WEAPON and EVOLUTIONS. */
export function buildPath(locale: Locale, id: CatId): string {
  const evo = evolutionDef(id),
    name = (u: UpgradeId) => t(locale, `upgrade.${u}.name` as MessageKey);
  return `${t(locale, "selector.weapon")} · ${name(START_WEAPON[id]!)}  ${t(
    locale,
    "selector.evolution",
  )} · ${name(evo.id)}: ${t(locale, "evolution.rule", {
    weapon: name(evo.weapon),
    passive: name(evo.passive),
  })}`;
}
export function paintPortrait(canvas: HTMLCanvasElement, id: CatId): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 52);
  catArt(id).portrait(
    ctx,
    {
      id,
      x: 32,
      y: 48,
      facing: 1,
      moving: false,
      dashing: false,
      hurt: false,
      time: 0,
    },
    0.15,
  );
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
    b.setAttribute("aria-pressed", String(i === 0));
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 52;
    canvas.setAttribute("aria-hidden", "true");
    const label = document.createElement("span"),
      name = document.createElement("strong"),
      role = document.createElement("small"),
      check = document.createElement("i");
    name.className = "choice-name";
    role.className = "choice-role";
    label.append(name, role);
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    b.append(canvas, label, check);
    group.append(b);
    return b;
  });
}
export function paintCharacterPanel(locale: Locale, id: CatId): void {
  const set = (key: string, text: string) => {
    document.getElementById(key)!.textContent = text;
  };
  const stats = CATS.get(id).stats;
  document.body.dataset.cat = id;
  set("cat-choice-label", t(locale, "selector.title"));
  set("selector-kicker", t(locale, "selector.kicker"));
  set("profile-skill-key", t(locale, "hud.space"));
  set("profile-name", catName(locale, id));
  set("profile-role", characterCopy(locale, id, "role"));
  set("profile-story", characterCopy(locale, id, "story"));
  set("profile-hp", `${t(locale, "selector.hp")}  ${"♥".repeat(stats.maxHp)}`);
  set("profile-speed", `${t(locale, "selector.speed")}  ${stats.speed}`);
  set("profile-tactic", characterCopy(locale, id, "tactic"));
  set("profile-build", buildPath(locale, id));
  set("hero-name", catName(locale, id).toUpperCase());
  set("hero-role", characterCopy(locale, id, "role"));
  set("hero-kicker", t(locale, "selector.preview"));
  for (const b of buildCatTickets()) {
    const candidate = b.dataset.cat!;
    b.setAttribute("aria-pressed", String(candidate === id));
    b.querySelector(".choice-name")!.textContent = t(locale, `cat.${candidate}.choice` as MessageKey);
    b.querySelector(".choice-role")!.textContent = characterCopy(locale, candidate, "role");
    paintPortrait(b.querySelector("canvas")!, candidate);
  }
  paintPortrait(document.getElementById("profile-portrait") as HTMLCanvasElement, id);
  for (const kind of ["attack", "active", "passive"] as const) {
    set(`skill-${kind}-type`, t(locale, `selector.${kind}`));
    set(`skill-${kind}-name`, characterCopy(locale, id, `${kind}.name`));
    set(`skill-${kind}-desc`, characterCopy(locale, id, `${kind}.desc`));
    paintSkillIcon(document.getElementById(`icon-${kind}`) as HTMLCanvasElement, id, kind);
  }
  set("btn-start", t(locale, "title.start", characterValues(locale, id)));
}
