import { t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import {
  EVOLUTIONS,
  isEvolved,
  isWeapon,
  nextWeaponStep,
  upgradeDef,
  upgradeParams,
  type UpgradeId,
  type WeaponStat,
} from "../game/upgrades.js";
import { paintUpgradeCardArt } from "../render/upgrade-card-art.js";

export function upgradeName(locale: Locale, id: UpgradeId): string {
  return t(locale, `upgrade.${id}.name` as MessageKey);
}
export function upgradeDesc(locale: Locale, id: UpgradeId): string {
  return t(locale, `upgrade.${id}.desc` as MessageKey, upgradeParams(id));
}
/** What the next level of an owned weapon adds, from the same WEAPON_STEPS data. */
export function weaponStepText(locale: Locale, id: UpgradeId, owned: number): string {
  if (!isWeapon(id)) return "";
  const step = nextWeaponStep(id, owned);
  return (Object.keys(step) as WeaponStat[])
    .map((k) =>
      t(locale, `stat.${k}` as MessageKey, {
        n: k === "rate" ? Math.round(step[k]! * 100) : step[k]!,
      }),
    )
    .join(" · ");
}
/** Card text: a new item explains itself; an owned weapon lists its next step. */
function cardDesc(locale: Locale, id: UpgradeId, owned: number): string {
  return owned > 0 && isWeapon(id) ? weaponStepText(locale, id, owned) : upgradeDesc(locale, id);
}
function part<T extends Element>(root: Element, selector: string): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el as T;
}
/** Fills the three static card buttons from the pending choice. */
export function paintUpgradeCards(
  locale: Locale,
  sim: SimState,
  touch: boolean,
): void {
  const options = sim.pendingChoice?.options ?? [];
  const set = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  };
  set("upgrade-kicker", t(locale, "upgrade.kicker", { level: sim.level }));
  set("upgrade-title", t(locale, "upgrade.title"));
  set("upgrade-hint", t(locale, touch ? "upgrade.hint_touch" : "upgrade.hint"));
  const evo = isEvolved(sim) ? undefined : EVOLUTIONS.find((e) => e.cat === sim.player.id);
  for (let i = 0; i < 3; i++) {
    const card = document.getElementById(`upgrade-card-${i}`) as HTMLButtonElement | null;
    if (!card) continue;
    const id = options[i] as UpgradeId | undefined,
      def = id ? upgradeDef(id) : undefined;
    card.classList.toggle("hidden", !def);
    if (!id || !def) continue;
    const owned = sim.upgrades[id] ?? 0,
      slotted = def.slot === "weapon" || def.slot === "passive",
      evoPair = !!evo && (id === evo.passive || (id === evo.weapon && (sim.upgrades[evo.passive] ?? 0) > 0));
    card.dataset.pool = def.cat;
    card.dataset.slot = def.slot;
    card.classList.toggle("evolution", def.slot === "evolution");
    card.classList.toggle("evo-pair", evoPair);
    const kind = slotted ? t(locale, def.slot === "weapon" ? "upgrade.weapon" : "upgrade.passive") : "",
      kindLabel = part<HTMLElement>(card, ".card-kind"),
      name = upgradeName(locale, id);
    kindLabel.hidden = !kind;
    kindLabel.textContent = kind;
    part<HTMLElement>(card, ".card-pool").textContent = t(
      locale,
      evoPair ? "upgrade.evo_pair" : slotted && def.cat !== "any" ? "upgrade.signature" : "upgrade.shared",
    );
    part<HTMLElement>(card, ".card-name").textContent = name;
    const level = part<HTMLElement>(card, ".card-level");
    level.hidden = !slotted;
    part<HTMLElement>(level, ".card-level-label").textContent = owned === 0
      ? t(locale, "upgrade.new")
      : t(locale, "upgrade.level", { from: owned, to: owned + 1 });
    part<HTMLElement>(level, ".card-pips").replaceChildren(...Array.from({ length: slotted ? def.maxLevel : 0 }, (_, i) => {
      const pip = document.createElement("i");
      pip.classList.toggle("filled", i <= owned);
      return pip;
    }));
    const desc = cardDesc(locale, id, owned);
    part<HTMLElement>(card, ".card-desc").textContent = desc;
    part<HTMLElement>(card, "kbd").textContent = String(i + 1);
    const icon = part<HTMLCanvasElement>(card, ".card-icon");
    if (icon.dataset.id !== id) {
      icon.dataset.id = id;
      paintUpgradeCardArt(icon, id);
    }
    card.setAttribute("aria-label", `${i + 1}. ${kind ? `${kind} · ` : ""}${name}: ${desc}`);
  }
}
