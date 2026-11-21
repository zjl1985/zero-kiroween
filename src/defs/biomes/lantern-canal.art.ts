import type { BiomeArt } from "../../render/art-registry.js";
import { crease, flatCut, PAPER_STOCK } from "../../render/paper-kit.js";
import { line } from "../../render/paper-material.js";
import { reedFan } from "../../render/scenery-details.js";
import { variant } from "../../render/variants.js";

/** Dry towpath scraps only. Real water is generated once and drawn by water-art. */
export const LANTERN_CANAL_ART: BiomeArt = {
  id: "lantern-canal",
  swatch: ["#476263", "#2c4560", "#f0b85a"],
  sheet: { colors: ["#4a5a57", "#52635d", "#465451"], seam: "wave", fringe: "#5f7364" },
  patchChance: 0.6,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#687f72", "#6b8479", "#738c7c"], flip: true });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    const stock = { ...PAPER_STOCK.sheet, texture: 0.08 };
    // A broad die-cut towpath sheet. The lower edge exposes the unprinted
    // paper core; no added channels or dark shapes that imply new water.
    flatCut(ctx, [[-63, -4], [-39, -14], [-7, -13], [23, -16], [58, -5], [65, 7],
      [44, 19], [17, 22], [-14, 20], [-43, 17], [-61, 10]],
      { color: look.color, ...stock, thickness: 1, lift: 0.7, edge: "#aeb69d" });
    flatCut(ctx, [[-61, 10], [-43, 17], [-14, 20], [17, 22], [44, 19], [65, 7],
      [63, 11], [45, 23], [17, 26], [-15, 24], [-44, 21], [-60, 14]],
      { color: PAPER_STOCK.back, ...stock, thickness: 0.65, lift: 0, edge: "#d7cfb4" });
    // One long pressed fold, broad enough to read at the game camera scale.
    flatCut(ctx, [[-54, -4], [-25, -9], [6, -7], [36, -11], [54, -5],
      [35, -4], [7, 0], [-24, -2]],
      { color: "#84907a", ...stock, lift: 0.25, thickness: 0.55 });
    crease(ctx, -48, -3, 30, -5, 0.45);
    // A single lifted reverse corner shows construction. Its contact shadow
    // belongs to the same dry sheet and does not extend its footprint.
    flatCut(ctx, [[44, 19], [55, 8], [64, 7]],
      { color: "#d0c6a8", ...stock, lift: 0.9, thickness: 0.65 });
    line(ctx, 44, 19, 55, 8, "#566455", 0.8, 0.65);
    // Two grouped paving scraps, deliberately quieter than the lantern model.
    const stoneX = look.index === 1 ? -12 : 20;
    for (let i = 0; i < 2; i++)
      flatCut(ctx, [[stoneX - 10 + i * 13, 10], [stoneX - 5 + i * 13, 5],
        [stoneX + 5 + i * 13, 7], [stoneX + 4 + i * 13, 13], [stoneX - 8 + i * 13, 15]],
        { color: i ? "#949b87" : "#a2a68f", ...stock, thickness: 0.85, lift: 0.45 });
    reedFan(ctx, -43, -5, look.index === 2 ? 0.75 : 0.9, seed);
    reedFan(ctx, 43, 12, 0.7, seed + 7);
    ctx.restore();
  },
};
