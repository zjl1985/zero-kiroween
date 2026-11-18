/** Card art for long-shadow. */
import type { PassiveArt } from "../../render/art-registry.js";
import { addPoints, cutHole, paperEmblem, placePoints } from "../../render/paper-kit.js";
import type { Point } from "../../render/paper-material.js";
import { CAT_HEAD } from "../../render/upgrade-icons.js";

export const LONG_SHADOW_ART: PassiveArt = {
  id: "long-shadow",
  /** The cat's paper head casting a long, stretched shadow cut that trails down-right. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: (p) => addPoints(p, CAT_HEAD.map(([x, y]) => [19.5 + x * 1.45 - y * 0.3, 21.5 + y * 0.6] as Point)),
        color: "#55707f",
        lift: 0.4,
      },
      {
        shape: (p) => {
          addPoints(p, placePoints(CAT_HEAD, 10.5, 15));
          cutHole(p, 8, 14.6, 1.1, 1.7);
          cutHole(p, 13, 14.6, 1.1, 1.7);
        },
        color: ink,
      },
    ]);
  },
};
