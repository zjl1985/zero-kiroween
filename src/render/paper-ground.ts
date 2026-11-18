/**
 * District ground as large overlapping paper sheets. A world-space grid of
 * sheets, each cut with its district's seam style, pressed edge and the
 * shared hard shadow down-right; grassy districts fringe-cut the sheet's
 * lower edge. Every sheet is a pure function of (seed, grid cell), painted in
 * one global order, so every chunk cache (terrain worker or fallback) that
 * overlaps a sheet draws exactly the same pixels for it.
 * No gradients, no shadowBlur, no filters; never the sim RNG.
 */
import { CHUNK, WORLD, biomeAt } from "../game/world-gen.js";
import { waterRegionsNear } from "../game/water.js";
import { touchesWaterShore } from "../defs/water.js";
import { BIOME_ART, type SheetLook } from "./art-registry.js";
import { crease, fringeStrip, insetPoints, PAPER_EDGE, PAPER_LIGHT, PAPER_SHADOW } from "./paper-kit.js";
import { grain, hash, mix, path, stitch, type Ctx, type Point } from "./paper-material.js";
import { yardDistance } from "./start-lawn.js";

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
      out.push([a[0] + dx * t + nx * d, a[1] + dy * t + ny * d]);
    }
  }
  return out;
}

/**
 * One ground sheet: hard shadow down-right, the darker card side, the flat
 * sheet (slightly translucent so the pressed pulp under it still shows),
 * fibre, a pressed lit rim toward the moon and the seam detail of its style.
 */
export function groundSheet(ctx: Ctx, pts: readonly Point[], color: string, look: SheetLook, seed: number): Path2D {
  const p = path(pts),
    k = Math.hypot(PAPER_SHADOW.dx, PAPER_SHADOW.dy) || 1,
    { dirX, dirY } = PAPER_LIGHT;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 2.6, PAPER_SHADOW.dy * 2.6);
  ctx.globalAlpha *= 0.34;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(p);
  ctx.restore();
  ctx.save();
  ctx.translate((PAPER_SHADOW.dx / k) * 1.5, (PAPER_SHADOW.dy / k) * 1.5);
  ctx.fillStyle = mix(color, "#1c142b", 0.45);
  ctx.fill(p);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = color;
  ctx.fill(p);
  ctx.restore();
  grain(ctx, p, 0.34);
  ctx.save();
  ctx.clip(p);
  ctx.save();
  ctx.translate(-dirX * 1.2, -dirY * 1.2);
  ctx.globalAlpha *= 0.42;
  ctx.strokeStyle = mix(color, PAPER_LIGHT.rim, 0.42);
  ctx.lineWidth = 2;
  ctx.stroke(p);
  ctx.restore();
  ctx.save();
  ctx.translate(dirX * 1.1, dirY * 1.1);
  ctx.globalAlpha *= 0.26;
  ctx.strokeStyle = PAPER_EDGE.lip;
  ctx.lineWidth = 1.6;
  ctx.stroke(p);
  ctx.restore();
  if (look.seam === "torn") {
    // Fresh tears show pale fibre just inside the edge.
    ctx.globalAlpha *= 0.42;
    ctx.strokeStyle = mix(color, "#efe0bd", 0.55);
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3, 1.5, 3]);
    ctx.lineDashOffset = hash(seed) * 10;
    ctx.stroke(p);
  }
  ctx.restore();
  ctx.globalAlpha *= 0.55;
  ctx.strokeStyle = mix(color, "#1c142b", 0.6);
  ctx.lineWidth = 0.6;
  ctx.stroke(p);
  ctx.restore();
  if (look.seam === "ruled") stitch(ctx, path(insetPoints(pts, 6)), mix(color, "#e6cf9e", 0.45), 0.55);
  if (look.seam === "wave" || look.seam === "scallop") {
    // A pressed (embossed) line follows the cut a little inside it.
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.strokeStyle = mix(color, PAPER_LIGHT.rim, 0.35);
    ctx.lineWidth = 0.9;
    ctx.stroke(path(insetPoints(pts, 8)));
    ctx.restore();
  }
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

/** One grid sheet, or two overlapping strips for furrowed districts, with its fringe-cut lower edge. */
export function paintSheet(ctx: Ctx, corners: readonly Point[], look: SheetLook, sd: number): void {
  const [a, b, c, d] = corners as [Point, Point, Point, Point],
    lerp = (p: Point, q: Point, t: number): Point => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t],
    parts: Point[][] = look.seam === "furrow"
      ? [[lerp(a, d, 0.48), lerp(b, c, 0.52), c, d], [a, b, lerp(b, c, 0.58), lerp(a, d, 0.56)]]
      : [[a, b, c, d]];
  parts.forEach((q, n) => {
    const color = look.colors[Math.floor(hash(sd + 20 + n) * look.colors.length)]!,
      pts = sheetOutline(q, look, sd + n * 7);
    groundSheet(ctx, pts, color, look, sd + n);
    if (look.seam === "furrow") {
      // Two ridges run along each strip: furrows pressed into the field sheet.
      for (const f of [0.38, 0.68]) {
        const l = lerp(q[0]!, q[3]!, f), r = lerp(q[1]!, q[2]!, f);
        crease(ctx, l[0] + 12, l[1], r[0] - 12, r[1], 0.45);
      }
    }
    if (!look.fringe) return;
    // Grass is fringe-cut along stretches of the sheet's lower edge, never along all of it.
    const bl = q[3]!, br = q[2]!, len = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
    for (let s = 0; s < 3; s++) {
      if (hash(sd + 40 + s + n * 5) < 0.35) continue;
      const t0 = 0.08 + s * 0.3 + hash(sd + 50 + s) * 0.06, t1 = t0 + Math.min(0.24, 60 / len + hash(sd + 60 + s) * 0.1),
        p0 = lerp(bl, br, t0), p1 = lerp(bl, br, t1);
      fringeStrip(ctx, p0[0], p0[1] - 1, p1[0], p1[1] - 1, 9 + hash(sd + 70 + s) * 5, look.fringe, sd + s * 31, 4.2);
    }
  });
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
