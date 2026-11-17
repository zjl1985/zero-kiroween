/**
 * Facade over the registered weapons, passives and evolutions
 * (src/defs/weapons, src/defs/passives, src/defs/evolutions).
 *
 * The build, survivors style: weapons and passives fill separate slots,
 * weapons level up step by step, and an evolution needs a max-level weapon
 * plus its paired passive and is granted only by opening a chest.
 */
import "../defs/index.js";
import { BUILD, XP, xpForLevel } from "../defs/progression.js";
import { CATS, EVOLUTION_DEFS, PASSIVE_DEFS, WEAPON_DEFS } from "../defs/registries.js";
import { stepBonus } from "../defs/weapons/steps.js";
import type {
  CatId,
  EvolutionDef,
  UpgradeId,
  UpgradePool,
  UpgradeValueMap,
  WeaponBaseMap,
  WeaponId,
  WeaponStep,
} from "../defs/types.js";
import type { SimState } from "./types.js";

export { BUILD, XP, xpForLevel };
export { playerStats, type PlayerStats } from "./stats.js";
export type { EvolutionDef, UpgradeId, UpgradePool, WeaponId, WeaponStat, WeaponStep } from "../defs/types.js";

export type UpgradeSlot = "weapon" | "passive" | "evolution" | "filler";
export interface UpgradeDef {
  id: UpgradeId;
  cat: UpgradePool;
  slot: UpgradeSlot;
  maxLevel: number;
}

const plainWeapons = WEAPON_DEFS.all().filter((w) => w.kind === "weapon");
const weaponMax = (id: WeaponId) => WEAPON_DEFS.get(id).steps!.length + 1;

/** Each cat starts with its own weapon at level 1. */
export const START_WEAPON: Readonly<Record<CatId, WeaponId>> = Object.fromEntries(
  CATS.all().map((c) => [c.id, c.startWeapon]),
);
/** WEAPON_STEPS[id][i] is what the weapon gains going from level i + 1 to i + 2. */
export const WEAPON_STEPS: Readonly<Record<WeaponId, readonly WeaponStep[]>> = Object.fromEntries(
  plainWeapons.map((w) => [w.id, w.steps!]),
);
/**
 * Level-1 numbers of the weapons that carry their own. Meow-bolt and
 * moon-stars start from CHARACTERS (zero / nicole).
 */
export const WEAPONS = Object.fromEntries(
  plainWeapons.filter((w) => w.base).map((w) => [w.id, w.base!]),
) as unknown as WeaponBaseMap;
/** Card order: weapons, passives, evolutions, then the filler. */
export const UPGRADES: readonly UpgradeDef[] = [
  ...plainWeapons.map((w) => ({ id: w.id, cat: w.pool, slot: "weapon" as const, maxLevel: weaponMax(w.id) })),
  ...PASSIVE_DEFS.all()
    .filter((p) => !p.filler)
    .map((p) => ({ id: p.id, cat: p.pool, slot: "passive" as const, maxLevel: p.maxLevel })),
  ...EVOLUTION_DEFS.all().map((e) => ({ id: e.id, cat: e.cat, slot: "evolution" as const, maxLevel: 1 })),
  ...PASSIVE_DEFS.all()
    .filter((p) => p.filler)
    .map((p) => ({ id: p.id, cat: p.pool, slot: "filler" as const, maxLevel: p.maxLevel })),
];
export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);
/** Echo Legion: max Meow Bolt + Long Shadow. Full Moon: max Moon Stars + Deep Fold. */
export const EVOLUTIONS: readonly EvolutionDef[] = EVOLUTION_DEFS.all();
/** Per-level amounts of passives, evolutions and the filler. */
export const UPGRADE_VALUES = Object.fromEntries([
  ...PASSIVE_DEFS.all().map((p) => [p.id, p.values]),
  ...WEAPON_DEFS.all()
    .filter((w) => w.values)
    .map((w) => [w.id, w.values!]),
]) as unknown as UpgradeValueMap;

const BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));
export function upgradeDef(id: string): UpgradeDef | undefined {
  return BY_ID.get(id);
}
export function levelOf(state: SimState, id: UpgradeId): number {
  return state.upgrades[id] ?? 0;
}
export function evolutionDef(cat: CatId): EvolutionDef {
  return EVOLUTIONS.find((e) => e.cat === cat)!;
}
export function evolutionFor(cat: CatId): UpgradeId {
  return evolutionDef(cat).id;
}
export function isEvolved(state: SimState): boolean {
  return levelOf(state, evolutionFor(state.player.id)) > 0;
}
/** The chosen cat's evolution when its weapon is maxed and its passive owned. */
export function readyEvolution(state: SimState): EvolutionDef | undefined {
  const evo = evolutionDef(state.player.id);
  if (levelOf(state, evo.id) > 0) return undefined;
  if (levelOf(state, evo.weapon) < weaponMax(evo.weapon)) return undefined;
  return levelOf(state, evo.passive) > 0 ? evo : undefined;
}
/** Sum of the weapon steps reached at `level` (level 1 adds nothing). */
export function weaponBonus(id: WeaponId, level: number): Required<WeaponStep> {
  return stepBonus(WEAPON_STEPS[id]!, level);
}
/** What the next level of an owned weapon adds; empty at max level. */
export function nextWeaponStep(id: WeaponId, owned: number): WeaponStep {
  return WEAPON_STEPS[id]![owned - 1] ?? {};
}
export function isWeapon(id: string): id is WeaponId {
  return id in WEAPON_STEPS;
}
/** Numbers shown on a card for one level. Used by i18n descriptions. */
export function upgradeParams(id: UpgradeId): Record<string, number> {
  if (isWeapon(id)) return { ...(WEAPON_DEFS.get(id).base ?? {}) };
  const passive = PASSIVE_DEFS.find(id),
    v = passive?.values ?? WEAPON_DEFS.get(id).values ?? {},
    percent = passive?.percent ?? false,
    out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) out[k] = percent ? Math.round(n * 100) : n;
  return out;
}
function poolMatches(def: UpgradeDef, cat: CatId): boolean {
  return def.cat === "any" || def.cat === cat;
}
/**
 * Whether a level-up card may offer this item: weapons and passives only
 * (never evolutions), of the cat's pool, below max level, and either owned
 * or with a free slot of its kind.
 */
export function isEligible(state: SimState, def: UpgradeDef): boolean {
  if (!poolMatches(def, state.player.id)) return false;
  if (def.slot === "evolution") return false;
  if (levelOf(state, def.id) >= def.maxLevel) return false;
  if (def.slot === "filler" || levelOf(state, def.id) > 0) return true;
  return def.slot === "weapon"
    ? state.build.weapons.length < BUILD.weaponSlots
    : state.build.passives.length < BUILD.passiveSlots;
}
/** Picks distinct cards from eligible weapons and passives; the filler tops up a short hand. */
export function rollChoices(
  state: SimState,
  rng: { int(min: number, max: number): number },
): UpgradeId[] {
  const rest = UPGRADES.filter((u) => u.slot !== "filler" && isEligible(state, u)).map((u) => u.id);
  const picks: UpgradeId[] = [];
  while (picks.length < XP.choices && rest.length)
    picks.push(rest.splice(rng.int(0, rest.length), 1)[0]!);
  for (const u of UPGRADES)
    if (picks.length < XP.choices && u.slot === "filler" && isEligible(state, u)) picks.push(u.id);
  return picks;
}
/** Owned weapons and passives a chest may still level up. */
export function chestCandidates(state: SimState): UpgradeId[] {
  return [...state.build.weapons, ...state.build.passives].filter((id) => {
    const def = upgradeDef(id)!;
    return def.slot !== "evolution" && levelOf(state, id) < def.maxLevel;
  });
}
