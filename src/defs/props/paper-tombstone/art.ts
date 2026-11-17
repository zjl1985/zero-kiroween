import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const STONES = ["#7f7486", "#8b8079", "#746d7c"] as const;
const BOUNDS = { l: -18, r: 18, t: -40, b: 6 } as const;

function tombstone(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: STONES, shift: 0.3, wear: [0.2, 0.7] });
  shadow(ctx, 1, 1, 15, 4);
  const slab = v % 2 ? new Path2D("M -12 0 L -12 -22 Q -12 -36 0 -36 Q 12 -36 12 -22 L 12 0 Z") : path([[-11, 0], [-12, -28], [-6, -34], [6, -34], [12, -28], [11, 0]]);
  paperCut(ctx, slab, { color: look.color, shadow: 2.2, thickness: 1, texture: 0.95, wear: look.wear, seed: v, layers: 1, edge: "#b8a4a6" });
  stroke(ctx, new Path2D("M -7 -4 L -7 -22 Q -7 -30 0 -30 Q 7 -30 7 -22 L 7 -4"), "#a9969e", 0.6, 0.8);
  line(ctx, 0, -27, 0, -15, "#4e4256", 1);
  line(ctx, -4, -23, 4, -23, "#4e4256", 1);
  line(ctx, -5, -10, 5, -10, "#4e4256", 0.5, 0.8);
  // A clump of paper moss at the foot.
  for (let i = 0; i < 4; i++)
    paperCut(ctx, oval(-9 + i * 6, 0, 4, 2.4, v + i, 0.2), { color: i % 2 ? "#5d6a48" : "#4f5a40", shadow: 0.5, thickness: 0.4, texture: 0.5 });
}

export const PAPER_TOMBSTONE_ART: PropArt = {
  id: "paper-tombstone",
  bounds: BOUNDS,
  variants: 4,
  flames: [],
  scraps: [...STONES, "#5d6a48"],
  look: { scale: [0.94, 1.06], angle: [-0.07, 0.07], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: tombstone,
    stub: "#7f7486",
    stubs: [
      [-5, 12],
      [6, 9],
    ],
    scraps: STONES,
    spread: [16, 5],
    keep: 0.5,
  }),
};
