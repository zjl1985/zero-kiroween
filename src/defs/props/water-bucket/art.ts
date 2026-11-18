import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut } from "../../../render/paper-kit.js";
import { line, mix, oval, shadow, type Ctx } from "../../../render/paper-material.js";
import { phasedPaint } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const CARDS = ["#5f8fa3", "#6b8a9e", "#7a9488"] as const;
const WATER = "#a9cfdc";
const BOUNDS = { l: -28, r: 30, t: -52, b: 14 } as const;

/** A tapered card pail with two hoop bands, a wire handle and a full water surface. */
function bucket(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: CARDS, wear: [0.1, 0.35] });
  shadow(ctx, 2, 2, 20, 6);
  paperCut(ctx, [[-15, -26], [15, -26], [12, -1], [6, 2], [-10, 1]], {
    color: look.color, thickness: 1.2, shadow: 1.8, texture: 0.85, wear: look.wear, seed: v,
    fold: { from: [5, -25], to: [5, 1], depth: 0.22 },
  });
  // The face away from the moon sits in shade.
  paperCut(ctx, [[8, -25.5], [15, -26], [12, -1], [6, 2]], { color: mix(look.color, "#26304a", 0.32), thickness: 0.5, shadow: 0.3 });
  for (const y of [-21, -6]) {
    paperCut(ctx, [[-15, y], [15, y], [14.4, y + 2.6], [-14.4, y + 2.6]], { color: "#c9b48a", thickness: 0.5, shadow: 0.7 });
    line(ctx, -11, y + 1, 10, y + 1, "#ead9ad", 0.55);
  }
  paperCut(ctx, oval(0, -27, 16.5, 5.6, v), { color: "#d5c7a2", thickness: 0.9, shadow: 0.9 });
  paperCut(ctx, oval(0, -27.6, 13, 3.9, v + 1), { color: WATER, thickness: 0.4, shadow: 0, texture: 0.35, edge: "#e6f4f6" });
  line(ctx, -7, -28.4, 2, -29, "#eef8fa", 1.1, 0.85);
  // Wire handle: a thin folded strip arching over the rim.
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3b3a4c";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -25);
  ctx.quadraticCurveTo(0, -50, 14, -25);
  ctx.stroke();
  ctx.strokeStyle = "#8d8aa0";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-13, -26);
  ctx.quadraticCurveTo(0, -49, 13, -26);
  ctx.stroke();
  ctx.restore();
}

/** Tipped over: the pail on its side and a flat cut-paper spill of water. */
function spilled(ctx: Ctx, v: number): void {
  const color = CARDS[v % CARDS.length]!;
  shadow(ctx, 2, 2, 22, 6);
  paperCut(ctx, new Path2D("M -26 6 Q -28 0 -14 -1 Q 0 -3 8 -1 Q 26 0 25 6 Q 22 11 2 10 Q -14 13 -26 6 Z"),
    { color: WATER, shadow: 0.5, thickness: 0.4, texture: 0.4, edge: "#e6f4f6" });
  line(ctx, -15, 4, -3, 3, "#eef8fa", 0.9, 0.8);
  paperCut(ctx, [[-4, -20], [17, -15], [16, -2], [-6, -4]], {
    color, thickness: 1, shadow: 1.1, texture: 0.75, edge: "#c7d5d8",
  });
  paperCut(ctx, oval(-6, -12, 4, 8.5, v), { color: "#d5c7a2", thickness: 0.6, shadow: 0.5 });
  paperCut(ctx, oval(-6, -12, 2.6, 6.4, v + 2), { color: "#43566a", thickness: 0.3, shadow: 0 });
  foldLine(ctx, 4, -18, 4, -3, 0.35);
}

export const WATER_BUCKET_ART: PropArt = {
  id: "water-bucket", bounds: BOUNDS, variants: 3, flames: [[-4, -14], [6, -10]], scraps: [...CARDS, "#d5c7a2", WATER],
  paint: phasedPaint({
    bounds: BOUNDS, intact: bucket, damaged: spilled, stub: "#6b8a9e", stubs: [[-10, 7], [9, 5]],
    scraps: [...CARDS, "#d5c7a2", WATER], spread: [22, 8],
  }),
};
