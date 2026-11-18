import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut } from "../../../render/paper-kit.js";
import { line, mix, oval, shadow, type Ctx } from "../../../render/paper-material.js";
import { phasedPaint } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const CARDS = ["#648b88", "#64788c", "#776c88"] as const;
const BOUNDS = { l: -32, r: 34, t: -63, b: 16 } as const;

function vat(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: CARDS, wear: [0.12, 0.4] });
  shadow(ctx, 2, 2, 25, 7);
  paperCut(ctx, oval(-12, 1, 14, 4, v), { color: "#383348", thickness: 0.45, shadow: 0.4 });
  paperCut(ctx, [[-19, -30], [19, -30], [16, -3], [8, 2], [-12, 0]], {
    color: look.color, thickness: 1.2, shadow: 2, texture: 0.9, wear: look.wear, seed: v,
    fold: { from: [7, -29], to: [6, 1], depth: 0.23 },
  });
  paperCut(ctx, [[10, -29], [19, -30], [16, -3], [8, 2]], { color: mix(look.color, "#292d42", 0.3), thickness: 0.6, shadow: 0.4 });
  for (const y of [-25, -7]) {
    paperCut(ctx, [[-19, y], [19, y], [18, y + 3], [-18, y + 3]], { color: "#b5a47e", thickness: 0.6, shadow: 0.8 });
    line(ctx, -14, y + 1, 13, y + 1, "#e0ce9d", 0.6);
  }
  paperCut(ctx, oval(0, -31, 21, 8, v), { color: "#c2b692", thickness: 1.1, shadow: 1 });
  paperCut(ctx, oval(0, -32, 16.5, 5.4, v), { color: "#292b42", thickness: 0.5, shadow: 0, texture: 0.6 });
  line(ctx, -9, -34, 4, -35, "#9a9bb3", 1.4, 0.8);
  // A folded label and dipped brush make this read as an ink source, not a barrel.
  paperCut(ctx, [[-10, -23], [4, -23], [5, -10], [-9, -10]], { color: "#d6c9a6", shadow: 0.8, thickness: 0.6 });
  paperCut(ctx, [[-3, -21], [-7, -15], [-5, -12], [0, -12], [2, -15]], { color: "#39364f", shadow: 0.3, thickness: 0.35 });
  paperCut(ctx, [[7, -33], [11, -32], [22, -54], [18, -55]], { color: "#ba9267", thickness: 0.7, shadow: 1 });
  foldLine(ctx, 9, -34, 19, -52, 0.4);
  paperCut(ctx, [[7, -33], [11, -32], [8, -27], [4, -28]], { color: "#333048", thickness: 0.5, shadow: 0.4 });
}

function spilledVat(ctx: Ctx, v: number): void {
  const color = CARDS[v % CARDS.length]!;
  shadow(ctx, 2, 2, 24, 6);
  paperCut(ctx, new Path2D("M -24 5 Q -27 0 -16 -2 Q -3 -2 4 -6 L 24 -4 Q 30 0 24 7 Q 21 12 4 10 Q -8 14 -24 5 Z"),
    { color: "#343049", shadow: 0.6, thickness: 0.5, texture: 0.63, edge: "#7e7795" });
  paperCut(ctx, [[-17, -24], [-5, -20], [-1, -14], [7, -18], [15, -21], [13, -2], [6, 2], [-12, 1]],
    { color, thickness: 1, shadow: 1.1, texture: 0.7, edge: "#afafb0" });
  paperCut(ctx, [[-17, -24], [-4, -20], [-5, -14], [-20, -18], [-24, -27]],
    { color: mix(color, "#c0ac90", 0.43), thickness: 0.7, shadow: 1.1, texture: 0.57 });
  paperCut(ctx, new Path2D("M -1 -16 L 8 -18 Q 7 -9 13 -5 L 19 3 L 7 7 Q 1 2 -1 -16 Z"),
    { color: "#292840", thickness: 0.55, shadow: 0.7, edge: "#817e9b", texture: 0.58 });
  line(ctx, 8, 3, 17, 5, "#a5a0b9", 0.85, 0.8);
}

export const INK_VAT_ART: PropArt = {
  id: "ink-vat", bounds: BOUNDS, variants: 3, flames: [], scraps: [...CARDS, "#39364f", "#d6c9a6"],
  paint: phasedPaint({
    bounds: BOUNDS, intact: vat, damaged: spilledVat, stub: "#64788c", stubs: [[-12, 8], [10, 5]],
    scraps: [...CARDS, "#39364f", "#d6c9a6"], spread: [25, 9],
  }),
};
