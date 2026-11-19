/**
 * Stone-Placing Cat: one black and one white go-stone pin on the ear, two
 * paper discs in the paw and a small paper go board by the feet. The skill
 * places three stones round a ring with one open liberty.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine, oval } from "../../../render/costume-outfit.js";
import type { CostumeZone } from "../../../game/types.js";
import { HASSABIS_SKILL } from "./def.js";

const COLORS = { tag: "#d6c08e", ink: "#f6f0e0" } as const;
const LOOK: ZoneLook = { circle: "go", telegraph: HASSABIS_SKILL.delay };
const WHITE = "#f2ecdc", BLACK = "#1f1b22";

export const HASSABIS_ART: CostumeArt = {
  id: "hassabis",
  colors: COLORS,
  makeup: { accessories: ["stone-pins"] },
  outfit: {
    parts: [
      {
        // A small board laid on the ground beside the cat, two stones on its grid.
        layer: "under",
        box: [-13, -7, 15, 10],
        at: [26, -2],
        paint(c) {
          cut(c, [[-11, -3], [10, -4.4], [12.4, 5], [-10.4, 6.2]], "#c9a86a", 0.6);
          for (let i = 1; i < 4; i++) {
            outfitLine(c, -10.6 + i * 5.4, -3.6, -10.6 + i * 5.8, 5.8, "#6e5536", 0.35, 0.8);
            outfitLine(c, -10.8 + i * 0.2, -3 + i * 2.3, 10.6 + i * 0.4, -4.2 + i * 2.3, "#6e5536", 0.35, 0.8);
          }
          cut(c, oval(-0.4, -0.6, 1.8, 1.2), BLACK, 0.3);
          cut(c, oval(5, 1.6, 1.8, 1.2), WHITE, 0.3);
        },
      },
      {
        // One black and one white paper disc held together.
        layer: "hand",
        box: [-9, -8, 11, 9],
        at: [1, 1],
        paint(c) {
          cut(c, oval(-2.4, 0.6, 5, 4), BLACK);
          cut(c, oval(3, -1.4, 5, 4), WHITE);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    const r = HASSABIS_SKILL.radius * 0.45,
      stones: CostumeZone[] = [1, 2, 3].map((k) => ({
        kind: "circle", x: Math.cos((k * Math.PI) / 2) * r, y: Math.sin((k * Math.PI) / 2) * r * 0.62,
        radius: HASSABIS_SKILL.stone, until: 1, power: 0,
      }));
    previewZones(ctx, [...stones, { kind: "circle", x: 0, y: 0, radius: r, until: 1, power: HASSABIS_SKILL.slow }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, oval(16.5, 18, 6, 5));
  },
};
