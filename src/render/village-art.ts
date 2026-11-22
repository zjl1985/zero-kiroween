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

/** Four directional neighbours select actual artist-drawn grass/soil corners.
 * Callers own the semantic footprint; this only dresses a static flat surface.
 */
export function villageSoilTile(w: boolean, e: boolean, n: boolean, s: boolean): VillageAsset {
  return `soil${!w ? 0 : !e ? 2 : 1}${!n ? 0 : !s ? 2 : 1}` as VillageAsset;
}
export function drawVillageSoil(ctx: Ctx, view: ViewRect, inside: (x: number, y: number) => boolean): void {
  const step = VILLAGE_TILE, half = step / 2;
  for (let y = Math.floor(view.y0 / step) * step; y < view.y1; y += step)
    for (let x = Math.floor(view.x0 / step) * step; x < view.x1; x += step) {
      if (!inside(x + half, y + half)) continue;
      const w = inside(x - half, y + half), e = inside(x + step + half, y + half),
        n = inside(x + half, y - half), s = inside(x + half, y + step + half);
      drawVillageSprite(ctx, villageSoilTile(w, e, n, s), x, y);
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
