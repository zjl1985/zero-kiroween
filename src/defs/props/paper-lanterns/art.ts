import type { PropArt } from "../../../render/art-registry.js";
import { flatCut, flatShadow, PAPER_STOCK } from "../../../render/paper-kit.js";
import { line, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { paperLantern, type LanternCondition } from "../../../render/paper-lantern-kit.js";
import { variant } from "../../../render/variants.js";

const PAPERS = ["#e9a457", "#d9724f", "#f0c86a", "#c95f55"] as const;
const BOUNDS = { l: -44, r: 44, t: -74, b: 10 } as const;
function cordAt(t: number, damaged: boolean): Point {
  const u = 1 - t, controlY = damaged ? -28 : -42, endY = damaged ? -44 : -60;
  return [-34 + 68 * t, -60 * u * u + 2 * u * t * controlY + t * t * endY];
}
/** Poles are scored card strips; a broken pole keeps its exposed folded cross-section. */
function stand(ctx: Ctx, x: number, top: number, broken: boolean, burnt: boolean): void {
  flatShadow(ctx, x, 2, 6, 2);
  flatCut(ctx, [[x - 2, 1], [x - 1.8, top], [x + 1.8, top + (broken ? 2 : 0)], [x + 2, 1]], {
    color: burnt ? "#403037" : "#70513b", ...PAPER_STOCK.card,
    fold: { from: [x, top + 2], to: [x, 0], depth: 0.3 },
  });
  if (broken) flatCut(ctx, [[x - 1.8, top], [x + 1, top - 2], [x + 3, top + 1], [x + 1.8, top + 3]], {
    color: burnt ? "#917356" : PAPER_STOCK.back, ...PAPER_STOCK.thin, texture: 0,
  });
}

export const PAPER_LANTERNS_ART: PropArt = {
  id: "paper-lanterns", bounds: BOUNDS, variants: 4,
  flames: [[-20, -48], [0, -44], [20, -48]],
  scraps: [...PAPERS, "#5f4532"],
  look: { scale: [0.95, 1.05], angle: [-0.01, 0.01], flip: true },
  paint(ctx, x, y, s, v, phase, burnt) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const fallen = phase === "scraps", damaged = phase === "damaged";
    stand(ctx, -34, fallen ? -13 : -64, fallen, burnt);
    stand(ctx, 34, fallen ? -9 : damaged ? -45 : -64, fallen || damaged, burnt);
    if (!fallen) {
      const cord = new Path2D();
      cord.moveTo(...cordAt(0, damaged));
      cord.quadraticCurveTo(0, damaged ? -28 : -42, 34, damaged ? -44 : -60);
      stroke(ctx, cord, "#2e2228", 1.2); stroke(ctx, cord, "#b89463", 0.5);
    }
    for (let i = 0; i < 4; i++) {
      const look = variant(v * 7 + i, { palette: PAPERS, shift: 0.3 }),
        [lx, ly] = cordAt((i + 0.6) / 4.2, damaged),
        dropped = fallen || (damaged && i === 2),
        px = dropped ? -24 + i * 15 : lx,
        py = dropped ? 3 + (i % 2) * 2 : ly + 12,
        state: LanternCondition = dropped ? "collapsed" : burnt ? "charred" : damaged && i % 2 ? "torn" : "intact";
      if (!dropped) line(ctx, px, ly, px, py - 9 * 0.88, "#362b2d", 0.7);
      else flatShadow(ctx, px, py + 1, 7, 2);
      paperLantern(ctx, px, py, 0.88, burnt ? "#56443a" : look.color, state, v + i);
    }
    ctx.restore();
  },
};
