import type { BiomeArt } from "../../render/art-registry.js";
import { leaf, grassTuft, flower } from "../../render/craft-scene.js";
import { paperCut, stitchAlong, warmGlow } from "../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, stroke } from "../../render/paper-material.js";

const MOSS = ["#323b33", "#3a4438", "#2d3530"] as const;

/** Graveyard woods: dark moss, fallen leaves and a low cold mist. */
export const GRAVEYARD_WOODS_ART: BiomeArt = {
  id: "graveyard-woods",
  swatch: ["#3a4238", "#2d3530", "#9fb4cc"],
  patchChance: 0.75,
  patch(ctx, x, y, r, seed) {
    for (let i = 0; i < 3; i++) {
      const px = x + (hash(seed + i * 3) - 0.5) * r * 0.9,
        py = y + (hash(seed + i * 5) - 0.5) * r * 0.3,
        rr = r * (0.4 + hash(seed + i) * 0.3);
      paperCut(ctx, oval(px, py, rr, rr * 0.42, seed + i, 0.2), {
        color: MOSS[i % 3]!,
        shadow: 0.7,
        thickness: 0.8,
        texture: 0.8,
        edge: "#5f6a55",
      });
    }
    for (let i = 0; i < 6; i++)
      leaf(
        ctx,
        x + (hash(seed + i * 13) - 0.5) * r * 1.4,
        y + (hash(seed + i * 17) - 0.5) * r * 0.4,
        6 + hash(seed + i) * 3,
        3,
        hash(seed + i * 19) * 6,
        ["#6a4a3a", "#5a4048", "#7a5a3a"][i % 3]!,
        seed + i,
      );
    glow(ctx, x, y - 4, r * 0.9, "#9fb4cc", 0.08, 0.6);
  },
};
