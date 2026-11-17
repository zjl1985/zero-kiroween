import type { CatId } from "../cats/types.js";
import { CHARACTERS } from "./characters.js";
import type { SimState } from "./types.js";

/**
 * The build, survivors style: weapons and passives fill separate slots,
 * weapons level up step by step, and an evolution needs a max-level weapon
 * plus its paired passive and is granted only by opening a chest.
 */
export const UPGRADE_IDS = [
  // Weapons
  "meow-bolt",
  "night-claw",
  "moon-stars",
  "star-fall",
  "paper-crane",
  "pumpkin-seed",
  // Passives
  "vitality",
  "swift",
  "magnet",
  "focus",
  "scholar",
  "paper-armor",
  "night-eyes",
  "long-shadow",
  "deep-fold",
  "moon-shield",
  // Evolutions
  "echo-legion",
  "full-moon",
  // Filler
  "snack",
] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
export type UpgradePool = "any" | CatId;
export type UpgradeSlot = "weapon" | "passive" | "evolution" | "filler";
export interface UpgradeDef {
  id: UpgradeId;
  cat: UpgradePool;
  slot: UpgradeSlot;
  maxLevel: number;
}
/** Slot limits. The starting weapon takes one weapon slot. */
export const BUILD = { weaponSlots: 3, passiveSlots: 4 } as const;
export type WeaponId =
  | "meow-bolt"
  | "night-claw"
  | "moon-stars"
  | "star-fall"
  | "paper-crane"
  | "pumpkin-seed";
/** Each cat starts with its own weapon at level 1. */
export const START_WEAPON: Record<CatId, WeaponId> = {
  zero: "meow-bolt",
  nicole: "moon-stars",
};
/**
 * Stats a weapon level can raise. damage: +damage; rate: fraction faster;
 * count: more bolts / stars / targets / cranes / seeds; pierce: +enemies
 * passed through; area: +radius or reach in world units.
 */
export type WeaponStat = "damage" | "rate" | "count" | "pierce" | "area";
export type WeaponStep = Partial<Record<WeaponStat, number>>;
/** WEAPON_STEPS[id][i] is what the weapon gains going from level i + 1 to i + 2. */
export const WEAPON_STEPS: Record<WeaponId, readonly WeaponStep[]> = {
  "meow-bolt": [
    { damage: 0.5 },
    { rate: 0.12 },
    { count: 1 },
    { pierce: 1 },
    { damage: 0.5, rate: 0.12 },
    { count: 1, pierce: 1 },
  ],
  "moon-stars": [
    { count: 1 },
    { damage: 0.5 },
    { area: 9 },
    { count: 1 },
    { damage: 0.5 },
    { count: 1, area: 9 },
  ],
  "night-claw": [{ damage: 1 }, { area: 10 }, { rate: 0.15 }, { damage: 1, area: 10 }],
  "star-fall": [{ count: 1 }, { damage: 1 }, { area: 8 }, { count: 1, rate: 0.15 }],
  "paper-crane": [{ count: 1 }, { damage: 1 }, { rate: 0.15 }, { count: 1, pierce: 1 }],
  "pumpkin-seed": [{ area: 8 }, { damage: 1 }, { count: 1 }, { rate: 0.2, damage: 1 }],
};
/**
 * Level-1 numbers of the weapons that are not in the character kit.
 * Meow-bolt and moon-stars start from CHARACTERS (zero / nicole).
 */
