import type { BiomeArt } from "../../render/art-registry.js";
import { leaf, grassTuft, flower } from "../../render/craft-scene.js";
import { paperCut, stitchAlong, warmGlow } from "../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, stroke } from "../../render/paper-material.js";

/** Pumpkin farmland: strips of furrowed soil with straw bits. */
export const PUMPKIN_FARM_ART: BiomeArt = {
  id: "pumpkin-farm",
  swatch: ["#6a6a44", "#6b4f38", "#e0863f"],
  patchChance: 0.7,
  patch(ctx, x, y, r, seed) {
    const soil = oval(x, y, r, r * 0.38, seed, 0.14);
    paperCut(ctx, soil, { color: "#5f4a36", shadow: 1, thickness: 1, texture: 0.85, edge: "#8c6a4c" });
    ctx.save();
    ctx.clip(soil);
    for (let i = -2; i <= 2; i++) {
      const fy = y + i * r * 0.14,
        f = new Path2D();
      f.moveTo(x - r, fy);
      f.quadraticCurveTo(x, fy + 4 + hash(seed + i) * 3, x + r, fy - 2);
      stroke(ctx, f, "#3e2e25", 1.8, 0.55);
      ctx.save();
      ctx.translate(0, -1.2);
      stroke(ctx, f, "#8a6a4a", 0.7, 0.5);
      ctx.restore();
    }
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const sx = x + (hash(seed + i * 7) - 0.5) * r * 1.6,
        sy = y + (hash(seed + i * 9) - 0.5) * r * 0.5,
        a = hash(seed + i) * 3;
      line(ctx, sx, sy, sx + Math.cos(a) * 6, sy + Math.sin(a) * 2, "#d8b363", 1, 0.85);
    }
    grassTuft(ctx, x + r * 0.9, y + 3, 0.8, seed);
  },
};
