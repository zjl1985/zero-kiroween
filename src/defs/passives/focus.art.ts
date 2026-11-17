/** Card art for focus. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, oval, line, stitch } from "../../render/paper-material.js";

export const FOCUS_ART: PassiveArt = {
  id: "focus",
  icon(ctx, ink) {
    piece(ctx, oval(16, 16, 10, 10, 4), "#2b3440", { shadow: 1, thickness: 0.6 });
    line(ctx, 16, 16, 16, 9, ink, 1.8);
    line(ctx, 16, 16, 21, 19, ink, 1.8);
    stitch(ctx, oval(16, 16, 8, 8, 5), ink, 0.9);
  },
};
