import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft } from "../../../render/craft-scene.js";
import { paperCut } from "../../../render/paper-kit.js";
import { box, line } from "../../../render/paper-material.js";
import { RIVER } from "./def.js";

export const STONE_BRIDGE_ART: LandmarkArt = {
  id: "stone-bridge",
  ink: "#8fb6c6",
  reach: (l) => Math.max(l.radius, (l.span ?? 0) + 30),
  ground(ctx, l) {
    // Water, the stone deck and every road crossing come from the shared water pass.
    const span = l.span ?? RIVER.halfLength;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++)
        grassTuft(ctx, l.x + side * (span - 14 - i * 20), l.y + (i % 2 ? -1 : 1) * (RIVER.halfWidth + 10), 0.9, l.seed + i);
      // Landing stones outside the wet shelf leave both banks freely accessible.
      for (let i = -2; i <= 2; i++) {
        const x = l.x + i * 23, y = l.y + side * (RIVER.halfWidth + 25);
        paperCut(ctx, box(x - 10, y - 4, 20, 9, l.seed + i), {
          color: "#8c8877", shadow: 0.8, thickness: 0.8, texture: 0.7, edge: "#c2b493",
        });
        line(ctx, x - 7, y - 2, x + 6, y - 2, "#cdbda0", 0.6, 0.7);
      }
    }
  },
};
