/**
 * The pencil underdrawing under the colour: what washed paper reveals.
 * Raw cream paper with visible fibre, graphite construction lines that
 * overshoot their corners, hand-drawn outlines that leave small gaps, and
 * hatching only on the shadow side (down-left of the moon light). Everything
 * is placed by world coordinates and render hashes, so neighbouring chunk
 * tiles, the terrain worker and the fallback paint the same strokes.
 * Flat strokes only: no gradients, no filters, no blur, no random numbers.
 */
import { visHash } from "./hash.js";
import { PAPER_LIGHT } from "./paper-rules.js";
import type { Ctx, Point } from "./paper-material.js";

/** The pencil palette: raw paper, clean (erased) paper and graphite weights. */
export const PENCIL = Object.freeze({
  paper: "#eee4cf",
  /** Slightly darker raw paper for the pressed sheet seams. */
  paperShade: "#e2d5ba",
  fibre: "#b4a17f",
  fibreLight: "#fbf4e2",
  blank: "#fbf8f0",
  graphite: "#45434f",
  soft: "#6f6c78",
  /** World grid for paper fibre, so tiles join without seams. */
  fibreCell: 22,
});

/** Hash of a world position and salt (render only). */
export function spot(x: number, y: number, salt: number): number {
  return visHash(Math.round(x) * 73856093 ^ Math.round(y) * 19349663 ^ salt * 83492791);
}

/**
 * Raw cream paper over a rectangle with world-anchored fibre: short curled
 * hairs in two tones, denser than the painted sheets show.
 */
export function rawPaper(ctx: Ctx, x0: number, y0: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = PENCIL.paper;
  ctx.fillRect(x0, y0, w, h);
  const c = PENCIL.fibreCell,
    dark = new Path2D(),
    light = new Path2D();
  for (let gy = Math.floor(y0 / c) - 1; gy * c < y0 + h + c; gy++)
    for (let gx = Math.floor(x0 / c) - 1; gx * c < x0 + w + c; gx++)
      for (let k = 0; k < 2; k++) {
        const r = (n: number) => visHash(gx * 92821 + gy * 68917 + k * 7919 + n * 131),
          x = (gx + r(1)) * c,
          y = (gy + r(2)) * c,
          a = r(3) * Math.PI,
          len = 3 + r(4) * 6,
          bend = (r(5) - 0.5) * 3,
          p = r(6) < 0.62 ? dark : light,
          dx = Math.cos(a) * len,
          dy = Math.sin(a) * len;
        p.moveTo(x - dx * 0.5, y - dy * 0.5);
        p.quadraticCurveTo(x - dy * bend * 0.1, y + dx * bend * 0.1, x + dx * 0.5, y + dy * 0.5);
      }
  ctx.lineCap = "round";
  ctx.lineWidth = 0.55;
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = PENCIL.fibre;
  ctx.stroke(dark);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = PENCIL.fibreLight;
  ctx.lineWidth = 0.8;
  ctx.stroke(light);
  ctx.restore();
}

export interface PencilOptions {
  /** Line weight in world units (default 0.9). */
  readonly weight?: number;
  /** Stroke opacity (default 0.62). */
  readonly alpha?: number;
  /** Leave small gaps so the outline reads unfinished (default true). */
  readonly gaps?: boolean;
  /** Overshoot at both ends, like a construction line drawn past its corner (default 0). */
  readonly overshoot?: number;
  /** Graphite colour (default PENCIL.graphite). */
  readonly color?: string;
  /** Close the polyline (outlines). */
  readonly closed?: boolean;
}
/** Wobbled copy of a polyline: each vertex nudged along its normal by a hash. */
function wobble(points: readonly Point[], amount: number, salt: number): Point[] {
  return points.map(([x, y], i) => {
    const a = points[Math.max(0, i - 1)]!, b = points[Math.min(points.length - 1, i + 1)]!,
      dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1,
      d = (spot(x, y, salt) - 0.5) * 2 * amount;
    return [x - (dy / len) * d, y + (dx / len) * d] as Point;
  });
}
function polyline(points: readonly Point[], closed: boolean): Path2D {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (closed) p.closePath();
  return p;
}
/**
 * A hand-drawn graphite line along `points`: one firm pass and a lighter
 * second pass slightly off it, with seeded gaps so the outline stays
 * unfinished. Long segments should be subdivided by the caller for wobble.
 */
