/**
 * Leather-Jacket Compute Cat: a short black leather jacket (coat recoloured,
 * or open jacket panels over the tee) with lapels at the chin, and a small
 * unbranded green paper chip in the paw. Parallel work shows as a ring.
 */
import type { CostumeArt } from "../../../render/art-registry.js";
import { costumeTicket, previewZones, zoneArt, type ZoneLook } from "../../../render/costume-fx.js";
import { outfitCut as cut, outfitLine } from "../../../render/costume-outfit.js";
import type { Point } from "../../../render/paper-material.js";
import { JENSEN_SKILL } from "./def.js";

const COLORS = { tag: "#76b06a", ink: "#e6f2d8" } as const;
const LOOK: ZoneLook = { aura: JENSEN_SKILL.duration };
const LEATHER = "#1f1d23";
const flip = (pts: readonly Point[]): Point[] => pts.map(([x, y]) => [-x, y] as Point);

export const JENSEN_ART: CostumeArt = {
  id: "jensen",
  colors: COLORS,
  makeup: { accessories: ["jacket-collar"] },
  outfit: {
    coat: { body: "#1d1b20", bodyEdge: "#5c5662", cape: "#232027", capeEdge: "#6e6875", bib: "#2a272e", lining: "#3a3640", belt: "#3d3a42" },
    parts: [
      {
        // Open jacket panels over the tee, or lapels and a sheen crease on the recoloured coat.
        layer: "torso",
        tailored: true,
        box: [-14, -34, 15, -5],
        at: [0, 0],
        paint(c, tailoring) {
          if (tailoring === "tee-and-jeans") {
            const panel: Point[] = [[-11.4, -29.4], [-5.8, -30.8], [-3.4, -23], [-2.4, -14.2], [-10.8, -14.4], [-9.2, -21], [-10.4, -23]];
            cut(c, panel, LEATHER);
            cut(c, flip(panel), LEATHER);
            for (const s of [-1, 1]) outfitLine(c, s * 7.5, -27, s * 6.6, -16, "#4a4550", 0.5, 0.8);
          }
          const lapel: Point[] = [[-6.2, -30.4], [-2.6, -25], [-4.6, -21.6], [-8.4, -27]];
          cut(c, lapel, "#2c2930", 0.35);
          cut(c, flip(lapel), "#2c2930", 0.35);
          outfitLine(c, -9, -12, -7.6, -22, "#6d6874", 0.45, 0.6);
        },
      },
      {
        // An unbranded green paper chip with gold pins along each side.
        layer: "hand",
        box: [-10, -10, 11, 11],
        at: [2, 0],
        paint(c) {
          for (let i = -1; i <= 1; i++) {
            cut(c, [[-8, i * 2.6 - 0.6], [-6, i * 2.6 - 0.6], [-6, i * 2.6 + 0.6], [-8, i * 2.6 + 0.6]], "#d8b35c", 0.1, 0.3);
            cut(c, [[6, i * 2.6 - 0.6], [8, i * 2.6 - 0.6], [8, i * 2.6 + 0.6], [6, i * 2.6 + 0.6]], "#d8b35c", 0.1, 0.3);
          }
          cut(c, [[-6, -6], [6, -6], [6, 6], [-6, 6]], "#3f7d52", 0.6);
          cut(c, [[-3, -3], [3, -3], [3, 3], [-3, 3]], "#2a4f36", 0.2, 0.35);
          outfitLine(c, -5, -4.6, 5, -4.6, "#8fc79a", 0.4, 0.7);
        },
      },
    ],
  },
  ...zoneArt(LOOK, COLORS),
  preview(ctx) {
    previewZones(ctx, [{ kind: "circle", x: 0, y: 0, radius: 36, until: 1, power: 1 }], 0, { circle: "safe" }, COLORS);
  },
  ticket(ctx) {
    costumeTicket(ctx, COLORS, [[11, 13], [22, 13], [22, 24], [11, 24]]);
  },
};
