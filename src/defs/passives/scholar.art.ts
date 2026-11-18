/** Card art for scholar. */
import type { PassiveArt } from "../../render/art-registry.js";
import { line } from "../../render/paper-material.js";
import { crescent } from "../../render/craft-combat.js";
import { paperEmblem } from "../../render/paper-kit.js";

export const SCHOLAR_ART: PassiveArt = {
  id: "scholar",
  /** An open paper book folded at the spine, a gold crescent cut on its page and an ink ribbon. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: [[3, 8.5], [16, 11.5], [29, 8.5], [29, 24.5], [16, 27.5], [3, 24.5]],
        color: "#e9dfc8",
        fold: { from: [16, 11.5], to: [16, 27.5], depth: 0.16, side: 1 },
      },
      { shape: crescent(22.6, 17.6, 4.6, -0.4), color: "#ecc879", lift: 0.7 },
      { shape: [[15, 26.8], [17.4, 26.8], [17.4, 31.4], [16.2, 29.8], [15, 31.4]], color: ink, lift: 0.8 },
    ]);
    for (let i = 0; i < 3; i++) line(ctx, 6, 14 + i * 3.6, 13, 15.4 + i * 3.6, "#b4a68a", 0.7, 0.8);
  },
};
