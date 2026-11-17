/** Card art for vitality. */
import type { PassiveArt } from "../../render/art-registry.js";
import { line } from "../../render/paper-material.js";
import { heart } from "../../render/upgrade-icons.js";

export const VITALITY_ART: PassiveArt = {
  id: "vitality",
  icon(ctx, ink) {
    heart(ctx, 16, 16, 7, "#e59a8a");
    line(ctx, 24, 6, 24, 12, ink, 1.6);
    line(ctx, 21, 9, 27, 9, ink, 1.6);
  },
};
