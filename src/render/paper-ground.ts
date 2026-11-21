/** District terrain pixels retain the existing world sheet/patch placement API.
 * Every detail is world anchored, so independently baked chunks have no seams. */
import { CHUNK, WORLD, biomeAt } from "../game/world-gen.js";
import { waterRegionsNear } from "../game/water.js";
import { touchesWaterShore } from "../defs/water.js";
import { BIOME_ART, type SheetLook } from "./art-registry.js";
import { hash, path, type Ctx, type Point } from "./paper-material.js";
import { yardDistance } from "./start-lawn.js";
import { pixelRect, pixelTerrainCluster, terrainPalette } from "./pixel-terrain.js";

/** The sheet grid: cell size, overlap past the cell and corner jitter, in world units. */
export const SHEET = { w: 280, h: 190, overlap: 46, jitter: 18, step: 14 } as const;

/** Outward edge displacement of a seam style at fraction `t` along an edge of length `len`. */
function seamOffset(look: SheetLook, t: number, len: number, i: number, seed: number): number {
  switch (look.seam) {
    case "torn":
      return (i % 2 ? 1 : -0.5) * (1.4 + hash(seed + i * 13) * 3.4);
    case "wave":
      return Math.sin(t * len * 0.09 + seed) * 4.2;
    case "scallop":
      return Math.abs(Math.sin(t * len * 0.07 + seed)) * 6 - 2;
    case "furrow":
      return Math.sin(t * len * 0.05 + seed) * 2;
    default:
      return (hash(seed + i * 5) - 0.5) * 0.8;
  }
}
/** A sheet outline from four corners (clockwise on screen), each edge cut in the seam style. */
export function sheetOutline(corners: readonly Point[], look: SheetLook, seed: number): Point[] {
  const out: Point[] = [];
  for (let e = 0; e < corners.length; e++) {
    const a = corners[e]!, b = corners[(e + 1) % corners.length]!,
      dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1,
      // Clockwise on screen (y down): the outward normal is (dy, -dx) / len.
      nx = dy / len, ny = -dx / len,
      n = Math.max(1, Math.round(len / SHEET.step));
    for (let i = 0; i < n; i++) {
      const t = i / n, d = i === 0 ? 0 : seamOffset(look, t, len, i, seed + e * 101);
      const px = Math.round((a[0] + dx * t + nx * d) / 2) * 2,
        py = Math.round((a[1] + dy * t + ny * d) / 2) * 2,
        prev = out[out.length - 1];
      if (prev && prev[0] !== px && prev[1] !== py) out.push([px, prev[1]]);
      out.push([px, py]);
    }
  }
  if (out.length) out.push([out[0]![0], out[out.length - 1]![1]]);
  return out;
}

/** A bounded terrain patch with low-contrast pixels and clustered raised details. */
export function groundSheet(ctx: Ctx, pts: readonly Point[], _color: string, look: SheetLook, seed: number): Path2D {
  const p = path(pts), [dark, mid, light] = terrainPalette(look.seam),
    x0 = Math.min(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])),
    x1 = Math.max(...pts.map(p => p[0])), y1 = Math.max(...pts.map(p => p[1]));
  ctx.save();
  ctx.fillStyle = mid; ctx.fill(p); ctx.clip(p);
  // Large quiet two-tone regions, with sparse authored clusters on a world grid.
  for (let gy = Math.floor(y0 / 30); gy * 30 <= y1; gy++)
    for (let gx = Math.floor(x0 / 42); gx * 42 <= x1; gx++) {
      const sd = gx * 7919 + gy * 104729 + seed,
        x = gx * 42 + Math.floor(hash(sd) * 8) * 2,
        y = gy * 30 + Math.floor(hash(sd + 7) * 6) * 2;
      if (hash(sd + 11) < 0.2) {
        pixelRect(ctx, x, y, 12, 4, dark);
        pixelRect(ctx, x + 4, y - 2, 8, 2, light);
      }
      if (hash(sd + 19) > 0.83) pixelTerrainCluster(ctx, x, y, sd, look.seam);
    }
  ctx.restore();
  return p;
}

/** The grid sheet (i, j): corners, district look and colour, all from render hashes of the run seed. */
export function sheetAt(seed: number, i: number, j: number) {
  const sd = seed * 131 + i * 7919 + j * 104729,
    { w, h, overlap: o, jitter: q } = SHEET,
    x0 = i * w - o, y0 = j * h - o, x1 = (i + 1) * w + o, y1 = (j + 1) * h + o,
    jx = (n: number) => (hash(sd + n) - 0.5) * 2 * q,
    corners: Point[] = [[x0 + jx(1), y0 + jx(2)], [x1 + jx(3), y0 + jx(4)], [x1 + jx(5), y1 + jx(6)], [x0 + jx(7), y1 + jx(8)]],
    cx = (i + 0.5) * w, cy = (j + 0.5) * h,
    opacity = Math.min(1, 0.48 + yardDistance(cx, cy) / 580),
    art = BIOME_ART.find(biomeAt(seed, Math.floor(cx / CHUNK.width), Math.floor(cy / CHUNK.height)).id);
  return { sd, corners, art, opacity, bounds: [x0 - q - 8, y0 - q - 8, x1 + q + 8, y1 + q + 8] as const };
}

