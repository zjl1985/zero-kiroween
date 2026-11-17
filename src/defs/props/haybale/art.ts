import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
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
