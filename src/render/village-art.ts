/** Generated high-detail raster scenery. No simulation imports or RNG.
 * Generated sheets are extracted to separate anchored sprites, not a scene background.
 * Synchronous row runs preserve workers / offline / Node, without an image-load race.
 */
import { cachedSprite } from "../engine/sprite.js";
import { mix, type Ctx } from "./paper-material.js";
import type { ViewRect } from "./camera.js";
import { visHash } from "./hash.js";
import { VILLAGE_PALETTE, VILLAGE_PIXELS, type VillagePixels } from "./village-pixels.js";
export type VillageAsset = keyof typeof VILLAGE_PIXELS;
export const VILLAGE_PIXEL = 2;
export const VILLAGE_TILE = 16 * VILLAGE_PIXEL;

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
export function drawVillageSprite(ctx: Ctx, key: VillageAsset, x: number, y: number, scale = 1): void {
  const p = VILLAGE_PIXELS[key];
  const sprite = cachedSprite(`village-generated-v2:${key}`, p.width * VILLAGE_PIXEL, p.height * VILLAGE_PIXEL, 1,
    c => { c.imageSmoothingEnabled = false; paintVillagePixels(c, p); }, { x: p.ax / p.width, y: p.ay / p.height });
  ctx.save(); ctx.imageSmoothingEnabled = false;
  sprite.draw(ctx, { x: Math.round(x), y: Math.round(y), scale });
  ctx.restore();
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;
function surfaceIndex(key: "earth" | "meadow", x: number, y: number): number {
  const { rows, width, height } = VILLAGE_PIXELS[key];
  const row = wrap(Math.floor(y / VILLAGE_PIXEL), height);
  const column = wrap(Math.floor(x / VILLAGE_PIXEL), width);
  return rows[row]!.charCodeAt(column) - 33;
}
export function villageSurfaceColor(key: "earth" | "meadow", x: number, y: number): string {
  return VILLAGE_PALETTE[surfaceIndex(key, x, y)]!;
}
export function villageEdgeGrain(x: number, y: number): number {
  return visHash(Math.imul(x, 73856093) ^ Math.imul(y, 19349663));
}

/** Coalesce like-coloured pixels on the same world grid used by both surfaces. */
export function* drawVillageRaster(ctx: Ctx, view: ViewRect, color: (x: number, y: number) => string): Generator<void> {
  const step = VILLAGE_PIXEL;
  const left = Math.floor(view.x0 / step) * step, right = Math.ceil(view.x1 / step) * step;
  for (let y = Math.floor(view.y0 / step) * step; y < view.y1; y += step) {
    let start = left, last = "";
    for (let x = left; x <= right; x += step) {
      const next = x === right ? "" : color(x, y);
      if (next === last) continue;
      if (last) {
        ctx.fillStyle = last;
        ctx.fillRect(start, y, x - start, step);
      }
      start = x;
      last = next;
    }
    if (y % 32 === 0) yield;
  }
}

const GARDEN_SOIL = VILLAGE_PALETTE.map(color => color ? mix(color, "#423f2d", .36) : "");
const GARDEN_EDGE = GARDEN_SOIL.map(color => color ? mix(color, "#64643a", .48) : "");
/** The authored plot is sampled at each two-unit cell, including narrow tips.
 * Small groups of meadow pixels show through along the inside edge. */
export function drawVillageSoil(ctx: Ctx, view: ViewRect, inside: (x: number, y: number) => boolean): void {
  for (const _ of drawVillageRaster(ctx, view, (x, y) => {
    const px = x + VILLAGE_PIXEL / 2, py = y + VILLAGE_PIXEL / 2;
    if (!inside(px, py)) return "";
    const reach = 4;
    const edge = !inside(px - reach, py) || !inside(px + reach, py) ||
      !inside(px, py - reach) || !inside(px, py + reach);
    if (edge && villageEdgeGrain(Math.floor(x / 4), Math.floor(y / 4)) < .37) return "";
    return (edge ? GARDEN_EDGE : GARDEN_SOIL)[surfaceIndex("earth", x, y)]!;
  })) { /* static ground bake */ }
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
export function drawVillageGrass(ctx: Ctx, view: ViewRect): void {
  // The single periodic source uses absolute world phase, including negative chunks.
  const step = VILLAGE_PIXELS.meadow.width * VILLAGE_PIXEL;
  for (let y = Math.floor(view.y0 / step) * step; y < view.y1; y += step)
    for (let x = Math.floor(view.x0 / step) * step; x < view.x1; x += step)
      drawVillageSprite(ctx, "meadow", x, y);
}
/** Same source sprites in the opening and the wilderness, same frontal view.
 * Buildings keep their established north-of-playTop footings and porch points.
 */
export function drawVillageDecor(ctx: Ctx, kind: string, x: number, y: number, s: number, seed: number): boolean {
  const v = Math.abs(Math.trunc(seed));
  if (kind === "barn" || kind === "cottage") {
    drawVillageSprite(ctx, kind, x + 23 * s, y + 29 * s, s * 1.05);
    return true;
  }
  if (kind === "tree") { drawVillageSprite(ctx, v % 2 ? "tree1" : "tree0", x, y, s); return true; }
  if (kind === "bush") { drawVillageSprite(ctx, "bush", x, y, s); return true; }
  if (kind === "stone") { drawVillageSprite(ctx, v % 2 ? "pebble" : "stone", x, y, s * .7); return true; }
  if (kind === "fence") { drawVillageSprite(ctx,"fence",x,y,s*.7); return true; }
  if (kind === "lamp") { drawVillageSprite(ctx,"lamp",x,y,s); return true; }
  if (kind === "pumpkin") { drawVillageSprite(ctx,"pumpkin",x,y,s*.9); return true; }
  if (kind === "candles") { drawVillageSprite(ctx,"candles",x,y,s*.8); return true; }
  return false;
}
