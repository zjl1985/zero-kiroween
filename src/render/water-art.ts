import type { WaterPolygon, WaterRegion, WaterShape } from "../defs/types.js";
import { prepareWater } from "../defs/water.js";
import { paperCut, stitchAlong } from "./paper-kit.js";
import { hash, line, stroke, type Ctx } from "./paper-material.js";

/** No rough oval or smoothing here: this is the exact simulation polygon. */
export function waterPath(polygon: WaterPolygon): Path2D {
  const p = new Path2D();
  polygon.forEach((v, i) => i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y));
  p.closePath();
  return p;
}
export function drawWaterGround(ctx: Ctx, region: WaterRegion): void {
  const shore = waterPath(region.shore), { minX, maxX, minY, maxY } = region.bounds;
  // Pressed earth backing, pale shallow shelf, then a visibly darker blocked core.
  stroke(ctx, shore, "#52634e", 12, 0.75);
  stroke(ctx, shore, "#9caa84", 3, 0.75);
  paperCut(ctx, shore, { color: "#628b87", shadow: 1.5, thickness: 1.2, texture: 0.6, edge: "#b2c4ab" });
  if (region.core.length) paperCut(ctx, waterPath(region.core), {
    color: "#2c4560", shadow: 0, thickness: 0.6, texture: 0.55, edge: "#7caaa9",
  });
  ctx.save();
  ctx.clip(shore);
  const count = Math.min(34, Math.ceil((maxX - minX) / 16));
  for (let i = 0; i < count; i++) {
    const x = minX + hash(region.seed + i * 19) * (maxX - minX),
      y = minY + hash(region.seed + i * 31 + 7) * (maxY - minY), p = new Path2D();
    p.moveTo(x - 8, y); p.quadraticCurveTo(x, y - 2, x + 10, y);
    stroke(ctx, p, "#b1c6bd", 0.7, 0.45);
    if (i % 4 === 0) line(ctx, x - 2, y + 3, x + 5, y + 3, "#d4bf82", 0.8, 0.3);
  }
  ctx.restore();
  stitchAlong(ctx, shore, "#c3ccb0", 0.45);
}
/** Explicit dry paper decks, drawn after roads so every collision exemption is visible. */
export function drawWaterCrossings(ctx: Ctx, region: WaterRegion): void {
  for (const crossing of region.crossings) {
    const p = waterPath(crossing.polygon), a = crossing.polygon[0]!, b = crossing.polygon[1]!,
      d = crossing.polygon[3]!, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    paperCut(ctx, p, { color: "#9a8b7e", shadow: 2.2, thickness: 1.6, texture: 0.85, edge: "#dac6a4" });
    ctx.save(); ctx.clip(p);
    const count = Math.max(1, Math.ceil(len / 13));
    for (let i = 1; i < count; i++) {
      const t = i / count;
      line(ctx, a.x + dx * t, a.y + dy * t, d.x + dx * t, d.y + dy * t, "#655d57", 0.8, 0.8);
    }
    ctx.restore();
    // Low stitched edges, not impassable parapets hiding access to the shallow shelf.
    stitchAlong(ctx, p, "#e5d3ae", 0.6);
  }
}
/** Used by standalone previews without needing a world seed or road network. */
export function drawWaterShape(ctx: Ctx, shape: WaterShape): void {
  const region = prepareWater(shape);
  drawWaterGround(ctx, region);
  drawWaterCrossings(ctx, region);
}
