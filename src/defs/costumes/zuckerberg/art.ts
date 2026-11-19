/**
 * Hydrofoil Glide Cat: a navy wetsuit (garment recolour), white sunscreen
 * stripes on the cheeks and nose, and an origami hydrofoil board under the
 * paws. The skill leaves a blue pencil water line.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { ZUCKERBERG_SKILL } from "./def.js";

const COLORS = { tag: "#6fa7c9", ink: "#e6f6ff" } as const;
const LOOK: ZoneLook = { lane: "water" };

export const ZUCKERBERG_ART: CostumeArt = {
  id: "zuckerberg",
  colors: COLORS,
  makeup: {
    patches: [
      { path: "M 31.8 33 Q 34.6 32.2 37.4 33 L 37 34.2 Q 34.6 33.6 32.2 34.2 Z", color: "#f6f2ea" },
      { path: "M 15.8 40.6 L 21.6 39.6 L 21.8 41 L 16.2 42 Z M 53.8 40.6 L 48 39.6 L 47.8 41 L 53.4 42 Z", color: "#f6f2ea" },
    ],
  },
  outfit: {
    coat: { body: "#24304a", bodyEdge: "#6e7fa0", cape: "#2c3a56", capeEdge: "#7d8db0", bib: "#2a3650", lining: "#3d5072" },
    tee: { body: "#26324a", bodyEdge: "#6e7fa0", denim: "#1f2a40", denimEdge: "#5a6a8a" },
    parts: [
      {
        // A folded paper board with a stripe, its mast and the small foil wing below.
        layer: "under",
        box: [-30, -4, 32, 20],
        at: [0, 0],
        paint(c) {
          cut(c, [[1.6, 2], [4, 2], [4.2, 13], [1.8, 13]], "#3a4258", 0.4);
          cut(c, [[-8, 13], [14, 12.4], [10, 15.6], [-6, 15.6]], "#5876a8", 0.5);
          cut(c, [[-27, -1], [24, -2.2], [29, 0.4], [25, 2.6], [-26, 2.6]], "#e8e4d6", 0.7);
          cut(c, [[-22, 0.2], [22, -0.6], [22, 0.6], [-22, 1.4]], "#5876a8", 0, 0.3);
          outfitLine(c, -28, 9, 30, 8, "#6fa7c9", 0.8, 0.6);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "lane", x: -70, y: 10, x2: 70, y2: -10, radius: ZUCKERBERG_SKILL.width, until: 1, power: 1 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[9, 19], [22, 16.5], [25, 18], [22, 20.5], [9, 21]]);
  },
};
