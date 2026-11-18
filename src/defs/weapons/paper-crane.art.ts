/** Card art for paper-crane. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, path, line } from "../../render/paper-material.js";
import { ellipse } from "../../render/pixel-art.js";
import { combatPart } from "../../render/craft-combat.js";
import { paperTrail } from "../../render/combat-fx.js";
import { paperEmblem, foldLine } from "../../render/paper-kit.js";

export const PAPER_CRANE_ART: WeaponArt = {
  id: "paper-crane",
  /** An origami crane: the folded body, a near wing in the back-side shade, and an ink tail tip. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: [[3, 9], [11.5, 17.5], [15, 15.5], [18.5, 2.5], [20.5, 16], [24, 16.5], [27.5, 6.5], [31, 8.8], [28.2, 9.6], [26.5, 19], [17, 25.5], [9, 21.5]],
        color: "#efe6d2",
        fold: { from: [11.5, 17.5], to: [24, 16.5], depth: 0.16, side: 1 },
      },
      { shape: [[13.5, 19.5], [24.5, 5], [21, 20.5]], color: "#d8cdb5", fold: { from: [13.5, 19.5], to: [24.5, 5], depth: 0.16, side: 1 } },
      { shape: [[3, 9], [9.4, 15.5], [7, 17.4]], color: ink, lift: 0.5 },
    ]);
  },
  shotTag: "crane",
  /** A folded paper crane flying nose first. */
  shot(ctx, s, time) {
    const a = Math.atan2(s.vy, s.vx), x = s.x, y = s.y - 14,
      flap = Math.sin(time * 14 + s.id);
    ellipse(ctx, s.x, s.y, 6, 2, "#0b101c55");
    paperTrail(ctx, x, y, a, 26, "#bcccb8", 0.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, side * (0.8 + flap * 0.25));
      combatPart("crane-wing", 30, 30, (c) => {
        piece(c, path([[4, 0], [-4, -10], [-8, -3], [-3, 1]]), "#efe6d2", { shadow: 0.7, edge: "#fff3d5", texture: 0.4, thickness: 0.65 });
        c.fillStyle = "#b9b5a4";
        c.fill(path([[4, 0], [-4, -10], [-2, -2]]));
        foldLine(c, -4, -9, 3, 0, 0.5);
      }).draw(ctx, { x: 0, y: 0 });
      ctx.restore();
    }
    combatPart("crane-keel", 32, 20, (c) => {
      piece(c, path([[-10, 3], [-6, -1], [5, -1], [8, -6], [11, -3], [8, -2], [7, 2], [-3, 3]]), "#e4d7b9", { shadow: 0.7, edge: "#fff4db", texture: 0.35, thickness: 0.6 });
      line(c, -7, 1, 5, 1, "#a99b80", 0.6);
    }).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  },
};
