/** Card art for night-eyes. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, oval, glow } from "../../render/paper-material.js";

export const NIGHT_EYES_ART: PassiveArt = {
  id: "night-eyes",
  icon(ctx, ink) {
    for (const x of [10, 22]) {
      piece(ctx, oval(x, 16, 5, 6, x), "#e7c766", { shadow: 1, thickness: 0.6, edge: ink });
      piece(ctx, oval(x, 16, 1.4, 4.6, x + 1), "#1d2230", { shadow: 0, thickness: 0.2 });
    }
    glow(ctx, 16, 16, 15, "#e7c766", 0.3);
  },
};
