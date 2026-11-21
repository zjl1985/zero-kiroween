/** Card art for night-claw. */
import type { WeaponArt } from "../../render/art-registry.js";
import { path, line } from "../../render/paper-material.js";
import { combatPart } from "../../render/craft-combat.js";
import { crease, flatCut, paperEmblem, tornEdge, PAPER_STOCK } from "../../render/paper-kit.js";

/** One claw blade as a curved paper sliver, base at (x, y). */
function blade(p: Path2D, x: number, y: number): void {
  p.moveTo(x, y + 24);
  p.quadraticCurveTo(x + 1.6, y + 14, x + 8.6, y + 3.4);
  p.lineTo(x + 13, y);
  p.quadraticCurveTo(x + 7.4, y + 11, x + 6.2, y + 19);
  p.lineTo(x + 6.6, y + 22);
  p.lineTo(x + 2.8, y + 25.4);
  p.closePath();
}
export const NIGHT_CLAW_ART: WeaponArt = {
  id: "night-claw",
  /** Three paper claw slivers torn through a scrap of night paper. */
  icon(ctx, ink) {
    const offsets = [[3, 2], [10.5, 3.2], [18, 4.6]] as const;
    paperEmblem(ctx, [
      {
        shape: [[4, 9], [27, 6], [29, 17], ...tornEdge(28, 26, 3, 27, 7, 1.6, 5)],
        color: "#3f3752",
        lift: 0.7,
      },
      { shape: (p) => offsets.forEach(([x, y]) => blade(p, x, y)), color: ink, rim: "#fff1c6" },
    ]);
    for (const [x, y] of offsets) crease(ctx, x + 2.6, y + 23, x + 9.4, y + 5.4, 0.55);
  },
  effects: {
    // Three cut-paper slashes sweeping across the arc toward the target.
    claw(ctx, e, { fade, ease }) {
      const reach = e.radius ?? 58,
        a = e.angle ?? 0;
      ctx.globalAlpha = fade;
      ctx.save();
      ctx.translate(e.x, e.y - 10);
      ctx.scale(reach / 58, reach / 58 * 0.6);
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.rotate(a + i * 0.32 + (ease - 0.5) * 0.7);
        ctx.scale(0.75 + ease * 0.25, 1);
        const color = i === 0 ? "#f3dca2" : "#d9b878";
        combatPart(`claw-cut:${color}`, 76, 34, (c) => {
          // A bent sliver with an open centre; targets remain visible between the three cuts.
          flatCut(c, new Path2D("M -18 7 Q 1 -8 20 -2 L 31 -6 Q 13 5 -18 7 Z"), { color, ...PAPER_STOCK.thin, lift: 0.4, edge: "#fff0c5" });
          // The returning edge shows the paper back, not a luminous streak.
          flatCut(c, path([[-18, 7], [-9, 4], [-4, 6], [-14, 9]]), { color: PAPER_STOCK.back, ...PAPER_STOCK.thin, lift: 0, texture: 0 });
          line(c, -8, 3, 13, -1, "#fff4d4", 0.65, 0.8);
          c.globalAlpha = 0.35;
          line(c, -17, 11, 8, 8, "#b7a6c3", 0.8);
        }).draw(ctx, { x: 27, y: i * 5 });
        ctx.restore();
      }
      ctx.restore();
    },
  },
};
