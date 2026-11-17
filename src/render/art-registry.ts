/**
 * The art layer: one registered art entry per cat, enemy, weapon and passive,
 * looked up by the same id as its sim def. Art files sit beside their defs
 * (src/defs/cats/<id>/art.ts, src/defs/enemies/<id>/art.ts,
 * src/defs/weapons/<id>.art.ts, src/defs/passives/<id>.art.ts) and are
 * registered only by src/render/art-index.ts, so the sim never imports them.
 *
 * Rules for every painter: read SimState, never mutate it, never use the sim
 * RNG; draw with code only (paper-material helpers), no images.
 */
import { createRegistry } from "../engine/registry.js";
import type { MessageKey } from "../content/keys.js";
import { CATS } from "../defs/registries.js";
import type { CatId, EnemyKind, UpgradeId, WeaponId } from "../defs/types.js";
import type { EnemyState, Impact, ShotState, SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import type { Ctx } from "./paper-material.js";

export type SkillIconKind = "attack" | "active" | "passive";
/** Paper colours of the shared cat body (craft-cat.ts) for one cat. */
export interface CatBodyPalette {
  readonly rim: string;
  readonly tail: string;
  readonly paw: string;
  readonly pawEdge: string;
  readonly cape: string;
  readonly capeEdge: string;
  readonly capeFold: string;
  readonly body: string;
  readonly bodyEdge: string;
  readonly bib: string;
  readonly belt: string;
  readonly arm: string;
  /** A small gold chain on the chest. */
  readonly chain: boolean;
}
/** Accent colours the HUD, cards and cues use for this cat. */
export interface CatColors {
  /** HUD badge accent. */
  readonly hud: string;
  /** Card window flower and cue tone. */
  readonly tone: string;
  /** Upgrade card tag paper and ink for this cat's pool. */
  readonly cardPaper: string;
  readonly cardInk: string;
  /** Skill icon ink on the selection page. */
  readonly icon: string;
  /** Level-up and evolution bursts. */
  readonly levelUp: string;
  readonly evolve: string;
}
export interface CatArt {
  readonly id: CatId;
  readonly body: CatBodyPalette;
  readonly colors: CatColors;
  /** The cat in the world (official head on a paper body). */
  draw(ctx: Ctx, pose: CatPose): void;
  /** Head-only portrait for tickets and the HUD badge. */
  portrait(ctx: Ctx, pose: CatPose, scale: number): void;
  /** The title-screen aura behind the chosen cat. */
  heroAura(ctx: Ctx, x: number, y: number, time: number): void;
  /** 32 x 32 skill symbol for the selection page. */
  skillIcon(ctx: Ctx, kind: SkillIconKind): void;
  /** Flat ground marks under the cat (fields, empower ring). */
  ground?(ctx: Ctx, state: SimState): void;
  /** HUD status line when no shield or empower is up; the role line otherwise. */
  status?(state: SimState): MessageKey | null;
}

export interface EnemyLook {
  x: number;
  y: number;
}
/** How a defeated enemy dissolves into paper flakes (craft-juice.ts). */
export interface EnemyDissolve {
  readonly flakes: readonly string[];
  readonly count: number;
  /** Delay before flakes leave the edge, as a fraction of the effect. */
  readonly start?: number;
  /** Multiplier on how far flakes fly. */
  readonly spread?: number;
  readonly size?: number;
  /** Crumpled paper opens into a flat sheet first. */
  readonly uncrumple?: boolean;
}
/** Progress of an effect: t 0..1, fade = 1 - t, ease = ease-out cubic. */
export interface EffectProgress {
  readonly t: number;
  readonly fade: number;
  readonly ease: number;
}
export type EffectPainter = (ctx: Ctx, e: Impact, k: EffectProgress, state?: SimState) => void;
export interface EnemyArt {
  readonly id: EnemyKind;
  /** The body at its base size; elites are scaled and crowned by the caller. */
  draw(ctx: Ctx, e: EnemyState, time: number, look: EnemyLook): void;
  /** Flat telegraphs on the yard for this enemy. */
  ground?(ctx: Ctx, e: EnemyState): void;
  /** Extra culling margin for large bodies. */
  readonly cullMargin?: number;
  readonly dissolve: EnemyDissolve;
  /** Impact kinds this enemy's attacks and defeat leave (ENEMY_FX_LIFE). */
  readonly effects?: Readonly<Record<string, EffectPainter>>;
}

/** Adds a y-sorted world sprite. */
export type AddSprite = (y: number, draw: () => void) => void;
export interface WeaponArt {
  readonly id: WeaponId;
  /** Card glyph inside a 32 x 32 box. */
  icon(ctx: Ctx, ink: string): void;
  /** ShotState.weapon tag this weapon fires, and how such a shot looks. */
  readonly shotTag?: string;
  shot?(ctx: Ctx, s: ShotState, time: number): void;
  /** Impact kinds this weapon leaves (EFFECT_LIFE). */
  readonly effects?: Readonly<Record<string, EffectPainter>>;
  /** Only while the weapon is active (owned, or the chosen cat's start weapon): */
  ground?(ctx: Ctx, state: SimState): void;
  sprites?(ctx: Ctx, state: SimState, time: number, add: AddSprite): void;
  front?(ctx: Ctx, state: SimState): void;
}
export interface PassiveArt {
  readonly id: UpgradeId;
  icon(ctx: Ctx, ink: string): void;
}

export const CAT_ART = createRegistry<CatArt>("cat art");
export const ENEMY_ART = createRegistry<EnemyArt>("enemy art");
/** Weapons and evolved weapons, same ids as WEAPON_DEFS. */
export const WEAPON_ART = createRegistry<WeaponArt>("weapon art");
export const PASSIVE_ART = createRegistry<PassiveArt>("passive art");

/** Art of the cat in this run, or the first registered cat. */
export function catArt(id: CatId | undefined): CatArt {
  return (id !== undefined && CAT_ART.find(id)) || CAT_ART.all()[0]!;
}
/** Weapons whose world art is drawn: owned ones plus the cat's start weapon. */
export function activeWeaponArt(state: SimState): readonly WeaponArt[] {
  const start = CATS.find(state.player.id)?.startWeapon;
  return WEAPON_ART.all().filter((w) => w.id === start || (state.upgrades[w.id] ?? 0) > 0);
}
/** Icon painter of any upgrade id (weapon, evolution or passive). */
export function upgradeIcon(id: UpgradeId): ((ctx: Ctx, ink: string) => void) | undefined {
  return (WEAPON_ART.find(id) ?? PASSIVE_ART.find(id))?.icon;
}
/** The painter for an impact kind, from whichever weapon or enemy art owns it. */
export function effectPainter(kind: string): EffectPainter | undefined {
  for (const a of [...WEAPON_ART.all(), ...ENEMY_ART.all()]) {
    const p = a.effects?.[kind];
    if (p) return p;
  }
  return undefined;
}
/** The art that draws shots with this ShotState.weapon tag. */
export function shotArt(tag: string): WeaponArt | undefined {
  return WEAPON_ART.all().find((w) => w.shotTag === tag);
}
