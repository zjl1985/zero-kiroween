import { box, grain, oval, piece, stitch, stroke, type Ctx } from "../../render/paper-material.js";

/** A cobbled paper plaza (clock tower, lantern market): cobbles batched per tone. */
export function plaza(ctx: Ctx, x: number, cy: number, rx: number, ry: number, seed: number): void {
  const plaza = oval(x, cy, rx, ry, seed, 0.06);
  piece(ctx, plaza, "#8b8174", { shadow: 1.6, edge: "#b9ab92", texture: 0.85, thickness: 1.4 });
  ctx.save();
  ctx.clip(plaza);
  // Cobbles are batched per tone: one fill and one cut-edge stroke each.
  const tones = [new Path2D(), new Path2D(), new Path2D()],
    cols = Math.ceil((rx * 2) / 15) + 1,
    rows = Math.ceil((ry * 2) / 10) + 1;
  for (let row = 0; row < rows; row++)
    for (let k = 0; k < cols; k++)
      tones[(row + k) % 3]!.addPath(box(x - rx + k * 15 + (row % 2) * 7, cy - ry + row * 10, 13, 8, row * 31 + k));
  tones.forEach((p, i) => {
    ctx.fillStyle = ["#958a7b", "#80776b", "#9d917f"][i]!;
    ctx.fill(p);
    stroke(ctx, p, "#5d554c", 0.7, 0.8);
  });
  ctx.translate(-0.3, -0.5);
  stroke(ctx, tones[2]!, "#c4b59c", 0.5, 0.6);
  ctx.restore();
  grain(ctx, plaza, 0.4);
  stitch(ctx, oval(x, cy, rx - 5, ry - 4, seed, 0.06), "#cdbb98", 0.7);
}
