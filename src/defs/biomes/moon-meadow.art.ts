import type { BiomeArt } from "../../render/art-registry.js";
import { foldLine, paperCut } from "../../render/paper-kit.js";
import { oval, type Point } from "../../render/paper-material.js";
import { paperFlower, paperSprig } from "../../render/scenery-details.js";
import { variant } from "../../render/variants.js";

// Loose asterisms made of dull stones, not glowing pickup dots or navigational lines.
const ASTERISMS: readonly (readonly Point[])[] = [
  [[6, 6], [18, 2], [30, 8], [40, 1], [49, 11]],
  [[6, 0], [18, 11], [29, 6], [34, -4], [45, -8]],
  [[5, 12], [17, 5], [30, 9], [40, 4], [34, -8]],
];

/** Moon meadow: scalloped clover, folded flower bouquets and quiet pebble asterisms. */
export const MOON_MEADOW_ART: BiomeArt = {
  id: "moon-meadow",
  swatch: ["#62647a", "#9d96a8", "#cdb8f2"],
  patchChance: 0.7,
  patch(ctx, x, y, r, seed) {
    const look = variant(seed, { palette: ["#77788b", "#807d92", "#737e86"], flip: true });
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 70 * look.flip, r / 70);
    paperCut(ctx, new Path2D("M -64 4 Q -62 -10 -45 -14 Q -36 -25 -22 -18 Q -5 -23 7 -15 Q 28 -22 39 -11 Q 57 -15 64 0 Q 63 15 49 18 Q 33 28 16 21 Q 0 31 -15 24 Q -28 31 -40 18 Q -58 21 -64 4 Z"),
      { color: "#5d606e", layers: 1, shadow: 0.73, thickness: 0.9, texture: 0.65, edge: "#938ca5" });
    for (const [i, [mx, my, rx]] of [[-33, -2, 26], [-17, 10, 22], [33, 5, 26]].entries())
      paperCut(ctx, oval(mx!, my!, rx!, 11, seed + i, 0.18), { color: look.color, shadow: 0.4, thickness: 0.6, texture: 0.6, edge: "#aca4b9" });
    paperSprig(ctx, -37, 8, 0.62, seed, "#a0ad84");
    paperSprig(ctx, -16, 13, 0.5, seed + 11, "#929f7c");
    for (const [i, [fx, fy]] of [[-43, 4], [-33, 0], [-23, 7], [-16, 14], [-34, 14]].entries())
      paperFlower(ctx, fx!, fy!, i % 2 ? 0.68 : 0.82, seed + i * 11);
    for (const [i, [px, py]] of ASTERISMS[look.index]!.entries()) {
      paperCut(ctx, [[px - 3.5, py], [px - 1, py - 2.4], [px + 3, py - 1.5], [px + 4, py + 1], [px + 1, py + 2], [px - 3, py + 1.5]], {
        color: i % 2 ? "#a7aa98" : "#969f91", shadow: 0.4, thickness: 0.6, texture: 0.5, edge: "#c3c7ae",
      });
      foldLine(ctx, px - 1, py - 1.5, px + 2.5, py + 0.5, 0.3);
    }
    ctx.restore();
  },
};
