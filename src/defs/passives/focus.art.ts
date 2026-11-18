/** Card art for focus. */
import type { PassiveArt } from "../../render/art-registry.js";
import { crease, paperEmblem, starPoints } from "../../render/paper-kit.js";

export const FOCUS_ART: PassiveArt = {
  id: "focus",
  /** A notched paper dial with a cream face and two cut clock hands. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: starPoints(16, 16, 13, 12, 0.9, -Math.PI / 2), color: "#45546a", rim: "#9fb2c4" },
      {
        shape: (p) => {
          p.moveTo(25, 16);
          p.ellipse(16, 16, 9, 9, 0, 0, Math.PI * 2);
          p.closePath();
        },
        color: ink,
        lift: 0.8,
      },
      {
        shape: (p) => {
          p.moveTo(15, 16.6); p.lineTo(15.4, 7.6); p.lineTo(16.6, 7.6); p.lineTo(17, 16.6); p.closePath();
          p.moveTo(15.6, 15.2); p.lineTo(22.4, 19.2); p.lineTo(21.6, 20.6); p.lineTo(15, 16.8); p.closePath();
        },
        color: "#2b3440",
        lift: 0.6,
      },
    ]);
    for (const [x0, y0, x1, y1] of [[16, 8.6, 16, 9.8], [23.4, 16, 22.2, 16], [16, 23.4, 16, 22.2], [8.6, 16, 9.8, 16]] as const)
      crease(ctx, x0, y0, x1, y1, 0.8);
  },
};
