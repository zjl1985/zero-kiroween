import { CHUNK, biomeAt, roads } from "../game/world-gen.js";
import { touchesWaterShore } from "../defs/water.js";
import { waterRegionsNear } from "../game/water.js";
import { BIOME_ART } from "./art-registry.js";
import type { ViewRect } from "./camera.js";
import { hash, type Ctx } from "./paper-material.js";

import { pixelRect, pixelTerrainCluster } from "./pixel-terrain.js";

export const ROAD_STOCK = { face: "#95886f", rim: "#a4977a" } as const;

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
      const sheet = sheetAt(seed, x, y);
      pixelTerrainCluster(ctx, x, y, sd, sheet?.seam ?? "scallop");
    }
  }
}

/** Broken wheel-worn lanes and inset paving remain inside the shared road
 * footprint. These are static cache detail, not new routes or collision edges. */
function drawTravelBands(ctx: Ctx, segment: RoadSegment, tile: ViewRect, seed: number): void {
  const {start,width,length,ux,uy,salt}=segment;
  for(let d=8;d<length-8;d+=4){
    const x=start.x+ux*d,y=start.y+uy*d;
    if(!nearTile(tile,x,y,width+12))continue;
    const block=Math.floor(d/28), tone=hash(salt+block*37);
    if(sheetAt(seed,x,y)?.seam==="ruled"){
      if(d%12!==8)continue;
      // Staggered, irregular flagstones with recessed joints, never a grid
      // covering every part of the road. Route intersections share the mask.
      for(const side of [-1,0,1]){
        if(hash(salt+block*71+side*19)<.3)continue;
        const off=side*width*.52,px=x-uy*off+ux*(side===0?3:0),py=y+ux*off+uy*(side===0?3:0);
        pixelRect(ctx,px-5,py-2,10,5,"#827866");
        pixelRect(ctx,px-4,py-3,8,4,tone>.5?"#a4987e":"#9e937b");
        pixelRect(ctx,px-3,py-3,5,1,"#b2a58a");
      }
    }else{
      if(tone<.2)continue;
      for(const side of [-1,1]){
        const offset=side*(width*.43+Math.sin(d/43+salt)*1.5),px=x-uy*offset,py=y+ux*offset;
        pixelRect(ctx,px-3,py-2,6,4,tone>.64?"#897b61":"#8e8167");
        if(d%16===8)pixelRect(ctx,px+1,py,3,1,"#a19272");
      }
      if(tone>.72)pixelRect(ctx,x-2,y-1,4,3,"#9c8e71");
    }
  }
}

/** World-anchored pixel flags, pebbles and worn earthen bands. */
function drawRoadWear(ctx: Ctx, segment: RoadSegment, tile: ViewRect, seed: number): void {
  const { start, width, length, ux, uy, salt } = segment;
  for (let d = 16; d < length - 8; d += 32) {
    const sd = salt + d * 31, along = d + (hash(sd) - 0.5) * 12,
      x = start.x + ux * along, y = start.y + uy * along;
    if (!nearTile(tile, x, y, width + 25)) continue;
    const stone = sheetAt(seed, x, y)?.seam === "ruled";
    for (let i = 0; i < (stone ? 3 : 2); i++) {
      const across = (i - 1) * width * 0.55,
        px = x - uy * across, py = y + ux * across;
      if (stone) {
        pixelRect(ctx, px - 5, py + 2, 11, 4, "#776e5e");
        pixelRect(ctx, px - 5, py, 9, 4, "#a3967e");
        pixelRect(ctx, px - 3, py, 6, 1, "#b8aa8e");
      } else {
        pixelRect(ctx, px - 6, py, 8, 1, i % 2 ? "#827154" : "#a99672");
        if (hash(sd + i) > 0.65) pixelRect(ctx, px, py - 2, 3, 1, "#b5a47f");
      }
    }
  }
}

/** One continuous route mask; styling never changes route positions or widths. */
export function* drawRoadNetwork(ctx: Ctx, seed: number, tile: ViewRect): Generator<void> {
  const segments = segmentsNear(seed, tile);
  if (!segments.length) return;
  const face = roadFootprint(segments);
  for (const segment of segments) {
    drawVerges(ctx, segment, tile, seed);
    yield;
  }
  ctx.save();
  ctx.fillStyle = "#5b5949"; ctx.fill(roadFootprint(segments, 3));
  ctx.fillStyle = ROAD_STOCK.rim; ctx.fill(face);
  ctx.fillStyle = ROAD_STOCK.face; ctx.fill(roadFootprint(segments, -1));
  ctx.clip(face);
  // A narrow lit bank, plus deliberate stone clusters rather than canvas grain.
  // Filled union avoids drawing the overlapping capsule caps as rings at junctions.
  yield;
  for (const segment of segments) {
    drawTravelBands(ctx, segment, tile, seed);
    drawRoadWear(ctx, segment, tile, seed);
    yield;
  }
  ctx.restore();
}
