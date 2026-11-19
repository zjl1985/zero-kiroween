/**
 * Night-Shift Admin Cat: a soft cap, a lanyard with a blank paper badge and a
 * "put away for tonight" paper seal in the paw: a cream tag with a violet
 * wax disc pressed with a crescent moon (no stamp word, no logo). The skill
 * previews a ring, then pins seal tags round it.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, moon, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, oval } from "../../../render/costume-outfit.js";
import { stroke } from "../../../render/paper-material.js";
import { DARIO_SKILL } from "./def.js";

const COLORS = { tag: "#8e86c8", ink: "#efe9ff" } as const;
const LOOK: ZoneLook = { circle: "seal", telegraph: DARIO_SKILL.telegraph };

export const DARIO_ART: CostumeArt = {
  id: "dario",
  colors: COLORS,
  makeup: { accessories: ["cap", "lanyard"] },
  outfit: {
    parts: [
      {
        layer: "hand",
        box: [-9, -2, 11, 17],
        at: [0, 0],
        paint(c) {
          stroke(c, new Path2D("M 0 0 L 0 3"), "#d8cdb6", 0.6);
          cut(c, [[-6, 3], [6, 2.6], [6.6, 14.4], [-6.2, 14.8]], "#efe2c4");
          cut(c, oval(0.2, 8.8, 4, 4), "#6c5ea8", 0.4);
          cut(c, moon(0.2, 8.8, 2.2), "#d9d0f2", 0.1, 0.3);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: DARIO_SKILL.radius * 0.45, until: 1, power: 1 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, moon(16.5, 18, 6));
  },
};
