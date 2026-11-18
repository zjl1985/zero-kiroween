/**
 * Grounded landmark bases. Each landmark kind stands on its own footing cut
 * from paper (riverbanks, fence silhouettes, furrow strips, market boards,
 * fringed grass mounds, paved tiles, stage boards, a wet stone ring ...),
 * instead of one shared floating oval. Everything here is drawn flat by the
 * paper ruleset: one hard shadow down-right, a lit rim toward the moon, no
 * gradients, shadowBlur or filters. Seeds are world-gen landmark seeds.
 */
import { flatCut, fringeStrip, tornEdge, crease, type FlatCutOptions } from "../../render/paper-kit.js";
import { hash, mix, stroke, type Ctx, type Point } from "../../render/paper-material.js";

/** An irregular ellipse-like outline (n points), roughened by the seed. */
export function blob(x: number, y: number, rx: number, ry: number, seed: number, rough = 0.06, n = 28): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + (hash(seed * 17 + i) - 0.5) * rough * 2;
    out.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  return out;
}
/** A regular polygon with `n` sides (used for tiered daises). */
export function polygon(x: number, y: number, rx: number, ry: number, n: number, turn = 0): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as Point;
  });
}
const cut = (ctx: Ctx, pts: readonly Point[] | Path2D, o: FlatCutOptions) => flatCut(ctx, pts, { texture: 0.6, ...o });

/** A grassy mound in tiers, each tier's lower edge fringe-cut into blades. */
export function fringedMound(ctx: Ctx, x: number, y: number, tiers: readonly (readonly [number, number, number, string])[], fringe: string, seed: number): void {
  tiers.forEach(([rx, ry, dy, color], t) => {
    cut(ctx, blob(x, y + dy, rx, ry, seed + t * 7, 0.07), { color, thickness: 1.3, lift: 1.4 - t * 0.3, rim: 1.1 });
    // Fringe the front arc of the tier: short blade runs along its lower edge.
    for (let i = 0; i < 7; i++) {
      const a0 = 0.35 + i * 0.36, a1 = a0 + 0.24;
      if (hash(seed + t * 31 + i) < 0.25) continue;
      fringeStrip(ctx, x + Math.cos(a0) * rx * 0.98, y + dy + Math.sin(a0) * ry * 0.98, x + Math.cos(a1) * rx * 0.98, y + dy + Math.sin(a1) * ry * 0.98,
        8 + t * 1.5, mix(fringe, color, 0.2 * t), seed + t * 13 + i, 4);
    }
  });
}
/** A torn-edged bank strip from x0 to x1: its torn edge on the `edgeY` side faces the water. */
export function tornBank(ctx: Ctx, x0: number, x1: number, edgeY: number, backY: number, color: string, seed: number): void {
  const torn = tornEdge(x0, edgeY, x1, edgeY, Math.max(6, Math.round((x1 - x0) / 16)), 3.4, seed),
    pts: Point[] = [[x0 - 6, backY], ...torn, [x1 + 6, backY]];
  cut(ctx, pts, { color, thickness: 1.1, lift: 1, rim: 0.9 });
  // Pale fibre along the tear, where the paper bank was ripped from the river sheet.
  const tear = new Path2D();
  torn.forEach(([px, py], i) => (i ? tear.lineTo(px, py) : tear.moveTo(px, py)));
  stroke(ctx, tear, mix(color, "#efe0bd", 0.55), 1.4, 0.55);
}
/** A run of cut-paper furrow strips: separate soil ridges, each with a lit ridge and ragged ends. */
export function furrowStrips(ctx: Ctx, x: number, y: number, rx: number, ry: number, rows: number, colors: readonly string[], seed: number): void {
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.5) / rows, yy = y - ry + t * ry * 2,
      // Wider in the middle rows, like a field seen in perspective.
      half = rx * Math.sqrt(Math.max(0.15, 1 - (2 * t - 1) ** 2)) * (0.92 + hash(seed + r) * 0.12),
      h = (ry * 2) / rows * 0.72,
      bend = (hash(seed + r * 3) - 0.5) * 8,
      left = tornEdge(x - half, yy + h / 2, x - half - 4, yy - h / 2, 3, 2.2, seed + r * 11),
      right = tornEdge(x + half + 4, yy - h / 2, x + half, yy + h / 2, 3, 2.2, seed + r * 13);
    const strip: Point[] = [...left, [x, yy - h / 2 + bend], ...right, [x, yy + h / 2 + bend]];
    cut(ctx, strip, { color: colors[r % colors.length]!, thickness: 1, lift: 0.9, rim: 0.9 });
    crease(ctx, x - half * 0.8, yy - h * 0.12 + bend * 0.6, x + half * 0.8, yy - h * 0.12 + bend * 0.6, 0.55);
  }
}
/** Planks laid side by side inside an outline; each plank its own cut with a nailed end. */
export function boards(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, planks: number, colors: readonly string[], seed: number, horizontal = true): void {
  for (let i = 0; i < planks; i++) {
    const a = i / planks, b = (i + 1) / planks, gap = 0.9;
    const pts: Point[] = horizontal
      ? [[x0 + (hash(seed + i) - 0.5) * 8, y0 + (y1 - y0) * a + gap], [x1 + (hash(seed + i + 9) - 0.5) * 8, y0 + (y1 - y0) * a + gap],
         [x1 + (hash(seed + i + 19) - 0.5) * 8, y0 + (y1 - y0) * b - gap], [x0 + (hash(seed + i + 29) - 0.5) * 8, y0 + (y1 - y0) * b - gap]]
      : [[x0 + (x1 - x0) * a + gap, y0 + (hash(seed + i) - 0.5) * 6], [x0 + (x1 - x0) * b - gap, y0 + (hash(seed + i + 9) - 0.5) * 6],
         [x0 + (x1 - x0) * b - gap, y1 + (hash(seed + i + 19) - 0.5) * 6], [x0 + (x1 - x0) * a + gap, y1 + (hash(seed + i + 29) - 0.5) * 6]];
    cut(ctx, pts, { color: colors[Math.floor(hash(seed + i * 7) * colors.length)]!, thickness: 0.9, lift: 0.7, rim: 0.7, wear: 0.15, seed: seed + i });
  }
}
/** Square paper paving tiles in a staggered grid, clipped to an apron outline. */
export function pavedTiles(ctx: Ctx, outline: readonly Point[], x: number, y: number, rx: number, ry: number, size: number, colors: readonly string[], seed: number): void {
  const apron = cut(ctx, outline, { color: "#5f5850", thickness: 1.4, lift: 1.3, rim: 1, layers: 1 });
  ctx.save();
  ctx.clip(apron);
  const tones = colors.map(() => new Path2D());
  for (let row = 0; row * size * 0.7 < ry * 2 + size; row++)
    for (let k = 0; k * size < rx * 2 + size * 2; k++) {
      const tx = x - rx - size + k * size + (row % 2) * size * 0.5, ty = y - ry + row * size * 0.7,
        n = Math.floor(hash(seed + row * 31 + k) * colors.length), q = size * 0.44, h = size * 0.3;
      const tile = tones[n]!;
      tile.moveTo(tx - q, ty - h);
      tile.lineTo(tx + q, ty - h + (hash(seed + k) - 0.5));
      tile.lineTo(tx + q, ty + h);
      tile.lineTo(tx - q, ty + h);
      tile.closePath();
    }
  tones.forEach((p, i) => cut(ctx, p, { color: colors[i]!, thickness: 0.6, lift: 0.4, rim: 0.6 }));
  ctx.restore();
}
/** A ring of separate stones around (x, y), wet: darker paper with a pale sheen cut on each. */
export function stoneRing(ctx: Ctx, x: number, y: number, rx: number, ry: number, count: number, depth: number, seed: number, wet = true): void {
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2 + 0.04, a1 = ((i + 1) / count) * Math.PI * 2 - 0.04,
      inner = 1 - depth, pts: Point[] = [];
    for (const [a, k] of [[a0, 1], [(a0 + a1) / 2, 1.02], [a1, 1], [a1, inner], [(a0 + a1) / 2, inner * 0.98], [a0, inner]] as const)
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    const base = wet ? ["#4f5560", "#5a5f69", "#474c57"][i % 3]! : ["#8b8174", "#958a7b", "#80776b"][i % 3]!;
    cut(ctx, pts, { color: base, thickness: 1, lift: 0.8, rim: 0.8 });
    if (wet) {
      // A wet sheen: one pale sliver cut along the moon side of the stone.
      const m = (a0 + a1) / 2;
      stroke(ctx, new Path2D(`M ${x + Math.cos(a0 + 0.08) * rx * (1 - depth * 0.3)} ${y + Math.sin(a0 + 0.08) * ry * (1 - depth * 0.3)} L ${x + Math.cos(m) * rx * (1 - depth * 0.25)} ${y + Math.sin(m) * ry * (1 - depth * 0.25)}`),
        "#b9c6d3", 1, 0.55);
    }
  }
}
/**
 * One cut fence silhouette along an arc: upright pointed pickets joined by
 * two rails, all one paper cut (one shadow), so it reads as a fence even
 * where the arc runs up the sides of the yard.
 */
