import type { PropArt } from "../../../render/art-registry.js";
import { paperCut } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx } from "../../../render/paper-material.js";
import { phasedPaint } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const HAY = ["#d8b363", "#c9a24f", "#e2c272"] as const;
const BOUNDS = { l: -30, r: 30, t: -36, b: 8 } as const;

function bale(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: HAY, shift: 0.4 });
  shadow(ctx, 0, 2, 27, 6);
  const body = path([[-24, 0], [-25, -22], [-18, -30], [14, -30], [16, 0]], true);
  paperCut(ctx, body, { color: look.color, shadow: 2, thickness: 1, texture: 0.9, edge: "#f4dd96", layers: 1 });
  // Straw strands along the roll.
  for (let i = 0; i < 9; i++) {
    const y = -26 + i * 2.8 + hash(v + i) * 1.5;
    line(ctx, -21 + hash(v + i * 3) * 6, y, 10 - hash(v + i * 5) * 6, y + (hash(v + i) - 0.5) * 2, mix(look.color, "#8a6a30", 0.45), 0.6, 0.7);
  }
  // The round end face with its spiral.
  paperCut(ctx, oval(15, -15, 10, 15, v + 4, 0.06), { color: mix(look.color, "#f2d88c", 0.25), shadow: 1.2, thickness: 0.9, texture: 0.85 });
  const spiral = new Path2D();
  for (let k = 0; k < 40; k++) {
    const a = k * 0.42,
      r = 1 + k * 0.2;
    k ? spiral.lineTo(15 + Math.cos(a) * r * 0.66, -15 + Math.sin(a) * r) : spiral.moveTo(15, -15);
  }
  stroke(ctx, spiral, "#9a7838", 0.6, 0.75);
  // Twine bands.
  for (const bx of [-12, 2]) stroke(ctx, new Path2D(`M ${bx} -30 Q ${bx - 2} -15 ${bx} 0`), "#7a4f34", 1.1, 0.85);
}

function unrolledBale(ctx: Ctx, v: number): void {
  const color = HAY[v % HAY.length]!;
  shadow(ctx, 0, 2, 27, 5.5);
  paperCut(ctx, new Path2D("M -27 1 Q -28 -12 -20 -21 L 12 -23 L 22 -13 L 18 0 L -12 4 Z"),
    { color, layers: 1, thickness: 0.9, edge: "#ebd08c", shadow: 1.5, texture: 0.78 });
  paperCut(ctx, oval(15, -10, 10, 10, v + 4, 0.1), { color: "#ad874c", shadow: 0.8, thickness: 0.9, texture: 0.69 });
  paperCut(ctx, oval(16, -10, 5.5, 6, v + 5, 0.12), { color: "#695035", edge: "#e4bd72", shadow: 0.3, thickness: 0.55 });
  paperCut(ctx, new Path2D("M -22 -13 Q -11 -20 2 -16 Q -7 -8 -3 -2 Q 5 1 11 0 L 6 6 Q -8 7 -18 3 L -29 5 Q -20 -1 -22 -13 Z"),
    { color: "#ebcd87", thickness: 0.78, shadow: 0.7, edge: "#fbebbb", texture: 0.68 });
  stroke(ctx, new Path2D("M -13 -21 Q -18 -10 -15 -5 M -16 1 Q -23 3 -28 1"), "#885d40", 1.1, 0.86);
}

export const HAYBALE_ART: PropArt = {
  id: "haybale",
  bounds: BOUNDS,
  variants: 4,
  flames: [
    [-12, -26],
    [4, -30],
    [16, -22],
  ],
  scraps: [...HAY, "#9a7838"],
  look: { scale: [0.94, 1.06], angle: [-0.02, 0.02], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: bale,
    damaged: unrolledBale,
    stub: "#c9a24f",
    stubs: [
      [-12, 10],
      [4, 12],
      [14, 8],
    ],
    scraps: HAY,
    spread: [26, 8],
  }),
};
