/**
 * Flying Circus Cat: a round comic bowler hat and a little folded theatre
 * curtain carried on the back. The comic pause shows a scalloped stage ring.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { GUIDO_SKILL } from "./def.js";

const COLORS = { tag: "#c95b4f", ink: "#ffe1c2" } as const;
const LOOK: ZoneLook = { circle: "curtain" };
const VELVET = "#a8433c";

export const GUIDO_ART: CostumeArt = {
  id: "guido",
  colors: COLORS,
  makeup: { accessories: ["bowler"] },
  outfit: {
    parts: [
      {
        // A tiny stage on a backpack frame: arch, two pleated curtain panels and a gold pelmet.
        layer: "back",
        box: [-13, -21, 14, 19],
        at: [-28, -16, -0.08],
        paint(c) {
          cut(c, [[-11, -16], [11, -16], [11, 15], [-11, 15]], "#3a2c33", 0.7);
          cut(c, [[-10, -14], [-1, -14], [-3, 14], [-10, 14]], VELVET, 0.4);
          cut(c, [[1, -14], [10, -14], [10, 14], [3, 14]], VELVET, 0.4);
          for (const x of [-7, -4.5, 5, 7.5]) outfitLine(c, x, -12, x + (x < 0 ? 0.6 : -0.6), 13, "#6f2a2a", 0.5, 0.75);
          cut(c, [[-12, -19], [12, -19], [12, -14], [8, -12], [4, -14], [0, -12], [-4, -14], [-8, -12], [-12, -14]], "#d8b35c", 0.45);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: GUIDO_SKILL.radius * 0.45, until: 1, power: 0.5 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    const hat = new Path2D("M 11 21 Q 10.5 11 16.5 10.5 Q 22.5 11 22 21 Z M 8 22.5 Q 16.5 19.5 25 22.5 Q 16.5 25 8 22.5 Z");
    costumeTicket(ctx, COLORS, hat);
  },
};
