/**
 * Developer-only isometric check view (`?iso=grid`), never linked from the UI.
 * Draws, in projected screen space, the 32-unit diamond grid around the view,
 * the cat's collision circle and enemy radii as 2:1 ellipses, the shared water
 * shore / core polygons vertex by vertex and the road centre lines. It reads
 * SimState and world-gen only and draws no text.
 */
import { enemyRadius } from "../../game/sim.js";
import { STATS, type SimState } from "../../game/types.js";
import { roads, waterRegionsNear } from "../../game/world-gen.js";
import type { WaterPolygon } from "../../defs/types.js";
import { isoInView, polygonBounds } from "./cull.js";
import { isoProjection, viewWorldPolygon, type IsoCamera, type IsoProjection } from "./iso-camera.js";
import { ISO, toScreen } from "./projection.js";

export const ISO_GRID = {
  /** World units of extra view polygon so grid lines and shapes run past the screen edge. */
  pad: 64,
  backdrop: "rgba(12, 14, 28, 0.55)",
  grid: "rgba(150, 190, 255, 0.35)",
  player: "#ffe36b",
  enemy: "#ff6b8a",
  shallow: "#6fd3ff",
  deep: "#2a6cff",
  road: "#f3b562",
} as const;

/** True for `?iso=grid` (developer check view only). */
export function isoGridRequested(search: string): boolean {
  return new URLSearchParams(search).get("iso") === "grid";
}

type Ctx = CanvasRenderingContext2D;

function moveTo(ctx: Ctx, p: IsoProjection, x: number, y: number, first: boolean): void {
  const s = toScreen(x, y), px = p.x + p.zoom * s.x, py = p.y + p.zoom * s.y;
  if (first) ctx.moveTo(px, py);
  else ctx.lineTo(px, py);
}

function strokePolygon(ctx: Ctx, p: IsoProjection, poly: WaterPolygon, colour: string): void {
  if (poly.length < 2) return;
  ctx.beginPath();
  poly.forEach((v, i) => moveTo(ctx, p, v.x, v.y, i === 0));
  ctx.closePath();
  ctx.strokeStyle = colour;
  ctx.stroke();
}

/** A world circle is a 2:1 ellipse on screen: width 2r * sqrt2 * k, height r * sqrt2 * k. */
function strokeFootprint(ctx: Ctx, p: IsoProjection, x: number, y: number, r: number, colour: string): void {
  const s = toScreen(x, y), rx = r * Math.SQRT2 * ISO.k * p.zoom;
  ctx.beginPath();
  ctx.ellipse(p.x + p.zoom * s.x, p.y + p.zoom * s.y, rx, rx / 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = colour;
  ctx.stroke();
}

/** Draws the check view over whatever is already on `ctx` (identity transform in view pixels). */
export function drawIsoDebugGrid(ctx: Ctx, sim: SimState, cam: IsoCamera): void {
  const proj = isoProjection(cam), poly = viewWorldPolygon(cam), b = polygonBounds(poly), pad = ISO_GRID.pad;
  ctx.save();
  ctx.fillStyle = ISO_GRID.backdrop;
  ctx.fillRect(0, 0, cam.width, cam.height);
  ctx.lineWidth = 1;
  // Grid lines every tile along both world axes.
  const t = ISO.tile, gx0 = Math.floor((b.x0 - pad) / t) * t, gy0 = Math.floor((b.y0 - pad) / t) * t;
  ctx.beginPath();
  for (let x = gx0; x <= b.x1 + pad; x += t) {
    moveTo(ctx, proj, x, b.y0 - pad, true);
    moveTo(ctx, proj, x, b.y1 + pad, false);
  }
  for (let y = gy0; y <= b.y1 + pad; y += t) {
    moveTo(ctx, proj, b.x0 - pad, y, true);
    moveTo(ctx, proj, b.x1 + pad, y, false);
  }
  ctx.strokeStyle = ISO_GRID.grid;
  ctx.stroke();
  // Water shore (shallow) and deep core, the same vertices the sim collides with.
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2,
    reach = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + pad;
  ctx.lineWidth = 2;
  for (const region of waterRegionsNear(sim.seed, cx, cy, reach)) {
    strokePolygon(ctx, proj, region.shore, ISO_GRID.shallow);
    if (region.core.length) strokePolygon(ctx, proj, region.core, ISO_GRID.deep);
  }
  // Road centre lines.
  ctx.strokeStyle = ISO_GRID.road;
  for (const road of roads(sim.seed)) {
    ctx.beginPath();
    road.points.forEach((pt, i) => moveTo(ctx, proj, pt.x, pt.y, i === 0));
    ctx.stroke();
  }
  // Collision footprints.
  ctx.lineWidth = 1;
  for (const e of sim.enemies) {
    if (!e.alive) continue;
    const r = enemyRadius(e);
    if (isoInView(poly, e.x, e.y, r + pad)) strokeFootprint(ctx, proj, e.x, e.y, r, ISO_GRID.enemy);
  }
  ctx.lineWidth = 2;
  strokeFootprint(ctx, proj, sim.player.x, sim.player.y, STATS.playerRadius, ISO_GRID.player);
  ctx.restore();
}
