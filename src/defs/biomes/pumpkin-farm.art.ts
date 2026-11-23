import type { BiomeArt } from "../../render/art-registry.js";
import { flatCut } from "../../render/paper-kit.js";
import { line, stroke } from "../../render/paper-material.js";
import { paperSprig } from "../../render/scenery-details.js";
import { variant } from "../../render/variants.js";

/** Furrowed beds: a leafy runner, paired seedlings, or a tied harvest-straw bundle. */
export const PUMPKIN_FARM_ART: BiomeArt = {
  id: "pumpkin-farm",
  // Baked voxel scenery pools (src/render/iso/scenery.ts).
  scenery: { trees: ["maple", "oak", "maple"], bushes: ["autumn", "green"], stones: ["hay-bale", "rock", "stump"], fences: ["fence-x", "fence-y"], lamps: ["lamp-lantern"], flowers: ["flowers-yellow", "flowers-white"] },
  swatch: ["#736343", "#8d6142", "#e0863f"],
  sheet: { colors: ["#5d5240", "#655840", "#57503a"], seam: "furrow", fringe: "#6f7547" },
  patchChance: 0.7,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#61503b", "#65573e", "#6a5940"], flip: true });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    const soil = new Path2D("M -62 -13 L -47 -21 L -24 -20 L 9 -26 L 53 -23 L 62 -17 L 61 17 L 31 20 L 17 24 L -11 22 L -28 26 L -53 19 Z");
    flatCut(ctx, soil, { color: look.color, shadow: 0.6, thickness: 0.8, texture: 0.7, edge: "#8c7650" });
    ctx.save();
    ctx.clip(soil);
    for (let row = 0; row < 4; row++) {
      const yy = -16 + row * 10;
      // Broad overlapping ridges, with a dark lower lip and one pale folded edge.
      flatCut(ctx, [[-62, yy], [-25, yy + 2], [24, yy - 2], [63, yy - 4], [61, yy + 1], [22, yy + 3], [-26, yy + 6], [-62, yy + 4]], {
        color: row % 2 ? "#906744" : "#76553e", shadow: 0.65, thickness: 0.8, texture: 0.6, edge: "#b08a5a",
      });
    }
    ctx.restore();
    const runner = new Path2D("M -50 11 Q -28 -2 -8 5 Q 12 12 36 -4 Q 46 -10 51 -6 Q 57 0 49 2");
    stroke(ctx, runner, "#3f4b32", 2.3, 0.7);
    stroke(ctx, runner, "#94915a", 0.9, 0.9);
    const shoots = look.index === 1 ? [-34, -8, 20, 43] : [-34, 3, 37];
    for (const [i, sx] of shoots.entries())
      paperSprig(ctx, sx, i % 2 ? 7 : 4, look.index === 1 ? 0.43 : 0.6, seed + i, i % 2 ? "#828651" : "#6f7e4d");
    if (look.index === 2) {
      for (let i = 0; i < 6; i++) {
        line(ctx, -47 + i, 17 + i * 0.4, -24 + i * 1.4, 11 + i, "#b69c64", 0.9, 0.8);
        line(ctx, -47 + i, 17 + i * 0.4, -43 + i, 15 + i * 0.4, "#d0b57d", 0.7, 0.7);
      }
      line(ctx, -35, 11, -32, 21, "#6d7450", 1.7);
    } else {
      // Small folded seed leaves, not glowing pumpkins that suggest an interaction.
      flatCut(ctx, [[38, 15], [44, 11], [51, 14], [47, 20], [42, 19]], { color: "#a2894e", shadow: 0.4, thickness: 0.5, texture: 0.6 });
      line(ctx, 40, 16, 48, 14, "#c4ac6c", 0.6, 0.65);
    }
    ctx.restore();
  },
};
