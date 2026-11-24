/**
 * Runtime side of the baked voxel scenery (scripts/iso-art/build.py ->
 * gen/scenery-pixels.ts). Decodes the palette-indexed runs into cached
 * native-size canvases (one per sprite id, so the cache is bounded by the
 * finite sprite list), and draws them at a projected world foot point at
 * scale 1: these sprites are authored in native pixels and never go
 * through place.ts atFoot's UPRIGHT_SCALE. Presentation only: reads no
 * SimState and consumes no RNG.
 */
import { surface, type CanvasSurface } from "../../engine/surface.js";
import { SCENERY_PALETTE, SCENERY_SPRITES, type GenLightKind, type GenSprite } from "./gen/scenery-pixels.js";
import { PROP_SPRITES } from "./gen/props-pixels.js";
import { LANDMARK_SPRITES } from "./gen/landmarks-pixels.js";
import { TOWNSFOLK_SPRITES } from "./gen/townsfolk-pixels.js";
import { CAT_SPRITES } from "./gen/cats-pixels.js";
import { COSTUME_SPRITES } from "./gen/costumes-pixels.js";
import { ENEMY_SPRITES } from "./gen/enemies-pixels.js";
import type { Bounds, Footprint } from "./depth.js";
import { snap, toScreen } from "./projection.js";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const GEN_SHADOW = {
  /** Colour and alpha of the baked hard ground shadows. */
  colour: "#05070f",
  alpha: 0.42,
} as const;

/** Code points of the run encoding (scripts/iso-art/build.py `rle`): an index, then the length of a run over 1. */
const INDEX_CODE = 0x100, RUN_CODE = 0x500;

/** Decodes the run string of a sprite (or shadow) into `length` palette indices. */
export function decodeRuns(data: string, length: number): Uint16Array {
  const out = new Uint16Array(length);
  let o = 0;
  for (let i = 0; i < data.length && o < length; ) {
    const v = data.charCodeAt(i++) - INDEX_CODE;
    let n = 1;
    if (i < data.length) {
      const c = data.charCodeAt(i);
      if (c >= RUN_CODE) { n = c - RUN_CODE; i++; }
    }
    out.fill(v, o, Math.min(length, o + n));
    o += n;
  }
  return out;
}

/** Every generated sprite module under one id space (they share SCENERY_PALETTE). */
export const GEN_SPRITES: Readonly<Record<string, GenSprite>> = {
  ...SCENERY_SPRITES, ...PROP_SPRITES, ...LANDMARK_SPRITES, ...TOWNSFOLK_SPRITES, ...CAT_SPRITES, ...COSTUME_SPRITES,
  ...ENEMY_SPRITES,
};

export function genSprite(id: string): GenSprite | undefined {
  return GEN_SPRITES[id];
}
export function hasGenSprite(id: string): boolean {
  return id in GEN_SPRITES;
}

/**
 * Status looks of a baked sprite as palette swaps of its own pixels (crisp, cached per
 * id and look, so the cache stays bounded by the finite sprite list): `char` while a
 * prop burns, `ink` while it is coated, `wash1..4` as the colour lifts off the page.
 */
export type GenLook = "char" | "ink" | "wash1" | "wash2" | "wash3" | "wash4" | "flash" | "pencil";
export const GEN_LOOKS = {
  char: { colour: "#2a1d22", amount: 0.58 },
  ink: { colour: "#281d44", amount: 0.6 },
  wash: { colour: "#b7b9aa", amount: 0.72 },
  /** A puppet's hit flash: its whole palette jumps to a warm white, the outline to a pale grey. */
  flash: { colour: "#fff6dc", amount: 0.8 },
  /** A puppet on colourless (erased) ground: graphite pencil lines on the page. */
  pencil: { colour: "#b9b5ab", amount: 0.86, graphite: "#2a2630" },
  /** Vertical squash of a folded prop (its cut lies almost flat). */
  fold: 0.34,
} as const;
const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, "0")).join("");
};
function lookPalette(look: GenLook | undefined): readonly string[] {
  if (!look) return SCENERY_PALETTE;
  let p = paletteMemo.get(look);
  if (p) return p;
  const spec = look === "char" ? GEN_LOOKS.char : look === "ink" ? GEN_LOOKS.ink : look === "flash" ? GEN_LOOKS.flash : look === "pencil" ? GEN_LOOKS.pencil : GEN_LOOKS.wash,
    t = look.startsWith("wash") ? (Number(look.slice(4)) / 4) * GEN_LOOKS.wash.amount : spec.amount;
  // The pencil look keeps the drawing's value steps as grey levels (its outline and shadows go to graphite).
  p = SCENERY_PALETTE.map((c) => {
    if (!c) return c;
    if (look === "pencil") {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const graphite = GEN_LOOKS.pencil.graphite;
      return l < 0.2 ? mix(graphite, spec.colour, l / 0.2) : mix("#8f8a84", spec.colour, Math.min(1, (l - 0.2) / 0.6));
    }
    return mix(c, spec.colour, t);
  });
  paletteMemo.set(look, p);
  return p;
}
const paletteMemo = new Map<string, readonly string[]>();
/** Wash look of a pencil amount (0 painted .. 1 colourless), or undefined when painted. */
export function washLook(amount: number): GenLook | undefined {
  const step = Math.min(4, Math.max(0, Math.round(amount * 4)));
  return step ? (`wash${step}` as GenLook) : undefined;
}

interface Baked { image?: CanvasSurface; shadow?: CanvasSurface }
const cache = new Map<string, Baked>();
const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";

