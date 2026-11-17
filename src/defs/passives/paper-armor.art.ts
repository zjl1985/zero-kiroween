/** Card art for paper-armor. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, stitch, box } from "../../render/paper-material.js";

export const PAPER_ARMOR_ART: PassiveArt = {
  id: "paper-armor",
  icon(ctx, ink) {
    for (let i = 2; i >= 0; i--)
      piece(ctx, box(7 + i * 2, 6 + i * 3, 16, 18, i + 1), i ? (i === 1 ? "#cfc3a8" : "#b7ab90") : "#efe6d2", {
        shadow: i ? 0.4 : 1.2,
        thickness: 0.6,
      });
    stitch(ctx, box(9, 8, 12, 14, 2), "#9c8f77", 0.6);
  },
};
