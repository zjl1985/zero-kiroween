/**
 * Which baked voxel sprite (gen-sprites.ts) dresses a generic decor piece,
 * an old yard decor painter (YARD_PROPS) or a yard lamp. Districts choose
 * their pools in their BiomeArt (`scenery`), so a graveyard `stone` becomes a
 * headstone and its fences iron; the variant comes from the decor seed and
 * scale (render-only, deterministic). Decor kinds without a baked sprite
 * (landmark pieces) return null and keep their own painters.
 */
import { BIOME_ART, decorPiece, type BiomeScenery } from "../art-registry.js";
import { hasGenSprite } from "./gen-sprites.js";
import { LANDMARK_SETS, ROTOR_FRAMES, type LandmarkSet } from "./gen/landmarks-pixels.js";
import { LANDMARK_ACTIONS } from "../../defs/landmark-activities.js";
import type { PropPhase } from "../../defs/types.js";

const DEFAULTS: Required<BiomeScenery> = {
  trees: ["oak", "maple"],
  bushes: ["green"],
  stones: ["rock"],
  fences: ["fence-x", "fence-y"],
  lamps: ["lamp-iron-0"],
  flowers: ["flowers-pink", "flowers-yellow"],
};

const pick = <T>(list: readonly T[], seed: number, salt = 0): T => list[(Math.abs(seed + salt * 7919) >>> 0) % list.length]!;
/** Size bucket 0..2 of a decor scale inside [lo, hi]. */
const bucket = (s: number, lo: number, hi: number) => Math.max(0, Math.min(2, Math.floor(((s - lo) / (hi - lo)) * 3)));

function pools(biome: string | undefined): Required<BiomeScenery> {
  const own = biome ? BIOME_ART.find(biome)?.scenery : undefined;
  return { ...DEFAULTS, ...(own ?? {}) };
}

/** Baked sprite of a generic decor piece in district `biome`, or null when it has none. */
export function decorSprite(d: { kind: string; s: number; seed: number }, biome?: string): string | null {
  const p = pools(biome), seed = Math.abs(d.seed | 0);
  let id: string | null = null;
  switch (d.kind) {
    case "tree": id = `tree-${pick(p.trees, seed)}-${bucket(d.s, 0.82, 1.15)}`; break;
    case "bush": id = `bush-${pick(p.bushes, seed)}-${seed % 3}`; break;
    case "stone": {
      const s = pick(p.stones, seed, 1);
      id = s === "rock" ? `rock-${bucket(d.s, 0.55, 1.3)}` : s;
      break;
    }
    case "fence": id = pick(p.fences, seed, 2); break;
    case "lamp": id = pick(p.lamps, seed, 3); break;
    case "candles": id = "candles"; break;
    case "pumpkin": id = `pumpkin-${seed % 3}`; break;
    case "cottage": id = `terrace-${d.s < 0.8 ? 0 : d.s < 0.88 ? 1 : 2}`; break;
    case "flowers": id = pick(p.flowers, seed, 4); break;
    case "tuft": id = `tuft-${seed % 3}`; break;
    default: return null;
  }
  return hasGenSprite(id) ? id : null;
}

/** Baked sprite of an old yard decor painter (craft-scene YARD_PROPS); `fence` is the n-th yard fence. */
export function yardPropSprite(p: { kind: string; s: number; seed: number }, fence: number): string | null {
  if (p.kind === "fence") return `yard-fence-${fence}`;
  return decorSprite(p, undefined);
}

/** Baked sprite of a yard lamp (craft-scene LAMPS) by its scale. */
export function lampSprite(s: number): string {
  return s >= 0.95 ? "lamp-iron-0" : "lamp-iron-1";
}

// ---------------------------------------------------------------- FEAT-004 world content
/** Baked sprite of a sim prop (art id) in a phase; burnt scraps become ash. Null when it has none. */
export function propSprite(art: string, phase: PropPhase, burnt: boolean): string | null {
  const id = `prop-${art}-${phase === "scraps" && burnt ? "ash" : phase}`;
  return hasGenSprite(id) ? id : null;
}

/** Baked sprite of a landmark decor piece (decorPiece kind) in its seeded variant, or null. */
export function pieceSprite(d: { kind: string; seed: number }): string | null {
  const n = decorPiece(d.kind)?.variants ?? 1, v = Math.abs(d.seed | 0) % n;
  for (const id of [`piece-${d.kind}-${v}`, `piece-${d.kind}-0`]) if (hasGenSprite(id)) return id;
  return null;
}

/**
 * Rotor frame of a live landmark piece (the windmill sails) for the sim-owned turn angle;
 * a finite frame set over the sails' quarter-turn symmetry, never a time-keyed texture.
 */
export function rotorSprite(kind: string, angle: number): string | null {
  const q = Math.PI / 2, a = ((angle % q) + q) % q, f = Math.floor((a / q) * ROTOR_FRAMES) % ROTOR_FRAMES, id = `rotor-${kind}-${f}`;
  return hasGenSprite(id) ? id : null;
}
/** Turn angle a live piece shows: the sim's own turn, else the idle drift (frozen under reduced motion). */
export function liveTurn(activity: { turn?: number } | undefined, time: number): number {
  return activity?.turn ?? time * LANDMARK_ACTIONS.idleTurn;
}

/** The flat ground base and extra standing pieces of a landmark kind (generated art data). */
export function landmarkSet(kind: string): LandmarkSet {
  return LANDMARK_SETS[kind] ?? {};
}

/** Iso direction a townsfolk puppet faces from its world motion (or its idle facing). */
export function folkDirection(dx: number, dy: number, moving: boolean, facing: number): "se" | "sw" | "nw" | "ne" {
  if (!moving || Math.abs(dx) + Math.abs(dy) < 1e-6) return facing < 0 ? "sw" : "se";
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "se" : "nw";
  return dy > 0 ? "sw" : "ne";
}
/** Baked sprite of a townsfolk kind facing `dir` in step frame `frame`, or null. */
export function folkSprite(kind: string, dir: string, frame: number): string | null {
  const id = `folk-${kind}-${dir}-${frame ? 1 : 0}`;
  return hasGenSprite(id) ? id : null;
}
