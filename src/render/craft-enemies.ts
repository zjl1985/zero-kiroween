/**
 * Shared papercraft enemy pieces (googly eyes, spawn rings, hp strips, elite
 * crowns, dashed telegraphs, puddles and ink drops). Each enemy kind's own
 * body, telegraphs and effects live in its art file
 * (src/defs/enemies/<id>/art.ts) and are looked up in ENEMY_ART.
 * Render only: reads SimState, never mutates it or uses the RNG.
 */
import {
  path,
  oval,
  stroke,
  stitch,
  line,
  hash,
  type Ctx,
  type Point,
} from "./paper-material.js";
import { cachedSprite } from "../engine/sprite.js";
import { flatLayer, flatShadow } from "./paper-kit.js";
import { ENEMIES, ENEMY_FX_LIFE, SMUDGE } from "../game/enemies.js";
import { enemyMaxHp, enemyRadius } from "../game/sim.js";
import type { EnemyShotState, EnemyState, Impact, SimState } from "../game/types.js";
import { ENEMY_ART, effectPainter } from "./art-registry.js";

export interface Look {
  x: number;
  y: number;
}
/** Finite static cuts only: callers hinge/scale them without time or actor-id cache keys. */
export function enemyPart(key: string, w: number, h: number, paint: (ctx: Ctx) => void) {
  return cachedSprite(`enemy-part:${key}`, w, h, 2, (ctx) => {
    ctx.translate(w / 2, h / 2);
    paint(ctx);
  }, { x: 0.5, y: 0.5 });
}
export function enemyShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / 16, ry / 5);
  enemyPart("contact", 48, 24, (c) => flatShadow(c, 0, 0, 16, 5, 1.15)).draw(ctx, { x: 0, y: 0 });
  ctx.restore();
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
  enemyPart("eye", 16, 18, (c) => {
    flatLayer(c, { shape: oval(0, 0, 4, 4.2, 3, 0.05), color: "#f6efe0", lift: 0.55, rim: "#ffffff", texture: 0.2, thickness: 0.6 });
  }).draw(ctx, { x, y, scale: r / 4 });
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
  const hit = Math.max(0, Math.min(1, (e.hitFlash ?? 0) / 0.14));
  ctx.save();
  // Fold under a hit, then spring back. The feet stay anchored to collision space.
  ctx.translate(e.x, e.y);
  ctx.scale(1 + hit * 0.08, 1 - hit * 0.1);
  ctx.rotate((e.id % 2 ? -1 : 1) * hit * 0.035);
  ctx.translate(-e.x, -e.y);
  drawEnemyBody(ctx, e, (e.stun ?? 0) > 0 ? 0 : time, look);
  ctx.restore();
}

function drawEnemyBody(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  const art = ENEMY_ART.get(e.kind);
  if (!e.elite) {
    art.draw(ctx, e, time, look);
    return;
  }
  const base = ENEMIES[e.kind].radius, radius = enemyRadius(e), k = radius / base;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(k, k);
  ctx.translate(-e.x, -e.y);
  // The body is drawn at its base size inside the scale, on a flat gold paper rosette.
  enemyPart("elite-rosette", 72, 36, (c) => {
    const pts: Point[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 0.86 : 1;
      pts.push([Math.cos(a) * 30 * rr, Math.sin(a) * 11 * rr]);
    }
    c.globalAlpha = 0.72;
    flatLayer(c, { shape: path(pts), color: "#c99a45", lift: 0.5, rim: "#ffe7a6", texture: 0.3 });
  }).draw(ctx, { x: e.x, y: e.y + 1, scale: base / 12 });
  art.draw(ctx, { ...e, radius: base }, time, look);
  ctx.restore();
  if (e.spawnTime <= 0) drawEliteCrown(ctx, e.x, e.y + (art.crownY ?? -base * 2.05) * k, radius / 14, e.id, time);
}
/** A small folded gold-paper crown with stitched band. */
function drawEliteCrown(ctx: Ctx, x: number, y: number, s: number, seed: number, time: number): void {
  const bob = Math.sin(time * 2.6 + seed) * 1.2;
  enemyPart("elite-crown", 42, 32, (c) => {
    const crown = path([[-13, 3.2], [-12.35, -5.6], [-5.85, -0.4], [0, -8.4], [5.85, -0.4], [12.35, -5.6], [13, 3.2]]);
    flatLayer(c, { shape: crown, color: "#e5bd62", lift: 1.1, rim: "#fff0c4", texture: 0.4, thickness: 1.2 });
    c.fillStyle = "#ac7f45";
    c.fill(path([[0, -8.4], [0, 3], [5.85, -0.4]]));
    stitch(c, path([[-11.7, 1.2], [11.7, 1.2]]), "#9c7434", 0.8);
    c.fillStyle = "#c2493f";
    c.fill(oval(0, -2, 1.6, 1.6));
  }).draw(ctx, { x, y: y + bob, scale: s });
}
export function dashed(ctx: Ctx, p: Path2D, color: string, alpha: number, width = 1.4): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = 0;
  stroke(ctx, p, "#1b1424", width + 1.4, alpha * 0.5);
  stroke(ctx, p, color, width, alpha);
  ctx.restore();
}

