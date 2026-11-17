/** Card art for long-shadow. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, path, oval } from "../../render/paper-material.js";

export const LONG_SHADOW_ART: PassiveArt = {
  id: "long-shadow",
  icon(ctx, ink) {
    piece(ctx, oval(12, 18, 6, 7, 3), "#6e8a98", { shadow: 0, thickness: 0.5 });
    piece(ctx, oval(20, 17, 6, 7, 4), ink, { shadow: 1.2, thickness: 0.6 });
    piece(ctx, path([[15, 11], [16, 6], [19, 10]]), ink, { shadow: 0, thickness: 0.5 });
    piece(ctx, path([[21, 10], [24, 6], [25, 11]]), ink, { shadow: 0, thickness: 0.5 });
  },
};
