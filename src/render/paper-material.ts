import type { CanvasSurface } from "../engine/surface.js";
import { hash, mix, surface, type Ctx, type Point } from "./pixel-art.js";
export { mix, hash, surface };
export type { Ctx, Point };

export function noise(
  x: number,
  y: number,
  cell: number,
  seed: number,
): number {
  const ix = Math.floor(x / cell),
    iy = Math.floor(y / cell),
    fx = x / cell - ix,
    fy = y / cell - iy;
  const a = fx * fx * (3 - 2 * fx),
    b = fy * fy * (3 - 2 * fy);
  const p = hash(ix + iy * 7919 + seed),
    q = hash(ix + 1 + iy * 7919 + seed),
    r = hash(ix + (iy + 1) * 7919 + seed),
    s = hash(ix + 1 + (iy + 1) * 7919 + seed);
  return (p * (1 - a) + q * a) * (1 - b) + (r * (1 - a) + s * a) * b;
}
let fiber: CanvasSurface | undefined;
/** Pulp, fine fibres and low-frequency pressing marks, generated once in code. */
export function paperTexture(): CanvasSurface {
  if (fiber) return fiber;
  fiber = surface(512, 512);
  const ctx = fiber.getContext("2d", { willReadFrequently: typeof document === "undefined" })!,
    im = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const coarse = noise(x, y, 42, 341),
        medium = noise(x, y, 8, 87),
        fine = hash(x * 131 + y * 7919);
      const wrinkle = Math.abs(
        noise(x, y, 21, 753) - noise(x + 3, y + 4, 21, 753),
      );
      const v = 177 + coarse * 32 + medium * 25 + fine * 30 - wrinkle * 120;
      const i = (y * 512 + x) * 4;
      im.data[i] = v;
      im.data[i + 1] = v;
      im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
  ctx.putImageData(im, 0, 0);
  ctx.lineWidth = 0.45;
  for (let i = 0; i < 3500; i++) {
    const x = hash(i * 11) * 512,
      y = hash(i * 37 + 3) * 512;
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,.17)" : "rgba(75,65,68,.09)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1 + hash(i * 31) * 4, y + (hash(i + 3) - 0.5) * 2);
    ctx.stroke();
  }
  return fiber;
}
const patterns = new WeakMap<Ctx, CanvasPattern>();
export function grain(ctx: Ctx, path: Path2D, opacity = 0.48): void {
  let p = patterns.get(ctx);
  if (!p) {
    p = ctx.createPattern(paperTexture(), "repeat")!;
    p.setTransform(new DOMMatrix().scale(0.5));
    patterns.set(ctx, p);
  }
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = p;
  // Cover the whole canvas in user space, wherever the camera has moved it.
  const m = ctx.getTransform().inverse(),
    cw = ctx.canvas.width,
    ch = ctx.canvas.height;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [cx, cy] of [
    [0, 0],
    [cw, 0],
    [0, ch],
    [cw, ch],
  ] as const) {
    const q = m.transformPoint({ x: cx, y: cy });
    x0 = Math.min(x0, q.x);
    y0 = Math.min(y0, q.y);
    x1 = Math.max(x1, q.x);
    y1 = Math.max(y1, q.y);
  }
  ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  ctx.restore();
}
export function path(points: readonly Point[], smooth = false): Path2D {
  const p = new Path2D();
  if (!points.length) return p;
  if (!smooth) {
    p.moveTo(...points[0]!);
    for (const q of points.slice(1)) p.lineTo(...q);
  } else {
    const first = points[0]!,
      last = points[points.length - 1]!;
    p.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!;
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
  }
  p.closePath();
  return p;
}
export function oval(
  x: number,
  y: number,
  rx: number,
  ry: number,
  seed = 1,
  rough = 0.04,
): Path2D {
  const pts: Point[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2,
      j =
        1 +
        (hash(seed * 41 + i) - 0.5) * rough +
        Math.sin(a * 7 + seed) * rough * 0.35;
    pts.push([x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]);
  }
  return path(pts, true);
}
export function box(
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 1,
): Path2D {
  return path([
    [x + 0.3, y],
    [x + w * 0.4, y + hash(seed) - 0.5],
    [x + w, y + 0.4],
    [x + w + 0.4, y + h * 0.6],
    [x + w - 0.3, y + h],
    [x + w * 0.45, y + h + 0.4],
    [x, y + h - 0.2],
    [x - 0.3, y + h * 0.4],
  ]);
}
export interface PaperOptions {
  shadow?: number;
  edge?: string;
  stitch?: boolean;
  texture?: number;
  thickness?: number;
}
export function piece(
  ctx: Ctx,
  p: Path2D,
  color: string,
  options: PaperOptions = {},
): void {
  const thickness = options.thickness ?? 1.15;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if ((options.shadow ?? 2) > 0) {
    ctx.shadowColor = "rgba(15,10,25,.62)";
    ctx.shadowBlur = (options.shadow ?? 2) * 2.5;
    ctx.shadowOffsetX = -0.9;
    ctx.shadowOffsetY = (options.shadow ?? 2) * 1.8;
  }
  ctx.fillStyle = color;
  ctx.fill(p);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = mix(color, "#1c142b", 0.55);
  ctx.lineWidth = thickness;
  ctx.stroke(p);
  ctx.save();
  ctx.clip(p);
  ctx.translate(-0.35, -0.5);
  ctx.strokeStyle = options.edge ?? mix(color, "#ffdfaa", 0.27);
  ctx.lineWidth = thickness * 1.3;
  ctx.stroke(p);
  ctx.restore();
  grain(ctx, p, options.texture ?? 0.55);
  if (options.stitch) stitch(ctx, p, options.edge ?? "#caa269");
  ctx.restore();
}
export function stitch(
  ctx: Ctx,
  p: Path2D,
  color = "#caa269",
  alpha = 0.75,
): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = color;
  ctx.setLineDash([2.5, 2.1]);
  ctx.stroke(p);
  ctx.restore();
}
export function stroke(
  ctx: Ctx,
  p: Path2D,
  color: string,
  width = 1,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(p);
  ctx.restore();
}
export function line(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: string,
  w = 1,
  alpha = 1,
): void {
  const p = new Path2D();
  p.moveTo(x0, y0);
  p.lineTo(x1, y1);
  stroke(ctx, p, c, w, alpha);
}
export function glow(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  c: string,
  strength = 0.4,
  flat = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, flat);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha *= strength;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, c);
  g.addColorStop(0.25, c + "80");
  g.addColorStop(1, c + "00");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}
export function shadow(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.save();
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "rgba(15,13,23,.32)";
  ctx.fill(oval(x - 2, y + 2, rx, ry));
  ctx.restore();
}
