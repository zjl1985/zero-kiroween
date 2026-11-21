import type { LandmarkArt } from "../../../render/art-registry.js";
import { blob, boards, fenceSilhouette, fringedMound, furrowStrips, pavedTiles, polygon, stoneRing, tornBank } from "../ground-kit.art.js";
import { paperLantern } from "../../../render/paper-lantern-kit.js";
import { flatCut } from "../../../render/paper-kit.js";
import { grassTuft, leaf, pumpkin } from "../../../render/craft-scene.js";
import { box, glow, grain, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

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
  paperLantern(ctx, 6, -42, 0.7, "#e9b561");
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
    paperLantern(ctx, lx, ly + 4, 0.53, c, "intact", i);
  }
  ctx.restore();
}


export const LANTERN_MARKET_ART: LandmarkArt = {
  id: "lantern-market",
  ink: "#f0b85a",
  base(ctx, l) {
    // A board deck for the stalls: separate planks with ragged ends, on the shared hard shadow.
    const { x, y } = l;
    flatCut(ctx, [[x - 182, y - 84], [x + 180, y - 88], [x + 186, y + 74], [x - 186, y + 78]], { color: "#3f3128", thickness: 1.4, lift: 1.5, rim: 0.8 });
    boards(ctx, x - 176, y - 80, x + 176, y + 70, 9, ["#7a5c45", "#6f533f", "#83654b"], l.seed);
  },
  ground(ctx, l) {
    const { x, y } = l;
    // Two woven market cloths spread in front of the stalls.
    for (const [dx, dy, c] of [
      [-70, 40, "#7c3f43"],
      [64, 34, "#3f5466"],
    ] as const) {
      const rug = box(x + dx - 30, y + dy - 13, 60, 26, dx);
      flatCut(ctx, rug, { color: c, edge: mix(c, "#f2d6a6", 0.4), texture: 0.7, thickness: 0.8, lift: 0.6, stitch: "#e2c79a", stitchInset: 4 });
      for (let i = 1; i < 4; i++) line(ctx, x + dx - 26, y + dy - 12 + i * 6, x + dx + 26, y + dy - 12 + i * 6, mix(c, "#f2d6a6", 0.3), 0.8, 0.6);
    }
  },
  pieces: [
    { kind: "stall", bounds: { l: -50, r: 50, t: -96, b: 10 }, paint: stall, variants: 2, popup: true },
    { kind: "lights", bounds: { l: -168, r: 168, t: -56, b: 24 }, paint: stringLights },
  ],
};
