import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const CARDS = ["#a8825a", "#9a7650", "#b48e62"] as const;
const BOUNDS = { l: -24, r: 24, t: -38, b: 8 } as const;

function crate(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: CARDS, shift: 0.3, wear: [0.2, 0.55] });
  shadow(ctx, 2, 2, 22, 5);
  const front: Point[] = [[-18, 0], [-18, -24], [10, -24], [10, 0]],
    side: Point[] = [[10, 0], [10, -24], [19, -30], [19, -6]],
    top: Point[] = [[-18, -24], [-9, -30], [19, -30], [10, -24]];
  paperCut(ctx, side, { color: mix(look.color, "#2a1d24", 0.3), shadow: 1.6, thickness: 0.8, texture: 0.8 });
  paperCut(ctx, front, { color: look.color, shadow: 2, thickness: 0.9, texture: 0.85, wear: look.wear, seed: v });
  paperCut(ctx, top, { color: mix(look.color, "#f2d6a6", 0.25), shadow: 0.4, thickness: 0.7, texture: 0.75 });
  // Flaps folded shut with a strip of tape.
  foldLine(ctx, -4, -24, 5, -30, 0.5);
  paperCut(ctx, [[-6, -24.5], [-2, -24.5], [7, -30.5], [3, -30.5]], { color: "#d9c597", shadow: 0, thickness: 0.3, texture: 0.4 });
  paperCut(ctx, [[-6, -24], [-2, -24], [-2, -14], [-6, -14]], { color: "#d9c597", shadow: 0.3, thickness: 0.3, texture: 0.4 });
  // A stamped fish mark: there may be a treat inside.
  stroke(ctx, new Path2D("M -14 -8 Q -9 -13 -4 -8 Q -9 -3 -14 -8 Z M -4 -8 L -1 -11 L -1 -5 Z"), "#5a3a2a", 0.9, 0.7);
}

export const PAPER_CRATE_ART: PropArt = {
  id: "paper-crate",
  bounds: BOUNDS,
  variants: 3,
  flames: [],
  scraps: [...CARDS, "#d9c597"],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: crate,
    stub: "#9a7650",
    stubs: [
      [-10, 8],
      [4, 11],
    ],
    scraps: [...CARDS, "#d9c597"],
    spread: [22, 7],
  }),
};
