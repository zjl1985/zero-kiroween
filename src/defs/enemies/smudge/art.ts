import type { EnemyArt } from "../../../render/art-registry.js";
import { dashed, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";
import { SMUDGE } from "../../../game/enemies.js";

/** Torn ink-stained paper with a drip; winds up a drop above its head. */
function drawSmudge(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#5f4e78")) return;
  const wind = (e.windup ?? 0) > 0 ? 1 - (e.windup ?? 0) / SMUDGE.windup : 0,
    shake = wind > 0 ? Math.sin(time * 60) * wind * 1.2 : 0,
    x = e.x + shake,
    y = e.y - 14 - wind * 3,
    tilt = Math.sin(time * 1.4 + e.id) * 0.08,
    c = Math.cos(tilt),
    s = Math.sin(tilt),
    torn: Point[] = [];
  const put = (px: number, py: number) => torn.push([x + px * c - py * s, y + px * s + py * c]);
  for (let i = 0; i <= 6; i++) put(-11 + i * 3.6, -12 + (hash(e.id * 3 + i) - 0.5) * 3);
  put(11, 0);
  for (let i = 0; i <= 6; i++) put(11 - i * 3.6, 11 + (hash(e.id * 5 + i) - 0.5) * 4);
  put(-11, 0);
  shadow(ctx, e.x, e.y, 11, 3.5);
  piece(ctx, path(torn), "#ddd0b6", {
    shadow: 1.8,
    edge: "#fbf1da",
    texture: 0.8,
    thickness: 0.9,
  });
  // The ink stain soaked into the sheet, with a hanging drip.
  const blot = oval(x, y + 1, 8.5, 7.5, e.id + 9, 0.32);
  piece(ctx, blot, "#3a2c4b", { shadow: 0, edge: "#6b5583", texture: 0.5, thickness: 0.5 });
  const drip = 3 + Math.sin(time * 2 + e.id) * 1.5;
  piece(
    ctx,
    new Path2D(`M ${x + 3} ${y + 6} q 1.8 ${drip} 0 ${drip + 3} q -1.8 -1 -1.6 -${drip + 3} Z`),
    "#3a2c4b",
    { shadow: 0, edge: "#6b5583", texture: 0.3, thickness: 0.4 },
  );
  googly(ctx, x - 3, y - 1, 2.3, look, time, e.id, wind > 0);
  googly(ctx, x + 3.4, y - 1.5, 2.1, look, time, e.id + 1, wind > 0);
  if (wind > 0) {
    const r = 2 + wind * 3.5;
    glow(ctx, x, y - 18, 10, "#9d7ca9", 0.25 * wind);
    piece(ctx, oval(x, y - 18, r, r * 1.15, e.id), "#3a2c4b", {
      shadow: 0.8,
      edge: "#8a6fa3",
      texture: 0.3,
      thickness: 0.4,
    });
  }
  hpStrip(ctx, e, e.y + 5, 18);
}

export const SMUDGE_ART: EnemyArt = {
  id: "smudge",
  draw: drawSmudge,
  /** The dashed landing mark of the drop it is winding up. */
  ground(ctx, e) {
    if ((e.windup ?? 0) > 0 && e.tx !== undefined && e.ty !== undefined)
      dashed(ctx, oval(e.tx, e.ty, SMUDGE.splashRadius, SMUDGE.splashRadius * 0.6), "#c99ad8", 0.6, 1);
  },
  dissolve: { flakes: ["#3a2c4b", "#54406a", "#e3d3b5", "#6d5684"], count: 10 },
  effects: {
    splat(ctx, e, { fade, ease }) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3,
          r = 6 + ease * 16;
        ctx.fillStyle = "#3a2c4b";
        ctx.fill(oval(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.55, 2.4 * fade + 0.8, 1.8 * fade + 0.6, i));
      }
    },
  },
};
