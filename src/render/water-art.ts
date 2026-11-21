import type { WaterPolygon, WaterRegion, WaterShape } from "../defs/types.js";
import { prepareWater } from "../defs/water.js";
import { hash, path, type Ctx, type Point } from "./paper-material.js";
import { pixelRect } from "./pixel-terrain.js";

/** Shared simulation polygon is the clip: pixel styling never moves a bank or a crossing. */
export function waterPath(polygon: WaterPolygon): Path2D {
  const p = new Path2D();
  polygon.forEach((v, i) => i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y));
  p.closePath();
  return p;
}
export function drawWaterGround(ctx: Ctx, region: WaterRegion): void {
  const shore = waterPath(region.shore), { minX, maxX, minY, maxY } = region.bounds;
  ctx.save();
  // A dark recessed bank rather than a raised sheet or a luminous outline.
  ctx.strokeStyle = "#263e49"; ctx.lineWidth = 6; ctx.lineJoin = "miter"; ctx.stroke(shore);
  ctx.fillStyle = "#628b87"; ctx.fill(shore);
  ctx.clip(shore);
  // Low-frequency stepped colour bands reveal the shallow shelf under the water.
  for (let gy = Math.floor(minY / 24); gy * 24 < maxY; gy++) {
    for (let gx = Math.floor(minX / 38); gx * 38 < maxX; gx++) {
      const sd = region.seed + gx * 7919 + gy * 104729;
      if (hash(sd) < 0.35) pixelRect(ctx, gx * 38, gy * 24, 26, 8, "#527e83");
      else if (hash(sd) > 0.8) pixelRect(ctx, gx * 38 + 8, gy * 24 + 8, 18, 4, "#7aab9a");
    }
  }
  if (region.core.length) {
    const core = waterPath(region.core);
    ctx.fillStyle = "#2c4560"; ctx.fill(core);
    ctx.save(); ctx.clip(core);
    for (let gy = Math.floor(minY / 28); gy * 28 < maxY; gy++)
      for (let gx = Math.floor(minX / 44); gx * 44 < maxX; gx++) {
        if (hash(region.seed + gx * 2137 + gy * 3791) > 0.55)
          pixelRect(ctx, gx * 44, gy * 28, 24, 6, "#34556b");
      }
    ctx.restore();
  }
  // Paired horizontal pixels, never smooth sine-wave strokes or random glitter.
  const count = Math.min(34, Math.ceil((maxX - minX) / 16));
  for (let i = 0; i < count; i++) {
    const x = minX + hash(region.seed + i * 19) * (maxX - minX),
      y = minY + hash(region.seed + i * 31 + 7) * (maxY - minY);
    pixelRect(ctx, x - 8, y, 12, 2, "#91b8ab");
    pixelRect(ctx, x + 4, y - 2, 4, 2, "#91b8ab");
    if (i % 4 === 0) pixelRect(ctx, x - 2, y + 4, 6, 2, "#547c83");
  }
  // Inset shore band retains the exact collision edge; native terrain raster
  // resolves this into stepped pixels when the chunk is baked.
  ctx.strokeStyle = "#9bbca3"; ctx.lineWidth = 2; ctx.stroke(shore);
  ctx.restore();
}
/** Walkable deck tops use the exact shared polygon and are drawn after roads. */
export function drawWaterCrossings(ctx: Ctx, region: WaterRegion): void {
  for (const crossing of region.crossings) {
    const p = waterPath(crossing.polygon), a = crossing.polygon[0]!, b = crossing.polygon[1]!,
      d = crossing.polygon[3]!, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    ctx.save();
    ctx.save(); ctx.translate(2, 4); ctx.fillStyle = "#293740"; ctx.fill(p); ctx.restore();
    ctx.fillStyle = "#9a8b7e"; ctx.fill(p);
    ctx.clip(p);
    const wx = d.x - a.x, wy = d.y - a.y, count = Math.max(1, Math.ceil(len / 12));
    for (let i = 0; i < count; i++) {
      const from = (i + 0.08) / count, to = (i + 0.87) / count,
        lx = a.x + dx * from, ly = a.y + dy * from,
        rx = a.x + dx * to, ry = a.y + dy * to;
      const points: Point[] = [[lx, ly], [rx, ry], [rx + wx, ry + wy], [lx + wx, ly + wy]];
      ctx.fillStyle = i % 3 === 0 ? "#b6a17b" : "#977c60";
      ctx.fill(path(points));
      // Tiny dark nail pairs read as wooden construction at native resolution.
      pixelRect(ctx, lx + wx * 0.15, ly + wy * 0.15, 2, 2, "#51473d");
      pixelRect(ctx, lx + wx * 0.82, ly + wy * 0.82, 2, 2, "#51473d");
    }
    ctx.strokeStyle = "#d1ba87"; ctx.lineWidth = 2; ctx.stroke(p);
    ctx.restore();
  }
}
export function drawWaterShape(ctx: Ctx, shape: WaterShape): void {
  const region = prepareWater(shape);
  drawWaterGround(ctx, region);
  drawWaterCrossings(ctx, region);
}
