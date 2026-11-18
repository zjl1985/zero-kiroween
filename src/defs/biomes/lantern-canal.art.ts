import type { BiomeArt } from "../../render/art-registry.js";
import { paperCut } from "../../render/paper-kit.js";
import { line } from "../../render/paper-material.js";
import { reedFan } from "../../render/scenery-details.js";
import { variant } from "../../render/variants.js";

/** Dry towpath scraps only. Real water is generated once and drawn by water-art. */
export const LANTERN_CANAL_ART: BiomeArt = {
  id: "lantern-canal",
  swatch: ["#476263", "#2c4560", "#f0b85a"],
  patchChance: 0.6,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#687f72", "#6b8479", "#738c7c"], flip: true });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    paperCut(ctx, new Path2D("M -64 2 L -53 -7 L -37 -8 Q -21 -22 5 -13 L 26 -16 L 41 -12 L 65 1 L 58 16 L 39 18 L 24 24 L 1 18 L -18 23 L -42 16 L -59 14 Z"),
      { color: look.color, layers: 1, shadow: 0.62, thickness: 0.8, texture: 0.65, edge: "#a1ae94" });
    // Layered towpath fibres do not imply wet status on otherwise dry ground.
    for (let i = 0; i < 4; i++) {
      const yy = -3 + i * 3;
      line(ctx, -25 + i * 4, yy, 23 - i * 2, yy - 1, "#a0a18a", 0.7, 0.45);
    }
    paperCut(ctx, [[-60, -4], [-39, -15], [-13, -16], [17, -12], [47, -10], [58, -2], [31, -6], [5, -7], [-23, -10], [-44, -5]], {
      color: "#84907a", layers: 1, shadow: 0.4, thickness: 0.6, texture: 0.65, edge: "#a5af91",
    });
    paperCut(ctx, [[-53, 12], [-29, 14], [-2, 10], [26, 12], [56, 5], [49, 17], [17, 22], [-16, 20], [-41, 20]], {
      color: "#7b8168", shadow: 0.5, thickness: 0.7, texture: 0.6, edge: "#a7a98b",
    });
    const stoneX = look.index === 1 ? -12 : 25;
    for (let i = 0; i < 3; i++)
      paperCut(ctx, [[stoneX - 9 + i * 8, 14], [stoneX - 5 + i * 8, 11], [stoneX + i * 8, 12], [stoneX + 1 + i * 8, 16], [stoneX - 7 + i * 8, 17]], {
        color: "#929584", shadow: 0.4, thickness: 0.6, texture: 0.55,
      });
    reedFan(ctx, -43, -5, look.index === 2 ? 0.75 : 0.9, seed);
    reedFan(ctx, 43, 12, 0.7, seed + 7);
    ctx.restore();
  },
};
