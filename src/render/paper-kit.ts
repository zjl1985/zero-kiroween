/**
 * The paper kit: composable cut-paper primitives built on paper-material.ts.
 * Every piece gets a cut edge, visible thickness and a contact shadow from
 * the same helpers the rest of the game uses, so new art shares one material
 * language. Pure Canvas code; seeds come from world-gen or render hashes
 * (render/hash.ts, render/variants.ts), never the sim RNG.
 *
 * Usage: the FEAT-004 prop art (src/defs/props/<id>/art.ts) is the reference.
 */
import { glow, grain, hash, line, mix, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "./paper-material.js";
import { PAPER_EDGE, PAPER_FIBER, PAPER_LAYERS, PAPER_LIGHT, PAPER_SHADOW } from "./paper-rules.js";

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
  shadeAcross(ctx, p, f);
  ctx.save();
  ctx.clip(p);
  foldLine(ctx, f.from[0], f.from[1], f.to[0], f.to[1], 0.8);
  ctx.restore();
}
/** Shades one side of a crease inside a cut (no crease line). */
function shadeAcross(ctx: Ctx, p: Path2D, f: PaperFold): void {
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

// ---------------------------------------------------------------------------
// Flat paper layers: the paper ruleset (paper-rules.ts) as drawing helpers.
// No gradients, no shadowBlur, no additive light; one shadow direction.

export { PAPER_EDGE, PAPER_FIBER, PAPER_LAYERS, PAPER_LIGHT, PAPER_SHADOW } from "./paper-rules.js";

/** One flat paper layer of an emblem: one colour, one or more cuts in `shape`. */
export interface FlatLayer {
  readonly shape: PaperShape;
  /** Fill colour as #rrggbb. */
  readonly color: string;
  /** Cast shadow height multiplier (default 1; 0 = glued flat, no shadow). */
  readonly lift?: number;
  /** Lit rim colour (default the moon rim mixed into the fill). */
  readonly rim?: string;
  /** Fibre strength (default PAPER_FIBER). */
  readonly texture?: number;
  /** Creases: the shaded side plus a crease line lit from the moon. */
  readonly fold?: PaperFold | readonly PaperFold[];
  /** Dashed thread inside the edge. */
  readonly stitch?: boolean | string;
  /** Card thickness multiplier (default 1). */
  readonly thickness?: number;
}

/** A crease lit by the moon: dark valley with the pale lip toward the top-right. */
export function crease(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, strength = 0.6): void {
  line(ctx, x0, y0, x1, y1, PAPER_EDGE.lip, 0.9, 0.55 * strength);
  line(ctx, x0 + PAPER_LIGHT.dirX * 0.6, y0 + PAPER_LIGHT.dirY * 0.6, x1 + PAPER_LIGHT.dirX * 0.6, y1 + PAPER_LIGHT.dirY * 0.6, PAPER_LIGHT.rim, 0.6, 0.6 * strength);
}

/**
 * One flat paper layer: hard cast shadow down-right, the darker card side,
 * the flat fill, fibre, a lit rim on the top-right inner edge, a dark lip on
 * the bottom-left, a thin cut line, then creases and stitches.
 */
export function flatLayer(ctx: Ctx, l: FlatLayer): Path2D {
  const p = toPath(l.shape),
    lift = l.lift ?? 1,
    th = PAPER_EDGE.thickness * (l.thickness ?? 1),
    { dirX, dirY } = PAPER_LIGHT,
    shadowLen = Math.hypot(PAPER_SHADOW.dx, PAPER_SHADOW.dy) || 1;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (lift > 0) {
    ctx.save();
    ctx.translate(PAPER_SHADOW.dx * lift, PAPER_SHADOW.dy * lift);
    ctx.globalAlpha *= PAPER_SHADOW.alpha;
    ctx.fillStyle = PAPER_SHADOW.color;
    ctx.fill(p);
    ctx.restore();
  }
  // The cut side of the card shows on the shadow side.
  ctx.save();
  ctx.translate((PAPER_SHADOW.dx / shadowLen) * th, (PAPER_SHADOW.dy / shadowLen) * th);
  ctx.fillStyle = mix(l.color, "#1c142b", 0.5);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = l.color;
  ctx.fill(p);
  grain(ctx, p, l.texture ?? PAPER_FIBER);
  ctx.save();
  ctx.clip(p);
  // Shifting the outline away from the light leaves a band on the lit inner edge.
  ctx.save();
  ctx.translate(-dirX * PAPER_EDGE.rim, -dirY * PAPER_EDGE.rim);
  ctx.globalAlpha *= PAPER_EDGE.rimAlpha;
  ctx.strokeStyle = l.rim ?? mix(l.color, PAPER_LIGHT.rim, 0.55);
  ctx.lineWidth = PAPER_EDGE.rim * 1.5;
  ctx.stroke(p);
  ctx.restore();
  ctx.save();
  ctx.translate(dirX * PAPER_EDGE.rim, dirY * PAPER_EDGE.rim);
  ctx.globalAlpha *= PAPER_EDGE.lipAlpha;
  ctx.strokeStyle = PAPER_EDGE.lip;
  ctx.lineWidth = PAPER_EDGE.rim * 1.3;
  ctx.stroke(p);
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha *= PAPER_EDGE.cutAlpha;
  ctx.strokeStyle = mix(l.color, "#1c142b", 0.62);
  ctx.lineWidth = 0.5;
  ctx.stroke(p);
  ctx.restore();
  if (l.fold)
    for (const f of Array.isArray(l.fold) ? l.fold : [l.fold as PaperFold]) {
      shadeAcross(ctx, p, f);
      ctx.save();
      ctx.clip(p);
      crease(ctx, f.from[0], f.from[1], f.to[0], f.to[1], 0.75);
      ctx.restore();
    }
  if (l.stitch) {
    const color = typeof l.stitch === "string" ? l.stitch : mix(l.color, "#f2d9a4", 0.55);
    if (isPoints(l.shape)) stitch(ctx, path(insetPoints(l.shape, 2.2)), color, 0.7);
    else stitchAlong(ctx, p, color, 0.7);
  }
  return p;
}

/** An emblem of 1 to 3 flat layers glued back to front; returns their paths. */
export function paperEmblem(ctx: Ctx, layers: readonly FlatLayer[]): Path2D[] {
  if (layers.length < PAPER_LAYERS.min || layers.length > PAPER_LAYERS.max)
    throw new RangeError(`paper emblem needs ${PAPER_LAYERS.min} to ${PAPER_LAYERS.max} layers, got ${layers.length}`);
  return layers.map((l) => flatLayer(ctx, l));
}

/**
 * A hard paper contact shadow on the ground: two flat ovals (umbra and a
 * lighter penumbra step) pushed down-right along PAPER_SHADOW. No blur.
 */
export function flatShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, strength = 1): void {
  const k = Math.hypot(PAPER_SHADOW.dx, PAPER_SHADOW.dy) || 1,
    ox = (PAPER_SHADOW.dx / k) * ry * 0.35,
    oy = (PAPER_SHADOW.dy / k) * ry * 0.35;
  ctx.save();
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.globalAlpha *= 0.16 * strength;
  const outer = new Path2D();
  outer.ellipse(x + ox, y + oy, rx * 1.08, ry * 1.1, 0, 0, Math.PI * 2);
  ctx.fill(outer);
  ctx.globalAlpha *= 1.9;
  const inner = new Path2D();
  inner.ellipse(x + ox * 0.6, y + oy * 0.6, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.fill(inner);
  ctx.restore();
}

/** Options of a flat ground- or prop-scale cut (the paperCut options, drawn by the ruleset). */
export interface FlatCutOptions extends PaperCutOptions {
  /** Cast shadow length multiplier (default: the `shadow` option, else 1). */
  readonly lift?: number;
  /** Rim / lip width in local units (default 0.9 * thickness). */
  readonly rim?: number;
}

/**
 * The paper ruleset at prop and ground scale: a hard cast shadow down-right,
 * stacked darker sheets, the card side, flat fill and fibre, a lit rim toward
 * the moon, a dark lip away from it, a thin cut line, then wear, creases and
 * stitches. Takes paperCut options, so it drops in where blurred shadows read
 * as gloss. No gradients, no shadowBlur, no filters.
 */
export function flatCut(ctx: Ctx, shape: PaperShape, o: FlatCutOptions): Path2D {
  const p = toPath(shape),
    th = o.thickness ?? 1,
    lift = o.lift ?? (o.shadow === undefined ? 1 : o.shadow / 1.6),
    rim = o.rim ?? 0.9 * th,
    { dirX, dirY } = PAPER_LIGHT,
    k = Math.hypot(PAPER_SHADOW.dx, PAPER_SHADOW.dy) || 1,
    sx = PAPER_SHADOW.dx / k,
    sy = PAPER_SHADOW.dy / k,
    layers = Math.max(0, Math.floor(o.layers ?? 0));
  if (o.ground) flatShadow(ctx, o.ground.x, o.ground.y, o.ground.rx, o.ground.ry);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (lift > 0) {
    ctx.save();
    ctx.translate(PAPER_SHADOW.dx * 1.4 * lift + sx * th * layers, PAPER_SHADOW.dy * 1.4 * lift + sy * th * layers);
    ctx.globalAlpha *= PAPER_SHADOW.alpha * 0.8;
    ctx.fillStyle = PAPER_SHADOW.color;
    ctx.fill(p);
    ctx.restore();
  }
  for (let i = layers; i >= 1; i--) {
    ctx.save();
    ctx.translate(sx * th * i * 1.3, sy * th * i * 1.3);
    const under = mix(o.color, "#1c142b", 0.3 + 0.12 * i);
    ctx.fillStyle = under;
    ctx.fill(p);
    ctx.globalAlpha *= 0.6;
    ctx.strokeStyle = mix(under, "#ffdfaa", 0.22);
    ctx.lineWidth = 0.6;
    ctx.stroke(p);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(sx * th * 0.9, sy * th * 0.9);
  ctx.fillStyle = mix(o.color, "#1c142b", 0.48);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = o.color;
  ctx.fill(p);
  grain(ctx, p, (o.texture ?? 0.7) * 0.75);
  ctx.save();
  ctx.clip(p);
  ctx.save();
  ctx.translate(-dirX * rim, -dirY * rim);
  ctx.globalAlpha *= 0.66;
  ctx.strokeStyle = o.edge ?? mix(o.color, PAPER_LIGHT.rim, 0.5);
  ctx.lineWidth = rim * 1.6;
  ctx.stroke(p);
  ctx.restore();
  ctx.save();
  ctx.translate(dirX * rim, dirY * rim);
  ctx.globalAlpha *= 0.3;
  ctx.strokeStyle = PAPER_EDGE.lip;
  ctx.lineWidth = rim * 1.4;
  ctx.stroke(p);
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha *= PAPER_EDGE.cutAlpha;
  ctx.strokeStyle = mix(o.color, "#1c142b", 0.6);
  ctx.lineWidth = 0.55;
  ctx.stroke(p);
  ctx.restore();
  if (o.wear && o.wear > 0) wearEdge(ctx, p, o.color, o.wear, o.seed ?? 1);
  if (o.fold)
    for (const f of Array.isArray(o.fold) ? o.fold : [o.fold as PaperFold]) {
      shadeAcross(ctx, p, f);
      ctx.save();
      ctx.clip(p);
      crease(ctx, f.from[0], f.from[1], f.to[0], f.to[1], 0.75);
      ctx.restore();
    }
  if (o.stitch) {
    const color = typeof o.stitch === "string" ? o.stitch : mix(o.color, "#f2d9a4", 0.55);
    if (isPoints(shape)) stitchAlong(ctx, shape, color, 0.75, o.stitchInset ?? 3);
    else stitchAlong(ctx, p, color, 0.75);
  }
  return p;
}

/**
 * A fringe-cut paper strip: one sheet whose top edge is snipped into blades,
 * laid along a baseline from (x0, y0) to (x1, y1). Blade heights and lean
 * come from the seed. Drawn flat by the ruleset.
 */
export function fringeStrip(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, height: number, color: string, seed: number, blade = 4.5): Path2D {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1,
    ux = (x1 - x0) / len,
    uy = (y1 - y0) / len,
    n = Math.max(2, Math.round(len / blade)),
    base = height * 0.28,
    pts: Point[] = [[x0, y0 + 1.5]];
  for (let i = 0; i < n; i++) {
    const t = i / n,
      bx = x0 + (x1 - x0) * t,
      by = y0 + (y1 - y0) * t,
      h = height * (0.55 + hash(seed + i * 7) * 0.45),
      lean = (hash(seed + i * 13) - 0.5) * blade * 0.9;
    // A notch at the base of each blade, then the blade tip (blades stand up the screen).
    pts.push([bx, by - base]);
    pts.push([bx + ux * blade * 0.5 + lean, by + uy * blade * 0.5 - h]);
  }
  pts.push([x1, y1 - base], [x1, y1 + 1.5]);
  return flatCut(ctx, pts, { color, thickness: 0.6, lift: 0.55, rim: 0.45, texture: 0.5 });
}

/** Points rotated by `angle`, scaled by `k` and moved to (x, y); the light never rotates with them. */
export function placePoints(points: readonly Point[], x: number, y: number, angle = 0, k = 1): Point[] {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return points.map(([px, py]) => [x + (px * c - py * s) * k, y + (px * s + py * c) * k] as Point);
}
/** An n-point star outline (outer radius r, inner radius r * inner), first tip at `angle`. */
export function starPoints(x: number, y: number, r: number, n = 5, inner = 0.45, angle = -Math.PI / 2): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = angle + (i * Math.PI) / n,
      rr = i % 2 ? r * inner : r;
    out.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return out;
}
/** Adds a polygon to a path builder. */
export function addPoints(p: Path2D, points: readonly Point[]): void {
  if (!points.length) return;
  p.moveTo(points[0]![0], points[0]![1]);
  for (const q of points.slice(1)) p.lineTo(q[0], q[1]);
  p.closePath();
}
/** Cuts an oval hole in a path whose outline runs clockwise on screen (nonzero rule). */
export function cutHole(p: Path2D, x: number, y: number, rx: number, ry: number): void {
  p.moveTo(x + rx, y);
  p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2, true);
  p.closePath();
}
