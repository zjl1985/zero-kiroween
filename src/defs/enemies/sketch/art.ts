import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { flatLayer } from "../../../render/paper-kit.js";
import { line, type Ctx } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";

const PAPER = "#e2d5bc", GRAPHITE = "#413947", LIGHT = "#817481";

/** The loose pencil outline of a crouching ink creature, drawn twice like a quick sketch. */
function outline(c: Ctx, dx: number, dy: number, width: number, alpha: number): void {
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = GRAPHITE;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(-11 + dx, 9 + dy);
  c.bezierCurveTo(-14 + dx, 0 + dy, -11 + dx, -11 + dy, -4 + dx, -12 + dy);
  c.lineTo(-2 + dx, -16 + dy);
  c.lineTo(1 + dx, -11 + dy);
  c.lineTo(5 + dx, -15 + dy);
  c.lineTo(6 + dx, -10 + dy);
  c.bezierCurveTo(12 + dx, -7 + dy, 13 + dx, 3 + dy, 10 + dx, 9 + dy);
  c.quadraticCurveTo(0 + dx, 12 + dy, -11 + dx, 9 + dy);
  c.stroke();
  c.restore();
}
function bodyPart() {
  return enemyPart("sketch:body", 40, 44, (c) => {
    // A barely-there scrap of raw paper behind the lines so it reads on any ground.
    flatLayer(c, {
      shape: new Path2D("M -12 9 C -15 0 -12 -11 -4 -12 L 1 -11 L 6 -10 C 12 -7 13 3 10 9 Q 0 12 -12 9 Z"),
      color: PAPER, rim: "#fffaf0", texture: 0.3, lift: 0.7, thickness: 0.6,
    });
    outline(c, 0, 0, 1.1, 0.95);
    outline(c, 0.8, -0.6, 0.6, 0.45);
    // Hatching on the side away from the moon.
    for (let i = 0; i < 5; i++) line(c, -10 + i * 2.2, 8, -6 + i * 2.2, 0, LIGHT, 0.6, 0.7);
    // Pencil-ring eyes with a pressed dot.
    for (const x of [-3.5, 3.5]) {
      c.save();
      c.strokeStyle = GRAPHITE;
      c.lineWidth = 0.9;
      c.beginPath();
      c.ellipse(x, -3, 2.6, 2.8, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = GRAPHITE;
      c.beginPath();
      c.arc(x + 0.5, -2.6, 0.9, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    line(c, -2, 3, 2, 3.5, GRAPHITE, 0.8, 0.8);
  });
}

function drawSketch(ctx: Ctx, e: EnemyState, time: number, _look: Look): void {
  if (spawning(ctx, e, LIGHT)) return;
  const phase = e.phase ?? 0,
    hop = Math.abs(Math.sin(time * 7 + phase)) * 2.2;
  enemyShadow(ctx, e.x, e.y, 10, 3);
  ctx.save();
  ctx.translate(e.x, e.y - 12 - hop);
  ctx.rotate(Math.sin(time * 5 + phase) * 0.06);
  bodyPart().draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  hpStrip(ctx, e, e.y + 5, 16);
}

export const SKETCH_ART: EnemyArt = {
  id: "sketch",
  draw: drawSketch,
  previewBounds: { l: -22, r: 23, t: -33, b: 8 },
  dissolve: { flakes: [PAPER, LIGHT, GRAPHITE, "#fffaf0"], count: 8 },
};
