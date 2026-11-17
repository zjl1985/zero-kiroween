import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

export const MOON_HILL_ART: LandmarkArt = {
  id: "moon-hill",
  ink: "#cdb8f2",
  ground(ctx, l) {
    const { x, y, seed } = l;
    for (const [rx, ry, dy, c] of [
      [180, 98, 10, "#4f5747"],
      [128, 70, -2, "#5d6553"],
      [76, 42, -10, "#6a7360"],
    ] as const) {
      const p = oval(x, y + dy, rx, ry, seed + rx, 0.1);
      piece(ctx, p, c, { shadow: 3, edge: "#8c9672", texture: 0.85, thickness: 1.4 });
      stitch(ctx, oval(x, y + dy, rx - 5, ry - 4, seed + rx, 0.1), "#a3ab7c", 0.5);
    }
    glow(ctx, x, y - 10, 90, "#bcd8f2", 0.12, 0.55);
  },
};
