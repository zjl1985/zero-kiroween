/**
 * Which baked voxel sprite (gen-sprites.ts) dresses a generic decor piece,
 * an old yard decor painter (YARD_PROPS) or a yard lamp. Districts choose
 * their pools in their BiomeArt (`scenery`), so a graveyard `stone` becomes a
 * headstone and its fences iron; the variant comes from the decor seed and
 * scale (render-only, deterministic). Decor kinds without a baked sprite
 * (landmark pieces) return null and keep their own painters.
 */
import { BIOME_ART, type BiomeScenery } from "../art-registry.js";
import { hasGenSprite } from "./gen-sprites.js";

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