/** Paints index rows as runs of fillRect (works on every 2D context, no ImageData needed). */
function paintRuns(c: Ctx, idx: Uint16Array, w: number, colour: (v: number) => string | null): void {
  for (let y = 0, h = idx.length / w; y < h; y++)
    for (let x = 0; x < w; ) {
      const v = idx[y * w + x]!;
      let e = x + 1;
      while (e < w && idx[y * w + e] === v) e++;
      const css = colour(v);
      if (css) {
        c.fillStyle = css;
        c.fillRect(x, y, e - x, 1);
      }
      x = e;
    }
}

function baked(id: string, look?: GenLook): Baked | undefined {
  const key = look ? `${id}|${look}` : id;
  let b = cache.get(key);
  if (b) return b;
  const s = GEN_SPRITES[id];
  if (!s) return undefined;
  b = {};
  if (canMake()) {
    const image = surface(s.w, s.h), c = image.getContext("2d") as Ctx | null, pal = lookPalette(look);
    if (c) {
      paintRuns(c, decodeRuns(s.data, s.w * s.h), s.w, (v) => (v ? pal[v]! : null));
      b.image = image;
    }
    if (s.shadow && !look) {
      const sh = s.shadow, shadow = surface(sh.w, sh.h), d = shadow.getContext("2d") as Ctx | null;
      if (d) {
        paintRuns(d, decodeRuns(sh.data, sh.w * sh.h), sh.w, (v) => (v ? GEN_SHADOW.colour : null));
        b.shadow = shadow;
      }
    }
  }
  cache.set(key, b);
  return b;
}

/** The cached canvas of a sprite (tests and the off-map wall). */
export function genCanvas(id: string): CanvasSurface | undefined {
  return baked(id)?.image;
}
/** The cached canvas of a sprite in a status look (puppets draw it through iso/puppet.ts). */
export function genImage(id: string, look?: GenLook): CanvasSurface | undefined {
  return baked(id, look)?.image;
}
export function genShadowCanvas(id: string): CanvasSurface | undefined {
  return baked(id)?.shadow;
}

/** Draws sprite `id` with its foot on the projected world point (x, y); `ctx` carries the camera transform. */
export function drawGen(ctx: Ctx, id: string, x: number, y: number, look?: GenLook, lift = 0): void {
  const s = GEN_SPRITES[id], img = baked(id, look)?.image;
  if (!s || !img) return;
  const p = toScreen(x, y);
  ctx.drawImage(img, snap(p.x) - s.ax, snap(p.y) - s.ay - Math.round(lift));
}

/** A folded sprite: squashed toward its foot (GEN_LOOKS.fold), nearest neighbour. */
export function drawGenFolded(ctx: Ctx, id: string, x: number, y: number, look?: GenLook): void {
  const s = GEN_SPRITES[id], img = baked(id, look)?.image;
  if (!s || !img) return;
  const p = toScreen(x, y), k = GEN_LOOKS.fold, h = Math.max(1, Math.round(s.h * k));
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, snap(p.x) - s.ax, snap(p.y) - Math.round(s.ay * k), s.w, h);
  ctx.imageSmoothingEnabled = smooth;
}

/** Draws the baked ground shadow of sprite `id` under foot (x, y). */
export function drawGenShadow(ctx: Ctx, id: string, x: number, y: number): void {
  const s = GEN_SPRITES[id], img = baked(id)?.shadow;
  if (!s?.shadow || !img) return;
  const p = toScreen(x, y);
  ctx.save();
  ctx.globalAlpha *= GEN_SHADOW.alpha;
  ctx.drawImage(img, snap(p.x) + s.shadow.x, snap(p.y) + s.shadow.y);
  ctx.restore();
}

/** Native-pixel art bounds around the foot (for culling and occlusion). */
export function genBounds(id: string): Bounds {
  const s = GEN_SPRITES[id];
  if (!s) return { l: 0, r: 0, t: 0, b: 0 };
  return { l: -s.ax, r: s.w - s.ax, t: -s.ay, b: s.h - s.ay };
}

/** World footprint of a sprite's voxels at foot (x, y). */
export function genFootprint(id: string, x: number, y: number): Footprint | null {
  const e = GEN_SPRITES[id]?.extent;
  return e ? { x0: x + e.x, y0: y + e.y, x1: x + e.x + e.w, y1: y + e.y + e.d } : null;
}

/** Footprint a sprite stands on: its declared / ground-level base, else its voxel extent. */
export function genBaseFootprint(id: string, x: number, y: number): Footprint | null {
  const e = GEN_SPRITES[id]?.base ?? GEN_SPRITES[id]?.extent;
  return e ? { x0: x + e.x, y0: y + e.y, x1: x + e.x + e.w, y1: y + e.y + e.d } : null;
}

/** A light anchored on a baked sprite: world foot plus its native-pixel offset from the foot. */
export interface GenGlow {
  readonly kind: GenLightKind;
  readonly x: number;
  readonly y: number;
  /** Native pixels right of the projected foot. */
  readonly dx: number;
  /** Native pixels above the projected foot. */
  readonly lift: number;
}

/** Emissive anchors of sprite `id` standing at (x, y), appended to `out`. */
export function genGlows(id: string, x: number, y: number, out: GenGlow[]): void {
  for (const l of GEN_SPRITES[id]?.lights ?? []) out.push({ kind: l.kind, x, y, dx: l.x, lift: -l.y });
}

/** Releases every decoded sprite canvas. */
export function clearGenSprites(): void {
  for (const b of cache.values()) {
    if (b.image) { b.image.width = 0; b.image.height = 0; }
    if (b.shadow) { b.shadow.width = 0; b.shadow.height = 0; }
  }
  cache.clear();
}
export function genSpriteCacheSize(): number {
  return cache.size;
}
/** Cache keys of the decoded sprites (id, or `id|look`): tests and diagnostics. */
export function genSpriteCacheKeys(): string[] {
  return [...cache.keys()];
}
