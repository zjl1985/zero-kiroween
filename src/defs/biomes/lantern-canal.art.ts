import type { BiomeArt } from "../../render/art-registry.js";
import { leaf, grassTuft, flower } from "../../render/craft-scene.js";
import { paperCut, stitchAlong, warmGlow } from "../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, stroke } from "../../render/paper-material.js";

/** Lantern canal: small paper ponds with lily pads and a floating lantern. */
export const LANTERN_CANAL_ART: BiomeArt = {
  id: "lantern-canal",
  swatch: ["#4f5a4c", "#2c4560", "#f0b85a"],
  patchChance: 0.6,
  patch(ctx, x, y, r, seed) {
    const pond = oval(x, y, r * 0.8, r * 0.32, seed, 0.16);
    paperCut(ctx, pond, { color: "#2c4560", shadow: 1.2, thickness: 1.4, texture: 0.7, edge: "#7d9bb0" });
    ctx.save();
    ctx.clip(pond);
    for (let i = 0; i < 5; i++) {
      const rx = x + (hash(seed + i) - 0.5) * r * 1.2,
        ry = y + (hash(seed + i * 3) - 0.5) * r * 0.35,
        ripple = new Path2D();
      ripple.moveTo(rx, ry);
      ripple.quadraticCurveTo(rx + 6, ry - 1.5, rx + 13, ry);
      stroke(ctx, ripple, "#8fb0c4", 0.7, 0.6);
    }
    ctx.restore();
    stitchAlong(ctx, oval(x, y, r * 0.8 - 3, r * 0.32 - 2, seed, 0.16), "#a8c0cc", 0.45);
    for (let i = 0; i < 2; i++) {
      const lx = x + (hash(seed + i * 7) - 0.5) * r * 0.9,
        ly = y + (hash(seed + i * 9) - 0.5) * r * 0.2;
      paperCut(ctx, oval(lx, ly, 6, 3, seed + i, 0.1), { color: "#5d7a4c", shadow: 0.5, thickness: 0.5, texture: 0.5 });
    }
    // A floating paper lantern: a warm spot on the cold water.
    const fx = x + (hash(seed + 21) - 0.5) * r * 0.6;
    warmGlow(ctx, fx, y, 18, 0.35);
    paperCut(ctx, [[fx - 4, y + 1], [fx + 4, y + 1], [fx + 3, y - 5], [fx - 3, y - 5]], { color: "#f0b85a", shadow: 0.6, thickness: 0.5, texture: 0.4, edge: "#fff0c4" });
    stroke(ctx, new Path2D(`M ${fx - 7} ${y + 2.5} Q ${fx} ${y + 4} ${fx + 7} ${y + 2.5}`), "#8fb0c4", 0.6, 0.6);
  },
};
