/**
 * Cardboard Car Rocket Cat: an unbranded cardboard car shell round the waist,
 * a folded origami rocket on the back and paper driving goggles pushed up.
 * The skill draws wheel tracks down a lane and a rocket landing mark.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine, oval } from "../../../render/costume-outfit.js";
import { MUSK_SKILL } from "./def.js";

const COLORS = { tag: "#c7a46e", ink: "#f0e6d0" } as const;
const LOOK: ZoneLook = { lane: "road", burst: "rocket", telegraph: MUSK_SKILL.drive };
const CARD = "#c7a46e";

export const MUSK_ART: CostumeArt = {
  id: "musk",
  colors: COLORS,
  makeup: { accessories: ["goggles"] },
  outfit: {
    parts: [
      {
        // A folded paper rocket strapped across the back.
        layer: "back",
        box: [-9, -19, 11, 15],
        at: [-21, -21, -0.5],
        paint(c) {
          cut(c, [[0, -16], [5, -7], [5, 9], [-5, 9], [-5, -7]], "#e9e0cc");
          cut(c, [[-5, 3], [-8.5, 10], [-5, 9]], "#b8483e", 0.3);
          cut(c, [[5, 3], [8.5, 10], [5, 9]], "#b8483e", 0.3);
          cut(c, oval(0, -3, 2, 2), "#6f93b8", 0.1, 0.3);
          outfitLine(c, 0, -16, 0, 8, "#9c907a", 0.45, 0.7);
        },
      },
      {
        // The cardboard car body: taped flaps, corrugation and two paper wheels.
        layer: "front",
        box: [-28, -12, 30, 14],
        at: [0, -9],
        paint(c) {
          for (const x of [-15, 15]) {
            cut(c, oval(x, 6, 4.8, 4.8), "#3a3236", 0.6);
            cut(c, oval(x, 6, 1.8, 1.8), "#b9ad98", 0.1, 0.3);
          }
          cut(c, [[-25, -6], [-19, -10], [17, -10], [26, -5], [26, 4], [-25, 4]], CARD, 0.7, 0.7);
          cut(c, [[-19, -10], [-13, -15.5], [-10, -10]], "#b39260", 0.3);
          for (const x of [-18, -12, -6, 0, 6, 12, 18]) outfitLine(c, x, -8, x, 2, "#9a7c4e", 0.4, 0.6);
          cut(c, [[-3, -10], [3, -10], [3, 4], [-3, 4]], "#e6d8b0", 0.1, 0.3);
          cut(c, oval(24, -1.4, 1.4, 1.6), "#f3e7b8", 0.15, 0.3);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [
      { kind: "lane", x: -70, y: 12, x2: 40, y2: -6, radius: MUSK_SKILL.width * 0.7, until: 1, power: 0 },
      { kind: "burst", x: 58, y: -9, radius: MUSK_SKILL.radius * 0.5, until: 1, power: 1, armed: MUSK_SKILL.drive * 0.5 },
    ], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[16.5, 9], [20, 14], [20, 23], [13, 23], [13, 14]]);
  },
};
