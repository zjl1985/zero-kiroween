import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf } from "../../../render/craft-scene.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

/** A curtain half, gathered toward the side with fold creases. */
function curtain(ctx: Ctx, side: number): void {
  const x0 = side * 4,
    x1 = side * 44,
    pts: Point[] = [[x1, -128], [x0, -128], [x0 + side * 6, -96], [x1 - side * 18, -60], [x1, -22]];
  paperCut(ctx, pts, { color: "#9a3a3c", shadow: 2, thickness: 0.9, texture: 0.85, edge: "#d87a6a" });
  for (let k = 1; k < 4; k++) foldLine(ctx, x0 + side * k * 10, -127, x1 - side * (14 - k * 3), -40 + k * 4, 0.45);
  paperCut(ctx, oval(x1 - side * 16, -62, 4, 3, side + 5), { color: "#e3b866", shadow: 0.6, thickness: 0.4 });
}
/** A hanging paper puppet: a cat or a bat silhouette on two strings. */
function puppet(ctx: Ctx, x: number, y: number, bat: boolean): void {
  line(ctx, x - 4, -128, x - 4, y - 8, "#e8d8b4", 0.4, 0.8);
  line(ctx, x + 4, -128, x + 4, y - 8, "#e8d8b4", 0.4, 0.8);
  const shape: Point[] = bat
    ? [[x - 14, y - 4], [x - 6, y - 8], [x - 3, y - 4], [x, y - 9], [x + 3, y - 4], [x + 6, y - 8], [x + 14, y - 4], [x + 6, y], [x, y + 3], [x - 6, y]]
    : [[x - 7, y + 10], [x - 8, y - 4], [x - 7, y - 11], [x - 4, y - 7], [x + 4, y - 7], [x + 7, y - 11], [x + 8, y - 4], [x + 7, y + 10]];
  paperCut(ctx, shape, { color: "#241b2c", shadow: 1.2, thickness: 0.5, texture: 0.4 });
  if (!bat) {
    line(ctx, x - 3.5, y - 2, x - 1.5, y - 2, "#f2d38e", 1);
    line(ctx, x + 1.5, y - 2, x + 3.5, y - 2, "#f2d38e", 1);
  }
}
/** The puppet theatre: plank stage, card proscenium, curtains, moon backdrop and footlights. */
function theatre(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 80, 13);
  // Stage platform: top boards and a front face.
  paperCut(ctx, [[-76, -20], [76, -20], [80, 4], [-80, 4]], { color: "#6b4d34", shadow: 2.6, thickness: 1.2, texture: 0.9, edge: "#b2884f" });
  for (let i = 0; i < 8; i++) line(ctx, -74 + i * 21, -18, -76 + i * 21.5, 3, "#4f3826", 0.7, 0.8);
  paperCut(ctx, [[-70, -26], [70, -26], [76, -20], [-76, -20]], { color: "#8a6448", shadow: 0.6, thickness: 0.7, texture: 0.8 });
  // Backdrop: night sky with a big paper moon.
  paperCut(ctx, box(-48, -130, 96, 104, v), { color: "#2a3050", shadow: 0.8, thickness: 0.8, texture: 0.7 });
  glow(ctx, 18, -100, 30, "#f6e0a8", 0.35);
  paperCut(ctx, oval(18, -100, 13, 13, v + 2, 0.03), { color: "#f2e1b8", shadow: 1, thickness: 0.8, texture: 0.5, edge: "#fff4d4" });
  paperCut(ctx, [[-48, -40], [-30, -56], [-12, -46], [8, -62], [30, -44], [48, -52], [48, -26], [-48, -26]], { color: "#3d4a3a", shadow: 1, thickness: 0.6, texture: 0.7 });
  puppet(ctx, -16, -70, false);
  puppet(ctx, 22, -76, true);
  curtain(ctx, -1);
  curtain(ctx, 1);
  // Proscenium arch with gold trim and a pediment.
  const frame = new Path2D("M -62 -22 L -62 -130 Q 0 -150 62 -130 L 62 -22 L 50 -22 L 50 -124 Q 0 -138 -50 -124 L -50 -22 Z");
  paperCut(ctx, frame, { color: "#7a3a46", shadow: 2.8, thickness: 1.2, texture: 0.85, edge: "#e2b06a", layers: 1 });
  stitchAlong(ctx, frame, "#e3b866", 0.6);
  paperCut(ctx, [[-66, -136], [0, -166], [66, -136], [0, -146]], { color: "#5a2f3a", shadow: 2.4, thickness: 1, texture: 0.8, edge: "#c29a61" });
  paperCut(ctx, oval(0, -150, 6, 6, v + 4), { color: "#e3b866", shadow: 0.8, thickness: 0.6 });
  // Footlights: little warm cups along the stage edge.
  for (let i = 0; i < 5; i++) {
    const fx = -48 + i * 24;
    warmGlow(ctx, fx, -26, 16, 0.4);
    paperCut(ctx, [[fx - 4, -21], [fx + 4, -21], [fx + 3, -26], [fx - 3, -26]], { color: "#efb35a", shadow: 0.6, thickness: 0.6, texture: 0.4, edge: "#634431" });
  }
  ctx.restore();
}
/** A card bench for the audience. */
function bench(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 22, 3.5);
  for (const lx of [-17, 17]) paperCut(ctx, box(lx - 1.6, -8, 3.2, 9, v + lx), { color: "#4f3826", shadow: 0.8, thickness: 0.5 });
  paperCut(ctx, [[-22, -12], [22, -12], [21, -7], [-21, -7]], { color: "#8a6448", shadow: 1.6, thickness: 0.8, texture: 0.85, edge: "#c49a62", wear: 0.3, seed: v });
  ctx.restore();
}

export const PUPPET_THEATRE_ART: LandmarkArt = {
  id: "puppet-theatre",
  ink: "#c2604e",
  ground(ctx, l) {
    const { x, y, seed } = l;
    const yard = oval(x, y + 8, 168, 96, seed, 0.08);
    piece(ctx, yard, "#6a5a48", { shadow: 1.6, edge: "#9a8466", texture: 0.85, thickness: 1.2 });
    stitch(ctx, oval(x, y + 8, 162, 90, seed, 0.08), "#b8a07a", 0.6);
    // Ticket stubs and confetti trodden into the yard.
    for (let i = 0; i < 26; i++) {
      const cx = x + (hash(seed + i) - 0.5) * 280,
        cy = y + 8 + (hash(seed + i * 3) - 0.5) * 150,
        c = ["#c2604e", "#e3b866", "#8aa0b8", "#efe2c2"][i % 4]!;
      piece(ctx, box(cx, cy, 4 + hash(seed + i * 5) * 3, 2.4, seed + i), c, { shadow: 0.3, texture: 0.3, thickness: 0.3 });
    }
    for (let i = 0; i < 8; i++) leaf(ctx, x + (hash(seed + i * 7) - 0.5) * 300, y + 80 + hash(seed + i) * 20, 7, 3, hash(seed + i * 9) * 6, "#9f5740", i);
  },
  pieces: [
    { kind: "theatre", bounds: { l: -86, r: 86, t: -172, b: 14 }, paint: theatre, popup: true },
    { kind: "bench", bounds: { l: -26, r: 26, t: -16, b: 6 }, paint: bench, variants: 3 },
  ],
};
