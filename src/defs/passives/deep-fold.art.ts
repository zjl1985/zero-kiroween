/** Card art for deep-fold. */
import type { PassiveArt } from "../../render/art-registry.js";
import { crease, paperEmblem, starPoints } from "../../render/paper-kit.js";

export const DEEP_FOLD_ART: PassiveArt = {
  id: "deep-fold",
  /** An origami square with its top corner folded down, the pale back of the flap showing, and a star tucked below. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: [[9.5, 9.5], [22.5, 9.5], [29, 16], [16, 29], [3, 16]],
        color: "#5a4f7a",
        fold: { from: [16, 9.5], to: [16, 29], depth: 0.16, side: 1 },
      },
      { shape: [[9.5, 9.5], [22.5, 9.5], [16, 16]], color: "#9a8cc4", lift: 0.6 },
      { shape: starPoints(16, 21.6, 4.4, 5, 0.45), color: ink, lift: 0.8 },
    ]);
    crease(ctx, 3.6, 16, 9.8, 16, 0.5);
    crease(ctx, 22.2, 16, 28.4, 16, 0.5);
  },
};
