import { foldLine, paperCut } from "./paper-kit.js";
import { line, mix, oval, path, stroke, type Ctx } from "./paper-material.js";
import { variant } from "./variants.js";

/** Small folded botanical pieces, used only by cached scenery painters. */
export function paperSprig(ctx: Ctx, x: number, y: number, s: number, seed: number, color: string, fern = false): void {
  const look = variant(seed, { palette: [color], angle: [-0.22, 0.22], flip: true });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(look.angle);
  ctx.scale(s * look.flip, s);
  const stem = new Path2D("M 0 0 Q 3 -10 0 -23");
  stroke(ctx, stem, mix(color, "#d7c58d", 0.4), 0.8);
  const pairs = fern ? 5 : 3;
  for (let i = 0; i < pairs; i++) {
    const yy = -4 - i * (fern ? 3.4 : 6), width = (fern ? 10 : 8) - i * 1.25;
    for (const side of [-1, 1]) {
      paperCut(ctx, [[1, yy], [side * width, yy - 2], [side * (width + 1), yy - 6], [side * 3, yy - 5]], {
        color: side < 0 ? color : mix(color, "#273b37", 0.22), shadow: 0.35, thickness: 0.45, texture: 0.55,
      });
      foldLine(ctx, 1, yy, side * width, yy - 5, 0.35);
    }
  }
  ctx.restore();
}

/** A stem, folded leaves and an overlapping rosette, rather than isolated dots. */
export function paperFlower(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  const look = variant(seed, { palette: ["#c9c4ac", "#b9a7bc", "#d4bd93"], angle: [-0.22, 0.22] });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const lean = look.index === 1 ? -2 : 1.5;
  stroke(ctx, new Path2D(`M 0 0 Q ${lean + 2} -7 ${lean} -12`), "#8c956b", 0.8);
  paperCut(ctx, [[0, -3], [-5, -6], [-6, -10], [-1, -8]], { color: "#79866a", shadow: 0.3, thickness: 0.4, texture: 0.5 });
  paperCut(ctx, [[1, -6], [5, -10], [5, -12], [1, -10]], { color: "#939b76", shadow: 0.3, thickness: 0.4, texture: 0.5 });
  ctx.translate(lean, -13);
  ctx.rotate(look.angle);
  const petals = look.index === 1 ? 4 : 5;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI * 2 / petals);
    paperCut(ctx, [[0, 1], [-2.7, -2.5], [-2, -5], [1.2, -5.5], [3, -2.4]], {
      color: look.color, shadow: 0.35, thickness: 0.4, texture: 0.5,
    });
    foldLine(ctx, 0, 0, 0, -4, 0.3);
    ctx.restore();
  }
  paperCut(ctx, oval(0, 0, 1.5, 1.3, seed), { color: "#c7a660", shadow: 0.3, thickness: 0.3, texture: 0.4 });
  ctx.restore();
}

/** A rooted fan, not upright scenery: stays below 23 units above its anchor. */
export function reedFan(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  const look = variant(seed, { palette: ["#7e8c70", "#929779"], flip: true });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * look.flip, s);
  for (const [dx, h] of [[-9, 13], [-4, 22], [2, 18], [8, 15]]) {
    paperCut(ctx, [[-1, 0], [dx! - 1, -h! * 0.7], [dx!, -h!], [dx! + 1.5, -h! * 0.65], [2, 0]], {
      color: look.color, shadow: 0.3, thickness: 0.4, texture: 0.5,
    });
    line(ctx, 0, -1, dx!, -h! + 2, "#b1b18a", 0.4, 0.65);
  }
  paperCut(ctx, path([[-5, 0], [-1, -2], [5, 0], [3, 2]]), { color: "#626f5b", shadow: 0.4, thickness: 0.5, texture: 0.5 });
  ctx.restore();
}
