import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

export const PUMPKIN_FIELD_ART: LandmarkArt = {
  id: "pumpkin-field",
  ink: "#e0863f",
  ground(ctx, l) {
    const { x, y, seed } = l;
    const soil = oval(x, y + 6, 175, 104, seed, 0.1);
    piece(ctx, soil, "#5a4434", { shadow: 1.8, edge: "#8c6a4c", texture: 0.9, thickness: 1.2 });
    ctx.save();
    ctx.clip(soil);
    for (let i = -6; i <= 6; i++) {
      const fy = y + 6 + i * 15,
        furrow = new Path2D();
      furrow.moveTo(x - 190, fy);
      furrow.quadraticCurveTo(x, fy + 8 + Math.sin(i) * 4, x + 190, fy - 2);
      stroke(ctx, furrow, "#3e2e25", 2.2, 0.55);
      ctx.save();
      ctx.translate(0, -1.4);
      stroke(ctx, furrow, "#86664a", 0.8, 0.5);
      ctx.restore();
    }
    ctx.restore();
    // Curling vines link the pumpkins.
    for (let i = 0; i < 9; i++) {
      const vx = x + (hash(seed + i) - 0.5) * 280,
        vy = y + (hash(seed + i * 5) - 0.5) * 150,
        v = new Path2D();
      v.moveTo(vx, vy);
      v.bezierCurveTo(vx + 14, vy - 10, vx + 24, vy + 8, vx + 36, vy - 2);
      stroke(ctx, v, "#6f7a46", 1.1, 0.85);
      leaf(ctx, vx + 18, vy, 9, 4, 1.2, "#7a8a4c", i);
    }
    stitch(ctx, oval(x, y + 6, 168, 98, seed, 0.1), "#b08a5c", 0.6);
  },
};
