/** Card art for deep-fold. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, path } from "../../render/paper-material.js";
import { star } from "../../render/combat-fx.js";

export const DEEP_FOLD_ART: PassiveArt = {
  id: "deep-fold",
  icon(ctx, ink) {
    piece(ctx, path([[4, 22], [16, 8], [28, 22], [16, 27]]), "#5a4f7a", { shadow: 1.2, thickness: 0.6 });
    piece(ctx, path([[16, 8], [28, 22], [16, 27]]), "#7a6ca3", { shadow: 0, thickness: 0.5 });
    star(ctx, 15, 19, 3.5, ink);
  },
};
