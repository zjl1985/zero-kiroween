import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { hash, path, piece, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { foldLine } from "../../../render/paper-kit.js";
import { paperFleck } from "../../../render/craft-combat.js";
import type { EnemyState } from "../../../game/types.js";
import { enemyRadius } from "../../../game/sim.js";

/** Three finite crumpled sheets with off-centre folds, recessed valleys and torn lips. */
function drawCrumple(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#b9a98e")) return;
  const r = enemyRadius(e) * 1.05, cy = e.y - r * 0.95, v = Math.abs(e.id) % 3;
  enemyShadow(ctx, e.x, e.y, r * 0.95, r * 0.32);
  ctx.save();
  ctx.translate(e.x, cy);
  ctx.rotate(time * 0.7 + e.id * 1.9);
  enemyPart(`crumple:${v}`, 58, 58, (c) => {
    const pts: Point[] = [];
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2, rr = 18 * (0.82 + hash(v * 13 + i) * 0.26);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.94]);
    }
    const cut = path(pts), hubs: Point[] = [[-4, -3], [5, 1], [-1, 7]];
    piece(c, cut, "#e3d6bd", { shadow: 1.5, edge: "#fff6df", texture: 0.8, thickness: 1.2 });
    c.save(); c.clip(cut);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!, hub = hubs[Math.floor(i / 4)]!;
      c.fillStyle = ["#b6a28c", "#eee2c8", "#cab89c", "#f8edd6"][i % 4]!;
      c.fill(path([hub, a, b]));
      foldLine(c, hub[0], hub[1], a[0], a[1], i % 3 ? 0.5 : 0.8);
    }
    c.fillStyle = "#8e7d72";
    c.fill(path([hubs[0]!, hubs[1]!, hubs[2]!]));
    foldLine(c, -4, -3, -1, 7, 0.9);
    stroke(c, new Path2D("M -12 4 q 4 -4 8 0 m 1 0 q 3 3 7 -1 M -10 7 l 5 1"), "#514458", 0.75, 0.65);
    c.restore();
  }).draw(ctx, { x: 0, y: 0, scale: r / 18 });
  ctx.restore();
  googly(ctx, e.x - r * 0.3, cy - r * 0.12, 3.1, look, time, e.id);
  googly(ctx, e.x + r * 0.3, cy - r * 0.18, 2.8, look, time, e.id + 1);
  hpStrip(ctx, e, e.y + 5, r * 1.6);
}
export const CRUMPLE_ART: EnemyArt = {
  id: "crumple", draw: drawCrumple,
  dissolve: { flakes: ["#e8dcc4", "#d9c9ab", "#f2e8d4", "#b9a582"], count: 14, start: 0.35, uncrumple: true },
  effects: {
    crumple(ctx, e, { ease }) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, r = 6 + ease * 24;
        paperFleck(ctx, e.x + Math.cos(a) * r, e.y - 12 + Math.sin(a) * r * 0.6 - ease * 6, 3, "#e3d6bd", a + ease);
      }
    },
  },
};
