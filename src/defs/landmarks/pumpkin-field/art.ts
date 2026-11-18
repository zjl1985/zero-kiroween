import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { flatCut } from "../../../render/paper-kit.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

export const PUMPKIN_FIELD_ART: LandmarkArt = {
  id: "pumpkin-field",
  ink: "#e0863f",
  base(ctx, l) {
    // Separate tilled furrow strips with ragged ends, not one oval of soil.
    furrowStrips(ctx, l.x, l.y + 6, 178, 102, 7, ["#5a4434", "#654c39", "#523d2f"], l.seed);
  },
  ground(ctx, l) {
    const { x, y, seed } = l;
    // Curling vines link the pumpkins.
    for (let i = 0; i < 9; i++) {
      const vx = x + (hash(seed + i) - 0.5) * 280,
        vy = y + (hash(seed + i * 5) - 0.5) * 150,
        v = new Path2D();
      v.moveTo(vx, vy);
      v.bezierCurveTo(vx + 14, vy - 10, vx + 24, vy + 8, vx + 36, vy - 2);
      stroke(ctx, v, "#6f7a46", 1.3, 0.85);
      leaf(ctx, vx + 18, vy, 10, 4.5, 1.2, "#7a8a4c", i);
    }
  },
};
