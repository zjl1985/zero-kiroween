/** Card art for paper-crane. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, path } from "../../render/paper-material.js";
import { ellipse } from "../../render/pixel-art.js";

export const PAPER_CRANE_ART: WeaponArt = {
  id: "paper-crane",
  icon(ctx, ink) {
    piece(ctx, path([[4, 19], [16, 15], [28, 8], [19, 20], [14, 26]]), "#efe6d2", { shadow: 1.2, thickness: 0.6 });
    piece(ctx, path([[16, 15], [28, 8], [19, 20]]), "#d8cdb5", { shadow: 0, thickness: 0.4 });
    piece(ctx, path([[4, 19], [8, 13], [10, 18]]), ink, { shadow: 0, thickness: 0.4 });
  },
  shotTag: "crane",
  /** A folded paper crane flying nose first. */
  shot(ctx, s, time) {
    const a = Math.atan2(s.vy, s.vx),
      x = s.x,
      y = s.y - 14,
      flap = Math.sin(time * 14 + s.id) * 3,
      c = Math.cos(a),
      n = Math.sin(a),
      p = (fx: number, fy: number): [number, number] => [x + fx * c - fy * n, y + fx * n + fy * c];
    ellipse(ctx, s.x, s.y, 6, 2, "#0b101c55");
    piece(ctx, path([p(9, 0), p(-2, -6 - flap), p(-7, 0), p(-2, 6 + flap)]), "#efe6d2", {
      shadow: 0.8,
      texture: 0.3,
      thickness: 0.5,
    });
    piece(ctx, path([p(9, 0), p(-2, -6 - flap), p(-1, 0)]), "#d8cdb5", {
      shadow: 0,
      texture: 0.2,
      thickness: 0.3,
    });
  },
};
