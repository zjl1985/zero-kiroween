import type { EnemyArt } from "../../../render/art-registry.js";
import { dangerRing, enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, piece, type Ctx, type Point } from "../../../render/paper-material.js";
import { foldLine } from "../../../render/paper-kit.js";
import type { EnemyState } from "../../../game/types.js";
import { SMUDGE } from "../../../game/enemies.js";

/** Ink pools in a folded scrap; three torn edges, not a new textured sheet each frame. */
function drawSmudge(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#5f4e78")) return;
  const wind = (e.windup ?? 0) > 0 ? 1 - (e.windup ?? 0) / SMUDGE.windup : 0,
    x = e.x + (wind > 0 ? Math.sin(time * 60) * wind * 1.2 : 0),
    y = e.y - 14 - wind * 3, v = Math.abs(e.id) % 3;
  enemyShadow(ctx, e.x, e.y, 11, 3.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 1.4 + e.id) * 0.08);
  enemyPart(`smudge-sheet:${v}`, 42, 48, (c) => {
    const torn: Point[] = [];
    for (let i = 0; i <= 6; i++) torn.push([-11 + i * 3.6, -12 + (hash(v * 3 + i) - 0.5) * 3]);
    torn.push([11, 0]);
    for (let i = 0; i <= 6; i++) torn.push([11 - i * 3.6, 11 + (hash(v * 5 + i) - 0.5) * 4]);
    torn.push([-11, 0]);
    piece(c, path(torn), "#ddd0b6", { shadow: 1.4, edge: "#fbf1da", texture: 0.65, thickness: 1 });
    c.fillStyle = "#b6a38f";
    c.fill(path([[-11, -9], [0, -5], [11, 10], [-2, 7]]));
    foldLine(c, -10, -8, 9, 10, 0.65);
    piece(c, oval(0, 1, 8.5, 7.5, v + 9, 0.32), "#3a2c4b", { shadow: 0.4, edge: "#7d6493", texture: 0.4, thickness: 0.75 });
    c.fillStyle = "#655077";
    c.fill(path([[-7, 0], [-4, -5], [3, -6], [0, -2]]));
    piece(c, path([[5, -12], [11, -10], [11, -5], [7, -7]]), "#f1e3c8", { shadow: 0.5, edge: "#fff0da", texture: 0.4, thickness: 0.5 });
    line(c, -7, 8, -3, 9, "#968277", 0.6);
  }).draw(ctx, { x: 0, y: 0 });
  ctx.save();
  ctx.translate(3, 7);
  ctx.scale(1, 0.75 + Math.sin(time * 2 + e.id) * 0.2);
  inkDrop().draw(ctx, { x: 0, y: 0, scale: 0.4 });
  ctx.restore();
  ctx.restore();
  googly(ctx, x - 3, y - 1, 2.3, look, time, e.id, wind > 0);
  googly(ctx, x + 3.4, y - 1.5, 2.1, look, time, e.id + 1, wind > 0);
  if (wind > 0) {
    glow(ctx, x, y - 18, 10, "#9d7ca9", 0.25 * wind);
    inkDrop().draw(ctx, { x, y: y - 18, scale: 0.4 + wind * 0.7 });
  }
  hpStrip(ctx, e, e.y + 5, 18);
}
function inkDrop() {
  return enemyPart("smudge-drop", 22, 26, (c) => {
    piece(c, new Path2D("M 0 -7 Q 7 1 4 5 Q 0 9 -4 5 Q -7 1 0 -7 Z"), "#3a2c4b", { shadow: 0.6, edge: "#9a83ad", texture: 0.3, thickness: 0.6 });
    line(c, -2, 0, -2, 3, "#beacc8", 0.7);
  });
}
export const SMUDGE_ART: EnemyArt = {
  id: "smudge", draw: drawSmudge,
  ground(ctx, e) {
    if ((e.windup ?? 0) > 0 && e.tx !== undefined && e.ty !== undefined)
      dangerRing(ctx, e.tx, e.ty, SMUDGE.splashRadius, 1 - e.windup! / SMUDGE.windup);
  },
  dissolve: { flakes: ["#3a2c4b", "#54406a", "#e3d3b5", "#6d5684"], count: 10 },
  effects: {
    splat(ctx, e, { fade, ease }) {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + 0.3, r = 6 + ease * 16;
        ctx.fillStyle = "#3a2c4b";
        ctx.fill(oval(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.55, 2.4 * fade + 0.8, 1.8 * fade + 0.6, i));
      }
    },
  },
};
