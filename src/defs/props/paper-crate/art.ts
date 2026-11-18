import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut } from "../../../render/paper-kit.js";
import { mix, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint } from "../../../render/prop-kit.js";
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

function openCrate(ctx: Ctx, v: number): void {
  const color = CARDS[v % CARDS.length]!;
  shadow(ctx, 2, 3, 22, 5);
  paperCut(ctx, [[-17, -19], [-10, -29], [4, -31], [8, -23], [-6, -15]],
    { color: mix(color, "#dbb588", 0.36), edge: "#ebcd9a", thickness: 1.05, shadow: 1.2, texture: 0.64 });
  paperCut(ctx, [[-17, -18], [-6, -25], [18, -24], [10, -16]], { color: "#4b332e", thickness: 1.25, shadow: 0.55 });
  paperCut(ctx, [[10, -16], [18, -24], [18, -6], [10, 0]],
    { color: mix(color, "#452d2c", 0.36), thickness: 0.86, shadow: 1.3, texture: 0.67 });
  paperCut(ctx, [[-17, -18], [-12, -17], [-9, -19], [-4, -16], [10, -16], [10, 0], [-17, 0]],
    { color, edge: "#dfbd87", layers: 1, thickness: 0.8, shadow: 1.45, texture: 0.72 });
  // Corrugated core at the torn opening and a flap tipped over its front edge.
  stroke(ctx, new Path2D("M -15 -17 L -13 -15 L -11 -17 L -9 -15 L -7 -17 L -5 -15 L -3 -16 L -1 -14 L 1 -16 L 3 -14 L 5 -16 L 7 -14 L 9 -16"), "#ecd09c", 0.85, 0.9);
  paperCut(ctx, [[-7, -16], [8, -16], [5, -9], [-14, -9]], { color: "#c6a275", thickness: 0.6, shadow: 1.1, texture: 0.61 });
  foldLine(ctx, -6, -15, 7, -15, 0.65);
}

export const PAPER_CRATE_ART: PropArt = {
  id: "paper-crate",
  bounds: BOUNDS,
  variants: 3,
  flames: [[-9, -20], [14, -23]],
  scraps: [...CARDS, "#d9c597"],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: crate,
    damaged: openCrate,
    stub: "#9a7650",
    stubs: [
      [-10, 8],
      [4, 11],
    ],
    scraps: [...CARDS, "#d9c597"],
    spread: [22, 7],
  }),
};
