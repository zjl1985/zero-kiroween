import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const BOARDS = ["#c9ad7c", "#b89a6a", "#d6bc8c"] as const;
const BOUNDS = { l: -26, r: 26, t: -60, b: 6 } as const;

function board(ctx: Ctx, y: number, dir: number, v: number): void {
  const look = variant(v, { palette: BOARDS, shift: 0.3, wear: [0.2, 0.6] }),
    tip = dir * 23,
    back = -dir * 10,
    pts: Point[] = [[back, y - 5], [tip - dir * 6, y - 5], [tip, y], [tip - dir * 6, y + 5], [back, y + 5]];
  paperCut(ctx, pts, { color: look.color, shadow: 1.8, thickness: 0.9, texture: 0.85, wear: look.wear, seed: v });
  for (let i = 0; i < 3; i++) {
    const x0 = back + dir * (3 + i * 5);
    line(ctx, x0, y - 1, x0 + dir * 3.4, y - 1, "#4a3328", 1, 0.8);
  }
  line(ctx, back + dir * 3, y + 2, back + dir * 14, y + 2, "#4a3328", 0.6, 0.6);
}
function signpost(ctx: Ctx, v: number): void {
  shadow(ctx, 0, 1, 10, 3);
  post(ctx, 0, 1, -58, 4.5, "#6b4d34", v);
  board(ctx, -48, 1, v * 3 + 1);
  board(ctx, -34, -1, v * 3 + 2);
  paperCut(ctx, oval(0, -58, 3, 2, v), { color: "#8c6a45", shadow: 0.4, thickness: 0.4 });
}

export const SIGNPOST_ART: PropArt = {
  id: "signpost",
  bounds: BOUNDS,
  variants: 3,
  flames: [],
  scraps: [...BOARDS, "#6b4d34"],
  look: { scale: [0.95, 1.05], angle: [-0.05, 0.05], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: signpost,
    stub: "#6b4d34",
    stubs: [[0, 18]],
    scraps: BOARDS,
    spread: [18, 5],
    keep: 0.62,
  }),
};
