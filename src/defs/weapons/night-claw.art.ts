/** Card art for night-claw. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, path, line } from "../../render/paper-material.js";
import { combatPart } from "../../render/craft-combat.js";

export const NIGHT_CLAW_ART: WeaponArt = {
  id: "night-claw",
  icon(ctx, ink) {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(5 + i * 7.5, 1 + i * 1.7);
      piece(ctx, new Path2D("M 0 25 Q 2 16 8 6 L 13 2 Q 7 12 6 19 L 7 22 L 3 24 L 3 26 Z"), ink,
        { shadow: 1.2, thickness: 0.85, edge: "#fff1c6", texture: 0.46 });
      line(ctx, 2, 24, 8, 10, "#866549", 1.1);
      ctx.restore();
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
