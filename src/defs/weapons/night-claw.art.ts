/** Card art for night-claw. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, path, line } from "../../render/paper-material.js";

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
      for (let i = -1; i <= 1; i++) {
        const sweep = a + i * 0.32 + (ease - 0.5) * 0.7,
          r0 = reach * 0.35,
          r1 = reach * (0.75 + ease * 0.25),
          ox = -Math.sin(sweep) * i * 5,
          oy = Math.cos(sweep) * i * 5 * 0.6;
        piece(
          ctx,
          path([
            [e.x + ox + Math.cos(sweep) * r0, e.y - 10 + oy + Math.sin(sweep) * r0 * 0.6],
            [e.x + ox + Math.cos(sweep + 0.05) * r1, e.y - 10 + oy + Math.sin(sweep + 0.05) * r1 * 0.6 - 2],
            [e.x + ox + Math.cos(sweep - 0.04) * r1, e.y - 10 + oy + Math.sin(sweep - 0.04) * r1 * 0.6 + 2],
          ]),
          i === 0 ? "#f3dca2" : "#d9b878",
          { shadow: 0.6, texture: 0.3, thickness: 0.5 },
        );
      }
    },
  },
};
