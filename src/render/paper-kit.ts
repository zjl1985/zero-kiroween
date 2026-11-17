/**
 * The paper kit: composable cut-paper primitives built on paper-material.ts.
 * Every piece gets a cut edge, visible thickness and a contact shadow from
 * the same helpers the rest of the game uses, so new art shares one material
 * language. Pure Canvas code; seeds come from world-gen or render hashes
 * (render/hash.ts, render/variants.ts), never the sim RNG.
 *
 * Usage: the FEAT-004 prop art (src/defs/props/<id>/art.ts) is the reference.
 */
import { glow, hash, line, mix, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "./paper-material.js";

/** A shape: a Path2D, a polygon of points, or a builder that draws into a Path2D. */
export type PaperShape = Path2D | readonly Point[] | ((p: Path2D) => void);

/** A crease across a piece: one side is shaded like a fold away from the light. */
export interface PaperFold {
  readonly from: Point;
  readonly to: Point;
  /** Shade depth 0..1 (default 0.35). */
  readonly depth?: number;
  /** Which side of from -> to is shaded: 1 = left of the direction, -1 = right. */
  readonly side?: 1 | -1;
}

export interface PaperCutOptions {
  /** Fill colour as #rrggbb. */
  readonly color: string;
  /** Edge stroke width, the visible card thickness (default 1). */
  readonly thickness?: number;
  /** Paper sheets showing under the cut, each offset `thickness` px down and darker (default 0). */
  readonly layers?: number;
  /** Dashed stitch inset from the edge: true for the default thread, or a colour. */
  readonly stitch?: boolean | string;
  /** How far the stitch sits inside the edge, in px (polygon shapes only; default 3). */
  readonly stitchInset?: number;
  /** One or more creases. */
  readonly fold?: PaperFold | readonly PaperFold[];
  /** 0..1 scuffs and darkened chips along the cut edge (default 0). */
  readonly wear?: number;
  /** Drop shadow strength of the piece itself (default 1.6; 0 = none). */
  readonly shadow?: number;
  /** A soft contact shadow on the ground under the piece: centre and radii. */
  readonly ground?: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number };
  /** Pale cut-edge colour (default: the fill mixed toward warm paper). */
  readonly edge?: string;
  /** Paper fibre strength 0..1 (default 0.7). */
  readonly texture?: number;
  /** Seed for wear chips; use a render hash or a world-gen seed. */
  readonly seed?: number;
}

function isPoints(shape: PaperShape): shape is readonly Point[] {
  return Array.isArray(shape);
}
/** Turns any PaperShape into a Path2D. */
export function toPath(shape: PaperShape): Path2D {
  if (shape instanceof Path2D) return shape;
  if (isPoints(shape)) return path(shape);
  const p = new Path2D();
  (shape as (p: Path2D) => void)(p);
  return p;
}
/** Points moved `inset` px toward their centroid (a cheap inner outline for stitches). */
export function insetPoints(points: readonly Point[], inset: number): Point[] {
  let cx = 0,
    cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  cx /= points.length || 1;
  cy /= points.length || 1;
  return points.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1,
      k = Math.max(0, (d - inset) / d);
    return [cx + (x - cx) * k, cy + (y - cy) * k] as Point;
  });
}

/**
 * One cut-paper piece: optional ground contact shadow, stacked sheets under
 * it for thickness, the piece with drop shadow, cut edge and fibre, then
 * wear, folds and an inset stitch.
 */
export function paperCut(ctx: Ctx, shape: PaperShape, o: PaperCutOptions): Path2D {
  const p = toPath(shape),
    thickness = o.thickness ?? 1,
    seed = o.seed ?? 1;
  if (o.ground) shadow(ctx, o.ground.x, o.ground.y, o.ground.rx, o.ground.ry);
  const layers = Math.max(0, Math.floor(o.layers ?? 0));
  for (let i = layers; i >= 1; i--) {
    ctx.save();
    ctx.translate(0, thickness * i);
    const under = mix(o.color, "#1c142b", 0.28 + 0.12 * i);
    piece(ctx, p, under, { shadow: i === layers ? (o.shadow ?? 1.6) : 0, edge: mix(under, "#ffdfaa", 0.2), texture: 0.4, thickness: thickness * 0.8 });
    ctx.restore();
  }
  piece(ctx, p, o.color, {
    shadow: layers > 0 ? 0.4 : (o.shadow ?? 1.6),
    edge: o.edge ?? mix(o.color, "#ffdfaa", 0.3),
    texture: o.texture ?? 0.7,
    thickness,
  });
  if (o.wear && o.wear > 0) wearEdge(ctx, p, o.color, o.wear, seed);
  if (o.fold) for (const f of Array.isArray(o.fold) ? o.fold : [o.fold as PaperFold]) foldAcross(ctx, p, f);
  if (o.stitch) {
    const color = typeof o.stitch === "string" ? o.stitch : mix(o.color, "#f2d9a4", 0.55);
    if (isPoints(shape)) stitchAlong(ctx, shape, color, 0.75, o.stitchInset ?? 3);
    else stitchAlong(ctx, p, color, 0.75);
  }
  return p;
}

