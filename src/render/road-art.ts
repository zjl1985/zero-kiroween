import { CHUNK, biomeAt, roads } from "../game/world-gen.js";
import { touchesWaterShore } from "../defs/water.js";
import { waterRegionsNear } from "../game/water.js";
import { BIOME_ART } from "./art-registry.js";
import type { ViewRect } from "./camera.js";
import { flatCut, fringeStrip, placePoints, PAPER_LIGHT, PAPER_SHADOW } from "./paper-kit.js";
import { grain, hash, mix, type Ctx } from "./paper-material.js";

export const ROAD_STOCK = { face: "#95886f", rim: "#b9aa8c" } as const;

interface RoadSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  width: number;
  length: number;
  angle: number;
  ux: number;
  uy: number;
  salt: number;
}

function segmentsNear(seed: number, tile: ViewRect): RoadSegment[] {
  const segments: RoadSegment[] = [];
  for (const [roadIndex, road] of roads(seed).entries()) {
    const pad = road.width + 46;
    for (let i = 0; i < road.points.length - 1; i++) {
      const start = road.points[i]!, end = road.points[i + 1]!;
      if (Math.max(start.x, end.x) + pad < tile.x0 || Math.min(start.x, end.x) - pad > tile.x1 ||
          Math.max(start.y, end.y) + pad < tile.y0 || Math.min(start.y, end.y) - pad > tile.y1) continue;
      const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy);
      if (length === 0) continue;
      segments.push({ start, end, width: road.width, length, angle: Math.atan2(dy, dx),
        ux: dx / length, uy: dy / length, salt: seed + roadIndex * 100003 + i * 7919 });
    }
  }
  return segments;
}

/** Each round-ended segment winds the same way, so a nonzero fill joins the whole road surface. */
function roadFootprint(segments: readonly RoadSegment[], outset = 0): Path2D {
  const outline = new Path2D();
  const quarter = Math.PI / 2;
  for (const { start, end, width, angle, ux, uy } of segments) {
    const radius = width + outset;
    outline.moveTo(start.x + uy * radius, start.y - ux * radius);
    outline.arc(end.x, end.y, radius, angle - quarter, angle + quarter);
    outline.arc(start.x, start.y, radius, angle + quarter, angle + 3 * quarter);
    outline.closePath();
  }
  return outline;
}

function nearTile(tile: ViewRect, x: number, y: number, pad: number): boolean {
  return x >= tile.x0 - pad && x <= tile.x1 + pad && y >= tile.y0 - pad && y <= tile.y1 + pad;
}

function sheetAt(seed: number, x: number, y: number) {
  return BIOME_ART.find(biomeAt(seed, Math.floor(x / CHUNK.width), Math.floor(y / CHUNK.height)).id)?.sheet;
}

/** Low grass cuts tuck under the road edge and leave the water approaches open. */
function drawVerges(ctx: Ctx, segment: RoadSegment, tile: ViewRect, seed: number): void {
  const { start, width, length, ux, uy, salt } = segment;
  for (let d = 22; d < length - 12; d += 48) {
    for (const side of [-1, 1]) {
      const sd = salt + d * 17 + side * 119;
      if (hash(sd) < 0.42) continue;
      const along = d + (hash(sd + 1) - 0.5) * 18;
      const across = side * (width + 4 + hash(sd + 2) * 4);
      const x = start.x + ux * along - uy * across, y = start.y + uy * along + ux * across;
      if (!nearTile(tile, x, y, 22)) continue;
      const extent = 11 + hash(sd + 3) * 8;
      if (waterRegionsNear(seed, x, y, extent).some((water) => touchesWaterShore(water, x, y, extent))) continue;
      const sheet = sheetAt(seed, x, y), color = sheet?.fringe ?? "#777758";
      fringeStrip(ctx, x - extent, y + 1, x + extent, y - 1, 5 + hash(sd + 4) * 5, color, sd, 5.2);
    }
  }
}

/** Offset stone flags in town, broad worn scraps on the softer district paths. */
function drawRoadWear(ctx: Ctx, segment: RoadSegment, tile: ViewRect, seed: number): void {
  const { start, width, length, angle, ux, uy, salt } = segment;
  for (let d = 16; d < length - 8; d += 46) {
    const sd = salt + d * 31, along = d + (hash(sd) - 0.5) * 19;
    const x = start.x + ux * along, y = start.y + uy * along;
    if (!nearTile(tile, x, y, width + 25)) continue;
    const sheet = sheetAt(seed, x, y), stone = sheet?.seam === "ruled";
    const shade = mix(ROAD_STOCK.face, sheet?.colors[1] ?? "#5e5443", 0.46);
    const light = mix(ROAD_STOCK.face, stone ? "#d3c8af" : "#cdb181", 0.24);
    const count = stone ? 2 + Math.floor(hash(sd + 1) * 2) : 1;
    for (let i = 0; i < count; i++) {
      const cut = sd + i * 713;
      const across = ((i + 0.5) / count - 0.5) * width * 1.68 + (hash(cut + 2) - 0.5) * 9;
      const stagger = (hash(cut + 3) - 0.5) * 18;
      const cx = x - uy * across + ux * stagger, cy = y + ux * across + uy * stagger;
      const halfLong = stone ? 7 + hash(cut + 4) * 8 : 13 + hash(cut + 4) * 11;
      const halfWide = stone ? 4 + hash(cut + 5) * 4 : 2.5 + hash(cut + 5) * 4;
      const points = placePoints([
        [-halfLong * 0.8, -halfWide], [halfLong * 0.48, -halfWide * 0.88], [halfLong, -halfWide * 0.24],
        [halfLong * 0.66, halfWide * 0.83], [-halfLong * 0.24, halfWide], [-halfLong, halfWide * 0.33],
      ], cx, cy, angle + (hash(cut + 6) - 0.5) * 0.76);
      flatCut(ctx, points, { color: hash(cut + 7) < 0.5 ? shade : light,
        thickness: 0.38, lift: 0.22, rim: 0.35, texture: 0.65 });
    }
  }
}

/** Bake the join before the relief: no individual road edges cross the shared face. */
export function* drawRoadNetwork(ctx: Ctx, seed: number, tile: ViewRect): Generator<void> {
  const segments = segmentsNear(seed, tile);
  if (!segments.length) return;
  const face = roadFootprint(segments);
  ctx.save();
  ctx.fillStyle = "#7b715c";
  ctx.globalAlpha *= 0.26;
  ctx.fill(roadFootprint(segments, 4.5));
  ctx.restore();
  for (const segment of segments) {
    drawVerges(ctx, segment, tile, seed);
    yield;
  }

  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 2.2, PAPER_SHADOW.dy * 2.2);
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.globalAlpha *= 0.28;
  ctx.fill(face);
  ctx.restore();
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx, PAPER_SHADOW.dy);
  ctx.fillStyle = "#635846";
  ctx.fill(face);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = ROAD_STOCK.rim;
  ctx.fill(face);
  ctx.clip(face);
  ctx.save();
  ctx.translate(-PAPER_LIGHT.dirX * 0.9, -PAPER_LIGHT.dirY * 0.9);
  ctx.fillStyle = ROAD_STOCK.face;
  ctx.fill(face);
  ctx.restore();
  grain(ctx, face, 0.68);
  yield;
  for (const segment of segments) {
    drawRoadWear(ctx, segment, tile, seed);
    yield;
  }
  ctx.restore();
}
