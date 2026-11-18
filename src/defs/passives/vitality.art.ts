/** Card art for vitality. */
import type { PassiveArt } from "../../render/art-registry.js";
import { stitch } from "../../render/paper-material.js";
import { paperEmblem } from "../../render/paper-kit.js";
import { heartPath } from "../../render/upgrade-icons.js";

export const VITALITY_ART: PassiveArt = {
  id: "vitality",
  /** A folded paper heart, stitched inside, with a small plus tab pinned at its shoulder. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: heartPath(15, 17.5, 10), color: "#e08a7c", rim: "#ffd2c2", fold: { from: [15, 13], to: [15, 27.5], depth: 0.2, side: 1 } },
      {
        shape: [[22.6, 3], [25.4, 3], [25.4, 7.2], [29.6, 7.2], [29.6, 10], [25.4, 10], [25.4, 14.2], [22.6, 14.2], [22.6, 10], [18.4, 10], [18.4, 7.2], [22.6, 7.2]],
        color: ink,
        lift: 1.2,
      },
    ]);
    stitch(ctx, heartPath(15, 17.6, 7.4), "#f6c4b4", 0.7);
  },
};
