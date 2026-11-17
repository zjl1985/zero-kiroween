import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut } from "../../../render/paper-kit.js";
import { line, mix, oval, shadow, type Ctx } from "../../../render/paper-material.js";
import { phasedPaint } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const WAX = ["#e3c98e", "#ddc29f", "#d8cba6"] as const;
const BOUNDS = { l: -25, r: 26, t: -58, b: 15 } as const;

function candle(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: WAX, wear: [0.05, 0.2] });
  shadow(ctx, 1, 2, 19, 5);
  paperCut(ctx, oval(0, 0, 18, 7, v), { color: "#8b826e", thickness: 1.2, shadow: 1.4, layers: 1 });
  paperCut(ctx, oval(0, -1, 14, 4.5, v + 3), { color: "#b5a783", thickness: 0.7, shadow: 0.5 });
  paperCut(ctx, oval(-2, -3, 12, 4, v + 5), { color: look.color, thickness: 0.9, shadow: 0.8 });
  paperCut(ctx, [[-9, -40], [9, -40], [9, -5], [3, -2], [-9, -5]], {
    color: look.color, thickness: 1.1, shadow: 1.6, texture: 0.85,
    fold: { from: [3, -39], to: [3, -3], depth: 0.18 },
  });
  paperCut(ctx, [[4, -39], [9, -40], [9, -5], [4, -3]], { color: mix(look.color, "#8f6a4c", 0.25), thickness: 0.5, shadow: 0.3 });
  paperCut(ctx, [[-9, -39], [-4, -36], [-2, -24], [1, -25], [2, -37], [7, -35], [9, -39]], {
    color: mix(look.color, "#fff0c7", 0.35), thickness: 0.8, shadow: 0.8,
  });
  paperCut(ctx, oval(0, -40, 9.5, 3.5, v), { color: "#f0dfb3", thickness: 0.8, shadow: 0.4 });
  paperCut(ctx, oval(1, -40, 4, 1.7), { color: "#ad8c62", thickness: 0.4, shadow: 0 });
  line(ctx, 1, -40, 2, -48, "#473d3e", 1.8);
  foldLine(ctx, -6, -31, -6, -8, 0.3);
  // The wick is unlit here. Only the live fire overlay supplies flames.
}

const paintWax = phasedPaint({
  bounds: BOUNDS, intact: candle, stub: "#d8c49a", stubs: [[-3, 5]],
  scraps: [...WAX, "#8b826e"], spread: [18, 7],
});

export const WAX_CANDLE_ART: PropArt = {
  id: "wax-candle", bounds: BOUNDS, variants: 3, flames: [[2, -47]], scraps: [...WAX, "#8b826e"],
  paint(ctx, x, y, s, v, phase, burnt) {
    if (phase !== "scraps" || !burnt) return paintWax(ctx, x, y, s, v, phase, burnt);
    // Heat consumes wax into a folded puddle, not the black ash used for paper flora.
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    shadow(ctx, 1, 2, 19, 5);
    paperCut(ctx, oval(0, 0, 18, 7, v), { color: "#8b826e", thickness: 1, shadow: 1.2 });
    const look = variant(v, { palette: WAX });
    paperCut(ctx, oval(-2, 1, 17, 5, v + 3, 0.2), { color: look.color, thickness: 1.1, layers: 1, shadow: 0.8 });
    paperCut(ctx, oval(1, -1, 10, 3, v + 5, 0.15), { color: "#f0dfb3", thickness: 0.6, shadow: 0.4 });
    foldLine(ctx, -9, 0, 8, 2, 0.2);
    line(ctx, -2, -2, 5, -4, "#473d3e", 1.6);
    ctx.restore();
  },
};
