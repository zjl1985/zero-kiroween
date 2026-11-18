/** Card art for night-eyes. */
import type { PassiveArt } from "../../render/art-registry.js";
import { paperEmblem } from "../../render/paper-kit.js";

/** An almond eye cut around (x, y), clockwise on screen. */
function almond(p: Path2D, x: number, y: number, w: number, h: number): void {
  p.moveTo(x - w, y);
  p.quadraticCurveTo(x, y - h * 2, x + w, y);
  p.quadraticCurveTo(x, y + h * 2, x - w, y);
  p.closePath();
}
export const NIGHT_EYES_ART: PassiveArt = {
  id: "night-eyes",
  /** A paper night mask with two cut golden cat eyes and slit pupils. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: [[1.5, 12], [8, 8.5], [16, 11], [24, 8.5], [30.5, 12], [29, 20], [22, 23.5], [16, 20.5], [10, 23.5], [3, 20]],
        color: ink,
        lift: 0.8,
      },
      { shape: (p) => { almond(p, 9.6, 15.6, 5.2, 3.6); almond(p, 22.4, 15.6, 5.2, 3.6); }, color: "#e7c766", lift: 0.5 },
      {
        shape: (p) => {
          for (const x of [9.6, 22.4]) {
            p.moveTo(x, 11.6);
            p.quadraticCurveTo(x + 1.6, 15.6, x, 19.6);
            p.quadraticCurveTo(x - 1.6, 15.6, x, 11.6);
            p.closePath();
          }
        },
        color: "#1d2230",
        lift: 0.3,
      },
    ]);
  },
};
