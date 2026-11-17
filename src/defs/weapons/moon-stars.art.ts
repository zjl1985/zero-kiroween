/** Card art for moon-stars. */
import type { WeaponArt } from "../../render/art-registry.js";
import { oval, stitch } from "../../render/paper-material.js";
import { drawOrbitStar, ring, star } from "../../render/combat-fx.js";
import { orbitPositions } from "../../game/sim.js";
import { playerStats } from "../../game/upgrades.js";

export const MOON_STARS_ART: WeaponArt = {
  id: "moon-stars",
  icon(ctx, ink) {
    star(ctx, 14, 18, 8, ink);
    star(ctx, 24, 9, 4.5, "#fff1ce");
    stitch(ctx, oval(16, 17, 12, 7, 2), ink, 0.6);
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
