/** Card art for moon-stars. */
import type { WeaponArt } from "../../render/art-registry.js";
import { oval, stitch } from "../../render/paper-material.js";
import { drawOrbitStar, ring, star } from "../../render/combat-fx.js";
import { orbitPositions } from "../../game/sim.js";
import { playerStats } from "../../game/upgrades.js";

export const MOON_STARS_ART: WeaponArt = {
  id: "moon-stars",
  icon(ctx, ink) {
    star(ctx, 15, 18, 8.5, "#8576ac", 0.12);
    star(ctx, 14, 16, 7.8, ink, 0.12);
    stitch(ctx, oval(16, 17, 13, 8, 2), "#c7b7e7", 0.72);
    star(ctx, 25, 9, 4.5, "#fff1ce", 0.24);
    star(ctx, 5, 23, 3.6, "#c7b7e7", -0.22);
  },
  /** The faint orbit track, gold once the Full Moon is out. */
  ground(ctx, state) {
    const ps = playerStats(state);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ring(ctx, state.player.x, state.player.y, ps.orbitRadius, ps.fullMoon ? "#e3d3a8" : "#a59bc4");
    ctx.restore();
  },
  sprites(ctx, state, time, add) {
    const full = playerStats(state).fullMoon;
    orbitPositions(state).forEach((p, i) => add(p.y, () => drawOrbitStar(ctx, p.x, p.y, time, i, full)));
  },
};
