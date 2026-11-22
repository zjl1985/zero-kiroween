import { CHUNK, biomeAt, roads } from "../game/world-gen.js";
import { touchesWaterShore } from "../defs/water.js";
import { waterRegionsNear } from "../game/water.js";
import { BIOME_ART } from "./art-registry.js";
import type { ViewRect } from "./camera.js";
import { hash, type Ctx } from "./paper-material.js";

import { pixelRect, pixelTerrainCluster } from "./pixel-terrain.js";

export const ROAD_STOCK = {
  face: "#9b876b", rim: "#aa9475", bank: "#665c48",
  worn: "#907c60", packed: "#a48e71",
} as const;

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

/** Low, uneven turf runs into the compacted shoulder of the farm lanes. */
function drawFarmVerge(ctx: Ctx, x: number, y: number, salt: number): void {
  const r = (dx: number, dy: number, w: number, h: number, color: string) =>
    pixelRect(ctx, x + dx, y + dy, w, h, color);
  const lean = hash(salt + 8) > .5 ? 1 : -1;
  r(-12, -1, 24, 5, "#74674c");
  r(-8, -3, 16, 6, "#687048");
  r(-11, 1, 18, 3, "#71774c");
  r(-6, 4, 12, 2, "#74674c");
  for (const [dx, height] of [[-6, 5], [-2, 8], [2, 6], [6, 4]] as const) {
    r(dx, 2 - height, 2, height, "#7e8657");
    r(dx + lean, 1 - height, 1, 3, "#979568");
  }
  r(10, 2, 3, 2, "#a18d6b");
  r(-13, 4, 3, 1, "#928269");
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
      if (sheet?.seam === "furrow") drawFarmVerge(ctx, x, y, sd);
      else pixelTerrainCluster(ctx, x, y, sd, sheet?.seam ?? "scallop");
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
      if(tone<.25)continue;
      for(const side of [-1,1]){
        // Broad wear varies between wheel paths and breaks before turns.
        if (hash(salt + block * 71 + side * 19) < .28) continue;
        const offset=side*(width*.41+Math.sin(d/43+salt)*2),px=x-uy*offset,py=y+ux*offset;
        pixelRect(ctx,px-3,py-2,6,4,tone>.64?ROAD_STOCK.worn:"#958164");
        if(d%16===8)pixelRect(ctx,px+1,py,3,1,ROAD_STOCK.packed);
      }
      if(tone>.72)pixelRect(ctx,x-2,y-1,4,3,ROAD_STOCK.packed);
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
        // Two nearby chips read as flush gravel instead of road markings.
        pixelRect(ctx, px - 5, py, 4, 2, i % 2 ? "#87755b" : "#b39b79");
        if (hash(sd + i) > 0.65) pixelRect(ctx, px + 1, py - 2, 3, 1, "#b39b79");
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
  ctx.fillStyle = ROAD_STOCK.bank; ctx.fill(roadFootprint(segments, 3));
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
