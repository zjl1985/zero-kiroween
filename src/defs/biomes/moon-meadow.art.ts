import type { BiomeArt } from "../../render/art-registry.js";
import { leaf, grassTuft, flower } from "../../render/craft-scene.js";
import { paperCut, stitchAlong, warmGlow } from "../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, stroke } from "../../render/paper-material.js";

const CLOVER = ["#7c8a78", "#8a9488", "#6f7c70"] as const;

/** Moon meadow: pale clover patches sprinkled with tiny paper flowers under moonlight. */
export const MOON_MEADOW_ART: BiomeArt = {
  id: "moon-meadow",
  swatch: ["#6a7462", "#a8b0a4", "#cdb8f2"],
  patchChance: 0.7,
  patch(ctx, x, y, r, seed) {
    for (let i = 0; i < 4; i++) {
      const px = x + (hash(seed + i * 3) - 0.5) * r,
        py = y + (hash(seed + i * 5) - 0.5) * r * 0.35,
        rr = r * (0.28 + hash(seed + i) * 0.22);
      paperCut(ctx, oval(px, py, rr, rr * 0.45, seed + i, 0.25), {
        color: mix(CLOVER[i % 3]!, "#cdb8f2", 0.08),
        shadow: 0.6,
        thickness: 0.7,
        texture: 0.7,
        edge: "#b4c0ac",
      });
    }
    for (let i = 0; i < 4; i++)
      flower(ctx, x + (hash(seed + i * 11) - 0.5) * r * 1.1, y + (hash(seed + i * 13) - 0.5) * r * 0.3, 0.55, seed + i);
    glow(ctx, x, y, r * 0.8, "#cdb8f2", 0.07, 0.6);
  },
};
