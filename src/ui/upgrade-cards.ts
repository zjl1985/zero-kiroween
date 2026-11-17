import { t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import {
  isWeapon,
  nextWeaponStep,
  upgradeDef,
  upgradeParams,
  type UpgradeId,
  type WeaponStat,
} from "../game/upgrades.js";
import { paintUpgradeIcon } from "../render/upgrade-icons.js";
import { paintWindowFlower, textSeed } from "../render/journal-ui.js";

/** Paper colour of each pool's window flower (matches the card --tone in styles.css). */
const FLOWER_TONE: Readonly<Record<string, string>> = {
  zero: "#c4553f",
  nicole: "#7d64b8",
  any: "#3f7f86",
  evolution: "#b8433d",
};

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
/** Filled and empty dots for the level after this pick. */
function levelDots(owned: number, max: number): string {
  return "●".repeat(Math.min(max, owned + 1)) + "○".repeat(Math.max(0, max - owned - 1));
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
  for (let i = 0; i < 3; i++) {
    const card = document.getElementById(`upgrade-card-${i}`) as HTMLButtonElement | null;
    if (!card) continue;
    const id = options[i] as UpgradeId | undefined,
      def = id ? upgradeDef(id) : undefined;
    card.classList.toggle("hidden", !def);
    if (!id || !def) continue;
    const owned = sim.upgrades[id] ?? 0,
      slotted = def.slot === "weapon" || def.slot === "passive";
    card.dataset.pool = def.cat;
    card.dataset.slot = def.slot;
    card.classList.toggle("evolution", def.slot === "evolution");
    const tag = slotted
      ? `${t(locale, def.slot === "weapon" ? "upgrade.weapon" : "upgrade.passive")} · ${t(
          locale,
          def.cat === "any" ? "upgrade.shared" : "upgrade.signature",
        )}`
      : t(locale, "upgrade.shared");
    part<HTMLElement>(card, ".card-tag").textContent = tag;
    part<HTMLElement>(card, ".card-name").textContent = upgradeName(locale, id);
    part<HTMLElement>(card, ".card-level").textContent = !slotted
      ? ""
      : owned === 0
        ? `${t(locale, "upgrade.new")}  ${levelDots(0, def.maxLevel)}`
        : `${t(locale, "upgrade.level", { from: owned, to: owned + 1 })}  ${levelDots(owned, def.maxLevel)}`;
    const desc = cardDesc(locale, id, owned);
    part<HTMLElement>(card, ".card-desc").textContent = desc;
    part<HTMLElement>(card, "kbd").textContent = String(i + 1);
    const icon = part<HTMLCanvasElement>(card, ".card-icon"),
      flower = part<HTMLCanvasElement>(card, ".card-flower");
    if (icon.dataset.id !== id) {
      paintUpgradeIcon(icon, id);
      icon.dataset.id = id;
    }
    // The paper-cut window flower: one layer, or two for an evolution.
    const evo = def.slot === "evolution";
    if (flower.dataset.id !== id) {
      paintWindowFlower(flower, FLOWER_TONE[evo ? "evolution" : def.cat], textSeed(id), evo);
      flower.dataset.id = id;
    }
    card.setAttribute("aria-label", `${i + 1}. ${upgradeName(locale, id)}: ${desc}`);
  }
}
