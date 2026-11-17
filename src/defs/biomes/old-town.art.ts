import type { BiomeArt } from "../../render/art-registry.js";
import { leaf, grassTuft, flower } from "../../render/craft-scene.js";
import { paperCut, stitchAlong, warmGlow } from "../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, stroke } from "../../render/paper-material.js";

const FLAGS = ["#7d7466", "#8a8070", "#736a5e"] as const;

/** Old town: clusters of worn flagstones and a stray leaf or two. */
export const OLD_TOWN_ART: BiomeArt = {
  id: "old-town",
  swatch: ["#5d6450", "#857c6c", "#e3b866"],
  patchChance: 0.55,
  patch(ctx, x, y, r, seed) {
    const n = 4 + Math.floor(hash(seed) * 4);
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i * 3) * Math.PI * 2,
        d = hash(seed + i * 5) * r * 0.55,
        w = 14 + hash(seed + i * 7) * 12,
        h = 8 + hash(seed + i * 11) * 5,
        sx = x + Math.cos(a) * d,
        sy = y + Math.sin(a) * d * 0.5;
      paperCut(ctx, box(sx - w / 2, sy - h / 2, w, h, seed + i), {
        color: FLAGS[i % 3]!,
        shadow: 0.9,
        thickness: 0.8,
        texture: 0.8,
        wear: 0.35,
        seed: seed + i,
        edge: "#b3a68e",
      });
    }
    leaf(ctx, x + r * 0.4, y + 4, 6, 3, hash(seed) * 6, "#b97a3e", seed);
  },
};
