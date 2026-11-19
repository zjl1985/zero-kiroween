/**
 * One More Cat: a dark rolled turtleneck, a wink, and a plain paper curtain
 * carried on the back with one extra paper star peeking out. No product, no
 * logo. The delayed strike shows a star landing mark that closes.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { starPoints } from "../../../render/paper-kit.js";
import { JOBS_SKILL } from "./def.js";

const COLORS = { tag: "#d9cfb8", ink: "#ffe7a2" } as const;
const LOOK: ZoneLook = { burst: "star", telegraph: JOBS_SKILL.telegraph };

export const JOBS_ART: CostumeArt = {
  id: "jobs",
  colors: COLORS,
  makeup: { expression: "wink", accessories: ["turtleneck"] },
  outfit: {
    coat: { body: "#1f1d22", bodyEdge: "#57525c", bib: "#26232a", cape: "#2a272e", capeEdge: "#6a6470" },
    tee: { body: "#222026", bodyEdge: "#57525c" },
    parts: [
      {
        // A plain grey-cream curtain on a rod; a gold paper star hides behind its edge.
        layer: "back",
        box: [-13, -19, 15, 19],
        at: [-28, -17, -0.06],
        paint(c) {
          cut(c, starPoints(8, -2, 6, 5, 0.45), "#e8c25a", 0.6);
          cut(c, [[-10, -14], [6, -14], [4, 15], [-10, 15]], "#cfc6b4", 0.6);
          for (const x of [-6, -2, 2]) outfitLine(c, x, -12, x - 0.4, 14, "#8f8778", 0.5, 0.75);
          cut(c, [[-12, -17], [12, -17], [12, -15], [-12, -15]], "#5b4334", 0.35);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "burst", x: 0, y: 0, radius: JOBS_SKILL.radius * 0.5, until: 2, power: 1, armed: JOBS_SKILL.telegraph * 0.6 }], 0, LOOK, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, starPoints(16.5, 18, 7, 5, 0.45));
  },
};
