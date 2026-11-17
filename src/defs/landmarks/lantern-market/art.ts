import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { plaza } from "../plaza.art.js";

function stall(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 3, 44, 9);
  for (const px of [-36, 36]) {
    piece(ctx, box(px - 2.5, -80, 5, 82), "#6b4d34", { shadow: 1.6, edge: "#b2884f", texture: 0.8, thickness: 0.7 });
  }
  piece(ctx, path([[-40, -30], [40, -30], [42, 2], [-42, 2]]), "#8a6448", {
    shadow: 2.4,
    edge: "#c49a62",
    texture: 0.9,
    thickness: 1,
  });
  for (let i = 0; i < 5; i++) line(ctx, -38 + i * 19, -27, -38 + i * 19, 0, "#6c4c37", 0.6);
  piece(ctx, box(-44, -34, 88, 6), "#b28a5c", { shadow: 1.2, edge: "#e2bd84", texture: 0.85, thickness: 0.7 });
  // Striped awning, each stripe its own paper strip.
  const colors = seed % 2 ? ["#a8574a", "#e2c79a"] : ["#4f6a7a", "#e2c79a"];
  for (let i = 0; i < 8; i++) {
    const x0 = -46 + i * 11.5;
    piece(ctx, path([[x0, -88], [x0 + 11.5, -88], [x0 + 12.5, -70], [x0 + 6, -66], [x0 - 0.5, -70]]), colors[i % 2]!, {
      shadow: 1.3,
      edge: mix(colors[i % 2]!, "#fff0d0", 0.35),
      texture: 0.8,
      thickness: 0.6,
    });
  }
  // Goods: a little pumpkin, a jar lantern, folded paper bats.
  pumpkin(ctx, -22, -34, 0.5, seed * 4 + 1);
  glow(ctx, 6, -42, 16, "#ffc15b", 0.3);
  piece(ctx, box(1, -48, 10, 13), "#e9b561", { shadow: 0.8, edge: "#664a35", texture: 0.4, thickness: 0.9 });
  piece(ctx, path([[18, -40], [24, -45], [27, -40], [30, -45], [36, -40], [27, -37]]), "#2a2034", {
    shadow: 0.6,
    texture: 0.5,
    thickness: 0.4,
  });
  ctx.restore();
}
function stringLights(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const pts: Point[] = [[-154, -8], [-95, 8], [-36, -40], [0, -24], [36, -40], [95, 8], [154, -8]];
  const cord = new Path2D();
  cord.moveTo(...pts[0]!);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!,
      b = pts[i + 1]!;
    cord.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  cord.lineTo(...pts[pts.length - 1]!);
  stroke(ctx, cord, "#3c2c2a", 1.4);
  stroke(ctx, cord, "#ba965f", 0.6);
  for (let i = 0; i < 16; i++) {
    const t = (i + 0.5) / 16,
      seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))),
      k = t * (pts.length - 1) - seg,
      a = pts[seg]!,
      b = pts[seg + 1]!,
      lx = a[0] + (b[0] - a[0]) * k,
      ly = a[1] + (b[1] - a[1]) * k + 4;
    const c = ["#f2b35a", "#e98a4f", "#f5d27a", "#d9725a"][i % 4]!;
    glow(ctx, lx, ly + 4, 14, "#ffc15b", 0.28);
    piece(ctx, oval(lx, ly + 4, 3.6, 4.6, i, 0.06), c, { shadow: 1, edge: "#fff0c4", texture: 0.45, thickness: 0.5 });
  }
  ctx.restore();
}


export const LANTERN_MARKET_ART: LandmarkArt = {
  id: "lantern-market",
  ink: "#f0b85a",
  ground(ctx, l) {
    const { x, y } = l;
    plaza(ctx, x, y - 4, 190, 98, l.seed);
    // Two woven rugs in front of the stalls.
    for (const [dx, dy, c] of [
      [-70, 40, "#7c3f43"],
      [64, 34, "#3f5466"],
    ] as const) {
      const rug = box(x + dx - 26, y + dy - 12, 52, 24, dx);
      piece(ctx, rug, c, { shadow: 1, edge: mix(c, "#f2d6a6", 0.4), texture: 0.8, thickness: 0.6 });
      stitch(ctx, box(x + dx - 22, y + dy - 9, 44, 18, dx + 1), "#e2c79a", 0.8);
    }
  },
  pieces: [
    { kind: "stall", bounds: { l: -50, r: 50, t: -96, b: 10 }, paint: stall, variants: 2, popup: true },
    { kind: "lights", bounds: { l: -168, r: 168, t: -56, b: 24 }, paint: stringLights },
  ],
};
