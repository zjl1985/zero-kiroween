import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const COATS = ["#5b6f88", "#7a5a7e", "#6e7d55", "#8a5a46"] as const;
const STRAW = "#d8b363";
const BOUNDS = { l: -32, r: 32, t: -82, b: 8 } as const;

function straws(ctx: Ctx, x: number, y: number, dir: number, seed: number): void {
  for (let i = 0; i < 4; i++) {
    const a = dir * (0.3 + i * 0.22) + (hash(seed + i) - 0.5) * 0.3,
      len = 6 + hash(seed + i * 3) * 4;
    paperCut(ctx, [[x, y - 1], [x + Math.cos(a) * len * dir, y + Math.sin(a) * len * 0.7], [x, y + 1.2]], {
      color: i % 2 ? STRAW : "#c49a4c",
      shadow: 0.4,
      thickness: 0.35,
      texture: 0.3,
    });
  }
}
function scarecrow(ctx: Ctx, v: number): void {
  const coat = variant(v, { palette: COATS, shift: 0.35, wear: [0.2, 0.6] });
  shadow(ctx, 0, 2, 20, 5);
  post(ctx, 0, 2, -60, 5, "#6b4d34", v);
  paperCut(ctx, [[-26, -45], [26, -46], [26, -42], [-26, -41]], { color: "#6b4d34", shadow: 1.4, thickness: 0.7, texture: 0.8 });
  straws(ctx, -26, -43, -1, v + 3);
  straws(ctx, 26, -44, 1, v + 7);
  // Patched coat with stitched seams.
  const body: Point[] = [[-22, -47], [-8, -50], [8, -50], [22, -47], [18, -40], [12, -40], [14, -14], [-14, -14], [-12, -40], [-18, -40]];
  paperCut(ctx, body, { color: coat.color, shadow: 2, thickness: 0.9, texture: 0.85, wear: coat.wear, seed: v, stitch: "#e2cfa2", stitchInset: 2.5 });
  foldLine(ctx, 0, -48, 0, -15, 0.35);
  paperCut(ctx, [[3, -34], [10, -35], [10, -27], [3, -26]], { color: mix(coat.color, "#d8b06a", 0.5), shadow: 0.6, thickness: 0.5, stitch: true, stitchInset: 1 });
  straws(ctx, -10, -14, -1, v + 11);
  straws(ctx, 10, -14, 1, v + 13);
  // Sack head, stitched face, straw hat.
  paperCut(ctx, oval(0, -57, 9, 9.5, v + 2, 0.08), { color: "#d9c08a", shadow: 1.6, thickness: 0.8, texture: 0.9, edge: "#f1dfb0" });
  line(ctx, -3.5, -59, -1.8, -59, "#3a2a26", 1.3);
  line(ctx, 1.8, -59, 3.5, -59, "#3a2a26", 1.3);
  stroke(ctx, new Path2D("M -4 -53.5 Q 0 -51 4 -53.5"), "#3a2a26", 0.8, 0.8);
  for (const sx of [-3, -1, 1, 3]) line(ctx, sx, -54.6, sx, -52.4, "#3a2a26", 0.5, 0.8);
  paperCut(ctx, [[-16, -64], [16, -64], [12, -61.5], [-12, -61.5]], { color: "#b8893f", shadow: 1.4, thickness: 0.7, texture: 0.8 });
  paperCut(ctx, [[-8, -64], [-4, -77], [5, -78], [8, -64]], { color: "#c79a48", shadow: 1.2, thickness: 0.8, texture: 0.8, fold: { from: [0, -78], to: [0, -64] } });
  line(ctx, -8, -66, 8, -66, "#8a3c32", 1.4);
}

export const SCARECROW_ART: PropArt = {
  id: "scarecrow",
  bounds: BOUNDS,
  variants: 4,
  flames: [],
  scraps: [...COATS, STRAW],
  look: { scale: [0.95, 1.05], angle: [-0.04, 0.04], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: scarecrow,
    stub: "#6b4d34",
    stubs: [[0, 22]],
    scraps: [...COATS, STRAW, "#d9c08a"],
    spread: [22, 6],
    keep: 0.55,
  }),
};
