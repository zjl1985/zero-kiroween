import type { PropArt } from "../../../render/art-registry.js";
import { hash, mix, path, piece, shadow, type Ctx } from "../../../render/paper-material.js";
import { ashPatch, scrapPieces } from "../../../render/paper-scraps.js";

const BLADES = ["#6f774f", "#848a5c", "#5e6846", "#979468"] as const;

/** One cut-paper blade: a tapered strip with a fold line, leaning by `lean`. */
function blade(ctx: Ctx, x: number, y: number, h: number, w: number, lean: number, color: string): void {
  const tip: [number, number] = [x + lean * h, y - h];
  const p = path([
    [x - w, y],
    [x - w * 0.3 + lean * h * 0.5, y - h * 0.55],
    tip,
    [x + w * 0.5 + lean * h * 0.45, y - h * 0.5],
    [x + w, y],
  ]);
  piece(ctx, p, color, { shadow: 0.9, edge: mix(color, "#e8d49a", 0.45), texture: 0.6, thickness: 0.55 });
}
/** Clumps of blades over an oval patch; `height` shortens them when damaged. */
function patch(ctx: Ctx, x: number, y: number, s: number, v: number, height: number, count: number): void {
  shadow(ctx, x, y - 4 * s, 48 * s, 12 * s);
  const clumps = 4;
  for (let c = 0; c < clumps; c++) {
    const cx = x + (c - (clumps - 1) / 2) * 24 * s + (hash(v + c * 7) - 0.5) * 8 * s,
      cy = y - 10 * s + (c % 2) * 10 * s;
    for (let i = 0; i < count; i++) {
      const k = hash(v * 31 + c * 13 + i),
        h = (14 + k * 14) * s * height,
        lean = (hash(v + c * 5 + i * 3) - 0.5) * 0.7;
      blade(ctx, cx + (i - count / 2) * 3.2 * s, cy, h, 2.4 * s, lean, BLADES[(i + c + v) % 4]!);
    }
  }
}

export const PAPER_GRASS_ART: PropArt = {
  id: "paper-grass",
  bounds: { l: -62, r: 62, t: -44, b: 16 },
  variants: 4,
  flames: [
    [-30, -12],
    [-6, -4],
    [18, -14],
    [36, -2],
  ],
  scraps: [...BLADES],
  paint(ctx, x, y, s, v, phase, burnt) {
    if (phase === "intact") patch(ctx, x, y, s, v, 1, 6);
    else if (phase === "damaged") {
      patch(ctx, x, y, s, v, 0.55, 4);
      scrapPieces(ctx, x, y + 2, 34 * s, BLADES, v * 7 + 2, 6);
    } else if (burnt) {
      ashPatch(ctx, x - 14 * s, y - 6 * s, 30 * s, 10 * s, v + 1);
      ashPatch(ctx, x + 20 * s, y - 2 * s, 26 * s, 9 * s, v + 6);
    } else {
      patch(ctx, x, y, s, v, 0.2, 3);
      scrapPieces(ctx, x, y, 42 * s, BLADES, v * 11 + 4, 12);
    }
  },
};
