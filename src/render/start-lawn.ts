import { CHUNK, SCREEN, biomeAt } from "../game/world-gen.js";
import { BIOME_ART, type SheetLook } from "./art-registry.js";
import type { ViewRect } from "./camera.js";
import { hash, path, type Ctx, type Point } from "./paper-material.js";

import { pixelRect, pixelTerrainCluster, terrainPalette } from "./pixel-terrain.js";

const { width, height } = SCREEN;
const spread = 104;
/** Hand-cut extensions of the starter lawn, crossing its west, south and east tile edges. */
const lawnEdge: readonly Point[] = [
  [-61, -24], [-77, 246], [-58, 314], [-74, 391], [-54, 469], [-63, height - 12],
  [-27, height + 36], [58, height + 54], [145, height + 42], [218, height + 73],
  [296, height + 85], [367, height + 61], [430, height + 70], [514, height + 92],
  [591, height + 72], [667, height + 83], [740, height + 52], [818, height + 62],
  [901, height + 48], [width + 31, height + 39], [width + 68, height + 6],
  [width + 51, 480], [width + 75, 407], [width + 49, 335], [width + 66, 255],
  [width + 53, -24],
];
/**
 * The district stock's cut around the lawn: vertex spacing, torn offset and a
 * slow wobble (world units), the reach of the cast shadow, lip and rim, how
 * strongly the edge reads over the translucent stock near the yard, and the
 * fringe-cut grass along the south edge. Presentation only.
 */
export const LAWN_CUT = {
  step: 12,
  tear: [1.2, 4.4],
  wobble: 3.2,
  shadow: 2.6,
  shadowAlpha: 0.34,
  card: 1.5,
  alpha: 0.85,
  fringe: { chance: 0.62, height: [8, 13], drop: 4, blade: 4.2 },
} as const;

let contour: readonly Point[] | undefined;
/**
 * The lawn outline as a hand-torn cut: every authored segment subdivided
 * every LAWN_CUT.step units and pushed along its normal by an alternating
 * tear plus a slow wobble. Pure (no seed), so every tile, painted or pencil,
 * cuts the same edge. The closing segment above the horizon stays straight.
 */
export function lawnContour(): readonly Point[] {
  if (contour) return contour;
  const out: Point[] = [];
  for (let e = 0; e < lawnEdge.length - 1; e++) {
    const a = lawnEdge[e]!, b = lawnEdge[e + 1]!,
      dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1,
      nx = -dy / len, ny = dx / len,
      n = Math.max(1, Math.round(len / LAWN_CUT.step));
    for (let i = 0; i < n; i++) {
      const t = i / n, x = a[0] + dx * t, y = a[1] + dy * t, sd = e * 1009 + i * 37,
        [lo, hi] = LAWN_CUT.tear,
        d = i === 0 ? 0 : (i % 2 ? 1 : -0.6) * (lo + hash(sd + 3) * (hi - lo)) + Math.sin(x * 0.043 + y * 0.051) * LAWN_CUT.wobble;
      out.push([x + nx * d, y + ny * d]);
    }
  }
  out.push(lawnEdge[lawnEdge.length - 1]!);
  return (contour = out);
}

/** Distance to the authored yard footprint, for feathering colour and detail beyond it. */
export function yardDistance(x: number, y: number): number {
  return Math.hypot(Math.max(0, -x, x - width), Math.max(0, -y, y - height));
}

/** Whether a tile (grown by `pad`) reaches the lawn's cut. */
export function reachesLawn({ x0, x1, y0 }: ViewRect, pad = 0): boolean {
  return x0 < width + spread + pad && x1 > -spread - pad && y0 < height + spread + pad;
}

/** Everything outside the lawn over a tile, as an even-odd region. */
function outsideLawn(tile: ViewRect): Path2D {
  const outside = new Path2D();
  const left = Math.min(tile.x0, -spread) - 1, top = Math.min(tile.y0, -spread) - 1;
  outside.rect(left, top, Math.max(tile.x1, width + spread) - left + 1, Math.max(tile.y1, height + spread) - top + 1);
  outside.addPath(path(lawnContour(), true));
  return outside;
}

