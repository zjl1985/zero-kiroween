/** Card art for snack. */
import type { PassiveArt } from "../../render/art-registry.js";
import { paperEmblem } from "../../render/paper-kit.js";
import { heartPath } from "../../render/upgrade-icons.js";

export const SNACK_ART: PassiveArt = {
  id: "snack",
  /** A folded paper treat pail: stitched body, creased lid flaps and a pink heart seal. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: [[7.5, 12], [24.5, 12], [22.4, 28], [9.6, 28]], color: "#efe6d2", stitch: "#b9ab8f", fold: { from: [16, 12], to: [16, 28], depth: 0.12, side: 1 } },
      { shape: [[7, 12.6], [10.4, 5.6], [16, 9.2], [21.6, 5.6], [25, 12.6]], color: "#d8cdb5", lift: 0.7, fold: { from: [16, 9.2], to: [16, 12.6], depth: 0.14, side: 1 } },
      { shape: heartPath(16, 19.6, 3.8), color: "#e59a8a", lift: 0.8 },
    ]);
  },
};
