/** Card art for swift. */
import type { PassiveArt } from "../../render/art-registry.js";
import { addPoints, paperEmblem } from "../../render/paper-kit.js";

/** An oval cut added clockwise to a path. */
function bean(p: Path2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  p.closePath();
}
export const SWIFT_ART: PassiveArt = {
  id: "swift",
  /** A soft paper paw print (pad and four toes) running past three cut speed streamers. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: (p) => {
          addPoints(p, [[1.5, 12], [11, 11.2], [12, 13], [2.5, 13.8]]);
          addPoints(p, [[1, 17.2], [10.5, 16.6], [11.4, 18.4], [2, 19]]);
          addPoints(p, [[3, 22.4], [10.6, 22], [11.2, 23.6], [3.8, 24]]);
        },
        color: "#86a7aa",
        lift: 0.6,
      },
      {
        shape: (p) => {
          p.moveTo(19.5, 15);
          p.bezierCurveTo(23.5, 15, 27.5, 19.4, 26.6, 23);
          p.bezierCurveTo(25.8, 26.2, 22.4, 25.2, 19.5, 25.6);
          p.bezierCurveTo(16.6, 25.2, 13.2, 26.2, 12.4, 23);
          p.bezierCurveTo(11.5, 19.4, 15.5, 15, 19.5, 15);
          p.closePath();
          bean(p, 12.6, 13, 2.2, 2.8, -0.5);
          bean(p, 16.6, 9.4, 2.3, 3, -0.15);
          bean(p, 22.4, 9.4, 2.3, 3, 0.15);
          bean(p, 26.4, 13, 2.2, 2.8, 0.5);
        },
        color: ink,
      },
      {
        shape: (p) => bean(p, 19.5, 21.4, 3.4, 2.4),
        color: "#e3a39a",
        lift: 0.4,
      },
    ]);
  },
};
