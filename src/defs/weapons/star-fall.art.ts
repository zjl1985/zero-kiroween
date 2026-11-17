/** Card art for star-fall. */
import type { WeaponArt } from "../../render/art-registry.js";
import { oval, line, glow, stitch } from "../../render/paper-material.js";
import { ring, star } from "../../render/combat-fx.js";
import { line as pixelLine } from "../../render/pixel-art.js";

export const STAR_FALL_ART: WeaponArt = {
  id: "star-fall",
  icon(ctx, ink) {
    for (let i = 0; i < 3; i++) line(ctx, 25 - i * 2, 3 + i, 15 - i * 2, 15 + i, "#cdb8f2", 1.2 - i * 0.3);
    glow(ctx, 13, 19, 10, "#fff1ce", 0.5);
    star(ctx, 13, 19, 7, ink);
    stitch(ctx, oval(13, 26, 9, 3, 6), "#9f8fc4", 0.6);
  },
  effects: {
    // A paper star drops from above, then lands in a soft ring.
    "star-fall"(ctx, e, { t, fade }) {
      const r = e.radius ?? 34,
        drop = 1 - Math.min(1, t * 2.4),
        land = Math.max(0, t * 2.4 - 1) / 1.4;
      ctx.globalAlpha = fade;
      if (drop > 0) {
        pixelLine(ctx, e.x + 18 * drop, e.y - 90 * drop - 30, e.x + 6 * drop, e.y - 50 * drop - 10, "#cdb8f2");
        star(ctx, e.x + 10 * drop, e.y - 70 * drop - 8, 7, "#fff1ce", t * 6);
      } else {
        glow(ctx, e.x, e.y - 6, r + 14, "#efe0b4", 0.3 * fade, 0.7);
        ring(ctx, e.x, e.y, 6 + land * r, "#e6dafc", 0.6);
        star(ctx, e.x, e.y - 6, 6 * fade + 2, "#fff1ce", t * 3);
      }
    },
  },
};
