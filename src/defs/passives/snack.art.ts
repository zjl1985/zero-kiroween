/** Card art for snack. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, path, box } from "../../render/paper-material.js";
import { heart } from "../../render/upgrade-icons.js";

export const SNACK_ART: PassiveArt = {
  id: "snack",
  icon(ctx, ink) {
    piece(ctx, box(10, 11, 12, 13, 3), "#efe6d2", { shadow: 1, thickness: 0.6 });
    piece(ctx, path([[10, 11], [13, 6], [19, 6], [22, 11]]), "#d8cdb5", { shadow: 0, thickness: 0.6 });
    heart(ctx, 16, 18, 3, "#e59a8a");
  },
};
