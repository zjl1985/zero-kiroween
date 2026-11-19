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
import type { CatId, EnemyKind, LandmarkPlace, PropPhase, UpgradeId, WeaponId } from "../defs/types.js";
import type { EnemyState, Impact, LandmarkEventState, ShotState, SimState } from "../game/types.js";
import type { CatPose } from "./layout.js";
import type { Ctx } from "./paper-material.js";
import type { VariantBase } from "./variants.js";
import type { MascotPalette } from "../cats/meow-wall-art.js";

export type SkillIconKind = "attack" | "active" | "passive";
/** Paper colours and clothing cut selected by the cat's art definition. */
export type CatBodyPalette = {
  readonly rim: string;
  readonly tail: string;
  readonly paw: string;
  readonly pawEdge: string;
  readonly body: string;
  readonly bodyEdge: string;
  readonly arm: string;
  readonly fold: string;
} & (
  | {
      readonly tailoring: "split-coat";
      readonly cape: string;
      readonly capeEdge: string;
      readonly bib: string;
      readonly belt: string;
      readonly lining: string;
      readonly trim: string;
      readonly metal: string;
    }
  | {
      readonly tailoring: "tee-and-jeans";
      readonly denim: string;
      readonly denimEdge: string;
    }
);
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
  /** Authored paper silhouette and identity patches, in the shared 70 × 55 head box. */
  readonly face: {
    readonly outline: string;
    /** The face-coloured cut inside the outer head silhouette. */
    readonly stock?: string;
    readonly patches: readonly { readonly path: string; readonly color: keyof MascotPalette }[];
  };
  readonly body: CatBodyPalette;
  readonly colors: CatColors;
  /** The cat in the world (authored paper head retaining the original identity). */
  draw(ctx: Ctx, pose: CatPose): void;
  /** Static gallery skill pose and effects, without constructing a simulation. */
  skillPreview(ctx: Ctx, pose: CatPose): void;
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
/** One attack footprint. The tint and symbol follow the ground; its edge stays visible above effects. */
export interface EnemyWarning {
  readonly area: Path2D;
  readonly fill?: string;
  readonly edge: string;
  readonly progress: number;
  symbol?(ctx: Ctx): void;
}
export interface EnemyArt {
  readonly id: EnemyKind;
  /** The body at its base size; elites are scaled and crowned by the caller. */
  draw(ctx: Ctx, e: EnemyState, time: number, look: EnemyLook): void;
  /** Trail marks on the ground (`look` is the cat this enemy tracks). */
  ground?(ctx: Ctx, e: EnemyState, look?: EnemyLook): void;
  /** Incoming attack, including its world-space footprint. */
  warning?(e: EnemyState): EnemyWarning | undefined;
  /** Extra culling margin for large bodies. */
  readonly cullMargin?: number;
  /** Bounds of the unscaled illustration in the workshop, relative to its ground point. */
  readonly previewBounds?: ArtBounds;
  /** Crown seat on the unscaled illustration for actors whose heads sit above the hit radius. */
  readonly crownY?: number;
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

/** Sprite box around a base point at s = 1 (left, right, top, bottom). */
export interface ArtBounds {
  readonly l: number;
  readonly r: number;
  readonly t: number;
  readonly b: number;
}
export interface PropArt {
  readonly id: string;
  readonly bounds: ArtBounds;
  /** Seeded variants per phase (keeps the sprite cache small). */
  readonly variants: number;
  /**
   * One phase of the prop with its base at (x, y): cut edges, thickness and a
   * contact shadow. `burnt` scraps are ash. Results are cached per
   * (phase, burnt, scale, variant), so painters must be pure.
   */
  paint(ctx: Ctx, x: number, y: number, s: number, variant: number, phase: PropPhase, burnt: boolean): void;
  /** Where flames sit while it burns, relative to the base at s = 1. */
  readonly flames: readonly (readonly [number, number])[];
  /** Paper colours of the flecks and scraps that flutter off it. */
  readonly scraps: readonly string[];
  /**
   * Per-placement look on top of the cached variant: size, tilt and mirror
   * from the prop's world seed (render/variants.ts). Palette picks inside
   * `paint` should use `variant(v, ...)` too. Default: PROP_LOOK.
   */
  readonly look?: Omit<VariantBase, "palette">;
}
/** Default per-placement look of props: a little size, tilt and mirroring. */
export const PROP_LOOK: Omit<VariantBase, "palette"> = { scale: [0.94, 1.06], angle: [-0.025, 0.025], flip: true };

/**
 * A tall decor piece a landmark brings (clock tower, chapel, tomb, ...): a
 * y-sorted cached sprite with its base at (x, y). Painters must be pure.
 */
export interface DecorPiece {
  readonly kind: string;
  readonly bounds: ArtBounds;
  paint(ctx: Ctx, x: number, y: number, s: number, variant: number): void;
  /** Live parts share the cached body's depth / popup transform; never cache by time. */
  live?(ctx: Ctx, x: number, y: number, s: number, variant: number, time: number, activity?: Readonly<LandmarkEventState>): void;
  /** Cached variants (variant = seed % variants; default 1). */
  readonly variants?: number;
  /** Folds up like a pop-up book page near the cat. */
  readonly popup?: boolean;
}
/** Art of one landmark kind, same id as its LandmarkDef. */
export interface LandmarkArt {
  readonly id: string;
  /**
   * The kind's own grounded footing (riverbank, fence yard, furrows, boards,
   * tiles ...), painted flat before `ground`; never a shared oval base.
   */
  base(ctx: Ctx, l: LandmarkPlace): void;
  /** Ground-level detail on the base, baked into the chunk caches (court marks, paths, plants ...). */
  ground(ctx: Ctx, l: LandmarkPlace): void;
  /** How far the ground art reaches from the centre (default radius + 40). */
  reach?(l: LandmarkPlace): number;
  /** Ink of its dot on the folded minimap. */
  readonly ink: string;
  /** Decor pieces only this landmark places. */
  readonly pieces?: readonly DecorPiece[];
}

/** How a district's ground sheets are cut and finished (render/paper-ground.ts). */
export interface SheetLook {
  /** Sheet paper tones (night values, so cats and ink stay readable). */
  readonly colors: readonly [string, string, string];
  /** Edge cut: ruler-cut and stitched, field strips, torn, wavy or scalloped. */
  readonly seam: "ruled" | "furrow" | "torn" | "wave" | "scallop";
  /** Fringe-cut grass along stretches of each sheet's lower edge. */
  readonly fringe?: string;
}
/** Ground art of one district biome, same id as its BiomeDef. */
export interface BiomeArt {
  readonly id: string;
  /** Base paper, plus two accents (gallery swatch and minimap tint). */
  readonly swatch: readonly [string, string, string];
  /** The large paper sheets the district ground is laid from. */
  readonly sheet: SheetLook;
  /** Chance that a ground patch cell of this biome gets a patch. */
  readonly patchChance: number;
  /** One flat cluster of ground detail around (x, y), about r wide; baked into chunk caches. */
  patch(ctx: Ctx, x: number, y: number, r: number, seed: number): void;
}

export const CAT_ART = createRegistry<CatArt>("cat art");
export const ENEMY_ART = createRegistry<EnemyArt>("enemy art");
/** Weapons and evolved weapons, same ids as WEAPON_DEFS. */
export const WEAPON_ART = createRegistry<WeaponArt>("weapon art");
export const PASSIVE_ART = createRegistry<PassiveArt>("passive art");
/** World props, same ids as PROP_DEFS art ids. */
export const PROP_ART = createRegistry<PropArt>("prop art");

export const LANDMARK_ART = createRegistry<LandmarkArt>("landmark art");
export const BIOME_ART = createRegistry<BiomeArt>("biome art");

const pieceMemo = { size: -1, map: new Map<string, DecorPiece>() };
/** The landmark decor piece of a decor kind, if a landmark art registers one. */
export function decorPiece(kind: string): DecorPiece | undefined {
  if (pieceMemo.size !== LANDMARK_ART.all().length) {
    pieceMemo.map.clear();
    for (const a of LANDMARK_ART.all()) for (const p of a.pieces ?? []) pieceMemo.map.set(p.kind, p);
    pieceMemo.size = LANDMARK_ART.all().length;
  }
  return pieceMemo.map.get(kind);
}
/** Ground reach of a placed landmark (for chunk caches and previews). */
export function landmarkReach(l: LandmarkPlace): number {
  return LANDMARK_ART.find(l.kind)?.reach?.(l) ?? l.radius + 40;
}

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
