/** Card art for pumpkin-seed. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, line, glow } from "../../render/paper-material.js";
import { ring } from "../../render/combat-fx.js";
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
    glow(ctx, x, y, 12, "#ffb45c", 0.35, 0.8);
    piece(ctx, oval(x, y, 3, 4.5, s.id, 0.06), "#f0dfb4", {
      shadow: 0.6,
      texture: 0.3,
      thickness: 0.5,
      edge: "#e7a35a",
    });
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
        piece(ctx, oval(x, y, 2.6, 1.6, i, 0.1), i % 2 ? "#e7a35a" : "#f0dfb4", {
          shadow: 0.4,
          texture: 0.2,
          thickness: 0.3,
        });
      }
    },
  },
};
