import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const REEDS = ["#7c8452", "#8f9460", "#6c7448", "#9a9668"] as const;
const BOUNDS = { l: -34, r: 34, t: -60, b: 10 } as const;

function reeds(ctx: Ctx, v: number): void {
  shadow(ctx, 0, 0, 30, 7);
  // A little paper water at the foot of the reeds.
  paperCut(ctx, oval(0, 2, 28, 6, v, 0.12), { color: "#34506b", shadow: 0.4, thickness: 0.6, texture: 0.5, edge: "#8fb0c4" });
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 6 + (hash(v * 5 + i) - 0.5) * 4,
      h = 30 + hash(v + i * 7) * 24,
      lean = (hash(v + i * 3) - 0.5) * 0.5,
      tip: Point = [x + lean * h, -h],
      c = variant(v * 13 + i, { palette: REEDS, shift: 0.35 }).color;
    paperCut(ctx, [[x - 2, 1], [x - 0.5 + lean * h * 0.5, -h * 0.55], tip, [x + 1.2 + lean * h * 0.45, -h * 0.5], [x + 2, 1]], {
      color: c,
      shadow: 0.9,
      thickness: 0.5,
      texture: 0.6,
      edge: mix(c, "#e8d49a", 0.4),
    });
    if (i % 3 === 1) {
      const hx = x + lean * h * 0.8,
        hy = -h * 0.8;
      paperCut(ctx, oval(hx, hy, 2.4, 6, v + i, 0.08), { color: "#6a4632", shadow: 0.8, thickness: 0.5, texture: 0.7, edge: "#a8784e" });
    }
  }
}

export const PAPER_REEDS_ART: PropArt = {
  id: "paper-reeds",
  bounds: BOUNDS,
  variants: 4,
  flames: [
    [-14, -18],
    [8, -22],
  ],
  scraps: [...REEDS, "#6a4632"],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: reeds,
    stub: "#7c8452",
    stubs: [
      [-14, 8],
      [-2, 10],
      [10, 7],
    ],
    scraps: REEDS,
    spread: [26, 7],
    keep: 0.4,
  }),
};
