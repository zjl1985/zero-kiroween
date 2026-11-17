/**
 * Shared papercraft enemy pieces (googly eyes, spawn rings, hp strips, elite
 * crowns, dashed telegraphs, puddles and ink drops). Each enemy kind's own
 * body, telegraphs and effects live in its art file
 * (src/defs/enemies/<id>/art.ts) and are looked up in ENEMY_ART.
 * Render only: reads SimState, never mutates it or uses the RNG.
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
import { ENEMIES, ENEMY_FX_LIFE, SMUDGE } from "../game/enemies.js";
import { enemyMaxHp, enemyRadius } from "../game/sim.js";
import type { EnemyShotState, EnemyState, Impact, SimState } from "../game/types.js";
import { ENEMY_ART, effectPainter } from "./art-registry.js";

export interface Look {
  x: number;
  y: number;
}
/**
 * Googly paper eyes: the pupil rolls toward the cat and the lid blinks on a
 * per-enemy rhythm (idea from "eye button" UI effects; drawn here from scratch).
 */
export function googly(
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
export function spawning(ctx: Ctx, e: EnemyState, color: string): boolean {
  if (e.spawnTime <= 0) return false;
  const r = enemyRadius(e);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([3, 2.5]);
  stroke(ctx, oval(e.x, e.y, r * 0.6 + (1 - Math.min(1, e.spawnTime)) * r, r * 0.3), color, 1);
  ctx.restore();
  return true;
}
export function hpStrip(ctx: Ctx, e: EnemyState, y: number, w: number): void {
  const max = enemyMaxHp(e);
  if (e.hp >= max) return;
  line(ctx, e.x - w / 2, y, e.x + w / 2, y, "#433b4a", 1.5);
  line(ctx, e.x - w / 2, y, e.x - w / 2 + (e.hp / max) * w, y, "#b69ac4", 1.5);
}
/** Draws an enemy through its registered art. Elites are drawn larger with a crown. */
export function drawCraftEnemy(
  ctx: Ctx,
  e: EnemyState,
  time: number,
  look: Look,
): void {
  if (!e.elite) {
    ENEMY_ART.get(e.kind).draw(ctx, e, time, look);
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
  ENEMY_ART.get(e.kind).draw(ctx, { ...e, radius: base }, time, look);
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
export function dashed(ctx: Ctx, p: Path2D, color: string, alpha: number, width = 1.4): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = 0;
  stroke(ctx, p, "#1b1424", width + 1.4, alpha * 0.5);
  stroke(ctx, p, color, width, alpha);
  ctx.restore();
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
  for (const e of state.enemies) if (e.alive) ENEMY_ART.find(e.kind)?.ground?.(ctx, e);
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
  effectPainter(e.kind)?.(ctx, e, { t, fade, ease });
  ctx.restore();
  return true;
}
export function box(x: number, y: number, w: number, h: number, seed: number): Path2D {
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
