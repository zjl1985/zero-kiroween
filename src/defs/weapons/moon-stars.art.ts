/** Card art for moon-stars. */
import type { WeaponArt } from "../../render/art-registry.js";
import { drawOrbitStar, ring } from "../../render/combat-fx.js";
import { addPoints, paperEmblem, starPoints } from "../../render/paper-kit.js";
import { orbitPositions } from "../../game/sim.js";
import { playerStats } from "../../game/upgrades.js";

export const MOON_STARS_ART: WeaponArt = {
  id: "moon-stars",
  /** A cut lilac orbit band behind a folded paper star, with two small stars riding the orbit. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: (p) => {
          p.moveTo(16 + 14 * Math.cos(-0.25), 17 + 14 * Math.sin(-0.25));
          p.ellipse(16, 17, 14, 8, -0.25, 0, Math.PI * 2);
          p.closePath();
          p.moveTo(16 + 11.4 * Math.cos(-0.25), 17 + 11.4 * Math.sin(-0.25));
          p.ellipse(16, 17, 11.4, 5.6, -0.25, 0, Math.PI * 2, true);
          p.closePath();
        },
        color: "#8576ac",
        lift: 0.6,
      },
      { shape: starPoints(15, 17, 10, 5, 0.46), color: ink, fold: { from: [15, 7], to: [15, 27], depth: 0.2, side: 1 } },
      {
        shape: (p) => {
          addPoints(p, starPoints(27, 9, 4.2, 4, 0.42, 0.2));
          addPoints(p, starPoints(4.5, 23.5, 3.2, 4, 0.42, -0.2));
        },
        color: "#fff1ce",
        lift: 1.1,
      },
    ]);
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
