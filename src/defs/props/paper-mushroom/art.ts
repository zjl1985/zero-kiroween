import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const CAPS = ["#a85a5a", "#b9875a", "#8a6a9a"] as const;
const BOUNDS = { l: -22, r: 22, t: -32, b: 6 } as const;

function mushroom(ctx: Ctx, x: number, h: number, r: number, cap: string, seed: number): void {
  paperCut(ctx, [[x - r * 0.28, 0], [x - r * 0.22, -h], [x + r * 0.22, -h], [x + r * 0.3, 0]], { color: "#e8dcc0", shadow: 1, thickness: 0.6, texture: 0.6 });
  const top = new Path2D(`M ${x - r} ${-h + 1} Q ${x - r} ${-h - r * 1.1} ${x} ${-h - r * 1.05} Q ${x + r} ${-h - r * 1.1} ${x + r} ${-h + 1} Q ${x} ${-h + 3} ${x - r} ${-h + 1} Z`);
  paperCut(ctx, top, { color: cap, shadow: 1.6, thickness: 0.8, texture: 0.7, edge: mix(cap, "#ffe0c0", 0.4) });
  for (let k = 0; k < 3; k++)
    paperCut(ctx, oval(x + (hash(seed + k) - 0.5) * r * 1.2, -h - r * (0.35 + hash(seed + k * 3) * 0.4), r * 0.16, r * 0.12, seed + k), {
      color: "#f2e6c8",
      shadow: 0,
      thickness: 0.3,
      texture: 0.2,
    });
}
function cluster(ctx: Ctx, v: number): void {
  // A faint cold glow: moonlit spores.
  warmGlow(ctx, 0, -10, 24, 0.18, "#a8d8e8");
  shadow(ctx, 0, 1, 18, 4);
  const cap = variant(v, { palette: CAPS, shift: 0.3 }).color;
  mushroom(ctx, -10, 9, 7, mix(cap, "#2a1d24", 0.15), v + 1);
  mushroom(ctx, 9, 7, 6, mix(cap, "#f2d6a6", 0.15), v + 5);
  mushroom(ctx, 0, 14, 9.5, cap, v + 9);
}

export const PAPER_MUSHROOM_ART: PropArt = {
  id: "paper-mushroom",
  bounds: BOUNDS,
  variants: 3,
  flames: [],
  scraps: [...CAPS, "#e8dcc0"],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: cluster,
    stub: "#e8dcc0",
    stubs: [
      [-8, 6],
      [6, 7],
    ],
    scraps: [...CAPS, "#e8dcc0"],
    spread: [16, 5],
    keep: 0.5,
  }),
};
