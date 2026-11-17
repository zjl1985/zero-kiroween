import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const PAPERS = ["#e9a457", "#d9724f", "#f0c86a", "#c95f55"] as const;
const BOUNDS = { l: -44, r: 44, t: -74, b: 10 } as const;

/** Points of the sagging cord between the two poles. */
function cordAt(t: number): Point {
  return [-34 + 68 * t, -60 + Math.sin(t * Math.PI) * 10];
}
function lanterns(ctx: Ctx, v: number): void {
  shadow(ctx, -34, 1, 7, 2.5);
  shadow(ctx, 34, 1, 7, 2.5);
  shadow(ctx, 0, 4, 34, 5);
  post(ctx, -34, 1, -64, 4, "#5f4532", v + 1);
  post(ctx, 34, 1, -64, 4, "#5f4532", v + 2);
  const cord = new Path2D();
  cord.moveTo(...cordAt(0));
  cord.quadraticCurveTo(0, -42, 34, -60);
  stroke(ctx, cord, "#2e2228", 1.2);
  stroke(ctx, cord, "#b89463", 0.5);
  for (let i = 0; i < 4; i++) {
    const [lx, ly] = cordAt((i + 0.6) / 4.2),
      look = variant(v * 7 + i, { palette: PAPERS, shift: 0.3 }),
      cy = ly + 9;
    warmGlow(ctx, lx, cy, 16, 0.32);
    line(ctx, lx, ly, lx, cy - 7, "#2e2228", 0.7);
    paperCut(ctx, oval(lx, cy, 5.6, 7.4, v + i, 0.05), { color: look.color, shadow: 1.2, thickness: 0.6, texture: 0.5, edge: "#fff0c4" });
    for (const k of [-0.5, 0.5]) stroke(ctx, new Path2D(`M ${lx + k * 6} ${cy - 6} Q ${lx + k * 9} ${cy} ${lx + k * 6} ${cy + 6}`), mix(look.color, "#5a3020", 0.4), 0.5, 0.7);
    paperCut(ctx, [[lx - 3, cy - 8.5], [lx + 3, cy - 8.5], [lx + 2.5, cy - 6.5], [lx - 2.5, cy - 6.5]], { color: "#3a2a2a", shadow: 0, thickness: 0.3, texture: 0.2 });
    paperCut(ctx, [[lx - 2.5, cy + 6.5], [lx + 2.5, cy + 6.5], [lx + 2, cy + 8.5], [lx - 2, cy + 8.5]], { color: "#3a2a2a", shadow: 0, thickness: 0.3, texture: 0.2 });
  }
}

export const PAPER_LANTERNS_ART: PropArt = {
  id: "paper-lanterns",
  bounds: BOUNDS,
  variants: 4,
  flames: [
    [-20, -48],
    [0, -44],
    [20, -48],
  ],
  scraps: [...PAPERS, "#5f4532"],
  look: { scale: [0.95, 1.05], angle: [-0.01, 0.01], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: lanterns,
    stub: "#5f4532",
    stubs: [
      [-34, 18],
      [34, 12],
    ],
    scraps: PAPERS,
    spread: [34, 7],
    keep: 0.62,
  }),
};
