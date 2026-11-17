/** Card art for scholar. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, path, line } from "../../render/paper-material.js";
import { crescent } from "../../render/craft-combat.js";

export const SCHOLAR_ART: PassiveArt = {
  id: "scholar",
  icon(ctx, ink) {
    piece(ctx, path([[5, 9], [16, 12], [27, 9], [27, 24], [16, 27], [5, 24]]), "#e9dfc8", { shadow: 1, thickness: 0.6 });
    line(ctx, 16, 12, 16, 27, "#9c8f77", 1);
    piece(ctx, crescent(22, 17, 3.5, -0.4), "#ecc879", { shadow: 0, thickness: 0.4 });
  },
};
