/** Card art for full-moon. */
import type { WeaponArt } from "../../render/art-registry.js";
import { piece, oval, glow, stitch } from "../../render/paper-material.js";
import { ring } from "../../render/combat-fx.js";
import { combatPart } from "../../render/craft-combat.js";
import { foldLine, paperEmblem, starPoints } from "../../render/paper-kit.js";
import { playerStats, UPGRADE_VALUES } from "../../game/upgrades.js";
import { ellipse } from "../../render/pixel-art.js";
import { NICOLE_STATS } from "../cats/nicole/stats.js";

export const FULL_MOON_ART: WeaponArt = {
  id: "full-moon",
  /** A full paper moon with cut crater patches, set on a five-ray star burst. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: starPoints(16, 16, 15.5, 5, 0.68, -Math.PI / 2), color: ink, lift: 0.7, fold: { from: [16, 1], to: [16, 31], depth: 0.14, side: 1 } },
      {
        shape: (p) => {
          p.moveTo(26, 16);
          p.ellipse(16, 16, 10, 10, 0, 0, Math.PI * 2);
          p.closePath();
        },
        color: "#efe0b4",
        rim: "#fff6d8",
        lift: 1.2,
      },
      {
        shape: (p) => {
          for (const [x, y, r] of [[12.6, 13.4, 2.4], [19, 19.2, 1.8], [18.6, 11.6, 1.2]] as const) {
            p.moveTo(x + r, y);
            p.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2);
            p.closePath();
          }
        },
        color: "#cdbd90",
        lift: 0,
      },
    ]);
    stitch(ctx, oval(16, 16, 8.2, 8.2, 7, 0.02), "#c3ae7c", 0.7);
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
    combatPart("full-moon", 28, 30, (c) => {
      piece(c, oval(0, 0, 8, 8, 7, 0.06), "#efe0b4", { shadow: 1.2, edge: "#fff6d8", texture: 0.6, thickness: 0.8 });
      c.fillStyle = "#c8b98f";
      c.fill(oval(-2.4, -1.2, 1.76, 1.6, 3));
      c.fill(oval(2.8, 2.4, 1.28, 1.12, 5));
      foldLine(c, 2, -6, -1, 6, 0.25);
    }).draw(ctx, { x: mx, y: my, scale: r / 8 });
  },
};
