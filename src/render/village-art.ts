/** Generated high-detail raster scenery. No simulation imports or RNG.
 * Generated sheets are extracted to separate anchored sprites, not a scene background.
 * Synchronous row runs preserve workers / offline / Node, without an image-load race.
 */
import { cachedSprite } from "../engine/sprite.js";
import type { Ctx } from "./paper-material.js";
import type { ViewRect } from "./camera.js";
import { VILLAGE_PALETTE, VILLAGE_PIXELS, type VillagePixels } from "./village-pixels.js";
export type VillageAsset = keyof typeof VILLAGE_PIXELS;
export const VILLAGE_PIXEL = 2;
export const VILLAGE_TILE = 16 * VILLAGE_PIXEL;

/** Presentation numbers for the flat village ground and contact shadows (world units). */
export const VILLAGE_GROUND = {
  /** Grass-over-soil fringe inside a crop plot outline: min + span * noise. */
  soilFringe: { min: 3.5, span: 4.5, lip: 2, shade: .8 },
  /** Two offset meadow phases laid over the base tiling in low-frequency blobs. */
  meadowBlock: 4,
  meadowLayers: [
    { mirror: true, ox: 82, oy: 166, scale: 46, salt: 17, threshold: .56 },
    { mirror: false, ox: 140, oy: 92, scale: 34, salt: 53, threshold: .6 },
  ],
  shadow: { color: "rgba(10,16,20,.42)", rows: .12, pad: 1, squash: .26, minRy: 3, maxRy: 6 },
} as const;

const mod = (v: number, n: number) => ((v % n) + n) % n;
/** Pure integer hash of absolute logical coordinates, in [0, 1). */
export function villageHash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x: number, y: number, salt: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = villageHash(ix, iy, salt), b = villageHash(ix + 1, iy, salt),
    c = villageHash(ix, iy + 1, salt), d = villageHash(ix + 1, iy + 1, salt);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const sample = (p: VillagePixels, px: number, py: number): number => p.rows[mod(py, p.height)]!.charCodeAt(mod(px, p.width)) - 33;
const SHADE = VILLAGE_PALETTE.map(hex => {
  if (!hex.startsWith("#")) return hex;
  const k = VILLAGE_GROUND.soilFringe.shade;
  return "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
});

export function paintVillagePixels(ctx: Ctx, pixels: VillagePixels): void {
  for (let y = 0; y < pixels.height; y++) {
    const row = pixels.rows[y]!;
    for (let x = 0; x < pixels.width;) {
      const start = x, index = row.charCodeAt(x) - 33;
      while (++x < pixels.width && row.charCodeAt(x) - 33 === index) { /* native horizontal run */ }
      if (!index) continue;
      ctx.fillStyle = VILLAGE_PALETTE[index]!;
      ctx.fillRect(start * VILLAGE_PIXEL, y * VILLAGE_PIXEL, (x - start) * VILLAGE_PIXEL, VILLAGE_PIXEL);
    }
  }
}
function stamp(ctx: Ctx, id: string, p: VillagePixels, x: number, y: number, scale: number): void {
  const sprite = cachedSprite(`village-generated-v2:${id}`, p.width * VILLAGE_PIXEL, p.height * VILLAGE_PIXEL, 1,
    c => { c.imageSmoothingEnabled = false; paintVillagePixels(c, p); }, { x: p.ax / p.width, y: p.ay / p.height });
  ctx.save(); ctx.imageSmoothingEnabled = false;
  sprite.draw(ctx, { x: Math.round(x), y: Math.round(y), scale });
  ctx.restore();
}
/** The raw generated asset, exactly as compiled (the gallery workshop shows this). */
export function drawVillageSprite(ctx: Ctx, key: VillageAsset, x: number, y: number, scale = 1): void {
  stamp(ctx, key, VILLAGE_PIXELS[key], x, y, scale);
}

/** A flat translucent stepped ellipse on the 2-unit world lattice. No blur or
 * gradient; every lattice cell is filled once, so the tone stays uniform. */
