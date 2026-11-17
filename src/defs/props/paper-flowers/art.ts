import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const PETALS = ["#d9c2e8", "#f0dcc0", "#e8b0b8", "#c8d4f0"] as const;
const STEMS = ["#6c7a50", "#7c8a5c"] as const;
const BOUNDS = { l: -44, r: 44, t: -50, b: 12 } as const;

function blossom(ctx: Ctx, x: number, y: number, r: number, color: string, seed: number): void {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + seed;
    paperCut(ctx, oval(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.55, r * 0.6, r * 0.42, seed + k, 0.1), {
      color,
      shadow: 0.8,
      thickness: 0.45,
      texture: 0.5,
      edge: mix(color, "#fff6e0", 0.5),
    });
  }
  paperCut(ctx, oval(x, y, r * 0.32, r * 0.3, seed), { color: "#e6b85c", shadow: 0.3, thickness: 0.35, texture: 0.3 });
}
function flowers(ctx: Ctx, v: number): void {
  shadow(ctx, 0, -2, 40, 9);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 13 + (hash(v * 7 + i) - 0.5) * 6,
      y = 4 - (i % 2) * 8,
      h = 22 + hash(v + i * 3) * 20,
      lean = (hash(v + i * 5) - 0.5) * 8,
      stem = STEMS[i % 2]!;
    stroke(ctx, new Path2D(`M ${x} ${y} Q ${x + lean * 0.3} ${y - h * 0.5} ${x + lean} ${y - h}`), mix(stem, "#1c142b", 0.4), 2.2);
    stroke(ctx, new Path2D(`M ${x} ${y} Q ${x + lean * 0.3} ${y - h * 0.5} ${x + lean} ${y - h}`), stem, 1.2);
    paperCut(ctx, [[x, y - h * 0.35], [x - 8, y - h * 0.45], [x - 1, y - h * 0.3]], { color: stem, shadow: 0.6, thickness: 0.4, texture: 0.5 });
    blossom(ctx, x + lean, y - h, 4.5 + hash(v + i) * 2, variant(v * 11 + i, { palette: PETALS, shift: 0.3 }).color, v + i * 2);
  }
}

export const PAPER_FLOWERS_ART: PropArt = {
  id: "paper-flowers",
  bounds: BOUNDS,
  variants: 4,
  flames: [
    [-20, -12],
    [4, -16],
    [24, -10],
  ],
  scraps: [...PETALS, ...STEMS],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: flowers,
    stub: "#6c7a50",
    stubs: [
      [-24, 7],
      [-6, 9],
      [12, 6],
      [26, 8],
    ],
    scraps: [...PETALS, ...STEMS],
    spread: [34, 9],
    keep: 0.45,
  }),
};