export function pencilLine(ctx: Ctx, points: readonly Point[], seed: number, o: PencilOptions = {}): void {
  if (points.length < 2) return;
  const weight = o.weight ?? 0.9,
    alpha = o.alpha ?? 0.62,
    color = o.color ?? PENCIL.graphite,
    closed = !!o.closed;
  let pts = points;
  if (o.overshoot) {
    const [a, b] = [points[0]!, points[1]!], [c, d] = [points[points.length - 2]!, points[points.length - 1]!],
      la = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ld = Math.hypot(d[0] - c[0], d[1] - c[1]) || 1,
      k = o.overshoot;
    pts = [[a[0] - ((b[0] - a[0]) / la) * k, a[1] - ((b[1] - a[1]) / la) * k], ...points,
      [d[0] + ((d[0] - c[0]) / ld) * k, d[1] + ((d[1] - c[1]) / ld) * k]];
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  if (o.gaps !== false) {
    const h = (n: number) => visHash(seed * 31 + n);
    ctx.setLineDash([42 + h(1) * 70, 3 + h(2) * 5, 18 + h(3) * 40, 2 + h(4) * 4]);
    ctx.lineDashOffset = h(5) * 90;
  }
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = weight;
  ctx.stroke(polyline(wobble(pts, 0.55, seed), closed));
  // The second, lighter pass drifts a little and skips different stretches.
  if (o.gaps !== false) ctx.lineDashOffset += 37;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = weight * 0.6;
  ctx.stroke(polyline(wobble(pts, 1.1, seed + 17), closed));
  ctx.restore();
}
/** A faint straight construction line, drawn past both ends. */
export function constructionLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, over = 14, alpha = 0.2): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len, p = new Path2D();
  p.moveTo(x0 - ux * over, y0 - uy * over);
  p.lineTo(x1 + ux * over, y1 + uy * over);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = PENCIL.soft;
  ctx.lineWidth = 0.5;
  ctx.stroke(p);
  ctx.restore();
}
/** Points along a polyline every `step` units (keeps wobble and gaps hand-drawn on long edges). */
export function subdivide(points: readonly Point[], step = 18, closed = false): Point[] {
  const out: Point[] = [], n = points.length, last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = points[i]!, b = points[(i + 1) % n]!, len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      k = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  if (!closed && n) out.push(points[n - 1]!);
  return out;
}
/**
 * Diagonal hatching ("/" strokes, the pencil's natural shading angle)
 * inside `region`, over the box. One path, one stroke; slightly uneven
 * lengths so it reads drawn, not ruled.
 */
export function hatch(ctx: Ctx, region: Path2D, x0: number, y0: number, x1: number, y1: number, gap = 3.2, alpha = 0.34, salt = 0): void {
  const p = new Path2D(), span = x1 - x0 + (y1 - y0);
  for (let s = Math.floor((x0 + y0) / gap) * gap; s < x0 + y0 + span + gap; s += gap) {
    // A "/" line: x + y = s, clipped to the box by the region clip below.
    const cut = spot(s, salt, 5) * 0.18;
    p.moveTo(s - y1 + cut * (y1 - y0), y1 - cut * (y1 - y0));
    p.lineTo(s - y0, y0);
  }
  ctx.save();
  ctx.clip(region);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = PENCIL.graphite;
  ctx.lineWidth = 0.5;
  ctx.lineCap = "round";
  ctx.stroke(p);
  ctx.restore();
}
/** Unit vector toward the shadow side of the page (away from the moon). */
export const SHADOW_SIDE = Object.freeze({ x: -PAPER_LIGHT.dirX, y: -PAPER_LIGHT.dirY });
/**
 * A band of hatching along a polyline on its shadow side, `from` to `to`
 * units away from the line (roads, sheet seams, footprints).
 */
export function shadeAlong(ctx: Ctx, points: readonly Point[], from: number, to: number, alpha = 0.3, salt = 0): void {
  const band = new Path2D();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    // Down-right of the light: the side whose normal points away from the moon.
    if (nx * PAPER_LIGHT.dirX + ny * PAPER_LIGHT.dirY > 0) { nx = -nx; ny = -ny; }
    const q: Point[] = [[a[0] + nx * from, a[1] + ny * from], [b[0] + nx * from, b[1] + ny * from],
      [b[0] + nx * to, b[1] + ny * to], [a[0] + nx * to, a[1] + ny * to]];
    q.forEach(([x, y], k) => {
      if (k) band.lineTo(x, y); else band.moveTo(x, y);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    });
    band.closePath();
  }
  if (x0 < x1) hatch(ctx, band, x0, y0, x1, y1, 3, alpha, salt);
}
/** A pencil ground cluster (the underdrawing of a district patch): a loose ring and a few tufts. */
export function pencilPatch(ctx: Ctx, x: number, y: number, r: number, seed: number): void {
  const ring: Point[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, k = 0.82 + visHash(seed + i * 7) * 0.22;
    ring.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.55]);
  }
  pencilLine(ctx, ring, seed, { weight: 0.6, alpha: 0.36, closed: true });
  const tufts = new Path2D();
  for (let i = 0; i < 5; i++) {
    const tx = x + (visHash(seed + i * 11) - 0.5) * r * 1.2, ty = y + (visHash(seed + i * 13) - 0.5) * r * 0.5;
    tufts.moveTo(tx - 3, ty); tufts.lineTo(tx - 1, ty - 5);
    tufts.moveTo(tx, ty); tufts.lineTo(tx + 0.5, ty - 6.5);
    tufts.moveTo(tx + 3, ty); tufts.lineTo(tx + 2, ty - 4.5);
  }
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.strokeStyle = PENCIL.graphite;
  ctx.lineWidth = 0.6;
  ctx.lineCap = "round";
  ctx.stroke(tufts);
  ctx.restore();
}
/** A footprint ellipse in pencil: faint construction ellipse, firmer unfinished outline, shadow-side hatch. */
export function pencilFootprint(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number, firm = 0.5): void {
  const ring = (k: number): Point[] => Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k] as Point;
  });
  pencilLine(ctx, ring(1.08), seed + 3, { weight: 0.5, alpha: 0.2, gaps: false, closed: true, color: PENCIL.soft });
  pencilLine(ctx, ring(1), seed, { weight: 0.85, alpha: firm, closed: true });
  // A crescent on the shadow side: the ellipse minus itself shifted toward the light.
  const crescent = new Path2D();
  crescent.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  crescent.ellipse(x + PAPER_LIGHT.dirX * rx * 0.28, y + PAPER_LIGHT.dirY * ry * 0.28, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.save();
  // Even-odd keeps only the crescent.
  ctx.clip(crescent, "evenodd");
  hatch(ctx, crescent, x - rx, y - ry, x + rx, y + ry, 3, 0.3, seed);
  ctx.restore();
}
