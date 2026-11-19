/**
 * Shape helpers for townsfolk art (src/defs/townsfolk/<id>/art.ts). A figure
 * is authored facing right with its feet at (0, 0); `f` = -1 mirrors the
 * points (never the context), so PAPER_SHADOW keeps falling down-right.
 * Every polygon is normalised to the winding the ovals use, so overlapping
 * cuts in one flat layer merge instead of punching holes.
 */
import { addPoints, type PaperShape } from "./paper-kit.js";
import { line, type Ctx, type Point } from "./paper-material.js";

export interface FigureBuilder {
  /** A polygon of points authored facing right. */
  poly(points: readonly Point[]): void;
  /** An oval centred at (x, y) authored facing right; `rot` tilts it. */
  oval(x: number, y: number, rx: number, ry: number, rot?: number): void;
}
/** Points mirrored for facing `f`, wound like the ovals (positive area on screen). */
export function facePoints(f: 1 | -1, points: readonly Point[]): Point[] {
  const out = points.map(([x, y]) => [x * f, y] as Point);
  let area = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i]!, b = out[(i + 1) % out.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area < 0 ? out.reverse() : out;
}
/** One flat layer's cuts for facing `f`, as a PaperShape builder. */
export function figure(f: 1 | -1, build: (b: FigureBuilder) => void): PaperShape {
  return (p: Path2D) => build({
    poly: (points) => addPoints(p, facePoints(f, points)),
    oval: (x, y, rx, ry, rot = 0) => {
      p.moveTo(x * f + rx * Math.cos(rot * f), y + rx * Math.sin(rot * f));
      p.ellipse(x * f, y, rx, ry, rot * f, 0, Math.PI * 2);
      p.closePath();
    },
  });
}
/** A small ink dot (eyes, nose): flat fill, no glow. */
export function inkDot(ctx: Ctx, f: 1 | -1, x: number, y: number, r: number, color = "#1d1620"): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x * f, y, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
/** A thin ink stroke (whiskers, mouth) for facing `f`. */
export function inkLine(ctx: Ctx, f: 1 | -1, x0: number, y0: number, x1: number, y1: number, color = "#2a2026", width = 0.6, alpha = 0.7): void {
  line(ctx, x0 * f, y0, x1 * f, y1, color, width, alpha);
}
/** Feet offsets of a two-frame step: [back x, back lift, front x, front lift]. */
export function stepFeet(frame: 0 | 1): readonly [number, number, number, number] {
  return frame ? [-2.5, -1.4, 2.5, 0] : [0, 0, 0, 0];
}
