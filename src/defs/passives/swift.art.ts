/** Card art for swift. */
import type { PassiveArt } from "../../render/art-registry.js";
import { piece, oval, line } from "../../render/paper-material.js";

export const SWIFT_ART: PassiveArt = {
  id: "swift",
  icon(ctx, ink) {
    piece(ctx, oval(19, 17, 6, 5, 2), ink, { shadow: 1, thickness: 0.6 });
    for (const [x, y] of [[14, 10], [19, 9], [24, 11]] as const)
      piece(ctx, oval(x, y, 2, 2, x), ink, { shadow: 0.5, thickness: 0.4 });
    for (let i = 0; i < 3; i++) line(ctx, 3, 14 + i * 4, 10 - i, 14 + i * 4, "#9fb6b8", 1.4);
  },
};
