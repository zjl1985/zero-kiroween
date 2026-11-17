/** Card art for full-moon. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, glow } from "../../render/paper-material.js";
import { ring, star } from "../../render/combat-fx.js";
import { playerStats, UPGRADE_VALUES } from "../../game/upgrades.js";
import { ellipse } from "../../render/pixel-art.js";
import { NICOLE_STATS } from "../cats/nicole/stats.js";

export const FULL_MOON_ART: WeaponArt = {
  id: "full-moon",
  icon(ctx, ink) {
    glow(ctx, 16, 16, 16, "#f3dfa6", 0.6);
    piece(ctx, oval(16, 16, 9, 9, 7, 0.06), "#efe0b4", { shadow: 1.4, thickness: 0.6, edge: "#fff6d8" });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - 0.4;
      star(ctx, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 2.5, ink, a);
    }
  },
  effects: {
    "moon-pulse"(ctx, e, { fade, ease }, state) {
      const reach =
          e.radius ??
          (state ? playerStats(state).orbitRadius : NICOLE_STATS.orbitRadius) +
            UPGRADE_VALUES["full-moon"].pulseReach,
        r = 14 + ease * reach;
      ctx.globalAlpha = fade;
      glow(ctx, e.x, e.y, r + 18, "#efe0b4", 0.22 * fade, 0.6);
      ctx.globalAlpha = fade * 0.12;
      ellipse(ctx, e.x, e.y, r, r * 0.6, "#efe0b4");
      ctx.globalAlpha = fade;
      ring(ctx, e.x, e.y, r, "#f3e6c4", 0.6);
      ring(ctx, e.x, e.y, r * 0.82, "#bda5ef", 0.6, fade);
    },
  },
  /** The moon pulse charge, read straight from the sim timer. */
  ground(ctx, state) {
    const ps = playerStats(state);
    if (!ps.fullMoon) return;
    const moon = UPGRADE_VALUES["full-moon"],
      charge = 1 - Math.max(0, state.pulseTimer) / moon.pulseInterval;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ring(ctx, state.player.x, state.player.y, ps.orbitRadius + moon.pulseReach, "#d9c79c", 0.55, charge);
    ctx.restore();
  },
  /** A small paper full moon floats at her shoulder and swells before each pulse. */
  front(ctx, state) {
    if (!playerStats(state).fullMoon) return;
    const p = state.player,
      moon = UPGRADE_VALUES["full-moon"],
      charge = 1 - Math.max(0, state.pulseTimer) / moon.pulseInterval,
      mx = p.x - p.facing * 22,
      my = p.y - 64,
      r = 5 + charge * 2.2;
    glow(ctx, mx, my, 22 + charge * 10, "#f3dfa6", 0.2 + charge * 0.15, 1);
    piece(ctx, oval(mx, my, r, r, 7, 0.06), "#efe0b4", {
      shadow: 1.2,
      edge: "#fff6d8",
      texture: 0.6,
      thickness: 0.6,
    });
    ctx.fillStyle = "#c8b98f";
    ctx.fill(oval(mx - r * 0.3, my - r * 0.15, r * 0.22, r * 0.2, 3));
    ctx.fill(oval(mx + r * 0.35, my + r * 0.3, r * 0.16, r * 0.14, 5));
  },
};
