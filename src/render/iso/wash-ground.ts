import { WASH } from "../../defs/wash.js";
import { surface, type CanvasSurface } from "../../engine/surface.js";
import { CHUNK } from "../../game/world-gen.js";
import type { Ctx } from "../paper-material.js";
import type { WashFrame } from "../wash-art.js";
import { createBlockCache, type ScreenRect } from "./terrain-bake.js";
import { ISO, snap, toScreen, toWorld } from "./projection.js";
import { texHash } from "./surface-texture.js";

type WashBucket = NonNullable<ReturnType<WashFrame["buckets"]["get"]>>;
type Mask = { image: CanvasSurface; sig: number };
const cache = createBlockCache<Mask>(16, ({ image }) => { image.width = image.height = 0; });
const { width: W, height: H } = CHUNK;
const SW = (W + H) * ISO.k, SH = SW / 2;
const CUT = 16, BLANK = 8, WET = 64;

/** Rasterize at the screen pixel centres, assigning each pixel to one world chunk.
 * The shared buckets include neighboring blots, so the chunk edge has no seam. */
function buildMask(seed: number, cx: number, cy: number, bucket: WashBucket): Mask {
  const x0 = cx * W, y0 = cy * H;
  const x = snap(toScreen(x0, y0 + H).x), y = snap(toScreen(x0, y0).y);
  const image = surface(SW, SH), ctx = image.getContext("2d")!;
  const pixels = ctx.createImageData(SW, SH), counts = new Uint8Array(SW * SH * 3);
  for (const mark of bucket.marks) {
    const mx = (mark.ix + 0.5) * WASH.cell, my = (mark.iy + 0.5) * WASH.cell;
    const at = toScreen(mx, my), radius = WASH.cell * (0.78 + texHash(mark.ix, mark.iy, seed) * 0.05);
    const hw = Math.ceil(Math.SQRT2 * ISO.k * radius), hh = Math.ceil(hw / 2);
    const startX = Math.max(0, Math.floor(at.x - x - hw)), endX = Math.min(SW, Math.ceil(at.x - x + hw));
    const startY = Math.max(0, Math.floor(at.y - y - hh)), endY = Math.min(SH, Math.ceil(at.y - y + hh));
    for (let row = startY; row < endY; row++) for (let col = startX; col < endX; col++) {
      const p = toWorld(x + col + 0.5, y + row + 0.5);
      if (p.x < x0 || p.x >= x0 + W || p.y < y0 || p.y >= y0 + H) continue;
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      const i = (row * SW + col) * 3;
      if (mark.code & CUT && Math.max(Math.abs(dx), Math.abs(dy)) < WASH.cell / 2 - 3)
        counts[i + 2] = dy < -WASH.cell / 2 + 5 ? 2 : 1;
      if (d2 >= radius * radius) continue;
      const edge = Math.min(4, Math.ceil((1 - d2 / (radius * radius)) * 12));
      counts[i] = Math.max(counts[i]!, edge * (mark.code & 7), mark.code & BLANK ? edge * 5 : 0);
      if (mark.code & WET) counts[i + 1] = Math.max(counts[i + 1]!, edge);
    }
  }
  const data = pixels.data;
  for (let i = 0, p = 0; i < counts.length; i += 3, p += 4) {
    const strength = counts[i]!, wet = counts[i + 1]!, cut = counts[i + 2]!;
    if (!(strength || wet || cut)) continue;
    const fibre = texHash(x + p / 4 % SW, y + Math.floor(p / 4 / SW), 561) < 0.12 ? -9 : 0;
    if (cut) {
      const shade = cut === 2 ? 213 : 40;
      data[p] = shade;
      data[p + 1] = shade - 7;
      data[p + 2] = shade - 13;
      data[p + 3] = 255;
    } else {
      const blank = strength > 16;
      data[p] = (blank ? 184 : 156) + fibre - wet * 5;
      data[p + 1] = (blank ? 170 : 151) + fibre;
      data[p + 2] = (blank ? 149 : 136) + fibre + wet * 4;
      data[p + 3] = Math.min(207, strength * 10 + wet * 7);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return { image, sig: bucket.sig };
}

export function drawIsoWashGround(ctx: Ctx, view: ScreenRect, frame: WashFrame | null): void {
  if (!frame?.buckets.size) return;
  const lo = toWorld(view.x0, view.y0), hi = toWorld(view.x1, view.y1);
  const cy0 = Math.floor(toWorld(view.x1, view.y0).y / H), cy1 = Math.floor(toWorld(view.x0, view.y1).y / H);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = Math.floor(lo.x / W); cx <= Math.floor(hi.x / W); cx++) {
    const key = cx + "," + cy, bucket = frame.buckets.get(key);
    if (!bucket) continue;
    const x = snap(toScreen(cx * W, (cy + 1) * H).x), y = snap(toScreen(cx * W, cy * H).y);
    if (x + SW <= view.x0 || x >= view.x1 || y + SH <= view.y0 || y >= view.y1) continue;
    const cacheKey = frame.seed + ":" + key;
    let mask = cache.get(cacheKey);
    if (!mask || mask.sig !== bucket.sig) {
      mask = buildMask(frame.seed, cx, cy, bucket);
      cache.set(cacheKey, mask);
    }
    ctx.drawImage(mask.image, x, y);
  }
}

export function clearIsoWashGround(): void {
  cache.clear();
}
