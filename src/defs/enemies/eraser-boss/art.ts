import type { EnemyArt } from "../../../render/art-registry.js";
import { dashed, googly, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, piece, shadow, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import type { BossAct, EnemyState } from "../../../game/types.js";
import { BOSS, ENEMIES } from "../../../game/enemies.js";
import { enemyRadius } from "../../../game/sim.js";
import { box } from "../../../render/craft-enemies.js";

/**
 * The Eraser: a big pink paper eraser in a stitched paper sleeve, worn at
 * the leading corner, with googly eyes tracking the cat.
 */
function drawEraser(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  const R = enemyRadius(e),
    a = e.act,
    windup = a && a.t > 0 ? 1 - a.t / BOSS[a.kind].telegraph : 0,
    charging = !!a && a.kind === "charge" && a.t <= 0 && a.run > 0;
  if (e.spawnTime > 0) {
    // Drops onto the page from above with a dashed landing mark.
    const k = Math.min(1, e.spawnTime / BOSS.spawnTime);
    ctx.save();
    ctx.setLineDash([5, 4]);
    stroke(ctx, oval(e.x, e.y, R * 1.6, R * 0.5), "#e48b9a", 1.4, 0.8);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.translate(0, -k * 120);
    drawEraserBody(ctx, e, R, 0, false, time, look);
    ctx.restore();
    return;
  }
  shadow(ctx, e.x, e.y, R * 1.55, R * 0.42);
  if (windup > 0) glow(ctx, e.x, e.y - R, R * 2.4, "#ff9fb0", 0.18 + windup * 0.2, 0.7);
  drawEraserBody(ctx, e, R, windup, charging, time, look);
}
function drawEraserBody(
  ctx: Ctx,
  e: EnemyState,
  R: number,
  windup: number,
  charging: boolean,
  time: number,
  look: Look,
): void {
  const face = look.x < e.x ? -1 : 1,
    squash = 1 - windup * 0.12,
    bob = charging ? 0 : Math.sin(time * 2.2) * 1.5,
    w = R * 2.5,
    h = R * 1.35 * squash,
    x0 = e.x - w / 2,
    y1 = e.y - 4 + bob,
    y0 = y1 - h,
    lean = charging ? face * 6 : 0,
    side = R * 0.38;
  ctx.save();
  ctx.translate(e.x, y1);
  ctx.transform(1, 0, -lean / h, 1, 0, 0);
  ctx.translate(-e.x, -y1);
  // Visible paper thickness: the darker side face under the top face.
  piece(
    ctx,
    path([
      [x0 + 3, y1 - 2],
      [x0 + w - 2, y1 - 2],
      [x0 + w - 2, y1 + side * 0.45],
      [x0 + 3, y1 + side * 0.45],
    ]),
    "#b96878",
    { shadow: 2.5, edge: "#d78494", texture: 0.6, thickness: 1 },
  );
  // Pink rubber with a worn, rounded leading corner.
  const worn = face > 0 ? [0.1, 0.42] : [0.42, 0.1];
  const rubber = new Path2D();
  rubber.moveTo(x0 + R * worn[0]!, y0);
  rubber.lineTo(x0 + w - R * worn[1]!, y0);
  rubber.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + R * worn[1]!);
  rubber.lineTo(x0 + w, y1);
  rubber.lineTo(x0, y1);
  rubber.lineTo(x0, y0 + R * worn[0]!);
  rubber.quadraticCurveTo(x0, y0, x0 + R * worn[0]!, y0);
  rubber.closePath();
  piece(ctx, rubber, "#f0a3b1", { shadow: 2, edge: "#ffd3da", texture: 0.85, thickness: 1.2 });
  // Rubbed crumbs and graphite smears on the working end.
  const end = face > 0 ? x0 + w - 8 : x0 + 8;
  for (let i = 0; i < 4; i++)
    line(ctx, end - face * i * 3, y0 + 5 + i * 4, end - face * (i * 3 + 6), y0 + 7 + i * 4, "#8d6f82", 0.8, 0.5);
  // The paper sleeve wrapped around the back half, with stitching.
  const sx = face > 0 ? x0 - 1.5 : x0 + w * 0.48,
    sw = w * 0.53 + 1.5,
    sleeve = path([
      [sx, y0 - 2.5],
      [sx + sw * 0.5, y0 - 3.2],
      [sx + sw, y0 - 2.5],
      [sx + sw + 0.5, y1 + 2],
      [sx + sw * 0.45, y1 + 2.8],
      [sx - 0.5, y1 + 2],
    ]);
  piece(ctx, sleeve, "#4f6f9c", { shadow: 1.5, edge: "#8eaed2", texture: 0.8, thickness: 1 });
  piece(ctx, path([
    [sx + 2, y0 + h * 0.36],
    [sx + sw - 2, y0 + h * 0.34],
    [sx + sw - 2, y0 + h * 0.58],
    [sx + 2, y0 + h * 0.6],
  ]), "#e9dcc2", { shadow: 0.6, edge: "#fff6e2", texture: 0.5, thickness: 0.5 });
  stitch(ctx, path([
    [sx + 3, y0 + 1.5],
    [sx + sw - 3, y0 + 1.5],
    [sx + sw - 3, y1 - 1],
    [sx + 3, y1 - 1],
  ]), "#c8d8ea", 0.85);
  // Two short ink bars on the label, in place of printed text.
  line(ctx, sx + sw * 0.25, y0 + h * 0.47, sx + sw * 0.6, y0 + h * 0.47, "#4f6f9c", 1.2);
  line(ctx, sx + sw * 0.66, y0 + h * 0.47, sx + sw * 0.78, y0 + h * 0.47, "#b2404f", 1.2);
  // Eyes on the exposed rubber.
  const ex = face > 0 ? x0 + w * 0.73 : x0 + w * 0.27,
    ey = y0 + h * 0.42,
    angry = windup > 0 || charging;
  googly(ctx, ex - 7, ey, 5, look, time, e.id, angry);
  googly(ctx, ex + 7, ey - 1, 5.4, look, time, e.id + 1, angry);
  const mouth = angry
    ? new Path2D(`M ${ex - 6} ${ey + 11} l 3 -2 l 3 2 l 3 -2 l 3 2`)
    : new Path2D(`M ${ex - 5} ${ey + 10} q 5 3 10 0`);
  stroke(ctx, mouth, "#6f3242", 1.2);
  ctx.restore();
}
function sweepRect(a: BossAct): Path2D {
  const R = ENEMIES["eraser-boss"].radius,
    half = BOSS.sweep.width / 2,
    nx = -a.dy,
    ny = a.dx,
    p0x = a.x - a.dx * R,
    p0y = a.y - a.dy * R,
    p1x = a.x + a.dx * BOSS.sweep.length,
    p1y = a.y + a.dy * BOSS.sweep.length;
  return path([
    [p0x + nx * half, p0y + ny * half],
    [p1x + nx * half, p1y + ny * half],
    [p1x - nx * half, p1y - ny * half],
    [p0x - nx * half, p0y - ny * half],
  ]);
}

