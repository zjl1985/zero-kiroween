/**
 * Papercraft enemies beyond the ink blob: folded paper bats, crumpled paper
 * balls, ink-stained smudges and the Eraser Boss, plus their dashed cut-paper
 * telegraphs. Render only: reads SimState, never mutates it or uses the RNG.
 */
import {
  piece,
  path,
  oval,
  stroke,
  stitch,
  line,
  glow,
  shadow,
  hash,
  type Ctx,
  type Point,
} from "./paper-material.js";
import { drawCraftBlob } from "./craft-combat.js";
import { BOSS, ENEMIES, ENEMY_FX_LIFE, SMUDGE } from "../game/enemies.js";
import { enemyMaxHp, enemyRadius } from "../game/sim.js";
import type {
  BossAct,
  EnemyShotState,
  EnemyState,
  Impact,
  SimState,
} from "../game/types.js";

interface Look {
  x: number;
  y: number;
}
/**
 * Googly paper eyes: the pupil rolls toward the cat and the lid blinks on a
 * per-enemy rhythm (idea from "eye button" UI effects; drawn here from scratch).
 */
function googly(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  look: Look,
  time: number,
  id: number,
  angry = false,
): void {
  const dx = look.x - x,
    dy = look.y - y,
    d = Math.hypot(dx, dy) || 1,
    reach = r * 0.42,
    px = x + (dx / d) * reach,
    py = y + (dy / d) * reach * 0.8,
    beat = (time * 0.55 + hash(id * 7 + 1) * 4) % 4,
    blink = beat < 0.13;
  piece(ctx, oval(x, y, r, r * 1.05, id + 3, 0.05), "#f6efe0", {
    shadow: 0.6,
    edge: "#ffffff",
    texture: 0.25,
    thickness: 0.45,
  });
  if (blink) {
    line(ctx, x - r * 0.8, y, x + r * 0.8, y, "#2a2033", 1.1);
    return;
  }
  ctx.fillStyle = "#1d1726";
  ctx.fill(oval(px, py, r * 0.48, r * 0.5, id + 5, 0.02));
  ctx.fillStyle = "#ffffffcc";
  ctx.fill(oval(px - r * 0.18, py - r * 0.2, r * 0.13, r * 0.13));
  if (angry)
    line(ctx, x - r, y - r * 1.15, x + r * 0.9, y - r * 0.55, "#2a2033", 1.3);
}
function spawning(ctx: Ctx, e: EnemyState, color: string): boolean {
  if (e.spawnTime <= 0) return false;
  const r = enemyRadius(e);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([3, 2.5]);
  stroke(ctx, oval(e.x, e.y, r * 0.6 + (1 - Math.min(1, e.spawnTime)) * r, r * 0.3), color, 1);
  ctx.restore();
  return true;
}
function hpStrip(ctx: Ctx, e: EnemyState, y: number, w: number): void {
  const max = enemyMaxHp(e);
  if (e.hp >= max) return;
  line(ctx, e.x - w / 2, y, e.x + w / 2, y, "#433b4a", 1.5);
  line(ctx, e.x - w / 2, y, e.x - w / 2 + (e.hp / max) * w, y, "#b69ac4", 1.5);
}
/** Folded black paper with notched wings and a centre crease. */
function drawBat(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#6d6283")) return;
  const flap = Math.sin(time * 15 + e.id * 1.3),
    hover = 20 + Math.sin(time * 3 + e.id) * 2,
    x = e.x,
    y = e.y - hover,
    face = look.x < x ? -1 : 1;
  shadow(ctx, x, e.y, 9, 3);
  for (const side of [-1, 1]) {
    const tip = y - 6 - flap * 7,
      pts: Point[] = [
        [x + side * 3, y - 2],
        [x + side * 9, y - 7 - flap * 3],
        [x + side * 17, tip],
        [x + side * 15, y + 2 - flap * 2],
        [x + side * 12, y - 1 - flap * 2],
        [x + side * 10, y + 4 - flap],
        [x + side * 7, y + 1],
        [x + side * 4, y + 5],
      ];
    piece(ctx, path(pts), side === face ? "#2d2638" : "#25202f", {
      shadow: 1.6,
      edge: "#6c5f86",
      texture: 0.7,
      thickness: 0.7,
    });
    // The fold that turns a flat cutout into a wing.
    line(ctx, x + side * 4, y, x + side * 15, tip + 2, "#5a4e70", 0.7, 0.8);
  }
  const body = path([
    [x - 4, y - 5],
    [x - 3, y - 10],
    [x - 1.5, y - 7],
    [x + 1.5, y - 7],
    [x + 3, y - 10],
    [x + 4, y - 5],
    [x + 4, y + 3],
    [x, y + 6],
    [x - 4, y + 3],
  ]);
  piece(ctx, body, "#1f1a28", {
    shadow: 1,
    edge: "#7b6d93",
    texture: 0.6,
    thickness: 0.6,
  });
  line(ctx, x, y - 6, x, y + 5, "#4c4160", 0.6);
  for (const dx of [-1.7, 1.7]) googly(ctx, x + dx, y - 3, 1.7, look, time, e.id + (dx > 0 ? 1 : 0));
  hpStrip(ctx, e, e.y + 6, 14);
}
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
/** Dispatches every enemy kind to its papercraft drawing. Elites are drawn larger with a crown. */
export function drawCraftEnemy(
  ctx: Ctx,
  e: EnemyState,
  time: number,
  look: Look,
): void {
  if (!e.elite) {
    drawEnemyBody(ctx, e, time, look);
    return;
  }
  const base = ENEMIES[e.kind].radius,
    k = enemyRadius(e) / base;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(k, k);
  ctx.translate(-e.x, -e.y);
  // The body is drawn at its base size inside the scale, with a gold rim glow.
  glow(ctx, e.x, e.y - base, base * 2.4, "#f2c46a", 0.22);
  drawEnemyBody(ctx, { ...e, radius: base }, time, look);
  ctx.restore();
  if (e.spawnTime <= 0) drawEliteCrown(ctx, e.x, e.y - enemyRadius(e) * 2.05, enemyRadius(e) / 14, e.id, time);
}
/** A small folded gold-paper crown with stitched band. */
function drawEliteCrown(ctx: Ctx, x: number, y: number, s: number, seed: number, time: number): void {
  const bob = Math.sin(time * 2.6 + seed) * 1.2,
    w = 13 * s,
    h = 8 * s,
    cy = y + bob,
    crown = path([
      [x - w, cy + h * 0.4],
      [x - w * 0.95, cy - h * 0.7],
      [x - w * 0.45, cy - h * 0.05],
      [x, cy - h * 1.05],
      [x + w * 0.45, cy - h * 0.05],
      [x + w * 0.95, cy - h * 0.7],
      [x + w, cy + h * 0.4],
    ]);
  piece(ctx, crown, "#e5bd62", { shadow: 1.2, edge: "#fff0c4", texture: 0.5, thickness: 0.8 });
  stitch(ctx, path([[x - w * 0.9, cy + h * 0.15], [x + w * 0.9, cy + h * 0.15]]), "#9c7434", 0.8);
  ctx.fillStyle = "#c2493f";
  ctx.fill(oval(x, cy - h * 0.25, 1.6 * s, 1.6 * s, seed));
}
function drawEnemyBody(
  ctx: Ctx,
  e: EnemyState,
  time: number,
  look: Look,
): void {
  switch (e.kind) {
    case "paper-bat":
      drawBat(ctx, e, time, look);
      return;
    case "crumple":
      drawCrumple(ctx, e, time, look);
      return;
    case "smudge":
      drawSmudge(ctx, e, time, look);
      return;
    case "eraser-boss":
      drawEraser(ctx, e, time, look);
      return;
    default:
      drawCraftBlob(
        ctx,
        e.x,
        e.y,
        time,
        e.id,
        (e.hp / enemyMaxHp(e)) * ENEMIES["ink-blob"].hp,
        e.slowTime > 0,
        e.spawnTime,
      );
  }
}
function dashed(ctx: Ctx, p: Path2D, color: string, alpha: number, width = 1.4): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = 0;
  stroke(ctx, p, "#1b1424", width + 1.4, alpha * 0.5);
  stroke(ctx, p, color, width, alpha);
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
/** Puddles, landing marks and Boss telegraphs, drawn flat on the yard. */
export function drawEnemyGround(ctx: Ctx, state: SimState): void {
  for (const h of state.hazards) {
    const k = h.life / h.maxLife,
      p = oval(h.x, h.y, h.radius, h.radius * 0.62, h.id, 0.28);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 3) * 0.85;
    piece(ctx, p, "#33263f", { shadow: 0, edge: "#6c5486", texture: 0.5, thickness: 0.8 });
    ctx.fillStyle = "#8a74a855";
    ctx.fill(oval(h.x - h.radius * 0.3, h.y - h.radius * 0.18, h.radius * 0.28, h.radius * 0.12, h.id + 2));
    ctx.restore();
  }
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    const k = Math.min(1, s.t / s.flight);
    dashed(ctx, oval(s.tx, s.ty, SMUDGE.splashRadius, SMUDGE.splashRadius * 0.6), "#c99ad8", 0.5 + k * 0.4, 1.1);
    ctx.save();
    ctx.globalAlpha = 0.25 + k * 0.3;
    ctx.fillStyle = "#3a2c4b";
    ctx.fill(oval(s.tx, s.ty, SMUDGE.splashRadius * k, SMUDGE.splashRadius * 0.6 * k));
    ctx.restore();
  }
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.kind === "smudge" && (e.windup ?? 0) > 0 && e.tx !== undefined && e.ty !== undefined)
      dashed(ctx, oval(e.tx, e.ty, SMUDGE.splashRadius, SMUDGE.splashRadius * 0.6), "#c99ad8", 0.6, 1);
    const a = e.act;
    if (e.kind !== "eraser-boss" || !a || a.t <= 0) continue;
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
  }
}
/** A slow ink drop arcing toward its locked landing spot. */
export function drawEnemyShot(ctx: Ctx, s: EnemyShotState): void {
  const k = Math.min(1, s.t / s.flight),
    x = s.x0 + (s.tx - s.x0) * k,
    gy = s.y0 + (s.ty - s.y0) * k,
    lift = 32 + Math.sin(k * Math.PI) * 46 - k * 18;
  shadow(ctx, x, gy, 4, 1.5);
  piece(
    ctx,
    new Path2D(`M ${x} ${gy - lift - 6} q 4.5 5 3.5 8 a 3.6 3.6 0 1 1 -7 0 q -1 -3 3.5 -8 Z`),
    "#3a2c4b",
    { shadow: 1, edge: "#8a6fa3", texture: 0.4, thickness: 0.5 },
  );
}
/** Splats, erase smears, summons, crumple bursts and the Boss's defeat. */
export function drawEnemyEffect(ctx: Ctx, e: Impact): boolean {
  if (!(e.kind in ENEMY_FX_LIFE)) return false;
  const life = ENEMY_FX_LIFE[e.kind as keyof typeof ENEMY_FX_LIFE],
    t = Math.min(1, Math.max(0, 1 - e.life / life)),
    fade = 1 - t,
    ease = 1 - (1 - t) ** 3;
  ctx.save();
  ctx.globalAlpha = fade;
  if (e.kind === "splat") {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3,
        r = 6 + ease * 16;
      ctx.fillStyle = "#3a2c4b";
      ctx.fill(oval(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.55, 2.4 * fade + 0.8, 1.8 * fade + 0.6, i));
    }
  } else if (e.kind === "erase") {
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
  } else if (e.kind === "summon") {
    dashed(ctx, oval(e.x, e.y, 14 + ease * 40, (14 + ease * 40) * 0.6), "#c99ad8", fade, 1.6);
  } else if (e.kind === "crumple") {
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
  } else if (e.kind === "boss-down") {
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
  }
  ctx.restore();
  return true;
}
function box(x: number, y: number, w: number, h: number, seed: number): Path2D {
  const a = seed * 0.9,
    c = Math.cos(a),
    s = Math.sin(a),
    pts: Point[] = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ];
  return path(pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c] as Point));
}
