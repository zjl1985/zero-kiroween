/** Card art for night-claw. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, path, line } from "../../render/paper-material.js";
import { combatPart } from "../../render/craft-combat.js";

export const NIGHT_CLAW_ART: WeaponArt = {
  id: "night-claw",
  icon(ctx, ink) {
    // Three cut paper slashes with a thin bright edge.
    for (let i = 0; i < 3; i++) {
      const x = 9 + i * 6;
      piece(ctx, path([[x, 26], [x + 7, 6], [x + 9, 7], [x + 3, 26]]), ink, { shadow: 1, thickness: 0.6 });
      line(ctx, x + 2, 23, x + 7.5, 9, "#fff1c6", 0.8);
    }
  },
  effects: {
    // Three cut-paper slashes sweeping across the arc toward the target.
    claw(ctx, e, { fade, ease }) {
      const reach = e.radius ?? 58,
        a = e.angle ?? 0;
      ctx.globalAlpha = fade;
      ctx.save();
      ctx.translate(e.x, e.y - 10);
      ctx.scale(reach / 58, reach / 58 * 0.6);
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.rotate(a + i * 0.32 + (ease - 0.5) * 0.7);
        ctx.scale(0.75 + ease * 0.25, 1);
        const color = i === 0 ? "#f3dca2" : "#d9b878";
        combatPart(`claw-cut:${color}`, 76, 34, (c) => {
          // A bent sliver with an open centre; targets remain visible between the three cuts.
          piece(c, new Path2D("M -18 7 Q 1 -8 20 -2 L 31 -6 Q 13 5 -18 7 Z"), color, { shadow: 0.6, edge: "#fff0c5", texture: 0.3, thickness: 0.6 });
          line(c, -8, 3, 13, -1, "#fff4d4", 0.65, 0.8);
          c.globalAlpha = 0.35;
          line(c, -17, 11, 8, 8, "#b7a6c3", 0.8);
        }).draw(ctx, { x: 27, y: i * 5 });
        ctx.restore();
      }
      ctx.restore();
    },
  },
};