export const ERASER_BOSS_ART: EnemyArt = {
  id: "eraser-boss",
  draw: drawEraser,
  cullMargin: 80,
  /** Sweep lane, charge lane and summon ring while an attack winds up. */
  ground(ctx, e) {
    const a = e.act;
    if (!a || a.t <= 0) return;
    const k = 1 - a.t / BOSS[a.kind].telegraph;
    if (a.kind === "sweep") {
      const r = sweepRect(a);
      ctx.save();
      ctx.globalAlpha = 0.12 + k * 0.22;
      ctx.fillStyle = "#f0a3b1";
      ctx.fill(r);
      ctx.restore();
      dashed(ctx, r, "#ffd3da", 0.6 + k * 0.4, 1.8);
    } else if (a.kind === "charge") {
      const len = BOSS.charge.speed * BOSS.charge.time,
        ex = a.x + a.dx * len,
        ey = a.y + a.dy * len,
        lane = new Path2D();
      lane.moveTo(a.x, a.y);
      lane.lineTo(ex, ey);
      dashed(ctx, lane, "#ffd3da", 0.5 + k * 0.5, 3 + k * 4);
      dashed(ctx, oval(ex, ey, 18, 9), "#ffd3da", 0.5 + k * 0.5, 1.4);
    } else {
      dashed(ctx, oval(e.x, e.y, BOSS.summon.distance + 10, (BOSS.summon.distance + 10) * 0.6), "#c99ad8", 0.5 + k * 0.4, 1.4);
    }
  },
  dissolve: {
    flakes: ["#f0a3b1", "#e58e9f", "#4f6f9c", "#f6ece0"],
    count: 26,
    spread: 2.4,
    size: 3.6,
  },
  effects: {
    erase(ctx, e, { fade, ease }) {
      // Pink rubber crumbs and a pale rubbed-out smear.
      ctx.globalAlpha = fade * 0.45;
      ctx.fillStyle = "#f6ece0";
      ctx.fill(oval(e.x, e.y, 26 + ease * 40, 10 + ease * 12, 4, 0.2));
      ctx.globalAlpha = fade;
      for (let i = 0; i < 10; i++) {
        const a = i * 2.1,
          r = 8 + ease * (20 + hash(i) * 30);
        piece(ctx, oval(e.x + Math.cos(a) * r, e.y - 4 + Math.sin(a) * r * 0.5 - ease * 8, 2, 1.4, i), "#e58e9f", {
          shadow: 0.5,
          texture: 0.2,
          thickness: 0.3,
        });
      }
    },
    summon(ctx, e, { fade, ease }) {
      dashed(ctx, oval(e.x, e.y, 14 + ease * 40, (14 + ease * 40) * 0.6), "#c99ad8", fade, 1.6);
    },
    "boss-down"(ctx, e, { fade, ease }) {
      glow(ctx, e.x, e.y - 20, 90 * ease + 20, "#ffd3da", 0.35 * fade, 0.8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          r = 10 + ease * 80,
          x = e.x + Math.cos(a) * r,
          y = e.y - 20 + Math.sin(a) * r * 0.55 - ease * 20;
        piece(ctx, box(x, y, 4, 3, i), i % 3 ? "#f0a3b1" : "#4f6f9c", {
          shadow: 0.6,
          texture: 0.3,
          thickness: 0.4,
        });
      }
    },
  },
};