/** Preserve the same district placement, now painted with native pixel clusters. */
export function paintSheet(ctx: Ctx, corners: readonly Point[], look: SheetLook, sd: number): void {
  const color = look.colors[Math.floor(hash(sd + 20) * look.colors.length)]!;
  groundSheet(ctx, sheetOutline(corners, look, sd), color, look, sd);
}

/** Sheets overlapping a box, in the same global order as sheetGround (painted and pencil layers agree). */
export function* sheetsIn(seed: number, x0: number, y0: number, x1: number, y1: number) {
  const { w, h, overlap: o, jitter: q } = SHEET,
    pad = o + q + 16,
    ia = Math.floor((Math.max(x0, WORLD.minX) - pad) / w), ib = Math.floor((x1 + pad) / w),
    ja = Math.floor((y0 - pad) / h), jb = Math.floor((y1 + pad) / h);
  for (let j = jb; j >= ja; j--)
    for (let i = ib; i >= ia; i--) {
      const s = sheetAt(seed, i, j), [bx0, by0, bx1, by1] = s.bounds;
      if (!s.art || bx1 < x0 || bx0 > x1 || by1 < y0 || by0 > y1) continue;
      yield { ...s, art: s.art };
    }
}
/** Ground patch grid: one possible cluster per cell, its biome from the cell centre's chunk. */
export const PATCH = { cell: 210, margin: 110, r: [46, 84] } as const;
/**
 * District ground patches overlapping a box: placed on a world grid by render
 * hashes, so every chunk that overlaps a patch places it the same way. A
 * seeded blend of neighbouring districts avoids hard chunk seams. Shared by
 * the painted ground and its pencil underdrawing.
 */
export function* patchSpots(seed: number, x0: number, y0: number, x1: number, y1: number) {
  const c = PATCH.cell,
    ia = Math.floor((x0 - PATCH.margin) / c),
    ib = Math.floor((x1 + PATCH.margin) / c),
    ja = Math.floor((y0 - PATCH.margin) / c),
    jb = Math.floor((y1 + PATCH.margin) / c);
  for (let j = ja; j <= jb; j++)
    for (let i = ia; i <= ib; i++) {
      const sd = seed * 31 + i * 7919 + j * 104729,
        x = (i + 0.2 + hash(sd) * 0.6) * c,
        y = (j + 0.2 + hash(sd + 1) * 0.6) * c;
      if (y < WORLD.playTop + 10) continue;
      if (x < WORLD.minX + 60 || x > WORLD.maxX - 60 || y > WORLD.maxY - 50) continue;
      const gx = x / CHUNK.width - 0.5, gy = y / CHUNK.height - 0.5,
        cx = Math.floor(gx), cy = Math.floor(gy),
        fx = gx - cx, fy = gy - cy,
        // Stochastic motif mixing, not translucent rectangular biome overlays.
        bx = cx + (hash(sd + 11) < fx * fx * (3 - 2 * fx) ? 1 : 0),
        by = cy + (hash(sd + 12) < fy * fy * (3 - 2 * fy) ? 1 : 0),
        art = BIOME_ART.find(biomeAt(seed, bx, by).id);
      if (!art || hash(sd + 2) > art.patchChance) continue;
      const r = PATCH.r[0] + hash(sd + 3) * (PATCH.r[1] - PATCH.r[0]);
      if (yardDistance(x, y) < r + 8) continue;
      if (x + r < x0 - 20 || x - r > x1 + 20 || y + r < y0 - 20 || y - r > y1 + 20) continue;
      if (waterRegionsNear(seed, x, y, r + 8).some((water) => touchesWaterShore(water, x, y, r + 8))) continue;
      yield { x, y, r, art, seed: Math.floor(hash(sd + 4) * 1e5) };
    }
}

/**
 * The sheets overlapping a tile, in one global order (bottom-right first),
 * so sheets above and to the left lie on top and cast their shadow down-right
 * onto the ones under them. Yields between sheets for the budgeted fallback.
 */
export function* sheetGround(ctx: Ctx, seed: number, x0: number, y0: number, x1: number, y1: number): Generator<void> {
  for (const s of sheetsIn(seed, x0, y0, x1, y1)) {
    ctx.save();
    ctx.globalAlpha *= s.opacity;
    paintSheet(ctx, s.corners, s.art.sheet, s.sd);
    ctx.restore();
    yield;
  }
}
