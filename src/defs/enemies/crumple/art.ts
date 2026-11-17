import type { EnemyArt } from "../../../render/art-registry.js";
import { dashed, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";
import { enemyRadius } from "../../../game/sim.js";

/** A screwed-up paper ball: faceted silhouette, light and shaded facets, fold lines. */
function drawCrumple(
  ctx: Ctx,
  e: EnemyState,
  time: number,
  look: Look,
): void {
  if (spawning(ctx, e, "#b9a98e")) return;
  const r = enemyRadius(e) * 1.05,
    cx = e.x,
    cy = e.y - r * 0.95,
    roll = time * 0.7 + e.id * 1.9,
    n = 11,
    pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = roll + (i / n) * Math.PI * 2,
      rr = r * (0.82 + hash(e.id * 13 + i) * 0.26);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.94]);
  }
  shadow(ctx, cx, e.y, r * 0.95, r * 0.32);
  piece(ctx, path(pts), "#e3d6bd", {
    shadow: 2,
    edge: "#fff6df",
    texture: 0.9,
    thickness: 1,
  });
  // Facets catch the moon from the upper left.
  const hub: Point = [cx + Math.cos(roll * 1.3) * r * 0.18, cy + Math.sin(roll * 1.3) * r * 0.16];
  ctx.save();
  ctx.clip(path(pts));
  for (let i = 0; i < n; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % n]!,
      mid = (a[1] + b[1]) / 2 - cy,
      lit = mid < 0 && (a[0] + b[0]) / 2 < cx + r * 0.3;
    ctx.fillStyle = lit ? "#fff4dc55" : `rgba(70,55,60,${0.08 + hash(e.id + i * 5) * 0.16})`;
    ctx.fill(path([hub, a, b]));
    line(ctx, hub[0], hub[1], a[0], a[1], "#a8957a", 0.6, 0.7);
  }
  // Ink scribbles from the page it used to be.
  stroke(
    ctx,
    new Path2D(
      `M ${cx - r * 0.6} ${cy + r * 0.25} q ${r * 0.3} ${-r * 0.3} ${r * 0.6} 0 t ${r * 0.6} 0`,
    ),
    "#3b2d49",
    0.9,
    0.55,
  );
  ctx.restore();
  const er = 3.1;
  googly(ctx, cx - r * 0.3, cy - r * 0.12, er, look, time, e.id);
  googly(ctx, cx + r * 0.3, cy - r * 0.18, er * 0.9, look, time, e.id + 1);
  hpStrip(ctx, e, e.y + 5, r * 1.6);
}

export const CRUMPLE_ART: EnemyArt = {
  id: "crumple",
  draw: drawCrumple,
  dissolve: { flakes: ["#e8dcc4", "#d9c9ab", "#f2e8d4", "#b9a582"], count: 14, start: 0.35, uncrumple: true },
  effects: {
    crumple(ctx, e, { ease }) {
      // Paper flakes burst off as the ball tears open.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2,
          r = 6 + ease * 24,
          x = e.x + Math.cos(a) * r,
          y = e.y - 12 + Math.sin(a) * r * 0.6 - ease * 6;
        piece(ctx, path([[x, y - 3], [x + 3, y + 1], [x - 2, y + 2.5]]), "#e3d6bd", {
          shadow: 0.6,
          texture: 0.3,
          thickness: 0.4,
        });
      }
    },
  },
};
