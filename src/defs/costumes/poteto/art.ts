/**
 * Warm Sweet Potato Cat: thin gold round glasses over a closed-eye smile,
 * warm cheek paint, a dark rolled turtleneck and a split roasted sweet potato
 * (purple-red skin, golden flesh) in the paw. The warmth shows as a ring.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import { oval } from "../../../render/paper-material.js";
import { POTETO_SKILL } from "./def.js";

const COLORS = { tag: "#c9874f", ink: "#f2d58a" } as const;
const LOOK: ZoneLook = { aura: POTETO_SKILL.warmth };
const SKIN = "#8e3a52", FLESH = "#e8b54a";

export const POTETO_ART: CostumeArt = {
  id: "poteto",
  colors: COLORS,
  makeup: {
    patches: [
      { path: "M 17.4 39.6 Q 20.6 37.2 24.6 39.4 Q 21 41.8 17.4 39.6 Z M 45 39.4 Q 49 37.2 52.2 39.6 Q 48.6 41.8 45 39.4 Z", color: "#e48f62", alpha: 0.85 },
    ],
    expression: "smile",
    accessories: ["round-glasses", "turtleneck"],
  },
  outfit: {
    coat: { body: "#24212a", bodyEdge: "#5a5463", bib: "#2d2933", cape: "#3a3442", capeEdge: "#8a7a6a" },
    tee: { body: "#25222b", bodyEdge: "#5b5664" },
    parts: [
      {
        // The two halves of a roasted sweet potato, one turned to show the golden flesh.
        layer: "hand",
        box: [-13, -9, 15, 11],
        at: [1, 1],
        paint(c) {
          cut(c, new Path2D("M -11 2 Q -10 -5 -2 -5 Q 1 -4 1 1 Q 0 6 -6 6 Q -11 6 -11 2 Z"), SKIN);
          cut(c, new Path2D("M 1 -2 Q 6 -7 11 -3 Q 13 2 9 6 Q 4 8 2 4 Z"), SKIN);
          cut(c, new Path2D("M 2.6 -1.4 Q 6.4 -5 10 -2.4 Q 11.4 1.6 8.4 4.6 Q 4.8 6 3.4 3.4 Z"), FLESH, 0.15);
          outfitLine(c, -8, 1, -4, -2, "#5e2236", 0.5, 0.7);
          cut(c, oval(7, 0.6, 1.4, 1.1), "#f4d27a", 0, 0.2);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: 40, until: 1, power: 1 }], 0, { circle: "safe" }, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, oval(16.5, 18, 6.5, 4.2));
  },
};