export function drawContactShadow(ctx: Ctx, cx: number, footY: number, rx: number, ry: number, below: number): void {
  const snap = (v: number) => Math.round(v / VILLAGE_PIXEL) * VILLAGE_PIXEL, cy = footY + below - ry;
  ctx.fillStyle = VILLAGE_GROUND.shadow.color;
  for (let y = snap(cy - ry); y < cy + ry; y += VILLAGE_PIXEL) {
    const t = (y + VILLAGE_PIXEL / 2 - cy) / ry, half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    const x0 = snap(cx - half), x1 = snap(cx + half);
    if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, VILLAGE_PIXEL);
  }
}
/** Opaque bottom-row span of a sprite, in logical pixels relative to its anchor. */
const feet = new Map<VillageAsset, { centre: number; half: number }>();
export function villageFootSpan(key: VillageAsset): { centre: number; half: number } {
  let hit = feet.get(key);
  if (hit) return hit;
  const p = VILLAGE_PIXELS[key];
  // Flat ground tiles (top-left anchored) never cast a contact shadow.
  if (!(p.ax > 0 && p.ay === p.height)) { feet.set(key, { centre: 0, half: 0 }); return feet.get(key)!; }
  const n = Math.max(3, Math.round(p.height * VILLAGE_GROUND.shadow.rows));
  let l = p.width, r = -1;
  for (let y = p.height - n; y < p.height; y++) for (let x = 0; x < p.width; x++)
    if (p.rows[y]!.charCodeAt(x) !== 33) { l = Math.min(l, x); r = Math.max(r, x); }
  hit = r < l ? { centre: 0, half: 0 } : { centre: (l + r + 1) / 2 - p.ax, half: (r - l + 1) / 2 };
  feet.set(key, hit);
  return hit;
}
/** Contact shadow under a generated sprite's footpoint, sized from its bottom rows.
 * Houses keep it on their footing line; free-standing pieces sink it just below. */
export function drawVillageShadow(ctx: Ctx, key: VillageAsset, x: number, y: number, scale = 1): void {
  const foot = villageFootSpan(key), k = VILLAGE_PIXEL * scale, s = VILLAGE_GROUND.shadow;
  if (!foot.half) return;
  const rx = (foot.half + s.pad) * k, ry = Math.min(s.maxRy, Math.max(s.minRy, rx * s.squash));
  const house = key === "barn" || key === "cottage";
  drawContactShadow(ctx, Math.round(x) + foot.centre * k, Math.round(y), rx, ry, house ? Math.min(4, ry) : ry * .5);
}
export function drawGroundedVillageSprite(ctx: Ctx, key: VillageAsset, x: number, y: number, scale = 1): void {
  drawVillageShadow(ctx, key, x, y, scale);
  drawVillageSprite(ctx, key, x, y, scale);
}

/** Four directional neighbours select actual artist-drawn grass/soil corners.
 * Kept for the workshop and data checks; the runtime plots sample `earth` below.
 */
export function villageSoilTile(w: boolean, e: boolean, n: boolean, s: boolean): VillageAsset {
  return `soil${!w ? 0 : !e ? 2 : 1}${!n ? 0 : !s ? 2 : 1}` as VillageAsset;
}
/** Colour of the logical pixel at world (x, y) whose centre lies `depth` world
 * units inside a plot outline. Grass keeps an irregular 2..4 pixel fringe, a
 * one-pixel shaded lip follows it, and the interior is `earth` at world phase. */
export function villageSoilColor(depth: number, x: number, y: number): string {
  const f = VILLAGE_GROUND.soilFringe, px = Math.floor(x / VILLAGE_PIXEL), py = Math.floor(y / VILLAGE_PIXEL);
  const edge = f.min + f.span * (.65 * valueNoise(px / 4.5, py / 4.5, 7) + .35 * villageHash(px, py, 3));
  if (!(depth >= edge)) return "";
  const index = sample(VILLAGE_PIXELS.earth, px, py);
  return (depth < edge + f.lip ? SHADE : VILLAGE_PALETTE)[index]!;
}
/** `distance` is a signed distance to the plot outline, negative inside. */
export function drawVillageSoil(ctx: Ctx, view: ViewRect, distance: (x: number, y: number) => number): void {
  const step = VILLAGE_PIXEL;
  for (let y = Math.floor(view.y0 / step) * step; y < view.y1; y += step) {
    let start = Math.floor(view.x0 / step) * step, last = "";
    const flush = (end: number) => { if (last && end > start) { ctx.fillStyle = last; ctx.fillRect(start, y, end - start, step); } };
    for (let x = start; x < view.x1; x += step) {
      const next = villageSoilColor(-distance(x + 1, y + 1), x, y);
      if (next !== last) { flush(x); start = x; last = next; }
    }
    flush(Math.ceil(view.x1 / step) * step);
  }
}
/** Quiet lawn with clumps, not a repeating full-screen noise carpet. Each source
 * tile uses the same base green as the native underlay; foliage is a darker ramp.
 */
