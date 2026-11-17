/** Card art for pumpkin-seed. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, line, glow } from "../../render/paper-material.js";
import { ring, paperTrail } from "../../render/combat-fx.js";
import { combatPart, paperFleck } from "../../render/craft-combat.js";
import { ellipse } from "../../render/pixel-art.js";

export const PUMPKIN_SEED_ART: WeaponArt = {
  id: "pumpkin-seed",
  icon(ctx, ink) {
    glow(ctx, 18, 15, 12, "#ffb45c", 0.5);
    piece(ctx, oval(18, 15, 5, 8, 3, 0.06), "#f0dfb4", { shadow: 1.2, thickness: 0.6, edge: ink });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      line(ctx, 9 + Math.cos(a) * 3, 24 + Math.sin(a) * 3, 9 + Math.cos(a) * 6, 24 + Math.sin(a) * 6, "#e7a35a", 1.2);
    }
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
      glow(c, 0, 0, 12, "#ffb45c", 0.25, 0.8);
      piece(c, oval(0, 0, 3, 4.5, 2, 0.06), "#f0dfb4", { shadow: 0.6, texture: 0.3, thickness: 0.6, edge: "#e7a35a" });
      line(c, 0, -3, -0.5, 3, "#a8824a", 0.6);
      line(c, 0.8, -2.5, 0.5, 2, "#fff4d0", 0.7);
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
