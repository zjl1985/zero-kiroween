import type { EnemyArt } from "../../../render/art-registry.js";
import { dashed, enemyPart, enemyShadow, googly, type Look } from "../../../render/craft-enemies.js";
import { glow, hash, line, oval, path, stitch, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import type { BossAct, EnemyState } from "../../../game/types.js";
import { BOSS, ENEMIES } from "../../../game/enemies.js";
import { enemyRadius } from "../../../game/sim.js";

import { addPoints, crease, flatLayer, flatShadow, PAPER_SHADOW } from "../../../render/paper-kit.js";
import { paperFleck } from "../../../render/craft-combat.js";

/** The rubber block seen from the front, with its top and moon-side faces receding up-right. */
const DEPTH = { x: 9, y: -7 } as const;
const RUBBER = { front: "#ec9aaa", top: "#ffd0d7", side: "#f7b6c2", worn: "#f9dfe0" } as const;
const SLEEVE = { front: "#41639a", top: "#7f9fd0", side: "#5b7fb8", label: "#efe5cf" } as const;
const ERASER_WARNING = { fill: "#be677d", edge: "#ffc3cd" } as const;

/** A box face from four corners, drawn as one flat paper layer. */
function face(c: Ctx, pts: readonly Point[], color: string, rim: string, lift = 0): void {
  flatLayer(c, { shape: path(pts), color, rim, lift, texture: 0.5, thickness: 0.9 });
}

/**
 * The Eraser: a real pink rubber block, its working end rubbed into a round
 * worn bevel, its back half wrapped in a printed card sleeve. Two cached cuts
 * (one per facing); the light stays top-right whichever way it faces.
 */
function paintEraser(c: Ctx, dir: number): void {
  const w = 60, h = 32, x0 = -w / 2, x1 = w / 2, y1 = 0, y0 = -h, dx = DEPTH.x, dy = DEPTH.y,
    bevel = 9,
    // The worn end faces the cat; the sleeve covers the other half.
    wornLeft = dir < 0;
  flatShadow(c, 4, 3, w * 0.62, 7, 1.2);
  const front: Point[] = wornLeft
    ? [[x0 + bevel, y0], [x1, y0], [x1, y1], [x0 + 2, y1], [x0, y1 - 3], [x0, y0 + bevel], [x0 + bevel * 0.3, y0 + bevel * 0.3]]
    : [[x0, y0], [x1 - bevel, y0], [x1 - bevel * 0.3, y0 + bevel * 0.3], [x1, y0 + bevel], [x1, y1 - 3], [x1 - 2, y1], [x0, y1]];
  const top: Point[] = wornLeft
    ? [[x0 + bevel, y0], [x0 + bevel + dx * 0.9, y0 + dy], [x1 + dx, y0 + dy], [x1, y0]]
    : [[x0, y0], [x0 + dx, y0 + dy], [x1 - bevel + dx * 0.7, y0 + dy], [x1 - bevel, y0]];
  const side: Point[] = wornLeft
    ? [[x1, y0], [x1 + dx, y0 + dy], [x1 + dx, y1 + dy], [x1, y1]]
    : [[x1, y0 + bevel], [x1 + dx * 0.6, y0 + bevel + dy * 0.8], [x1 + dx, y1 + dy], [x1, y1 - 3]];
  const bev: Point[] = wornLeft
    ? [[x0, y0 + bevel], [x0 + bevel * 0.3, y0 + bevel * 0.3], [x0 + bevel, y0], [x0 + bevel + dx * 0.9, y0 + dy], [x0 + dx * 0.5, y0 + bevel * 0.4 + dy * 0.6]]
    : [[x1 - bevel, y0], [x1 - bevel + dx * 0.7, y0 + dy], [x1 + dx * 0.6, y0 + bevel + dy * 0.8], [x1, y0 + bevel], [x1 - bevel * 0.3, y0 + bevel * 0.3]];
  // The whole block casts one hard shadow down-right (one union path, no doubled alpha).
  const block = new Path2D();
  for (const poly of [front, top, side, bev]) addPoints(block, poly);
  c.save();
  c.translate(PAPER_SHADOW.dx * 2.2, PAPER_SHADOW.dy * 2.2);
  c.globalAlpha *= PAPER_SHADOW.alpha;
  c.fillStyle = PAPER_SHADOW.color;
  c.fill(block);
  c.restore();
  face(c, front, RUBBER.front, "#ffe3e7");
  face(c, top, RUBBER.top, "#fff3f4");
  face(c, side, RUBBER.side, "#ffe3e7");
  // The rubbed-round corner: a pale worn bevel with graphite smudges.
  face(c, bev, RUBBER.worn, "#ffffff");
  const end = wornLeft ? x0 + 6 : x1 - 6, s = wornLeft ? 1 : -1;
  for (let i = 0; i < 3; i++) line(c, end + s * i * 2.5, y0 + 10 + i * 6, end + s * (i * 2.5 + 7), y0 + 12 + i * 6, "#7b6474", 1.2, 0.45);
  // The card sleeve wraps the back half: front band, top band and side band.
  const sx0 = wornLeft ? -4 : x0 - 1, sx1 = wornLeft ? x1 + 1 : 4;
  face(c, [[sx0, y0 - 1.5], [sx1, y0 - 1.5], [sx1, y1 + 1.5], [sx0, y1 + 1.5]], SLEEVE.front, "#a9c1e6", 0.8);
  face(c, [[sx0, y0 - 1.5], [sx0 + dx, y0 + dy - 1.5], [sx1 + dx, y0 + dy - 1.5], [sx1, y0 - 1.5]], SLEEVE.top, "#d3e0f4");
  if (sx1 > x1) face(c, [[sx1, y0 - 1.5], [sx1 + dx, y0 + dy - 1.5], [sx1 + dx, y1 + dy + 1.5], [sx1, y1 + 1.5]], SLEEVE.side, "#b8cdeb");
  // A printed paper label band with two ink bars instead of text.
  face(c, [[sx0 + 3, y0 + h * 0.36], [sx1 - 3, y0 + h * 0.34], [sx1 - 3, y0 + h * 0.62], [sx0 + 3, y0 + h * 0.64]], SLEEVE.label, "#ffffff", 0.3);
  const lw = sx1 - sx0;
  line(c, sx0 + lw * 0.2, y0 + h * 0.49, sx0 + lw * 0.58, y0 + h * 0.49, "#41639a", 1.6);
  line(c, sx0 + lw * 0.64, y0 + h * 0.49, sx0 + lw * 0.8, y0 + h * 0.49, "#b2404f", 1.6);
  stitch(c, path([[sx0 + 2, y0 + 1], [sx1 - 2, y0 + 1]]), "#c8d8ea", 0.8);
  crease(c, sx0 + 1, y1 - 4, sx1 - 1, y1 - 4, 0.6);
  // The sleeve's tucked seam lifts a little at one corner.
  face(c, wornLeft ? [[sx1 - 7, y1 + 1.5], [sx1, y1 + 1.5], [sx1 + 1, y1 - 6]] : [[sx0, y1 - 6], [sx0 + 1, y1 + 1.5], [sx0 + 8, y1 + 1.5]], "#9fb3cf", "#e3ebf5", 0.5);
}
function eraserCut(dir: number) {
  return enemyPart(`eraser-cut:${dir}`, 104, 80, (c) => {
    c.translate(-4, 18);
    paintEraser(c, dir);
  });
}
/** A rolled rubber crumb (finite variants). */
function crumb(v: number) {
  return enemyPart(`eraser-crumb:${v}`, 14, 12, (c) => {
    const pts: Point[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, rr = (i % 2 ? 1.6 : 2.4) + hash(v * 9 + i) * 0.8;
      pts.push([Math.cos(a) * rr * 1.4, Math.sin(a) * rr * 0.8]);
    }
    flatLayer(c, { shape: path(pts), color: v % 2 ? "#e48c9d" : "#f1b3bf", rim: "#ffe3e7", lift: 0.6, texture: 0.3 });
    crease(c, -2, 0.4, 2, -0.4, 0.4);
  });
}

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
  enemyShadow(ctx, e.x, e.y, R * 1.55, R * 0.42);
  // Crumbs shed from the trailing end roll off and settle (positions from view time only).
  const back = look.x < e.x ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    const k = (time * 0.7 + i / 4 + hash(e.id + i) * 0.2) % 1,
      cx = e.x + back * (R * 1.1 + k * 22 + hash(e.id * 3 + i) * 6),
      cy = e.y - 6 + Math.min(1, k * 2.2) * 8 + (hash(e.id * 5 + i) - 0.5) * 8;
    ctx.save();
    ctx.globalAlpha *= 1 - k * k;
    crumb(i % 3).draw(ctx, { x: cx, y: cy });
    ctx.restore();
  }
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
  const dir = look.x < e.x ? -1 : 1,
    squash = 1 - windup * 0.12,
    bob = charging ? 0 : Math.sin(time * 2.2) * 1.5,
    w = R * 2.5,
    h = R * 1.35 * squash,
    x0 = e.x - w / 2,
    y1 = e.y - 4 + bob,
    y0 = y1 - h,
    lean = charging ? dir * 6 : 0;
  ctx.save();
  ctx.translate(e.x, y1);
  ctx.transform(1, 0, -lean / h, 1, 0, 0);
  ctx.translate(-e.x, -y1);
  ctx.save();
  ctx.translate(e.x, y1);
  ctx.scale(1, squash);
  // The cut is painted 4 left / 18 down of its sprite centre; put the block base on the ground point.
  eraserCut(dir).draw(ctx, { x: 4 * (R / 24), y: -18 * (R / 24), scale: R / 24 });
  ctx.restore();
  // Eyes on the exposed rubber.
  const ex = dir > 0 ? x0 + w * 0.73 : x0 + w * 0.27,
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

