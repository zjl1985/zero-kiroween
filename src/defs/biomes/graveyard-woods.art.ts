import type { BiomeArt } from "../../render/art-registry.js";
import { leaf } from "../../render/craft-scene.js";
import { flatCut } from "../../render/paper-kit.js";
import { oval, stroke } from "../../render/paper-material.js";
import { paperSprig } from "../../render/scenery-details.js";
import { variant } from "../../render/variants.js";

/** Raised moss shelves and branching roots frame a quieter, readable central opening. */
export const GRAVEYARD_WOODS_ART: BiomeArt = {
  id: "graveyard-woods",
  swatch: ["#465046", "#39433c", "#9fb4cc"],
  sheet: { colors: ["#3e4a41", "#44513f", "#3a453f"], seam: "torn", fringe: "#56664c" },
  patchChance: 0.55,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#4b5847", "#53604d", "#48584c"], flip: true });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    flatCut(ctx, new Path2D("M -63 10 L -50 -4 L -34 -15 L -17 -13 L -4 -25 L 11 -13 L 28 -17 L 51 -1 L 62 9 L 54 21 L 31 24 L 13 18 L -8 28 L -35 23 Z"),
      { color: "#394a3d", thickness: 1, layers: 1, shadow: 0.75, texture: 0.65, edge: "#77876b" });
    for (const [i, [mx, my, rx]] of [[-32, -6, 29], [-20, 10, 25], [32, 8, 23]].entries()) {
      flatCut(ctx, oval(mx!, my!, rx!, 10 + i, seed + i, 0.2), { color: look.color, layers: 1, shadow: 0.5, thickness: 0.6, texture: 0.65, edge: "#768269" });
      flatCut(ctx, oval(mx! - 4, my! - 2, rx! * 0.67, 5, seed + i, 0.2), { color: "#637256", shadow: 0.3, thickness: 0.5, texture: 0.65, edge: "#889176" });
    }
    const root = new Path2D(look.index === 1
      ? "M -55 15 Q -38 13 -27 1 Q -16 -9 -5 -13 M -28 2 Q -40 -2 -49 -10 M -28 2 Q -23 13 -9 17 M 29 17 Q 39 11 51 7"
      : "M -56 12 Q -40 0 -32 -6 Q -20 -13 -6 -12 M -34 -4 Q -40 -13 -50 -15 M -34 -4 Q -21 7 -9 8 M 28 17 Q 40 8 53 11");
    stroke(ctx, root, "#303e35", 4.2, 0.75);
    stroke(ctx, root, "#857b5d", 2.3, 0.9);
    ctx.save(); ctx.translate(0, -0.8);
    stroke(ctx, root, "#a39b77", 0.6, 0.65);
    ctx.restore();
    paperSprig(ctx, -43, 0, 0.76, seed, "#76896a", true);
    paperSprig(ctx, 40, 12, look.index === 2 ? 0.9 : 0.64, seed + 9, "#809278", true);
    if (look.index === 0) paperSprig(ctx, -22, 17, 0.52, seed + 17, "#7c8b6a", true);
    for (let i = 0; i < 3; i++)
      leaf(ctx, -28 + i * 7, 18 + i % 2, 7, 3, -0.6 + i * 0.6, ["#857251", "#79624f", "#93805b"][i]!, seed + i);
    ctx.restore();
  },
};
