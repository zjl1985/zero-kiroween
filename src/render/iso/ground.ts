/**
 * Ground shapes from projected vertices (plan step 2.6). The world-space
 * ground painters (warnings, fire cells, wash blooms, Paper Cut / Page Fold
 * sheets, pickup and landmark activity rings, combat and enemy ground) keep
 * their world coordinates; `isoGround(ctx)` hands them a context that
 * projects every vertex through toScreen before it reaches the canvas, so
 * squares become 2:1 diamonds and circles 2:1 ellipses while line widths,
 * dashes and pixel images stay in screen space (images are placed upright at
 * their projected point, never skewed). The caller's ctx must already carry
 * the camera transform from isoProjection.
 */
import { ISO, snap, toScreen, type Vec } from "./projection.js";

type Ctx = CanvasRenderingContext2D;
/** A canvas-style affine matrix [a, b, c, d, e, f]. */
type M = readonly [number, number, number, number, number, number];
type Pt = readonly [number, number] | Vec;

/** The projection as a canvas matrix: screen = (k(x - y), k(x + y) / 2). */
export const ISO_MATRIX: M = [ISO.k, ISO.k / 2, -ISO.k, ISO.k / 2, 0, 0];
const IDENTITY: M = [1, 0, 0, 1, 0, 0];

const px = (p: Pt) => ("x" in p ? p.x : p[0]);
const py = (p: Pt) => ("x" in p ? p.y : p[1]);

/** Traces a closed world polygon as projected vertices on the current path. */
export function isoPath(ctx: Pick<Ctx, "moveTo" | "lineTo" | "closePath">, points: readonly Pt[]): void {
  points.forEach((p, i) => {
    const s = toScreen(px(p), py(p));
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  if (points.length) ctx.closePath();
}

/**
 * A world circle (or a world-axis ellipse rx, ry) on the ground. A circle of
 * radius r projects to an axis-aligned 2:1 ellipse with radii r*sqrt2*k and
 * r*sqrt2*k/2; its parameter t lands at t + 45 degrees.
 */
export function isoEllipse(
  ctx: Pick<Ctx, "ellipse" | "moveTo" | "lineTo" | "closePath">,
  x: number,
  y: number,
  r: number,
  ry = r,
  start = 0,
  end = Math.PI * 2,
  ccw = false,
): void {
  const c = toScreen(x, y);
  if (ry === r) {
    ctx.ellipse(c.x, c.y, r * Math.SQRT2 * ISO.k, (r * Math.SQRT2 * ISO.k) / 2, 0, start + Math.PI / 4, end + Math.PI / 4, ccw);
    return;
  }
  const n = 32, span = sweep(start, end, ccw);
  for (let i = 0; i <= n; i++) {
    const t = start + (span * i) / n, s = toScreen(x + Math.cos(t) * r, y + Math.sin(t) * ry);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
}

/** The four world corners of a w x h rectangle centred on (cx, cy), turned by `angle`. */
export function rectCorners(cx: number, cy: number, w: number, h: number, angle = 0): Vec[] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) =>
    ({ x: cx + u! * c - v! * s, y: cy + u! * s + v! * c }));
}

/** A world rectangle on the ground as projected vertices (an axis-aligned square is a 2:1 diamond). */
export function isoRect(ctx: Pick<Ctx, "moveTo" | "lineTo" | "closePath">, cx: number, cy: number, w: number, h: number, angle = 0): void {
  isoPath(ctx, rectCorners(cx, cy, w, h, angle));
}

function sweep(start: number, end: number, ccw: boolean): number {
  const full = Math.PI * 2;
  let d = end - start;
  if (!ccw && d < 0) d = (d % full) + full;
  if (ccw && d > 0) d = (d % full) - full;
  if (Math.abs(end - start) >= full) d = ccw ? -full : full;
  return d;
}

const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const isIdentity = (m: M) => m.every((v, i) => v === IDENTITY[i]);

const projected = new WeakMap<Path2D, Path2D>();
/**
 * A world-space Path2D re-expressed with projected vertices (Path2D.addPath
 * with the projection matrix, after the painter's own transform `local`).
 * Untransformed paths are memoised, so the fill and the edge of one warning
 * share a single projected path.
 */
