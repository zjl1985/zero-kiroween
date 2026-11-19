/**
 * Ten-Day Prototype Cat: a pencil tucked behind the ear and a ten-cell mini
 * calendar in the paw (seven days ticked). The skill stands a little folded
 * paper easel turret on the page.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { EICH_SKILL } from "./def.js";

const COLORS = { tag: "#e3c25a", ink: "#fff4c6" } as const;
const LOOK: ZoneLook = {};

export const EICH_ART: CostumeArt = {
  id: "eich",
  colors: COLORS,
  makeup: { accessories: ["pencil-ear"] },
  outfit: {
    parts: [
      {
        // A cream card calendar: red binding strip, two rows of five days, seven ticked.
        layer: "hand",
        box: [-11, -10, 12, 12],
        at: [1, 1],
        paint(c) {
          cut(c, [[-9, -6], [9, -6.6], [9.4, 8], [-8.6, 8.4]], "#ece2cb");
          cut(c, [[-9, -8], [9, -8.6], [9, -5.4], [-9, -4.8]], "#b8483e", 0.3);
          for (let i = 0; i <= 5; i++) outfitLine(c, -8.6 + i * 3.6, -4.6, -8.4 + i * 3.6, 7.8, "#9a8f78", 0.35, 0.8);
          outfitLine(c, -8.8, 1.6, 9.2, 1.2, "#9a8f78", 0.35, 0.8);
          for (let d = 0; d < 7; d++) {
            const x = -6.8 + (d % 5) * 3.6, y = d < 5 ? -1.6 : 4.6;
            outfitLine(c, x - 1, y, x, y + 1, "#3a3542", 0.6, 0.9);
            outfitLine(c, x, y + 1, x + 1.4, y - 1.2, "#3a3542", 0.6, 0.9);
          }
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "turret", x: 0, y: 16, radius: EICH_SKILL.range * 0.25, until: 1, power: 1, clock: 0 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[10, 12], [23, 12], [23, 24], [10, 24]]);
  },
};
