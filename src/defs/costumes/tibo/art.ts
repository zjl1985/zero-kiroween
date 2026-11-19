/**
 * Basement Reset Cat: charcoal clothing, short spiky forehead tufts, thick
 * brows as short dark blocks and a plain black neck collar; a paper tag with
 * a loop arrow in the paw. The skill shows as loop arrows chasing a ring.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut } from "../../../render/costume-outfit.js";
import { stroke } from "../../../render/paper-material.js";
import { TIBO_SKILL } from "./def.js";

const COLORS = { tag: "#7e8ea6", ink: "#dfe7f2" } as const;
const LOOK: ZoneLook = { circle: "loop" };

export const TIBO_ART: CostumeArt = {
  id: "tibo",
  colors: COLORS,
  makeup: { accessories: ["spiky-tufts", "thick-brows", "leather-collar"] },
  outfit: {
    coat: { body: "#29262d", bodyEdge: "#5f5866", cape: "#322e37", capeEdge: "#7a7180", bib: "#38343d", lining: "#4b4552" },
    tee: { body: "#2b2830", bodyEdge: "#665f6c" },
    parts: [
      {
        // A cream paper tag on a short string, cut with a loop arrow.
        layer: "hand",
        box: [-8, -2, 10, 17],
        at: [0, 0],
        paint(c) {
          stroke(c, new Path2D("M 0 0 L 0 3.5"), "#d8cdb6", 0.6);
          cut(c, [[-5, 3.5], [5, 3.2], [6, 13.5], [-5.5, 13.8]], "#e9dfc8");
          stroke(c, new Path2D("M 3 8.6 A 3 3 0 1 1 0.4 5.6"), "#3a3542", 1);
          cut(c, [[0, 4], [2.4, 5.6], [0, 7.2]], "#3a3542", 0.2, 0.3);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: TIBO_SKILL.pushTo * 0.35, until: 1, power: 0 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[10, 15], [17, 15], [17, 11], [24, 17.5], [17, 24], [17, 20], [10, 20]]);
  },
};
