/** Card art for pumpkin-seed. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, line, glow } from "../../render/paper-material.js";
import { ring, paperTrail } from "../../render/combat-fx.js";
import { combatPart, paperFleck, shotCut } from "../../render/craft-combat.js";
import { paperEmblem } from "../../render/paper-kit.js";
import { ellipse } from "../../render/pixel-art.js";

export const PUMPKIN_SEED_ART: WeaponArt = {
  id: "pumpkin-seed",
  /** A cut cream seed in front of a ribbed paper pumpkin with a green stem tab. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: (p) => {
          p.moveTo(31, 21);
          p.ellipse(22, 21, 9, 7, 0, 0, Math.PI * 2);
          p.closePath();
        },
        color: "#d9813f",
        fold: [
          { from: [19, 14.5], to: [19, 27.5], depth: 0.14, side: 1 },
          { from: [25, 14.5], to: [25, 27.5], depth: 0.1, side: -1 },
        ],
      },
      { shape: [[21, 15.5], [22, 10], [25.4, 9.2], [24.8, 11], [23.6, 15.5]], color: "#6f8a4a", lift: 0.6 },
      {
        shape: [[12, 4], [15.6, 8.5], [17, 14], [15.4, 20], [12, 23], [8.6, 20], [7, 14], [8.4, 8.5]],
        color: "#f0dfb4",
        rim: "#fff6dc",
        lift: 1.3,
        stitch: ink,
        fold: { from: [12, 4.5], to: [12, 22.5], depth: 0.16, side: 1 },
      },
    ]);
  },
  shotTag: "seed",
  /** A glowing pumpkin seed. */
  shot(ctx, s) {
    const x = s.x,
      y = s.y - 14;
    ellipse(ctx, s.x, s.y, 5, 2, "#0b101c55");
    const angle = Math.atan2(s.vy, s.vx);
    paperTrail(ctx, x, y, angle, 18, "#d6a45f", 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    combatPart("pumpkin-seed", 34, 34, (c) => {
      shotCut(c, oval(0, 0, 3.3, 4.9, 2, 0.06), "#f3dca6");
      line(c, 0, -3, -0.5, 3, "#a8824a", 0.7);
      line(c, 0.9, -2.6, 0.6, 2, "#fff6dc", 0.7);
    }).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  },
  effects: {
    "seed-burst"(ctx, e, { fade, ease }) {
      const r = 6 + ease * (e.radius ?? 40);
      ctx.globalAlpha = fade;
      glow(ctx, e.x, e.y - 8, r + 16, "#ffb45c", 0.32 * fade, 0.7);
      ring(ctx, e.x, e.y, r, "#f5c27a", 0.6);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + (e.seed ?? 0),
          x = e.x + Math.cos(a) * r * 0.8,
          y = e.y - 6 + Math.sin(a) * r * 0.5;
        paperFleck(ctx, x, y, 3, i % 2 ? "#e7a35a" : "#f0dfb4", a + ease);
      }
    },
  },
};