/** District sheets wrap around the same lawn in paint and graphite. */
export function clipOutsideLawn(ctx: Ctx, tile: ViewRect): void {
  if (!reachesLawn(tile)) return;
  ctx.clip(outsideLawn(tile), "evenodd");
}

/** The district stock that meets the lawn at a point. */
function stockAt(seed: number, x: number, y: number): SheetLook | undefined {
  return BIOME_ART.find(biomeAt(seed, Math.floor(x / CHUNK.width), Math.floor(y / CHUNK.height)).id)?.sheet;
}

/**
 * Stretches of the smoothed contour (the same quadratic curve as the clip)
 * that come near the tile, split where the neighbouring district changes.
 */
function edgeRuns(seed: number, tile: ViewRect, pad: number): { path: Path2D; look: SheetLook }[] {
  const pts = lawnContour(), n = pts.length, runs: { path: Path2D; look: SheetLook }[] = [];
  const mid = (i: number): Point => {
    const a = pts[(i + n) % n]!, b = pts[(i + 1) % n]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  let run: { path: Path2D; look: SheetLook } | undefined;
  for (let i = 0; i < n - 1; i++) {
    const [x, y] = pts[i]!,
      near = x > tile.x0 - pad && x < tile.x1 + pad && y > tile.y0 - pad && y < tile.y1 + pad,
      look = near ? stockAt(seed, x, y) : undefined;
    if (!look || look !== run?.look) {
      run = undefined;
      if (!look) continue;
      run = { path: new Path2D(), look };
      run.path.moveTo(...mid(i - 1));
      runs.push(run);
    }
    run.path.quadraticCurveTo(x, y, ...mid(i));
  }
  return runs;
}

/** Pixel grass banks follow the unchanged lawn contour on both sides of chunk seams. */
export function drawLawnEdge(ctx: Ctx, tile: ViewRect, seed: number): void {
  if (!reachesLawn(tile, 24)) return;
  const runs = edgeRuns(seed, tile, 24);
  if (!runs.length) return;
  ctx.save();
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  // An earthen bank, clipped to the original lawn, rather than a paper thickness lip.
  ctx.clip(path(lawnContour(), true));
  for (const r of runs) {
    const [dark, , light] = terrainPalette(r.look.seam);
    ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.stroke(r.path);
    ctx.strokeStyle = light; ctx.lineWidth = 2; ctx.stroke(r.path);
  }
  ctx.restore();
}

/** Authored pixel grass and stones interrupt the bank without changing its footprint. */
export function drawLawnVerge(ctx: Ctx, tile: ViewRect, seed: number): void {
  const pad = 42;
  if (!reachesLawn(tile, pad)) return;
  for (let i = 1; i < lawnEdge.length - 2; i++) {
    const [ax, ay] = lawnEdge[i]!, [bx, by] = lawnEdge[i + 1]!, salt = seed * 17 + i * 6971;
    if (hash(salt) < 0.22) continue;
    const t = 0.28 + hash(salt + 1) * 0.44,
      x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (x + pad < tile.x0 || x - pad > tile.x1 || y + pad < tile.y0 || y - pad > tile.y1) continue;
    const kind = stockAt(seed, x, y)?.seam ?? "scallop";
    pixelTerrainCluster(ctx, x - 8, y + 2, salt, kind);
    pixelTerrainCluster(ctx, x + 13, y + 5, salt + 379, "scallop");
    if (i % 3 === 0) {
      pixelRect(ctx, x - 16, y + 6, 10, 4, "#3a4b47");
      pixelRect(ctx, x - 16, y + 4, 8, 4, "#74816b");
      pixelRect(ctx, x - 14, y + 4, 6, 2, "#a2ae83");
    }
  }
}
