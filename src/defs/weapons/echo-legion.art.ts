/** Card art for echo-legion. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, glow } from "../../render/paper-material.js";
import { bolt } from "../../render/upgrade-icons.js";
import { ring } from "../../render/combat-fx.js";
import { paperFleck } from "../../render/craft-combat.js";
import { playerStats, UPGRADE_VALUES } from "../../game/upgrades.js";

export const ECHO_LEGION_ART: WeaponArt = {
  id: "echo-legion",
  icon(ctx, ink) {
    for (let i = 2; i >= 0; i--)
      piece(ctx, oval(10 + i * 6, 18 - i, 5.5, 6.5, i + 2), i ? (i === 1 ? "#8fb7c8" : "#6f8f9f") : ink, {
        shadow: i ? 0.4 : 1.2,
        thickness: 0.5,
      });
    bolt(ctx, 24, 9, -0.4, 4, "#a9d4e4");
  },
  effects: {
    "echo-burst"(ctx, e, { fade, ease }) {
      const r = 10 + ease * (e.radius ?? UPGRADE_VALUES["echo-legion"].burstRadius);
      ctx.globalAlpha = fade;
      glow(ctx, e.x, e.y - 12, r + 20, "#a9d4e4", 0.3 * fade, 0.7);
      ring(ctx, e.x, e.y, r, "#cfe8ee", 0.55);
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        paperFleck(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.55 - 6, 4, i % 2 ? "#e9c27a" : "#a9d0de", a + ease * 0.8);
      }
    },
  },
  /** Paper shards circle the evolved afterimage and mark its burst. */
  sprites(ctx, state, time, add) {
    const d = state.decoy;
    if (!d.live || !playerStats(state).echo) return;
    add(d.y + 0.5, () => {
      const echo = UPGRADE_VALUES["echo-legion"];
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.min(0.4, d.time);
      glow(ctx, d.x, d.y - 18, 46, "#9fcde0", 0.18, 1);
      ctx.globalAlpha *= 0.55;
      ring(ctx, d.x, d.y, echo.burstRadius, "#8fb7c8", 0.5, Math.min(1, d.time / 1.2));
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 4; i++) {
        const a = time * 2.6 + (i * Math.PI) / 2,
          x = d.x + Math.cos(a) * 20,
          y = d.y - 20 + Math.sin(a) * 9;
        paperFleck(ctx, x, y, 4, i % 2 ? "#e9c27a" : "#a9d0de", a);
      }
      ctx.restore();
    });
  },
};