export function fenceSilhouette(ctx: Ctx, x: number, y: number, rx: number, ry: number, a0: number, a1: number, pickets: number, height: number, color: string, seed: number): void {
  const fence = new Path2D(), posts: Point[] = [];
  for (let i = 0; i <= pickets; i++) {
    const a = a0 + ((a1 - a0) * i) / pickets;
    posts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  posts.forEach(([px, py], i) => {
    const h = height * (0.9 + hash(seed + i) * 0.2), w = 1.7;
    // Clockwise on screen, like the rails, so the nonzero union never leaves holes.
    fence.moveTo(px - w, py + 1);
    fence.lineTo(px - w, py - h * 0.78);
    fence.lineTo(px, py - h);
    fence.lineTo(px + w, py - h * 0.78);
    fence.lineTo(px + w, py + 1);
    fence.closePath();
    const next = posts[i + 1];
    if (!next) return;
    const [l, r] = px <= next[0] ? [[px, py] as Point, next] : [next, [px, py] as Point];
    for (const k of [0.68, 0.32]) {
      fence.moveTo(l[0], l[1] - height * k - 1);
      fence.lineTo(r[0], r[1] - height * k - 1);
      fence.lineTo(r[0], r[1] - height * k + 1);
      fence.lineTo(l[0], l[1] - height * k + 1);
      fence.closePath();
    }
  });
  cut(ctx, fence, { color, thickness: 0.9, lift: 1.1, rim: 0.6, texture: 0.4 });
}
