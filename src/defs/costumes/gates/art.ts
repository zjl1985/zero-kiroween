/**
 * Reading-List Cat: a folded page hat and a stack of untitled little books in
 * the paw, with a bookmark shaped like a cat tail. The page-turn pulse uses
 * the shared pull effect.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { stroke } from "../../../render/paper-material.js";
import { GATES_SKILL } from "./def.js";

const COLORS = { tag: "#9cb4d8", ink: "#f4f0e2" } as const;
const LOOK: ZoneLook = { circle: "safe" };

export const GATES_ART: CostumeArt = {
  id: "gates",
  colors: COLORS,
  makeup: { accessories: ["page-hat"] },
  outfit: {
    tee: { body: "#7f8fa8", bodyEdge: "#c0cad8" },
    parts: [
      {
        // Three untitled books, spines ruled, a tail-curl bookmark out of the top one.
        layer: "hand",
        box: [-12, -14, 13, 11],
        at: [1, 2],
        paint(c) {
          cut(c, [[-9, 3], [9, 3], [9, 8], [-9, 8]], "#5876a8");
          cut(c, [[-8, -2], [8.6, -2.4], [8.6, 3], [-8, 3]], "#b8483e");
          cut(c, [[-9.4, -7], [7.6, -7], [7.6, -2], [-9.4, -2]], "#6f9b5a");
          for (const [y0, y1] of [[4, 7], [-1.4, 2], [-6, -3]] as const) outfitLine(c, -6.4, y0, -6.4, y1, "#efe2c4", 0.45, 0.8);
          stroke(c, new Path2D("M 3 -7 Q 3.4 -11 6.6 -10.6 Q 9 -10 8.2 -8"), "#e3c25a", 1.2);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: GATES_SKILL.pull * 0.18, until: 1, power: 1 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[10, 13], [16.5, 15], [23, 13], [23, 24], [16.5, 26], [10, 24]]);
  },
};
