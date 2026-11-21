/**
 * A scored paper lantern, shared by props and market dressing. The same
 * authored envelope and three folded faces survive tearing, scorching and
 * collapse; no replacement particle silhouette or per-frame texture cache.
 * All coordinates are local, with the lantern's centre at (0, 0).
 */
import { cutHole, flatCut, PAPER_STOCK } from "./paper-kit.js";
import { line, mix, path, stroke, type Ctx, type Point } from "./paper-material.js";

export type LanternCondition = "intact" | "torn" | "charred" | "collapsed";
const CONTOUR: readonly Point[] = [
  [-3.8, -9], [3.8, -9], [6.4, -5.2], [7, 3.5], [3.8, 9],
  [-3.8, 9], [-7, 3.5], [-6.4, -5.2],
];
const FACES: readonly (readonly Point[])[] = [
  [[-3.8, -9], [-1.6, -8], [-2.2, 8], [-3.8, 9], [-7, 3.5], [-6.4, -5.2]],
  [[-1.6, -8], [2.4, -8], [3, 8], [-2.2, 8]],
  [[2.4, -8], [3.8, -9], [6.4, -5.2], [7, 3.5], [3.8, 9], [3, 8]],
];
const TEAR: readonly Point[] = [[2.4, -4.8], [0.5, -2.5], [2.2, -1.2], [0.2, 1.4], [2, 3.4], [1.2, 5.7]];

/** One geometry/material model, deformed only for the inert collapsed state. */
export function paperLantern(
  ctx: Ctx, x: number, y: number, scale: number, color: string,
  condition: LanternCondition = "intact", variant = 0,
): void {
  const collapsed = condition === "collapsed", burnt = condition === "charred",
    torn = condition === "torn", k = collapsed ? 0.28 : 1,
    project = (p: Point): Point => [x + (p[0] + (collapsed ? p[1] * 0.3 : 0)) * scale, y + p[1] * scale * k],
    shape = path(CONTOUR.map(project)),
    front = burnt ? "#514038" : color,
    back = burnt ? "#94775a" : PAPER_STOCK.back;
  // Opening cut through the envelope, never through the caller's canvas.
  if (burnt) cutHole(shape, x + 1.5 * scale, y + 1.1 * scale, 2.8 * scale, 4.1 * scale);
  if (torn) {
    // An asymmetric opening follows the score, with pale torn fibres at its left edge.
    const hole = [...TEAR, [5.7, 5], [5.8, -3.8]] as Point[];
    // Left edge runs down, then returns up the right: opposite to the body.
    hole.map(project).forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py));
    shape.closePath();
  }
  flatCut(ctx, shape, { color: front, ...PAPER_STOCK.sheet,
    thickness: PAPER_STOCK.sheet.thickness * scale, lift: collapsed ? 0.3 : 0.8,
    edge: burnt ? "#b3946c" : "#f4d8ac", texture: 0.08 });
  ctx.save();
  ctx.clip(shape);
  const shades = [mix(front, "#352b37", PAPER_STOCK.foldShade + 0.12), front, mix(front, "#f5ddb4", 0.25)];
  FACES.forEach((face, i) => {
    ctx.fillStyle = shades[i]!;
    ctx.fill(path(face.map(project)));
  });
  // Scored joins have a dark valley and a narrow moon-facing lip.
  for (const [a, b] of [[[-1.6, -8], [-2.2, 8]], [[2.4, -8], [3, 8]]] as const) {
    const u = project(a), v = project(b);
    line(ctx, ...u, ...v, mix(front, "#2c2330", 0.5), 0.65 * scale);
    line(ctx, u[0] + 0.55 * scale, u[1], v[0] + 0.55 * scale, v[1], back, 0.35 * scale, 0.7);
  }
  ctx.restore();
  if (torn || burnt) {
    const rim = new Path2D();
    if (burnt) rim.ellipse(x + 1.5 * scale, y + 1.1 * scale, 2.8 * scale, 4.1 * scale, 0, 0, Math.PI * 2);
    else TEAR.map(project).forEach(([px, py], i) => i ? rim.lineTo(px, py) : rim.moveTo(px, py));
    stroke(ctx, rim, burnt ? "#211c23" : "#f0dfbf", (burnt ? 1.5 : 0.9) * scale);
    // A single hinged flap exposes its back and casts a contact shadow on the face.
    const flap: Point[] = burnt
      ? [[4.2, -2], [6.3, -3], [7.1, 1], [4.1, 3]]
      : [[2, -4.5], [5.4, -2.6], [7.6, 2.6], [2, 3.4], [3.2, 0.6]];
    flatCut(ctx, flap.map(project), { color: back, ...PAPER_STOCK.thin,
      thickness: PAPER_STOCK.thin.thickness * scale, lift: 0.7,
      edge: burnt ? "#30242a" : "#fff0d4", texture: 0 });
    if (torn) for (let i = 0; i < 3; i++) {
      const p = project(TEAR[i * 2]!);
      line(ctx, p[0], p[1], p[0] - 0.9 * scale, p[1] + 0.7 * scale, "#fff1d7", 0.35 * scale);
    }
  }
  // Top and bottom are folded collars of the same stock, with a thin pale cut side.
  for (const side of [-1, 1]) {
    const yy = side * 8.8,
      collar: Point[] = [[-3.9, yy - 0.7], [3.9, yy - 0.7], [3.5, yy + 0.9], [-3.5, yy + 0.9]];
    flatCut(ctx, collar.map(project), {
      color: burnt ? "#30262b" : "#634537", ...PAPER_STOCK.thin,
      thickness: 0.45 * scale, lift: 0.15, texture: 0,
    });
  }
  if (!collapsed) {
    const [tx, ty] = project([0, 10]);
    line(ctx, tx, ty, tx + (variant % 2 ? 0.6 : -0.6) * scale, ty + 2 * scale, back, 0.65 * scale);
  }
}
