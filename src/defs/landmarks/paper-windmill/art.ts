import type { LandmarkArt } from "../../../render/art-registry.js";
import { grassTuft, leaf } from "../../../render/craft-scene.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { box, glow, hash, line, mix, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";

/** One lattice sail on its arm, pointing along angle `a` from the hub. */
function sail(ctx: Ctx, a: number, seed: number): void {
  ctx.save();
  ctx.rotate(a);
  paperCut(ctx, [[-1.6, 0], [1.6, 0], [1.2, -86], [-1.2, -86]], { color: "#6b4d34", shadow: 1.4, thickness: 0.6, texture: 0.7 });
  const cloth: Point[] = [[3, -20], [20, -24], [22, -84], [3, -84]];
  paperCut(ctx, cloth, { color: "#e3d6b4", shadow: 1.8, thickness: 0.8, texture: 0.85, wear: 0.3, seed, edge: "#fff1cf" });
  for (let k = 0; k < 6; k++) line(ctx, 3, -28 - k * 10, 21, -30 - k * 10, "#9a845e", 0.6, 0.8);
  line(ctx, 12, -22, 12.5, -84, "#9a845e", 0.6, 0.8);
  ctx.restore();
}
/** A paper windmill: tapered tower with a lit side face, a shingled cap and four sails. */
function windmill(ctx: Ctx, x: number, y: number, s: number, v: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 4, 2, 48, 11);
  // Tower front and the turned side face give it volume.
  paperCut(ctx, [[-34, 4], [-22, -128], [16, -130], [26, 4]], { color: "#d8c8a4", shadow: 3, thickness: 1.2, texture: 0.9, edge: "#f2dfb6", wear: 0.25, seed: v });
  paperCut(ctx, [[26, 4], [16, -130], [24, -124], [38, 0]], { color: "#a8946e", shadow: 1, thickness: 0.8, texture: 0.85 });
  for (let r = 0; r < 6; r++) line(ctx, -31 + r * 2, -12 - r * 20, 24 - r * 1.6, -13 - r * 20, "#b8a47e", 0.6, 0.7);
  // Shingled cap.
  const cap = path([[-30, -124], [-4, -170], [26, -126]]);
  piece(ctx, cap, "#5a3f4a", { shadow: 3, edge: "#b48b59", texture: 0.8, thickness: 1.4 });
  ctx.save();
  ctx.clip(cap);
  for (let row = 0; row < 7; row++)
    for (let xx = -34 - (row % 2) * 4; xx < 30; xx += 9)
      piece(ctx, box(xx, -132 - row * 7, 10, 6, row * 9 + xx), ["#664553", "#57404e", "#704c58"][(row + Math.abs(xx)) % 3]!, {
        shadow: 0.8,
        texture: 0.7,
        edge: "#98765e",
        thickness: 0.4,
      });
  ctx.restore();
  // Warm windows and the door.
  for (const [wx, wy] of [[-6, -92], [2, -52]] as const) {
    warmGlow(ctx, wx, wy, 18, 0.35);
    paperCut(ctx, new Path2D(`M ${wx - 5} ${wy + 6} L ${wx - 5} ${wy - 4} Q ${wx} ${wy - 10} ${wx + 5} ${wy - 4} L ${wx + 5} ${wy + 6} Z`), {
      color: "#efb35a",
      shadow: 0.8,
      thickness: 1.4,
      texture: 0.4,
      edge: "#634431",
    });
  }
  paperCut(ctx, new Path2D("M -14 4 L -14 -20 Q -4 -30 6 -20 L 6 4 Z"), { color: "#5f4530", shadow: 2, thickness: 1.2, texture: 0.9, edge: "#b68e56" });
  for (let i = 0; i < 3; i++) line(ctx, -10 + i * 6, -18, -10 + i * 6, 3, "#a07a47", 0.6);
  // Sails at a fixed angle per variant (sprites are cached, not spun).
  ctx.save();
  ctx.translate(-4, -118);
  const turn = 0.35 + (v % 3) * 0.5;
  for (let k = 0; k < 4; k++) sail(ctx, turn + (k * Math.PI) / 2, v + k);
  paperCut(ctx, oval(0, 0, 6, 6, v), { color: "#6b4d34", shadow: 1.6, thickness: 0.8, texture: 0.6, edge: "#c49a62" });
  ctx.restore();
  ctx.restore();
}

export const PAPER_WINDMILL_ART: LandmarkArt = {
  id: "paper-windmill",
  ink: "#e3d6b4",
  ground(ctx, l) {
    const { x, y, seed } = l;
    // A grassy mound with a trodden path to the door.
    for (const [rx, ry, dy, c] of [
      [170, 92, 14, "#56603f"],
      [110, 58, 0, "#64704a"],
    ] as const) {
      const p = oval(x, y + dy, rx, ry, seed + rx, 0.1);
      piece(ctx, p, c, { shadow: 2.4, edge: "#8c9a64", texture: 0.85, thickness: 1.2 });
      stitch(ctx, oval(x, y + dy, rx - 5, ry - 4, seed + rx, 0.1), "#a4ac74", 0.5);
    }
    const walk = new Path2D();
    walk.moveTo(x - 6, y + 4);
    walk.quadraticCurveTo(x + 20, y + 50, x - 10, y + 96);
    stroke(ctx, walk, "#7a6450", 16, 0.85);
    stroke(ctx, walk, "#a08a6c", 11, 0.9);
    for (let i = 0; i < 6; i++) grassTuft(ctx, x + (hash(seed + i) - 0.5) * 260, y + 40 + hash(seed + i * 3) * 40, 0.9, seed + i);
  },
  pieces: [{ kind: "windmill", bounds: { l: -96, r: 96, t: -232, b: 14 }, paint: windmill, variants: 3, popup: true }],
};