/** A layer of a paperStack: its shape plus paperCut options. */
export interface PaperLayer extends PaperCutOptions {
  readonly shape: PaperShape;
}
/** Pieces glued in order, back to front (each casts its shadow on the ones below). */
export function paperStack(ctx: Ctx, layers: readonly PaperLayer[]): void {
  for (const l of layers) paperCut(ctx, l.shape, l);
}

/** A crease line: dark valley with a pale lip on the lit side. `strength` 0..1. */
export function foldLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, strength = 0.6): void {
  line(ctx, x0, y0, x1, y1, "#1c142b", 1.1, 0.5 * strength);
  line(ctx, x0 - 0.4, y0 - 0.7, x1 - 0.4, y1 - 0.7, "#f3dcaa", 0.7, 0.55 * strength);
}
function foldAcross(ctx: Ctx, p: Path2D, f: PaperFold): void {
  const [ax, ay] = f.from,
    [bx, by] = f.to,
    dx = bx - ax,
    dy = by - ay,
    len = Math.hypot(dx, dy) || 1,
    side = f.side ?? 1,
    // Normal to the fold, toward the shaded side, far enough to cover the piece.
    nx = (-dy / len) * side,
    ny = (dx / len) * side,
    far = 4000;
  ctx.save();
  ctx.clip(p);
  ctx.globalAlpha *= f.depth ?? 0.35;
  ctx.fillStyle = "#1c142b";
  ctx.fill(
    path([
      [ax - (dx / len) * far, ay - (dy / len) * far],
      [bx + (dx / len) * far, by + (dy / len) * far],
      [bx + (dx / len) * far + nx * far, by + (dy / len) * far + ny * far],
      [ax - (dx / len) * far + nx * far, ay - (dy / len) * far + ny * far],
    ]),
  );
  ctx.restore();
  ctx.save();
  ctx.clip(p);
  foldLine(ctx, ax, ay, bx, by, 0.8);
  ctx.restore();
}
/**
 * A dashed thread. Points are stitched `inset` px inside their outline; a
 * Path2D is stitched on its own outline, clipped inside it.
 */
export function stitchAlong(ctx: Ctx, shape: PaperShape, color = "#caa269", alpha = 0.75, inset = 3): void {
  if (isPoints(shape)) {
    stitch(ctx, path(insetPoints(shape, inset)), color, alpha);
    return;
  }
  const p = toPath(shape);
  ctx.save();
  ctx.clip(p);
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = color;
  ctx.setLineDash([2.5, 2.1]);
  ctx.stroke(p);
  ctx.restore();
}
function wearEdge(ctx: Ctx, p: Path2D, color: string, wear: number, seed: number): void {
  const w = Math.min(1, wear);
  ctx.save();
  ctx.clip(p);
  ctx.strokeStyle = mix(color, "#1c142b", 0.4);
  ctx.globalAlpha *= 0.55 * w;
  ctx.lineWidth = 1.5 + 2.5 * w;
  // Broken dashes read as scuffs; the seed shifts where they fall.
  ctx.setLineDash([2 + hash(seed) * 4, 3 + hash(seed + 1) * 9, 1 + hash(seed + 2) * 3, 5 + hash(seed + 3) * 8]);
  ctx.lineDashOffset = hash(seed + 4) * 20;
  ctx.stroke(p);
  ctx.restore();
}
/** Burnt paper: a dark charred rim inside the edge with a faint ember line. `amount` 0..1. */
export function charEdge(ctx: Ctx, shape: PaperShape, amount = 0.7, seed = 1): void {
  const p = toPath(shape),
    k = Math.min(1, Math.max(0, amount));
  ctx.save();
  ctx.clip(p);
  stroke(ctx, p, "#2a1a14", 2 + k * 6, 0.7 * k);
  ctx.setLineDash([3 + hash(seed) * 5, 2 + hash(seed + 1) * 4]);
  stroke(ctx, p, "#e8833a", 0.8, 0.55 * k);
  ctx.restore();
}
/** A jagged torn edge between two points (fresh tears show pale fibre). */
export function tornEdge(ax: number, ay: number, bx: number, by: number, teeth: number, depth: number, seed: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth,
      nx = -(by - ay),
      ny = bx - ax,
      len = Math.hypot(nx, ny) || 1,
      d = (i % 2 ? 1 : -0.4) * depth * (0.5 + hash(seed + i * 13));
    out.push([ax + (bx - ax) * t + (nx / len) * d, ay + (by - ay) * t + (ny / len) * d]);
  }
  return out;
}
/** Warm lamp or window light: a wide soft halo plus a tighter bright core. */
export function warmGlow(ctx: Ctx, x: number, y: number, r: number, strength = 0.35, color = "#ffc065"): void {
  glow(ctx, x, y, r, color, strength);
  glow(ctx, x, y, r * 0.4, "#ffe4a8", strength * 0.8);
}
