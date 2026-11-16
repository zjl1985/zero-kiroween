import type { CatId } from "../cats/types.js";
import { CHARACTERS } from "./characters.js";
import type { SimState } from "./types.js";

/** Every upgrade card, the XP curve and both evolutions live here as data. */
export const UPGRADE_IDS = [
  "vitality",
  "swift",
  "magnet",
  "focus",
  "scholar",
  "bolt-power",
  "quick-draw",
  "split-bolt",
  "pierce",
  "long-shadow",
  "extra-star",
  "wide-orbit",
  "star-weight",
  "deep-fold",
  "moon-shield",
  "echo-legion",
  "full-moon",
  "snack",
] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
export type UpgradePool = "any" | CatId;
export interface UpgradeDef {
  id: UpgradeId;
  cat: UpgradePool;
  maxLevel: number;
  evolution?: boolean;
  /** Only offered when fewer than three other cards are eligible. */
  filler?: boolean;
  requires?: readonly { id: UpgradeId; level: number }[];
}
export const UPGRADES: readonly UpgradeDef[] = [
  { id: "vitality", cat: "any", maxLevel: 3 },
  { id: "swift", cat: "any", maxLevel: 3 },
  { id: "magnet", cat: "any", maxLevel: 3 },
  { id: "focus", cat: "any", maxLevel: 3 },
  { id: "scholar", cat: "any", maxLevel: 3 },
  { id: "bolt-power", cat: "zero", maxLevel: 3 },
  { id: "quick-draw", cat: "zero", maxLevel: 3 },
  { id: "split-bolt", cat: "zero", maxLevel: 2 },
  { id: "pierce", cat: "zero", maxLevel: 2 },
  { id: "long-shadow", cat: "zero", maxLevel: 3 },
  { id: "extra-star", cat: "nicole", maxLevel: 3 },
  { id: "wide-orbit", cat: "nicole", maxLevel: 2 },
  { id: "star-weight", cat: "nicole", maxLevel: 3 },
  { id: "deep-fold", cat: "nicole", maxLevel: 2 },
  { id: "moon-shield", cat: "nicole", maxLevel: 2 },
  {
    id: "echo-legion",
    cat: "zero",
    maxLevel: 1,
    evolution: true,
    requires: [
      { id: "quick-draw", level: 2 },
      { id: "long-shadow", level: 2 },
    ],
  },
  {
    id: "full-moon",
    cat: "nicole",
    maxLevel: 1,
    evolution: true,
    requires: [
      { id: "extra-star", level: 2 },
      { id: "star-weight", level: 2 },
    ],
  },
  { id: "snack", cat: "any", maxLevel: 99, filler: true },
];
/** Per-level amounts; card descriptions read the same numbers. */
export const UPGRADE_VALUES = {
  vitality: { maxHp: 1, heal: 1 },
  swift: { speed: 0.08 },
  magnet: { radius: 0.35 },
  focus: { cooldown: 0.12 },
  scholar: { xp: 0.2 },
  "bolt-power": { damage: 0.5 },
  "quick-draw": { interval: 0.12 },
  "split-bolt": { bolts: 1, spread: 0.2 },
  pierce: { pierce: 1 },
  "long-shadow": { decoyLife: 0.4, decoyRange: 20 },
  "extra-star": { stars: 1 },
  "wide-orbit": { radius: 9 },
  "star-weight": { damage: 0.5 },
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
export function evolutionFor(cat: CatId): UpgradeId {
  return cat === "zero" ? "echo-legion" : "full-moon";
}
export function isEvolved(state: SimState): boolean {
  return levelOf(state, evolutionFor(state.player.id)) > 0;
}
const PERCENT_CARDS: readonly UpgradeId[] = [
  "swift",
  "magnet",
  "focus",
  "scholar",
  "quick-draw",
];
/** Numbers shown on a card for one level. Used by i18n descriptions. */
export function upgradeParams(id: UpgradeId): Record<string, number> {
  const v = UPGRADE_VALUES[id] as Record<string, number>,
    percent = PERCENT_CARDS.includes(id),
    out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v))
    out[k] = percent ? Math.round(n * 100) : n;
  return out;
}
/** Base character numbers combined with upgrade levels. Sim, renderer and HUD share it. */
export function playerStats(state: SimState) {
  const l = (id: UpgradeId) => levelOf(state, id),
    z = CHARACTERS.zero,
    n = CHARACTERS.nicole,
    base = CHARACTERS[state.player.id],
    echo = l("echo-legion") > 0,
    full = l("full-moon") > 0,
    quick = 1 - UPGRADE_VALUES["quick-draw"].interval * l("quick-draw");
  return {
    speed: base.speed * (1 + UPGRADE_VALUES.swift.speed * l("swift")),
    cooldown: base.cooldown * (1 - UPGRADE_VALUES.focus.cooldown * l("focus")),
    pickupRadius: XP.pickupRadius * (1 + UPGRADE_VALUES.magnet.radius * l("magnet")),
    xpMultiplier: 1 + UPGRADE_VALUES.scholar.xp * l("scholar"),
    attackInterval: z.attackInterval * quick,
    empoweredInterval: z.empoweredInterval * quick,
    shotDamage: z.shotDamage + UPGRADE_VALUES["bolt-power"].damage * l("bolt-power"),
    bolts: 1 + UPGRADE_VALUES["split-bolt"].bolts * l("split-bolt"),
    spread: UPGRADE_VALUES["split-bolt"].spread,
    pierce: 1 + UPGRADE_VALUES.pierce.pierce * l("pierce"),
    empoweredPierce: z.empoweredPierce + UPGRADE_VALUES.pierce.pierce * l("pierce"),
    decoyLife:
      z.decoyLife +
      UPGRADE_VALUES["long-shadow"].decoyLife * l("long-shadow") +
      (echo ? UPGRADE_VALUES["echo-legion"].decoyLife : 0),
    decoyRange:
      z.decoyRange + UPGRADE_VALUES["long-shadow"].decoyRange * l("long-shadow"),
    echo,
    orbitCount:
      n.orbitCount +
      UPGRADE_VALUES["extra-star"].stars * l("extra-star") +
      (full ? UPGRADE_VALUES["full-moon"].stars : 0),
    orbitRadius: n.orbitRadius + UPGRADE_VALUES["wide-orbit"].radius * l("wide-orbit"),
    orbitDamage: n.orbitDamage + UPGRADE_VALUES["star-weight"].damage * l("star-weight"),
    fieldRadius: n.fieldRadius + UPGRADE_VALUES["deep-fold"].radius * l("deep-fold"),
    fieldDuration:
      n.fieldDuration + UPGRADE_VALUES["deep-fold"].duration * l("deep-fold"),
    shieldCharges: n.shieldCharges + UPGRADE_VALUES["moon-shield"].charges * l("moon-shield"),
    fullMoon: full,
  };
}
export type PlayerStats = ReturnType<typeof playerStats>;
function poolMatches(def: UpgradeDef, cat: CatId): boolean {
  return def.cat === "any" || def.cat === cat;
}
/** Whether a card may be offered right now. */
export function isEligible(state: SimState, def: UpgradeDef): boolean {
  if (!poolMatches(def, state.player.id)) return false;
  if ((state.upgrades[def.id] ?? 0) >= def.maxLevel) return false;
  return (def.requires ?? []).every(
    (r) => (state.upgrades[r.id] ?? 0) >= r.level,
  );
}
/** Picks distinct cards. An eligible evolution always takes the first slot. */
export function rollChoices(
  state: SimState,
  rng: { int(min: number, max: number): number },
): UpgradeId[] {
  const eligible = UPGRADES.filter((u) => !u.filler && isEligible(state, u));
  const picks: UpgradeId[] = [];
  const evo = eligible.find((u) => u.evolution);
  if (evo) picks.push(evo.id);
  const rest = eligible.filter((u) => !u.evolution).map((u) => u.id);
  while (picks.length < XP.choices && rest.length)
    picks.push(rest.splice(rng.int(0, rest.length), 1)[0]!);
  for (const u of UPGRADES)
    if (picks.length < XP.choices && u.filler && isEligible(state, u))
      picks.push(u.id);
  return picks;
}
