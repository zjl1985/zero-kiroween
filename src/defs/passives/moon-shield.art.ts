/** Card art for moon-shield. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, path } from "../../render/paper-material.js";
import { star } from "../../render/combat-fx.js";

export const MOON_SHIELD_ART: PassiveArt = {
  id: "moon-shield",
  icon(ctx, ink) {
    piece(ctx, path([[16, 4], [27, 9], [25, 20], [16, 28], [7, 20], [5, 9]]), "#64567a", { shadow: 1.2, thickness: 0.6, edge: ink });
    piece(ctx, path([[16, 8], [23, 11], [22, 19], [16, 24], [10, 19], [9, 11]]), "#7d6f9a", { shadow: 0, thickness: 0.4 });
    star(ctx, 16, 15, 4, ink);
  },
};