/** The moving body traced along the full dry-ground charge, with round end caps. */
function chargeLane(e: EnemyState, a: BossAct, angle: number, length: number): Path2D {
  const radius = enemyRadius(e), side = Math.PI / 2, lane = new Path2D();
  const endX = e.x + a.dx * length, endY = e.y + a.dy * length;
  lane.arc(e.x, e.y, radius, angle + side, angle + side * 3);
  lane.arc(endX, endY, radius, angle - side, angle + side);
  lane.closePath();
  return lane;
}

function warningArrows(ctx: Ctx, x: number, y: number, angle: number, length: number): void {
  const arrow = enemyPart("eraser-warning-arrow", 26, 23, (c) => {
    flatLayer(c, { shape: path([[-8, -7], [0, -7], [8, 0], [0, 7], [-8, 7], [0, 0]]),
      color: "#ffd4cf", rim: "#fff1df", lift: 0.65, texture: 0.3 });
    crease(c, 0, 0, 7, 0, 0.75);
  }, false);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (const at of [0.28, 0.53, 0.78]) arrow.draw(ctx, { x: length * at, y: 0 });
  ctx.restore();
}

export const ERASER_BOSS_ART: EnemyArt = {
  id: "eraser-boss",
  draw: drawEraser,
  cullMargin: 80,
  previewBounds: { l: -50, r: 50, t: -91, b: 8 },
  ground(ctx, e, look) {
    // Behind the block the page is rubbed back to blank paper: a pale smear with rubbed streaks.
    if (e.spawnTime <= 0) {
      const back = look && look.x < e.x ? 1 : -1, R = enemyRadius(e);
      ctx.save();
      ctx.translate(e.x + back * R * 1.5, e.y + 1);
      ctx.scale(back, 1);
      enemyPart("eraser-smear", 120, 40, (c) => {
        c.globalAlpha = 0.55;
        flatLayer(c, { shape: new Path2D("M -40 -6 Q -10 -11 22 -8 Q 40 -6 46 -1 Q 38 6 18 8 Q -12 10 -38 6 Q -46 0 -40 -6 Z"), color: "#efe5d0", rim: "#fffaf0", lift: 0, texture: 0.3 });
        c.globalAlpha = 0.45;
        for (const [y, l] of [[-4, 30], [0, 40], [4, 26]] as const) line(c, -30, y, -30 + l, y + 0.5, "#fffaf0", 1.6);
      }, false).draw(ctx, { x: 0, y: 0, scale: R / 26 });
      ctx.restore();
    }
  },
  warning(e) {
    const a = e.act;
    if (!a || a.t <= 0) return;
    const progress = 1 - a.t / BOSS[a.kind].telegraph;
    if (a.kind === "summon") {
      const ring = new Path2D(), distance = BOSS.summon.distance;
      ring.ellipse(e.x, e.y, distance, distance * 0.6, 0, 0, Math.PI * 2);
      return { area: ring, edge: "#e0bcec", progress };
    }
    const sweep = a.kind === "sweep",
      length = sweep ? BOSS.sweep.length : BOSS.charge.speed * BOSS.charge.time,
      angle = Math.atan2(a.dy, a.dx),
      x = sweep ? a.x : e.x,
      y = sweep ? a.y : e.y;
    return {
      area: sweep ? sweepRect(a) : chargeLane(e, a, angle, length),
      ...ERASER_WARNING,
      progress,
      symbol: (ctx) => warningArrows(ctx, x, y, angle, length),
    };
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
        paperFleck(ctx, e.x + Math.cos(a) * r, e.y - 4 + Math.sin(a) * r * 0.5 - ease * 8, 2.5, "#e58e9f", a);
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
        paperFleck(ctx, x, y, 4, i % 3 ? "#f0a3b1" : "#4f6f9c", a + ease);
      }
    },
  },
};
