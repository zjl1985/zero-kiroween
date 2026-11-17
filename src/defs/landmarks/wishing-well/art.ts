import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft } from "../../../render/craft-scene.js";
import { paperCut } from "../../../render/paper-kit.js";
import { box, glow, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

import { POND } from "./def.js";

/** A folded paper boat floating at (x, y). */
function boat(ctx: Ctx, x: number, y: number, k: number, seed: number): void {
  stroke(ctx, new Path2D(`M ${x - 12 * k} ${y + 2} Q ${x} ${y + 5} ${x + 12 * k} ${y + 2}`), "#8fb0c4", 0.7, 0.6);
  paperCut(ctx, [[x - 11 * k, y - 3 * k], [x + 11 * k, y - 3 * k], [x + 7 * k, y + 2], [x - 7 * k, y + 2]], {
    color: "#efe2c2",
    shadow: 1,
    thickness: 0.6,
    texture: 0.5,
    seed,
  });
  paperCut(ctx, [[x - 6 * k, y - 3 * k], [x, y - 13 * k], [x + 6 * k, y - 3 * k]], { color: "#e2d2ae", shadow: 0.6, thickness: 0.5, texture: 0.5, fold: { from: [x, y - 13 * k], to: [x, y - 3 * k] } });
}
/** The wishing well: a stone ring with depth, two posts, a little gable roof, rope and bucket. */
function well(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 3, 34, 8);
  // The ring: a front band of stones under a dark opening.
  paperCut(ctx, path([[-28, -24], [-28, 0], [-18, 5], [18, 5], [28, 0], [28, -24]]), { color: "#7d7486", shadow: 2.4, thickness: 1, texture: 0.9, edge: "#b3a4a8" });
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 5; k++)
      piece(ctx, box(-27 + k * 11 + (row % 2) * 5, -22 + row * 8, 10, 6.5, row * 7 + k), ["#8b8079", "#746d7c", "#857a86"][(row + k) % 3]!, {
        shadow: 0.6,
        texture: 0.8,
        edge: "#b39a9a",
        thickness: 0.5,
      });
  paperCut(ctx, oval(0, -24, 28, 8, v, 0.04), { color: "#8b8079", shadow: 0.8, thickness: 0.9, texture: 0.8, edge: "#c2b2ae" });
  paperCut(ctx, oval(0, -24, 21, 5, v + 1, 0.04), { color: "#141020", shadow: 0, thickness: 0.6, texture: 0.3 });
  glow(ctx, 0, -24, 16, "#8fb6c6", 0.18, 0.4);
  // Posts and the gable roof.
  for (const px of [-24, 24]) paperCut(ctx, box(px - 2.5, -82, 5, 60, v + px), { color: "#6b4d34", shadow: 1.6, thickness: 0.7, texture: 0.8, edge: "#b2884f" });
  const roof: Point[] = [[-34, -78], [0, -104], [34, -78], [28, -74], [0, -94], [-28, -74]];
  paperCut(ctx, roof, { color: "#5a3f4a", shadow: 2.6, thickness: 1.1, texture: 0.85, edge: "#b48b59" });
  paperCut(ctx, [[-28, -74], [0, -94], [28, -74], [0, -84]], { color: "#3e2a36", shadow: 0.4, thickness: 0.6, texture: 0.6 });
  // Winch, rope and a bucket.
  line(ctx, -22, -66, 22, -66, "#4f3826", 2.6);
  line(ctx, 22, -66, 30, -60, "#4f3826", 1.6);
  line(ctx, 0, -66, 0, -44, "#cdb88a", 0.8);
  paperCut(ctx, [[-6, -44], [6, -44], [5, -34], [-5, -34]], { color: "#8a6448", shadow: 1.2, thickness: 0.7, texture: 0.8, edge: "#c49a62" });
  stroke(ctx, new Path2D("M -6 -44 Q 0 -50 6 -44"), "#4f3826", 0.8);
  ctx.restore();
}

export const WISHING_WELL_ART: LandmarkArt = {
  id: "wishing-well",
  ink: "#8fb6c6",
  ground(ctx, l) {
    const { x, y, seed } = l;
    // A cobbled ring around the well.
    const ring = oval(x, y - 42, 70, 20, seed, 0.06);
    piece(ctx, ring, "#8b8174", { shadow: 1.4, edge: "#b9ab92", texture: 0.85, thickness: 1.2 });
    stitch(ctx, oval(x, y - 42, 64, 17, seed, 0.06), "#cdbb98", 0.6);
    // The shared water pass paints the exact shore/core before this floating detail.
    const py = y + POND.dy;
    for (let i = 0; i < 4; i++)
      paperCut(ctx, oval(x + (hash(seed + i * 7) - 0.5) * POND.rx * 1.4, py + (hash(seed + i * 9) - 0.5) * POND.ry, 8, 3.6, seed + i, 0.12), {
        color: "#5d7a4c",
        shadow: 0.6,
        thickness: 0.5,
        texture: 0.5,
      });
    boat(ctx, x - 50, py + 6, 1, seed + 1);
    boat(ctx, x + 40, py + 18, 0.8, seed + 2);
    boat(ctx, x + 6, py - 20, 0.7, seed + 3);
    for (let i = 0; i < 6; i++) grassTuft(ctx, x + Math.cos(i) * (POND.rx + 6), py + Math.sin(i * 1.7) * POND.ry, 0.9, seed + i);
  },
  pieces: [{ kind: "well", bounds: { l: -36, r: 36, t: -110, b: 10 }, paint: well }],
};
