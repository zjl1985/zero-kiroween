import type { PropArt } from "../../../render/art-registry.js";
import { bush, leaf } from "../../../render/craft-scene.js";
import { hash, oval, path, piece, shadow, stitch } from "../../../render/paper-material.js";
import { ashPatch, scrapPieces, tornEdge } from "../../../render/paper-scraps.js";

const GREENS = ["#556044", "#6c7150", "#737850", "#5a6548"] as const;

export const PAPER_BUSH_ART: PropArt = {
  id: "paper-bush",
  bounds: { l: -52, r: 52, t: -34, b: 12 },
  variants: 6,
  flames: [
    [-14, -14],
    [6, -20],
    [20, -10],
  ],
  scraps: [...GREENS, "#a49e63"],
  paint(ctx, x, y, s, v, phase, burnt) {
    if (phase === "intact") {
      bush(ctx, x, y, s, v);
      return;
    }
    if (phase === "scraps") {
      if (burnt) ashPatch(ctx, x, y, 30 * s, 8 * s, v + 4);
      else {
        shadow(ctx, x, y + 2, 26 * s, 5 * s);
        scrapPieces(ctx, x, y + 2, 26 * s, GREENS, v * 17 + 3, 12);
        for (let j = 0; j < 5; j++)
          leaf(ctx, x + (hash(v + j * 3) - 0.5) * 40 * s, y + 3, 5 * s, 2 * s, 1.2 + j, "#737c51", j);
      }
      return;
    }
    // Damaged: three lobes left, each with a bite torn out of its edge.
    shadow(ctx, x, y + 2, 27 * s, 6 * s);
    for (let i = 0; i < 3; i++) {
      const xx = x + (i - 1) * 15 * s,
        yy = y - 7 * s - Math.sin(i + 1) * 5 * s,
        r = 13 * s,
        pts: [number, number][] = [];
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2,
          bite = k >= 2 + ((v + i) % 5) && k <= 5 + ((v + i) % 5);
        pts.push([xx + Math.cos(a) * r * (bite ? 0.62 : 1), yy + Math.sin(a) * r * 0.86 * (bite ? 0.7 : 1)]);
      }
      const lobe = path(pts, true);
      piece(ctx, lobe, GREENS[(i + v) % 4]!, { shadow: 1.7, edge: "#d9cf9a", texture: 0.8, thickness: 0.8 });
      stitch(ctx, oval(xx, yy, r * 0.82, r * 0.7, v + i, 0.12), "#b4a76a", 0.5);
      const t = tornEdge(xx + r * 0.4, yy - r * 0.5, xx + r * 0.8, yy + r * 0.2, 4, 1.4, v + i);
      piece(ctx, path([...t, [xx + r * 0.5, yy + r * 0.1]]), "#e3d8a6", { shadow: 0, thickness: 0.3, texture: 0.3 });
    }
    scrapPieces(ctx, x + 6 * s, y + 4, 20 * s, GREENS, v * 5 + 1, 5);
  },
};
