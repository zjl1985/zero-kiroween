import type { PropArt } from "../../../render/art-registry.js";
import { fence } from "../../../render/craft-scene.js";
import { foldLine, paperCut, tornEdge } from "../../../render/paper-kit.js";
import { line, mix, shadow, type Ctx } from "../../../render/paper-material.js";
import { ashPatch, scrapPieces, tornStub } from "../../../render/paper-scraps.js";
import { variant } from "../../../render/variants.js";

const RAIL = "#624b35",
  PICKET = "#6b4d34",
  EDGE = "#b2884f",
  FIBRE = "#e6cf9f",
  /** Picket papers a damaged fence picks from per picket (render/variants.ts). */
  PICKETS = [PICKET, "#73533a", "#644832"] as const;

/** A picket that may be torn off at `cut` (fraction of its height) and lean by `lean`. */
function picket(ctx: Ctx, xx: number, cut: number, lean: number, seed: number): void {
  ctx.save();
  ctx.translate(xx, 2);
  ctx.rotate(lean);
  const top = -36 * cut;
  const head =
    cut >= 1
      ? ([
          [-3, -28],
          [-6, -29],
          [0, -36],
          [6, -29],
          [3, -28],
        ] as [number, number][])
      : tornEdge(3, top, -3, top, 3, 1.8, seed);
  const look = variant(seed, { palette: PICKETS, shift: 0.4, wear: [0.1, 0.6] });
  paperCut(ctx, [[-3, 0], [3, 0], ...head], {
    color: look.color,
    shadow: 2,
    edge: cut >= 1 ? EDGE : FIBRE,
    texture: 0.8,
    thickness: 0.8,
    wear: look.wear,
    seed,
  });
  line(ctx, -1, Math.max(top + 4, -25), -1, -2, "#ac8251", 0.65);
  ctx.restore();
}
function rail(ctx: Ctx, yy: number, x1: number, seed: number): void {
  // Left end is whole; the right end is torn at x1.
  const torn = tornEdge(x1, yy - 1, x1, yy + 4, 3, 2.4, seed);
  paperCut(ctx, [[-39, yy + 1], ...torn.slice().reverse(), [-39, yy + 5]], {
    color: RAIL,
    shadow: 1.3,
    edge: mix(EDGE, FIBRE, 0.4),
    texture: 0.8,
    thickness: 0.7,
    wear: 0.3,
    seed,
  });
  foldLine(ctx, -36, yy + 3, x1 - 4, yy + 3, 0.35);
}

export const PAPER_FENCE_ART: PropArt = {
  id: "paper-fence",
  bounds: { l: -46, r: 46, t: -42, b: 12 },
  variants: 4,
  flames: [],
  scraps: [PICKET, RAIL, "#8c6a45", FIBRE],
  paint(ctx, x, y, s, v, phase, burnt) {
    if (phase === "intact") {
      fence(ctx, x, y, s);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (phase === "damaged") {
      shadow(ctx, 0, 3, 42, 7);
      rail(ctx, -19, 18 + v * 4, v + 1);
      rail(ctx, -8, 30 - v * 3, v + 7);
      const gone = v % 4;
      for (let i = 0; i < 4; i++) {
        if (i === gone) continue;
        picket(ctx, -34 + i * 24, i === (gone + 2) % 4 ? 0.55 : 1, i === (gone + 1) % 4 ? 0.22 : 0, v * 5 + i);
      }
      tornStub(ctx, -34 + gone * 24, 2, 6, 9, PICKET, v + 3);
      scrapPieces(ctx, 8, 6, 22, [PICKET, FIBRE], v * 31 + 2, 4);
    } else if (burnt) ashPatch(ctx, 0, 2, 40, 7, v + 9);
    else {
      shadow(ctx, 0, 3, 40, 6);
      for (let i = 0; i < 4; i++) tornStub(ctx, -34 + i * 24, 2, 6, 5 + ((v + i) % 3) * 3, PICKET, v * 7 + i);
      scrapPieces(ctx, 0, 6, 34, [PICKET, RAIL, FIBRE], v * 13 + 5, 9);
    }
    ctx.restore();
  },
};
