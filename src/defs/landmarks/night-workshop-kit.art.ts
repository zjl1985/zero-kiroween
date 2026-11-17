import { foldLine, paperCut } from "../../render/paper-kit.js";
import { hash, line, mix, oval, type Ctx, type Point } from "../../render/paper-material.js";

/** A cut-card strut, rather than a round Canvas stroke, with a lit folded edge. */
export function cardBeam(ctx: Ctx, ax: number, ay: number, bx: number, by: number, width: number, color = "#70523e"): void {
  const length = Math.hypot(bx - ax, by - ay) || 1,
    nx = (-(by - ay) / length) * width * 0.5,
    ny = ((bx - ax) / length) * width * 0.5;
  paperCut(ctx, [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], {
    color, shadow: 0.8, thickness: 0.7, texture: 0.75,
  });
  line(ctx, ax + nx * 0.45, ay + ny * 0.45, bx + nx * 0.45, by + ny * 0.45, mix(color, "#efd5a4", 0.45), 0.65, 0.8);
}

/** Folded lanceolate leaf with a broad face and a darker return face. */
export function foldedLeaf(ctx: Ctx, x: number, y: number, length: number, width: number, angle: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  paperCut(ctx, [[0, 0], [-width, -length * 0.42], [-width * 0.55, -length * 0.76], [0, -length], [width * 0.9, -length * 0.58], [width * 0.65, -length * 0.2]], {
    color, thickness: 0.65, shadow: 1, texture: 0.8,
    fold: { from: [0, 0], to: [0, -length], depth: 0.2 },
  });
  for (const t of [0.32, 0.55, 0.73]) line(ctx, 0, -length * t, -width * 0.65, -length * (t + 0.1), "#c6cd91", 0.45, 0.5);
  ctx.restore();
}

/** Layered foliage; allow x +/- 48 and y -68..7, including shadows, at unit scale. */
export function paperSprig(ctx: Ctx, x: number, y: number, s: number, seed: number, cool = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const colors = cool ? ["#527e76", "#80a48a", "#abc39b"] : ["#647e4f", "#8e9c5f", "#b2b878"];
  for (let i = 0; i < 5; i++) {
    const angle = (i - 2) * 0.42,
      length = 27 + hash(seed + i * 19) * 20,
      sx = (i - 2) * 3,
      sy = -6 - (2 - Math.abs(i - 2)) * 4;
    line(ctx, 0, 0, sx, sy - length * 0.4, "#7a8e59", 1.2);
    foldedLeaf(ctx, sx, sy, length, 6 + hash(seed + i) * 2, angle, colors[i % 3]!);
  }
  ctx.restore();
}

/** An open terracotta pot; foliage is drawn separately so leaves overlap the rim. */
export function foldedPot(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  paperCut(ctx, [[-12, -23], [12, -23], [8, 0], [-8, 0]], {
    color: "#ac7052", shadow: 1.3, thickness: 1, texture: 0.9,
    fold: { from: [4, -23], to: [3, 0], depth: 0.22 },
    ground: { x: 0, y: 1, rx: 13, ry: 4 },
  });
  paperCut(ctx, oval(0, -23, 13, 4.5, seed), { color: "#cf9465", thickness: 0.7, shadow: 0.6 });
  paperCut(ctx, oval(0, -23, 9.5, 2.6, seed + 1), { color: "#3a3432", thickness: 0.45, shadow: 0, texture: 0.9 });
  foldLine(ctx, -8, -6, 7, -6, 0.45);
  ctx.restore();
}

/** A folded star motif, not a label or a gameplay marker. */
export function cardStar(ctx: Ctx, x: number, y: number, r: number, color = "#e6c88b"): void {
  const points: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      d = i % 2 ? r * 0.43 : r;
    points.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  paperCut(ctx, points, { color, thickness: 0.6, shadow: 0.8, texture: 0.55, fold: { from: [x, y - r], to: [x, y + r * 0.8], depth: 0.15 } });
}
