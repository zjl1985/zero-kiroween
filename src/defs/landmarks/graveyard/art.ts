import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { flatCut } from "../../../render/paper-kit.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

function chapel(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 70, 13);
  // Nave: a cream gable with a turned side wall.
  piece(ctx, path([[-58, -54], [-14, -58], [-14, 4], [-58, 1]]), "#b6a58a", {
    shadow: 3,
    edge: "#e0c6a0",
    texture: 0.9,
    thickness: 1.1,
  });
  piece(ctx, path([[-15, -58], [22, -104], [60, -58], [60, 4], [-15, 4]]), "#d8c5a4", {
    shadow: 2.7,
    edge: "#f0d7af",
    texture: 0.9,
    thickness: 1.1,
  });
  const roof = path([[-66, -54], [-26, -106], [24, -108], [-15, -56]]);
  piece(ctx, roof, "#3f3047", { shadow: 3.5, edge: "#a7865c", texture: 0.8, thickness: 1.5 });
  stroke(ctx, new Path2D("M -66 -54 L -15 -56 L 22 -108 L 64 -57"), "#c29a61", 0.9);
  // Belfry with a needle spire.
  piece(ctx, box(-50, -150, 22, 52), "#c4b293", { shadow: 2, edge: "#e5cda6", texture: 0.9 });
  piece(ctx, path([[-54, -148], [-39, -186], [-24, -148]]), "#4a3449", {
    shadow: 2,
    edge: "#b48b59",
    texture: 0.8,
    thickness: 1.2,
  });
  glow(ctx, -39, -128, 16, "#ffc065", 0.3);
  piece(ctx, new Path2D("M -44 -118 L -44 -130 Q -39 -137 -34 -130 L -34 -118 Z"), "#e8ac58", {
    shadow: 0.8,
    edge: "#634431",
    thickness: 1.3,
    texture: 0.4,
  });
  line(ctx, -39, -186, -39, -198, "#78543b", 1.3);
  line(ctx, -43, -194, -35, -194, "#78543b", 1.3);
  // Rose window and arched door glow warm against the cold yard.
  glow(ctx, 22, -72, 26, "#ffc065", 0.32);
  piece(ctx, oval(22, -72, 10, 10, 3, 0.02), "#efb35a", { shadow: 1, edge: "#634431", thickness: 1.6, texture: 0.4 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    line(ctx, 22 - Math.cos(a) * 9, -72 - Math.sin(a) * 9, 22 + Math.cos(a) * 9, -72 + Math.sin(a) * 9, "#805337", 0.9);
  }
  const door = new Path2D("M 11 4 L 11 -28 Q 22 -42 33 -28 L 33 4 Z");
  piece(ctx, door, "#5a3f2e", { shadow: 2, edge: "#b68e56", texture: 0.9, thickness: 1.3 });
  for (const wx of [-48, -30]) {
    glow(ctx, wx + 5, -30, 14, "#ffc065", 0.25);
    piece(ctx, new Path2D(`M ${wx} -20 L ${wx} -36 Q ${wx + 5} -43 ${wx + 10} -36 L ${wx + 10} -20 Z`), "#e2a655", {
      shadow: 0.8,
      edge: "#634431",
      thickness: 1.2,
      texture: 0.4,
    });
  }
  for (let i = 0; i < 12; i++)
    leaf(ctx, -60 + i * 10, 6, 7 + hash(i) * 4, 3, (hash(i * 3) - 0.5) * 1.6, ["#766645", "#916a45", "#8a6846"][i % 3]!, i);
  ctx.restore();
}
function tomb(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 13, 4);
  const cross = seed % 3 === 0;
  const p = cross
    ? path([[-3, 2], [-3, -20], [-10, -20], [-10, -26], [-3, -26], [-3, -34], [3, -34], [3, -26], [10, -26], [10, -20], [3, -20], [3, 2]])
    : new Path2D("M -11 2 L -11 -18 Q -11 -32 0 -33 Q 11 -32 11 -18 L 12 2 Z");
  piece(ctx, p, seed % 2 ? "#817486" : "#8b8079", { shadow: 2.4, edge: "#b39a9a", texture: 0.95, thickness: 1 });
  if (!cross) {
    stroke(ctx, new Path2D("M -7 -2 L -7 -18 Q -7 -27 0 -28 Q 7 -27 7 -18 L 7 -2"), "#b199a1", 0.6);
    line(ctx, -5, -15, 5, -15, "#5e4c60", 0.6);
    line(ctx, -4, -11, 4, -11, "#5e4c60", 0.5);
  }
  for (let i = 0; i < 4; i++) leaf(ctx, -9 + i * 6, 3, 7, 2.6, (i - 1.5) * 0.5, ["#68714f", "#7c6a45"][i % 2]!, i);
  ctx.restore();
}

export const GRAVEYARD_ART: LandmarkArt = {
  id: "graveyard",
  ink: "#b2abc2",
  base(ctx, l) {
    const { x, y, seed } = l;
    // A torn moss sheet for the yard, with a cut fence silhouette round the back, open to the south.
    flatCut(ctx, blob(x, y, 200, 124, seed, 0.09, 36), { color: "#434a3f", edge: "#6a735c", thickness: 1.3, lift: 1.3, rim: 1 });
    flatCut(ctx, blob(x + 8, y + 6, 168, 98, seed + 3, 0.12, 30), { color: "#4a5345", thickness: 0.8, lift: 0.6, rim: 0.8 });
    fenceSilhouette(ctx, x, y, 196, 120, Math.PI / 2 + 0.42, Math.PI * 2.5 - 0.42, 46, 14, "#2c2532", seed);
  },
  ground() {},
  pieces: [
    { kind: "chapel", bounds: { l: -82, r: 72, t: -202, b: 14 }, paint: chapel, popup: true },
    { kind: "tomb", bounds: { l: -16, r: 16, t: -38, b: 8 }, paint: tomb, variants: 6 },
  ],
};