/** World-space circular splash footprint; never flatten a radial damage test. */
export function dangerRing(ctx: Ctx, x: number, y: number, radius: number, progress: number): void {
  const ring = new Path2D();
  ring.arc(x, y, radius, 0, Math.PI * 2);
  ctx.save();
  ctx.globalAlpha *= 0.12 + Math.max(0, Math.min(1, progress)) * 0.2;
  ctx.fillStyle = "#eab2cb";
  ctx.fill(ring);
  ctx.restore();
  dashed(ctx, ring, "#ffe2bb", 0.9, 1.6);
  const r = radius * 0.3;
  line(ctx, x - r, y - r, x + r, y + r, "#ffe2bb", 1.2, 0.85);
  line(ctx, x - r, y + r, x + r, y - r, "#ffe2bb", 1.2, 0.85);
}
/** Puddles, landing marks and Boss telegraphs, drawn flat on the yard. */
export function drawEnemyGround(ctx: Ctx, state: SimState): void {
  for (const h of state.hazards) {
    const k = h.life / h.maxLife, v = Math.abs(h.id) % 3;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 3) * 0.85;
    enemyPart(`ink-puddle:${v}`, 58, 40, (c) => {
      flatLayer(c, { shape: oval(0, 0, 20, 12.4, v, 0.28), color: "#33263f", lift: 0, rim: "#6c5486", texture: 0.45 });
      c.fillStyle = "#8a74a855";
      c.fill(oval(-6, -3.6, 5.6, 2.4, v + 2));
    }).draw(ctx, { x: h.x, y: h.y, scale: h.radius / 20 });
    ctx.restore();
  }
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    const k = Math.min(1, s.t / s.flight);
    dangerRing(ctx, s.tx, s.ty, SMUDGE.splashRadius, k);
  }
  for (const e of state.enemies) if (e.alive) ENEMY_ART.find(e.kind)?.ground?.(ctx, e, state.player);
}
/** A slow ink drop arcing toward its locked landing spot. */
export function drawEnemyShot(ctx: Ctx, s: EnemyShotState): void {
  const k = Math.min(1, s.t / s.flight),
    x = s.x0 + (s.tx - s.x0) * k,
    gy = s.y0 + (s.ty - s.y0) * k,
    lift = 32 + Math.sin(k * Math.PI) * 46 - k * 18;
  enemyShadow(ctx, x, gy, 4, 1.5);
  enemyPart("ink-drop", 24, 28, (c) => {
    flatLayer(c, { shape: new Path2D("M 0 -8 Q 5 -1 4 4 Q 0 10 -4 4 Q -5 -1 0 -8 Z"), color: "#3a2c4b", rim: "#8a6fa3", texture: 0.35 });
    line(c, -2, -1, -2, 3, "#b5a0bd", 0.9, 0.7);
  }).draw(ctx, { x, y: gy - lift });
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