export function* villageGrassCells(view: ViewRect): Generator<{ key: VillageAsset; x: number; y: number }> {
  const step = VILLAGE_TILE;
  for (let gy = Math.floor(view.y0 / step); gy * step < view.y1; gy++)
    for (let gx = Math.floor(view.x0 / step); gx * step < view.x1; gx++) {
      const field = Math.sin(gx * .61 + gy * .19) + Math.cos(gy * .53 - gx * .13);
      if (field < 1.13) continue;
      const variant = 1 + ((gx * 13 + gy * 7) % 4 + 4) % 4;
      yield { key: `grass${variant}` as VillageAsset, x: gx * step, y: gy * step };
    }
}
const MEADOW_MIRROR: VillagePixels = { ...VILLAGE_PIXELS.meadow, rows: VILLAGE_PIXELS.meadow.rows.map(r => [...r].reverse().join("")) };
type MeadowLayer = typeof VILLAGE_GROUND.meadowLayers[number];
/** Whether the 4-unit block at world (x, y) shows this overlay phase. Low-frequency
 * blobs with a small dither on their rim; a pure function of absolute position. */
export function villageMeadowLayerAt(layer: MeadowLayer, x: number, y: number): boolean {
  const b = VILLAGE_GROUND.meadowBlock, bx = Math.floor(x / b), by = Math.floor(y / b), u = layer.scale / b;
  const field = .72 * valueNoise(bx / u, by / u, layer.salt) + .2 * valueNoise(bx / 5, by / 5, layer.salt + 1)
    + .08 * villageHash(bx, by, layer.salt + 2);
  return field > layer.threshold;
}
/** Meadow index at world (x, y), exactly what drawVillageGrass paints there. */
export function villageMeadowIndex(x: number, y: number): number {
  const px = Math.floor(x / VILLAGE_PIXEL), py = Math.floor(y / VILLAGE_PIXEL);
  for (let i = VILLAGE_GROUND.meadowLayers.length - 1; i >= 0; i--) {
    const layer = VILLAGE_GROUND.meadowLayers[i]!;
    if (!villageMeadowLayerAt(layer, x, y)) continue;
    const ox = layer.ox / VILLAGE_PIXEL, oy = layer.oy / VILLAGE_PIXEL;
    return sample(layer.mirror ? MEADOW_MIRROR : VILLAGE_PIXELS.meadow, px - ox, py - oy);
  }
  return sample(VILLAGE_PIXELS.meadow, px, py);
}
export function drawVillageGrass(ctx: Ctx, view: ViewRect): void {
  // Every source uses absolute world phase, including negative chunks. The base
  // tiling repeats every 256 units; two offset phases (one mirrored) cover
  // low-frequency blobs so no screen shows the same clumps on a grid.
  const step = VILLAGE_PIXELS.meadow.width * VILLAGE_PIXEL, b = VILLAGE_GROUND.meadowBlock;
  const tiles = (id: string, p: VillagePixels, ox: number, oy: number) => {
    for (let y = Math.floor((view.y0 - oy) / step) * step + oy; y < view.y1; y += step)
      for (let x = Math.floor((view.x0 - ox) / step) * step + ox; x < view.x1; x += step) stamp(ctx, id, p, x, y, 1);
  };
  tiles("meadow", VILLAGE_PIXELS.meadow, 0, 0);
  for (const layer of VILLAGE_GROUND.meadowLayers) {
    let any = false;
    ctx.save(); ctx.beginPath();
    for (let y = Math.floor(view.y0 / b) * b; y < view.y1; y += b) {
      let start = 0, open = false;
      for (let x = Math.floor(view.x0 / b) * b; x < view.x1 + b; x += b) {
        const on = x < view.x1 && villageMeadowLayerAt(layer, x, y);
        if (on && !open) { start = x; open = true; }
        else if (!on && open) { ctx.rect(start, y, x - start, b); open = false; any = true; }
      }
    }
    if (any) {
      ctx.clip();
      tiles(layer.mirror ? "meadow-mirror" : "meadow", layer.mirror ? MEADOW_MIRROR : VILLAGE_PIXELS.meadow, layer.ox, layer.oy);
    }
    ctx.restore();
  }
}
/** Same source sprites in the opening and the wilderness, same frontal view.
 * Buildings keep their established north-of-playTop footings and porch points.
 */
export function drawVillageDecor(ctx: Ctx, kind: string, x: number, y: number, s: number, seed: number): boolean {
  const v = Math.abs(Math.trunc(seed)), draw = (key: VillageAsset, scale: number, px = x, py = y) =>
    drawGroundedVillageSprite(ctx, key, px, py, scale);
  if (kind === "barn" || kind === "cottage") { draw(kind, s * 1.05, x + 23 * s, y + 29 * s); return true; }
  if (kind === "tree") { draw(v % 2 ? "tree1" : "tree0", s); return true; }
  if (kind === "bush") { draw("bush", s); return true; }
  if (kind === "stone") { draw(v % 2 ? "pebble" : "stone", s * .7); return true; }
  if (kind === "fence") { draw("fence", s * .7); return true; }
  if (kind === "lamp") { draw("lamp", s); return true; }
  if (kind === "pumpkin") { draw("pumpkin", s * .9); return true; }
  if (kind === "candles") { draw("candles", s * .8); return true; }
  return false;
}
