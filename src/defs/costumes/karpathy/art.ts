/**
 * Vibe Beat Cat: small headphones over closed, listening eyes, a slate tee
 * or cape and a little music-note card in the paw. The skill lays a dashed
 * beat line through the safe gap.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, oval } from "../../../render/costume-outfit.js";
import { KARPATHY_SKILL } from "./def.js";

const COLORS = { tag: "#7a8fd0", ink: "#e8ecff" } as const;
const LOOK: ZoneLook = { lane: "beat" };

export const KARPATHY_ART: CostumeArt = {
  id: "karpathy",
  colors: COLORS,
  makeup: { expression: "closed", accessories: ["headphones"] },
  outfit: {
    coat: { cape: "#3b475c", capeEdge: "#8d9ab0", lining: "#56637a" },
    tee: { body: "#5d6c84", bodyEdge: "#a4b1c4" },
    parts: [
      {
        // A cream card with a cut-out paper note.
        layer: "hand",
        box: [-8, -13, 10, 7],
        at: [1, 0],
        paint(c) {
          cut(c, [[-6, -10], [6, -11], [7, 4], [-5.5, 4.5]], "#ece2cb");
          cut(c, [[1.2, -8], [2.6, -8], [2.6, 0.4], [1.2, 0.4]], "#2a2840", 0.15, 0.3);
          cut(c, [[2.6, -8], [5.4, -6.4], [5, -4.8], [2.6, -6]], "#2a2840", 0.15, 0.3);
          cut(c, oval(-0.2, 0.6, 2.2, 1.6), "#2a2840", 0.2, 0.3);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "lane", x: -70, y: 8, x2: 70, y2: -8, radius: KARPATHY_SKILL.near, until: 1, power: 1 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[16, 10], [18, 10], [18, 20.5], [14.5, 23], [12, 21.5], [14.5, 19], [16, 19.4]]);
  },
};
