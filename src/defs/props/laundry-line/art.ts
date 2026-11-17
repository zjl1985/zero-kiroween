import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const CLOTHS = ["#d9d0bc", "#8aa0b8", "#c48a7a", "#a8b08a"] as const;
const BOUNDS = { l: -52, r: 52, t: -62, b: 8 } as const;

/** The line's height at x (it sags in the middle). */
const lineY = (x: number) => -52 + (1 - (x / 42) ** 2) * 8;
function laundry(ctx: Ctx, v: number): void {
  shadow(ctx, -42, 1, 6, 2.2);
  shadow(ctx, 42, 1, 6, 2.2);
  for (const px of [-42, 42]) {
    post(ctx, px, 1, -56, 3.6, "#6b4d34", v + px);
    paperCut(ctx, [[px - 6, -56], [px + 6, -56], [px + 6, -53.5], [px - 6, -53.5]], { color: "#6b4d34", shadow: 0.8, thickness: 0.5 });
  }
  const cord = new Path2D("M -42 -52 Q 0 -36 42 -52");
  stroke(ctx, cord, "#2e2228", 1);
  stroke(ctx, cord, "#c8b28a", 0.45);
  // A shirt, a sock and a sheet, each a cut cloth piece with a stitched hem.
  const items: [number, number, (x: number, y: number) => Point[]][] = [
    [-24, 0, (x, y) => [[x - 9, y], [x + 9, y], [x + 13, y + 5], [x + 9, y + 7], [x + 8, y + 22], [x - 8, y + 22], [x - 9, y + 7], [x - 13, y + 5]]],
    [-4, 1, (x, y) => [[x - 3, y], [x + 3, y], [x + 3, y + 12], [x + 7, y + 15], [x + 6, y + 18], [x - 3, y + 16]]],
    [20, 2, (x, y) => [[x - 12, y], [x + 12, y], [x + 13, y + 24], [x + 4, y + 22], [x - 4, y + 25], [x - 12, y + 23]]],
  ];
  for (const [x, i, shape] of items) {
    const y = lineY(x) + 0.5,
      look = variant(v * 5 + i, { palette: CLOTHS, shift: 0.3, wear: [0.1, 0.4] });
    paperCut(ctx, shape(x, y), { color: look.color, shadow: 1.6, thickness: 0.7, texture: 0.9, wear: look.wear, seed: v + i, stitch: true, stitchInset: 2 });
    for (const px of [x - 5, x + 5])
      paperCut(ctx, [[px - 1, y - 2], [px + 1, y - 2], [px + 1, y + 3], [px - 1, y + 3]], { color: "#8c6a45", shadow: 0.3, thickness: 0.3 });
  }
}

export const LAUNDRY_LINE_ART: PropArt = {
  id: "laundry-line",
  bounds: BOUNDS,
  variants: 4,
  flames: [],
  scraps: [...CLOTHS],
  look: { scale: [0.96, 1.04], angle: [-0.01, 0.01], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: laundry,
    stub: "#6b4d34",
    stubs: [
      [-42, 16],
      [42, 12],
    ],
    scraps: CLOTHS,
    spread: [40, 8],
    keep: 0.7,
  }),
};
