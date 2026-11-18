/** Card art for magnet. */
import type { PassiveArt } from "../../render/art-registry.js";
import { crescent } from "../../render/craft-combat.js";
import { addPoints, paperEmblem, starPoints } from "../../render/paper-kit.js";
import { line } from "../../render/paper-material.js";

export const MAGNET_ART: PassiveArt = {
  id: "magnet",
  /** A folded paper crescent pulling three small gold shard cuts in on dashed threads. */
  icon(ctx, ink) {
    ctx.save();
    ctx.setLineDash([1.2, 1.4]);
    for (const [x, y] of [[24, 9], [27.5, 16.5], [23.5, 23.5]] as const) line(ctx, x, y, 17, 16, "#c9a964", 0.6, 0.7);
    ctx.restore();
    paperEmblem(ctx, [
      {
        shape: (p) => {
          addPoints(p, starPoints(24, 9, 3.2, 4, 0.42, 0.3));
          addPoints(p, starPoints(27.5, 16.5, 3, 4, 0.42, 0));
          addPoints(p, starPoints(23.5, 23.5, 2.8, 4, 0.42, -0.3));
        },
        color: "#f3cf82",
        lift: 0.9,
      },
      { shape: crescent(14, 16, 11, Math.PI), color: ink, fold: { from: [2.5, 16], to: [12, 16], depth: 0.2, side: 1 } },
    ]);
  },
};