export const WEAPONS = {
  "meow-bolt": { spread: 0.2 },
  "night-claw": { interval: 1.5, reach: 58, damage: 2, arc: 1.2 },
  "star-fall": { interval: 2.2, range: 230, radius: 34, damage: 2.5, count: 1 },
  "paper-crane": {
    interval: 2.4,
    range: 320,
    speed: 190,
    life: 2.4,
    turn: 4.2,
    damage: 1.5,
    count: 1,
    pierce: 1,
  },
  "pumpkin-seed": {
    interval: 2.8,
    range: 260,
    speed: 240,
    minFlight: 0.25,
    radius: 40,
    damage: 2,
    count: 1,
    spread: 0.35,
  },
} as const;
const weaponMax = (id: WeaponId) => WEAPON_STEPS[id].length + 1;
export const UPGRADES: readonly UpgradeDef[] = [
  { id: "meow-bolt", cat: "zero", slot: "weapon", maxLevel: weaponMax("meow-bolt") },
  { id: "night-claw", cat: "zero", slot: "weapon", maxLevel: weaponMax("night-claw") },
  { id: "moon-stars", cat: "nicole", slot: "weapon", maxLevel: weaponMax("moon-stars") },
  { id: "star-fall", cat: "nicole", slot: "weapon", maxLevel: weaponMax("star-fall") },
  { id: "paper-crane", cat: "any", slot: "weapon", maxLevel: weaponMax("paper-crane") },
  { id: "pumpkin-seed", cat: "any", slot: "weapon", maxLevel: weaponMax("pumpkin-seed") },
  { id: "vitality", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "swift", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "magnet", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "focus", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "scholar", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "paper-armor", cat: "any", slot: "passive", maxLevel: 3 },
  { id: "night-eyes", cat: "any", slot: "passive", maxLevel: 4 },
  { id: "long-shadow", cat: "zero", slot: "passive", maxLevel: 3 },
  { id: "deep-fold", cat: "nicole", slot: "passive", maxLevel: 3 },
  { id: "moon-shield", cat: "nicole", slot: "passive", maxLevel: 2 },
  { id: "echo-legion", cat: "zero", slot: "evolution", maxLevel: 1 },
  { id: "full-moon", cat: "nicole", slot: "evolution", maxLevel: 1 },
  { id: "snack", cat: "any", slot: "filler", maxLevel: 99 },
];
export interface EvolutionDef {
  id: UpgradeId;
  cat: CatId;
  /** Must be at max level. */
  weapon: WeaponId;
  /** Must be owned (any level). */
  passive: UpgradeId;
}
/** Echo Legion: max Meow Bolt + Long Shadow. Full Moon: max Moon Stars + Deep Fold. */
export const EVOLUTIONS: readonly EvolutionDef[] = [
  { id: "echo-legion", cat: "zero", weapon: "meow-bolt", passive: "long-shadow" },
  { id: "full-moon", cat: "nicole", weapon: "moon-stars", passive: "deep-fold" },
];
/** Per-level amounts of passives, evolutions and the filler. */
export const UPGRADE_VALUES = {
  vitality: { maxHp: 1, heal: 1 },
  swift: { speed: 0.08 },
  magnet: { radius: 0.35 },
  focus: { cooldown: 0.1 },
  scholar: { xp: 0.15 },
  "paper-armor": { iframes: 0.2 },
  "night-eyes": { area: 0.1 },
  "long-shadow": { decoyLife: 0.4, decoyRange: 20 },
  "deep-fold": { radius: 14, duration: 0.8 },
  "moon-shield": { charges: 1 },
  "echo-legion": {
    fireInterval: 0.32,
    range: 190,
    burstRadius: 74,
    burstDamage: 3,
    decoyLife: 0.6,
  },
  "full-moon": {
    stars: 2,
    pulseInterval: 3.2,
    pulseReach: 34,
    pulseDamage: 1.5,
    pulsePush: 26,
  },
  snack: { heal: 1 },
} as const;
export const XP = {
  shardValue: 1,
  pickupRadius: 52,
  collectRadius: 16,
  magnetSpeed: 230,
  maxPickups: 80,
  choices: 3,
};
/** Ink shards needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return Math.round(4 + n * 2.6 + n * n * 0.18);
}
export function upgradeDef(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
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
  const out = { damage: 0, rate: 0, count: 0, pierce: 0, area: 0 };
  for (const s of WEAPON_STEPS[id].slice(0, Math.max(0, level - 1)))
    for (const k of Object.keys(s) as WeaponStat[]) out[k] += s[k]!;
  return out;
}
/** What the next level of an owned weapon adds; empty at max level. */
export function nextWeaponStep(id: WeaponId, owned: number): WeaponStep {
  return WEAPON_STEPS[id][owned - 1] ?? {};
}
export function isWeapon(id: string): id is WeaponId {
  return id in WEAPON_STEPS;
}
const PERCENT_CARDS: readonly UpgradeId[] = [
  "swift",
  "magnet",
  "focus",
  "scholar",
  "night-eyes",
];
/** Numbers shown on a card for one level. Used by i18n descriptions. */
export function upgradeParams(id: UpgradeId): Record<string, number> {
  if (isWeapon(id)) {
    const base = (id in WEAPONS ? WEAPONS[id as keyof typeof WEAPONS] : {}) as Record<
      string,
      number
    >;
    return { ...base };
  }
  const v = UPGRADE_VALUES[id as keyof typeof UPGRADE_VALUES] as Record<string, number>,
    percent = PERCENT_CARDS.includes(id),
    out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) out[k] = percent ? Math.round(n * 100) : n;
  return out;
}
/** Base character numbers combined with weapon levels and passives. Sim, renderer and HUD share it. */
export function playerStats(state: SimState) {
  const l = (id: UpgradeId) => levelOf(state, id),
    z = CHARACTERS.zero,
    n = CHARACTERS.nicole,
    cat = state.player.id,
    base = CHARACTERS[cat],
    echo = l("echo-legion") > 0,
    full = l("full-moon") > 0,
    area = 1 + UPGRADE_VALUES["night-eyes"].area * l("night-eyes"),
    // The starting weapon is always in hand, even in hand-built test states.
    wl = (id: WeaponId) => (START_WEAPON[cat] === id ? Math.max(1, l(id)) : l(id)),
    bolt = weaponBonus("meow-bolt", wl("meow-bolt")),
    stars = weaponBonus("moon-stars", wl("moon-stars")),
    claw = weaponBonus("night-claw", wl("night-claw")),
    fall = weaponBonus("star-fall", wl("star-fall")),
    crane = weaponBonus("paper-crane", wl("paper-crane")),
    seed = weaponBonus("pumpkin-seed", wl("pumpkin-seed")),
    W = WEAPONS,
    quick = 1 - bolt.rate;
  return {
    speed: base.speed * (1 + UPGRADE_VALUES.swift.speed * l("swift")),
    cooldown: base.cooldown * (1 - UPGRADE_VALUES.focus.cooldown * l("focus")),
    pickupRadius: XP.pickupRadius * (1 + UPGRADE_VALUES.magnet.radius * l("magnet")),
    xpMultiplier: 1 + UPGRADE_VALUES.scholar.xp * l("scholar"),
    hurtIframes: UPGRADE_VALUES["paper-armor"].iframes * l("paper-armor"),
    area,
    bolt: wl("meow-bolt") > 0,
    attackInterval: z.attackInterval * quick,
    empoweredInterval: z.empoweredInterval * quick,
    shotDamage: z.shotDamage + bolt.damage,
    bolts: 1 + bolt.count,
    spread: W["meow-bolt"].spread,
    pierce: 1 + bolt.pierce,
    empoweredPierce: z.empoweredPierce + bolt.pierce,
    decoyLife:
      z.decoyLife +
      UPGRADE_VALUES["long-shadow"].decoyLife * l("long-shadow") +
      (echo ? UPGRADE_VALUES["echo-legion"].decoyLife : 0),
    decoyRange: z.decoyRange + UPGRADE_VALUES["long-shadow"].decoyRange * l("long-shadow"),
    echo,
    echoBurstRadius: UPGRADE_VALUES["echo-legion"].burstRadius * area,
    orbit: wl("moon-stars") > 0,
    orbitCount:
      wl("moon-stars") > 0
        ? n.orbitCount + stars.count + (full ? UPGRADE_VALUES["full-moon"].stars : 0)
        : 0,
    orbitRadius: (n.orbitRadius + stars.area) * area,
    orbitDamage: n.orbitDamage + stars.damage,
    fieldRadius: n.fieldRadius + UPGRADE_VALUES["deep-fold"].radius * l("deep-fold"),
    fieldDuration: n.fieldDuration + UPGRADE_VALUES["deep-fold"].duration * l("deep-fold"),
    shieldCharges: n.shieldCharges + UPGRADE_VALUES["moon-shield"].charges * l("moon-shield"),
    fullMoon: full,
    pulseReach: UPGRADE_VALUES["full-moon"].pulseReach * area,
    claw: wl("night-claw") > 0 && {
      interval: W["night-claw"].interval * (1 - claw.rate),
      reach: (W["night-claw"].reach + claw.area) * area,
      damage: W["night-claw"].damage + claw.damage,
      arc: W["night-claw"].arc,
    },
    starFall: wl("star-fall") > 0 && {
      interval: W["star-fall"].interval * (1 - fall.rate),
      range: W["star-fall"].range,
      radius: (W["star-fall"].radius + fall.area) * area,
      damage: W["star-fall"].damage + fall.damage,
      count: W["star-fall"].count + fall.count,
    },
    crane: wl("paper-crane") > 0 && {
      interval: W["paper-crane"].interval * (1 - crane.rate),
      range: W["paper-crane"].range,
      speed: W["paper-crane"].speed,
      life: W["paper-crane"].life,
      turn: W["paper-crane"].turn,
      damage: W["paper-crane"].damage + crane.damage,
      count: W["paper-crane"].count + crane.count,
      pierce: W["paper-crane"].pierce + crane.pierce,
    },
    seed: wl("pumpkin-seed") > 0 && {
      interval: W["pumpkin-seed"].interval * (1 - seed.rate),
      range: W["pumpkin-seed"].range,
      speed: W["pumpkin-seed"].speed,
      minFlight: W["pumpkin-seed"].minFlight,
      radius: (W["pumpkin-seed"].radius + seed.area) * area,
      damage: W["pumpkin-seed"].damage + seed.damage,
      count: W["pumpkin-seed"].count + seed.count,
      spread: W["pumpkin-seed"].spread,
    },
  };
}
export type PlayerStats = ReturnType<typeof playerStats>;
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
  const rest = UPGRADES.filter(
    (u) => u.slot !== "filler" && isEligible(state, u),
  ).map((u) => u.id);
  const picks: UpgradeId[] = [];
  while (picks.length < XP.choices && rest.length)
    picks.push(rest.splice(rng.int(0, rest.length), 1)[0]!);
  for (const u of UPGRADES)
    if (picks.length < XP.choices && u.slot === "filler" && isEligible(state, u))
      picks.push(u.id);
  return picks;
}
/** Owned weapons and passives a chest may still level up. */
export function chestCandidates(state: SimState): UpgradeId[] {
  return ([...state.build.weapons, ...state.build.passives] as UpgradeId[]).filter((id) => {
    const def = upgradeDef(id)!;
    return def.slot !== "evolution" && levelOf(state, id) < def.maxLevel;
  });
}
