/** Card art for moon-shield. */
import type { PassiveArt } from "../../render/art-registry.js";
import { crescent } from "../../render/craft-combat.js";
import { addPoints, paperEmblem, starPoints } from "../../render/paper-kit.js";

export const MOON_SHIELD_ART: PassiveArt = {
  id: "moon-shield",
  /** A stitched paper shield with a raised inner panel carrying a cut crescent and star. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: [[16, 3], [28, 8], [26, 20], [16, 29], [6, 20], [4, 8]], color: "#64567a", stitch: "#a597c4" },
      { shape: [[16, 8], [23.5, 11], [22.4, 19], [16, 24.6], [9.6, 19], [8.5, 11]], color: "#7d6f9a", lift: 0.6 },
      {
        shape: (p) => {
          p.addPath(crescent(15, 16, 5.2, Math.PI * 0.85));
          addPoints(p, starPoints(19.6, 12.4, 2.4, 4, 0.42, 0));
        },
        color: ink,
        lift: 0.8,
      },
    ]);
  },
};