export function projectPath(path: Path2D, local: M = IDENTITY): Path2D {
  const plain = isIdentity(local);
  if (plain) {
    const hit = projected.get(path);
    if (hit) return hit;
  }
  const out = new Path2D(), m = mul(ISO_MATRIX, local);
  out.addPath(path, new DOMMatrix([...m]));
  if (plain) projected.set(path, out);
  return out;
}

/** Path-building calls whose (x, y) argument pairs are projected. */
const POINT_OPS: Readonly<Record<string, number>> = { moveTo: 1, lineTo: 1, quadraticCurveTo: 2, bezierCurveTo: 3 };

/**
 * A context for world-space ground painters that projects every vertex.
 * Local translate / rotate / scale / transform calls stay in world space and
 * are applied before the projection. fillRect batches consecutive rectangles
 * of one style into a single path fill, so scanline-built pixel polygons
 * leave no seams between their projected rows. `flush()` ends a batch; the
 * caller runs it after the painter (see groundPass).
 */
export function isoGround(ctx: Ctx): Ctx & { flush(): void } {
  let m: M = IDENTITY;
  const stack: M[] = [];
  let batch: Path2D | null = null;
  const world = (x: number, y: number): Vec => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const screen = (x: number, y: number): Vec => {
    const w = world(x, y);
    return toScreen(w.x, w.y);
  };
  const flush = () => {
    if (!batch) return;
    const b = batch;
    batch = null;
    ctx.fill(b);
  };
  const quad = (target: Pick<Ctx, "moveTo" | "lineTo" | "closePath">, x: number, y: number, w: number, h: number) => {
    const a = screen(x, y), b = screen(x + w, y), c = screen(x + w, y + h), d = screen(x, y + h);
    target.moveTo(a.x, a.y); target.lineTo(b.x, b.y); target.lineTo(c.x, c.y); target.lineTo(d.x, d.y); target.closePath();
  };
  const pathArg = (p: unknown): p is Path2D => typeof Path2D !== "undefined" && p instanceof Path2D;
  /** Scale and screen rotation of the local world x axis, for upright images and text. */
  const frame = () => {
    const o = screen(0, 0), ax = screen(1, 0);
    const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
    const rotated = Math.abs(m[1]) > 1e-9 || Math.abs(m[2]) > 1e-9;
    return { o, scale, angle: rotated ? Math.atan2(ax.y - o.y, ax.x - o.x) : 0 };
  };
  const ops: Record<string, (...args: any[]) => unknown> = {
    flush,
    save() { flush(); stack.push(m); ctx.save(); },
    restore() { flush(); m = stack.pop() ?? IDENTITY; ctx.restore(); },
    translate(x: number, y: number) { m = mul(m, [1, 0, 0, 1, x, y]); },
    // A flip or turn could reverse the winding of later batched rectangles: end the batch first.
    scale(x: number, y: number) { flush(); m = mul(m, [x, 0, 0, y, 0, 0]); },
    rotate(a: number) { flush(); const c = Math.cos(a), s = Math.sin(a); m = mul(m, [c, s, -s, c, 0, 0]); },
    transform(a: number, b: number, c: number, d: number, e: number, f: number) { flush(); m = mul(m, [a, b, c, d, e, f]); },
    beginPath() { flush(); ctx.beginPath(); },
    closePath() { ctx.closePath(); },
    rect(x: number, y: number, w: number, h: number) { quad(ctx, x, y, w, h); },
    roundRect(x: number, y: number, w: number, h: number) { quad(ctx, x, y, w, h); },
    arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false) {
      // Uniform, unrotated local scale keeps the exact projected ellipse; anything else samples the outline.
      if (Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && m[0] > 0 && m[0] === m[3]) {
        const w = world(x, y);
        isoEllipse(ctx, w.x, w.y, r * m[0], r * m[0], a0, a1, ccw);
      } else ops.ellipse!(x, y, r, r, 0, a0, a1, ccw);
    },
    ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false) {
      const n = 32, span = sweep(a0, a1, ccw), c = Math.cos(rot), s = Math.sin(rot);
      for (let i = 0; i <= n; i++) {
        const t = a0 + (span * i) / n, u = Math.cos(t) * rx, v = Math.sin(t) * ry;
        const p = screen(x + u * c - v * s, y + u * s + v * c);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
    },
    fillRect(x: number, y: number, w: number, h: number) {
      // One winding for every batched rectangle, whatever the sign of w and h.
      if (w < 0) { x += w; w = -w; }
      if (h < 0) { y += h; h = -h; }
      if (typeof Path2D === "undefined") {
        ctx.beginPath(); quad(ctx, x, y, w, h); ctx.fill();
        return;
      }
      batch ??= new Path2D();
      quad(batch, x, y, w, h);
    },
    strokeRect(x: number, y: number, w: number, h: number) { flush(); ctx.beginPath(); quad(ctx, x, y, w, h); ctx.stroke(); },
    clearRect() { flush(); },
    fill(...args: unknown[]) { flush(); if (pathArg(args[0])) ctx.fill(projectPath(args[0] as Path2D, m), ...(args.slice(1) as [CanvasFillRule?])); else ctx.fill(...(args as [CanvasFillRule?])); },
    stroke(p?: Path2D) { flush(); if (p && pathArg(p)) ctx.stroke(projectPath(p, m)); else ctx.stroke(); },
    clip(...args: unknown[]) { flush(); if (pathArg(args[0])) ctx.clip(projectPath(args[0] as Path2D, m), ...(args.slice(1) as [CanvasFillRule?])); else ctx.clip(...(args as [CanvasFillRule?])); },
    drawImage(image: CanvasImageSource & { width?: number; height?: number }, ...rest: number[]) {
      flush();
      const nine = rest.length >= 8;
      const dx = nine ? rest[4]! : rest[0]!, dy = nine ? rest[5]! : rest[1]!;
      const dw = nine ? rest[6]! : rest.length >= 4 ? rest[2]! : Number(image.width ?? 0);
      const dh = nine ? rest[7]! : rest.length >= 4 ? rest[3]! : Number(image.height ?? 0);
      // Upright at the projected centre: whole-pixel placement, never skewed.
      const f = frame(), c = screen(dx + dw / 2, dy + dh / 2), w = dw * f.scale, h = dh * f.scale;
      ctx.save();
      ctx.translate(snap(c.x), snap(c.y));
      if (f.angle) ctx.rotate(f.angle);
      if (nine) ctx.drawImage(image, rest[0]!, rest[1]!, rest[2]!, rest[3]!, -w / 2, -h / 2, w, h);
      else ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
    fillText(text: string, x: number, y: number, max?: number) {
      flush();
      const s = screen(x, y);
      if (max === undefined) ctx.fillText(text, snap(s.x), snap(s.y));
      else ctx.fillText(text, snap(s.x), snap(s.y), max);
    },
    strokeText(text: string, x: number, y: number) { flush(); const s = screen(x, y); ctx.strokeText(text, snap(s.x), snap(s.y)); },
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
      const a = screen(x0, y0), b = screen(x1, y1);
      return ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    },
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
      const a = screen(x0, y0), b = screen(x1, y1);
      return ctx.createRadialGradient(a.x, a.y, r0, b.x, b.y, r1);
    },
  };
  for (const [op, pairs] of Object.entries(POINT_OPS))
    ops[op] = (...args: number[]) => {
      const out: number[] = [];
      for (let i = 0; i < pairs; i++) {
        const s = screen(args[i * 2]!, args[i * 2 + 1]!);
        out.push(s.x, s.y);
      }
      (ctx as unknown as Record<string, (...a: number[]) => void>)[op]!(...out);
    };
  return new Proxy(ctx, {
    get(target, key) {
      if (typeof key === "string" && key in ops) return ops[key];
      const value = Reflect.get(target, key, target) as unknown;
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
    set(target, key, value) {
      flush();
      return Reflect.set(target, key, value, target);
    },
  }) as Ctx & { flush(): void };
}

/** Runs a world-space ground painter through isoGround(ctx) and ends its last batch. */
export function groundPass(ctx: Ctx, paint: (ground: Ctx) => void): void {
  const ground = isoGround(ctx);
  paint(ground);
  ground.flush();
}
