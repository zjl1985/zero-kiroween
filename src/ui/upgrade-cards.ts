import { t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import {
  upgradeDef,
  upgradeParams,
  type UpgradeId,
} from "../game/upgrades.js";
import { paintUpgradeIcon } from "../render/upgrade-icons.js";

export function upgradeName(locale: Locale, id: UpgradeId): string {
  return t(locale, `upgrade.${id}.name` as MessageKey);
}
export function upgradeDesc(locale: Locale, id: UpgradeId): string {
  return t(locale, `upgrade.${id}.desc` as MessageKey, upgradeParams(id));
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
    const owned = sim.upgrades[id] ?? 0;
    card.dataset.pool = def.cat;
    card.classList.toggle("evolution", !!def.evolution);
    part<HTMLElement>(card, ".card-tag").textContent = def.evolution
      ? t(locale, "upgrade.evolution")
      : t(locale, def.cat === "any" ? "upgrade.shared" : "upgrade.signature");
    part<HTMLElement>(card, ".card-name").textContent = upgradeName(locale, id);
    part<HTMLElement>(card, ".card-level").textContent =
      owned === 0 && def.maxLevel > 1
        ? t(locale, "upgrade.new")
        : def.maxLevel > 1 && !def.filler
          ? t(locale, "upgrade.level", { from: owned, to: owned + 1 })
          : "";
    part<HTMLElement>(card, ".card-desc").textContent = upgradeDesc(locale, id);
    part<HTMLElement>(card, "kbd").textContent = String(i + 1);
    const icon = part<HTMLCanvasElement>(card, "canvas");
    if (icon.dataset.id !== id) {
      paintUpgradeIcon(icon, id);
      icon.dataset.id = id;
    }
    card.setAttribute(
      "aria-label",
      `${i + 1}. ${upgradeName(locale, id)}: ${upgradeDesc(locale, id)}`,
    );
  }
}
