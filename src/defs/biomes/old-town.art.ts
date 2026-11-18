import type { BiomeArt } from "../../render/art-registry.js";
import { leaf } from "../../render/craft-scene.js";
import { foldLine, flatCut } from "../../render/paper-kit.js";
import { box, line, type Point } from "../../render/paper-material.js";
import { variant } from "../../render/variants.js";

// Broken courses, a corner apron, or staggered stepping flags; never an even scatter.
const COURSES: readonly (readonly Point[])[] = [
  [[-45, -12], [-23, -13], [-1, -12], [-45, 0], [-23, 0], [-1, 1], [-23, 13]],
  [[-47, -17], [-25, -17], [-3, -17], [19, -17], [-47, -4], [-47, 9], [-25, 9]],
  [[-47, 10], [-28, 3], [-9, -4], [10, -11], [31, -17], [-28, 15]],
];

/** Old town: worn masonry courses, inset drain grates and leaves caught in the joints. */
export const OLD_TOWN_ART: BiomeArt = {
  id: "old-town",
  swatch: ["#686153", "#948776", "#e3b866"],
  sheet: { colors: ["#5b574e", "#635e53", "#56524a"], seam: "ruled" },
  patchChance: 0.55,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#7d7466", "#8a8070", "#736f66"], flip: true, shift: 0.15 });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    flatCut(ctx, [[-63, -24], [-5, -30], [46, -23], [59, 1], [44, 26], [-18, 30], [-58, 20]],
      { color: "#655d50", thickness: 1.1, layers: 1, shadow: 0.8, texture: 0.67, edge: "#9f8c72" });
    for (const [i, [sx, sy]] of COURSES[look.index]!.entries()) {
      const w = i % 3 === 0 ? 20 : 18, h = i % 2 ? 9 : 10;
      flatCut(ctx, [[sx - w / 2, sy - h / 2], [sx + w / 2 - 3, sy - h / 2], [sx + w / 2, sy - 1], [sx + w / 2 - 1, sy + h / 2], [sx - w / 2 + 1, sy + h / 2]], {
        color: look.color, shadow: 0.6, thickness: 0.7, texture: 0.65, edge: "#aa9f8b",
      });
      if (i % 3 === 0) {
        foldLine(ctx, sx - 6, sy - 3, sx + 6, sy - 3, 0.35);
        line(ctx, sx + 2, sy + h / 2, sx + 5, sy + 1, "#5b594c", 0.65, 0.7);
      }
    }
    const gx = look.index === 2 ? 22 : 25, gy = look.index === 1 ? 8 : 4;
    flatCut(ctx, box(gx - 13, gy - 9, 26, 18, seed), { color: "#88816e", layers: 1, shadow: 0.5, thickness: 0.6, texture: 0.65 });
    flatCut(ctx, box(gx - 9, gy - 6, 18, 12, seed), { color: "#414b47", shadow: 0, thickness: 0.7, texture: 0.4, edge: "#a29c84" });
    for (let i = 0; i < 5; i++) {
      const xx = gx - 7 + i * 3.5;
      line(ctx, xx, gy - 5, xx, gy + 5, "#8b9280", 1.2, 0.8);
      line(ctx, xx + 1, gy - 5, xx + 1, gy + 5, "#303c39", 0.6, 0.6);
    }
    line(ctx, gx - 8, gy, gx + 8, gy, "#a0a18a", 0.8, 0.7);
    for (let i = 0; i < 3; i++)
      leaf(ctx, -43 + i * 5, 17 + i % 2 * 2, 6 + i, 2.6, -0.9 + i * 0.7, ["#9e784b", "#a58b57", "#827650"][i]!, seed + i);
    ctx.restore();
  },
};
