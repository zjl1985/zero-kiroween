/** Native pixel enemy support: cached integer-grid parts, stepped spawn/elite
 * markers and shared attack telegraphs. Geometry and timing remain simulation-owned.
 */
import { path, stroke, type Ctx, type Point } from "./paper-material.js";
import { cachedSprite } from "../engine/sprite.js";
import { reducedPaperMotion } from "./paper-motion.js";
import { liveSketchStep, sketchedPart } from "./sprite-sketch.js";
import { ENEMIES, ENEMY_FX_LIFE, SMUDGE } from "../game/enemies.js";
import { enemyMaxHp, enemyRadius } from "../game/sim.js";
import type { EnemyShotState, EnemyState, Impact, SimState } from "../game/types.js";
import { ENEMY_ART, effectPainter, type EnemyWarning } from "./art-registry.js";
import { lobFlightTime, type KiteLobParams } from "../defs/enemies/behaviours.js";
import { WASH_DRIP } from "../defs/enemies/wash/def.js";

export interface Look {
  x: number;
  y: number;
}
/**
 * Finite static cuts only: callers hinge/scale them without time or actor-id cache keys.
 * Native parts carry their own palette outline; the legacy rim argument is retained
 * for callers but no paper material pass is applied.
 */
export function enemyPart(key: string, w: number, h: number, paint: (ctx: Ctx) => void, rim = true) {
  const part = cachedSprite(`pixel-enemy-part:${key}`, w, h, 1, (ctx) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    paint(ctx);
    ctx.restore();
    // Native pixels carry their authored outline; no paper rim/filter pass.
  }, { x: 0.5, y: 0.5 });
  // On colourless paper (drawSketchedParts) the same part stamps its cached pencil variant.
  const step = liveSketchStep();
  return step > 0 ? sketchedPart(part, step) : part;
}
export function enemyShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = "#172631";
  ctx.fillRect(Math.round(x - rx), Math.round(y - ry / 2), Math.round(rx * 2), Math.max(1, Math.round(ry)));
  ctx.fillRect(Math.round(x - rx * 0.7), Math.round(y - ry), Math.round(rx * 1.4), Math.max(1, Math.round(ry * 2)));
  ctx.restore();
}
/**
 * Googly paper eyes: the pupil rolls toward the cat and the lid blinks on a
 * per-enemy rhythm (idea from "eye button" UI effects; drawn here from scratch).
 */
export function googly(ctx: Ctx, x: number, y: number, r: number, look: Look, time: number, id: number, angry = false): void {
  const size = Math.max(2, Math.round(r * 2)), dx = Math.sign(look.x - x), dy = Math.sign(look.y - y);
  ctx.save(); ctx.fillStyle = "#f6efe0";
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  ctx.fillStyle = "#192333";
  ctx.fillRect(Math.round(x - 1 + dx), Math.round(y - 1 + dy), 2, 3);
  if (angry) ctx.fillRect(Math.round(x - r), Math.round(y - r - 2), size, 2);
  ctx.restore();
}
export function spawning(ctx: Ctx, e: EnemyState, color: string): boolean {
  if (e.spawnTime <= 0) return false;
  const r = Math.round(enemyRadius(e));
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.fillStyle = color;
  ctx.fillRect(Math.round(e.x - r), Math.round(e.y - 2), r * 2, 3);
  ctx.fillRect(Math.round(e.x - r - 3), Math.round(e.y - 5), 3, 8);
  ctx.fillRect(Math.round(e.x + r), Math.round(e.y - 5), 3, 8);
  ctx.restore(); return true;
}
export function hpStrip(ctx: Ctx, e: EnemyState, y: number, w: number): void {
  const max = enemyMaxHp(e);
  if (e.hp >= max) return;
  ctx.save(); ctx.fillStyle = "#192333";
  ctx.fillRect(Math.round(e.x - w / 2), Math.round(y), Math.round(w), 3);
  ctx.fillStyle = "#b69ac4";
  ctx.fillRect(Math.round(e.x - w / 2 + 1), Math.round(y + 1), Math.max(0, Math.round(e.hp / max * (w - 2))), 1);
  ctx.restore();
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
  // One-pixel hit recoil; keep the collision-space foot anchor and crisp sprite grid.
  ctx.translate(e.x, e.y);
  if (!reducedPaperMotion() && hit > 0.5) ctx.translate(e.id % 2 ? -1 : 1, 0);
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
  // A stepped gold floor marker distinguishes elites without paper rosettes.
  ctx.save(); ctx.fillStyle = "#b68b43"; ctx.globalAlpha *= 0.65;
  ctx.fillRect(Math.round(e.x - base * 1.8), Math.round(e.y - 2), Math.round(base * 3.6), 5);
  ctx.fillRect(Math.round(e.x - base * 1.3), Math.round(e.y - 5), Math.round(base * 2.6), 10);
  ctx.restore();
  art.draw(ctx, { ...e, radius: base }, time, look);
  ctx.restore();
  if (e.spawnTime <= 0) drawEliteCrown(ctx, e.x, e.y + (art.crownY ?? -base * 2.05) * k, radius / 14, e.id, time);
}
/** Native gold crown with three stepped prongs, static under reduced motion. */
function drawEliteCrown(ctx: Ctx, x: number, y: number, s: number, seed: number, time: number): void {
  const bob = reducedPaperMotion() ? 0 : Math.round(Math.sin(time * 2.6 + seed));
  enemyPart("elite-crown", 32, 24, (c) => {
    c.fillStyle = "#192333"; c.fillRect(-12, -4, 24, 10);
    for (const px of [-12, -3, 8]) c.fillRect(px, px === -3 ? -11 : -8, 5, 10);
    c.fillStyle = "#e3b85d"; c.fillRect(-10, -3, 20, 7);
    for (const px of [-11, -2, 9]) c.fillRect(px, px === -2 ? -9 : -6, 3, 8);
    c.fillStyle = "#fff0b4"; c.fillRect(-9, 0, 18, 1);
    c.fillStyle = "#bd4d50"; c.fillRect(-1, 1, 3, 2);
  }, false).draw(ctx, { x: Math.round(x), y: Math.round(y + bob), scale: s });
}
export function dashed(ctx: Ctx, p: Path2D, color: string, alpha: number, width = 1.4): void {
  ctx.save();
  stroke(ctx, p, "#2a192e", width + 2, alpha * 0.9);
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = 0;
  stroke(ctx, p, color, width, alpha);
  ctx.restore();
}

const LOB_PALETTES = {
  ink: { fill: "#b86f86", edge: "#ffc486" },
  water: { fill: "#5d9fba", edge: "#a6e6f7" },
} as const;

/** World-space circular splash footprint; never flatten a radial damage test. */
function lobTarget(x: number, y: number, radius: number, progress: number, kind: "ink" | "water"): EnemyWarning {
  const area = new Path2D(), palette = LOB_PALETTES[kind];
  area.arc(x, y, radius, 0, Math.PI * 2);
  return { area, ...palette, progress, symbol: (ctx) => drawLobSymbol(ctx, x, y, radius, kind) };
}

function drawLobSymbol(ctx: Ctx, x: number, y: number, radius: number, kind: "ink" | "water"): void {
  const { edge } = LOB_PALETTES[kind];
  ctx.save(); ctx.fillStyle = edge;
  if (kind === "water") {
    for (let row = 0; row < 7; row++) {
      const half = row < 4 ? row + 1 : 7 - row;
      ctx.fillRect(Math.round(x - half), Math.round(y - 7 + row * 2), half * 2, 2);
    }
  } else {
    const r = Math.round(radius * 0.24);
    for (let i = -r; i <= r; i += 2) {
      ctx.fillRect(Math.round(x + i - 1), Math.round(y + i - 1), 3, 3);
      ctx.fillRect(Math.round(x + i - 1), Math.round(y - i - 1), 3, 3);
    }
  }
  ctx.restore();
}

/** Start the landing mark at aim lock and carry the same countdown into flight. */
export function lobWarning(e: EnemyState, lob: KiteLobParams & { splashRadius: number }): EnemyWarning | undefined {
  const remaining = e.windup ?? 0;
  if (remaining <= 0 || e.tx === undefined || e.ty === undefined) return;
  const flight = lobFlightTime(Math.hypot(e.tx - e.x, e.ty - e.y), lob);
  return lobTarget(e.tx, e.ty, lob.splashRadius, (lob.windup - remaining) / (lob.windup + flight), lob.shot ?? "ink");
}

/** Ink stains and trails sit under the warning tape. */
export function drawEnemyGround(ctx: Ctx, state: SimState): void {
  for (const h of state.hazards) {
    if (h.life <= 0) continue;
    const k = h.life / h.maxLife, ry = h.radius / SMUDGE.puddleAspect;
    ctx.save(); ctx.globalAlpha *= Math.min(1, k * 3) * 0.85;
    // Pixel rows follow the unchanged ellipse footprint; no independent hazard geometry.
    for (let dy = -Math.floor(ry); dy <= ry; dy += 2) {
      const half = Math.floor(h.radius * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
      ctx.fillStyle = dy < -ry * 0.4 ? "#735d87" : "#392d4a";
      ctx.fillRect(Math.round(h.x - half), Math.round(h.y + dy), half * 2, 2);
    }
    ctx.restore();
  }
  for (const e of state.enemies) if (e.alive) ENEMY_ART.find(e.kind)?.ground?.(ctx, e, state.player);
}

/** Collect both passes from the same paths and attack clocks for the current frame. */
export function enemyWarnings(state: SimState): EnemyWarning[] {
  const warnings: EnemyWarning[] = [];
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    const lob = s.kind === "water" ? WASH_DRIP : SMUDGE;
    const k = (lob.windup + s.t) / (lob.windup + s.flight);
    warnings.push(lobTarget(s.tx, s.ty, lob.splashRadius, k, s.kind ?? "ink"));
  }
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const warning = ENEMY_ART.find(e.kind)?.warning?.(e);
    if (warning) warnings.push(warning);
  }
  return warnings;
}

export function drawWarningGround(ctx: Ctx, warnings: readonly EnemyWarning[]): void {
  for (const { area, fill, progress, symbol } of warnings) {
    if (fill) {
      const k = Math.max(0, Math.min(1, progress));
      ctx.save();
      ctx.globalAlpha *= 0.1 + k * 0.16;
      ctx.fillStyle = fill;
      ctx.fill(area);
      ctx.restore();
    }
    symbol?.(ctx);
  }
}

export function drawWarningEdges(ctx: Ctx, warnings: readonly EnemyWarning[]): void {
  for (const { area, edge, progress } of warnings) {
    const k = Math.max(0, Math.min(1, progress));
    dashed(ctx, area, edge, 0.85 + k * 0.15, 1.6 + k * 0.35);
  }
}
/** A slow ink drop arcing toward its locked landing spot. */
export function drawEnemyShot(ctx: Ctx, s: EnemyShotState): void {
  const k = Math.min(1, s.t / s.flight),
    x = s.x0 + (s.tx - s.x0) * k,
    gy = s.y0 + (s.ty - s.y0) * k,
    lift = 32 + Math.sin(k * Math.PI) * 46 - k * 18;
  enemyShadow(ctx, x, gy, 4, 1.5);
  const water = s.kind === "water";
  enemyPart(water ? "water-drop" : "ink-drop", 24, 28, (c) => {
    c.fillStyle = "#192333";
    c.fillRect(-2, -8, 4, 4); c.fillRect(-4, -4, 8, 5); c.fillRect(-5, 1, 10, 6); c.fillRect(-3, 7, 6, 2);
    c.fillStyle = water ? "#7fb3c8" : "#624a7b";
    c.fillRect(-1, -6, 2, 3); c.fillRect(-3, -3, 6, 8); c.fillRect(-2, 5, 4, 2);
    c.fillStyle = water ? "#c8e9e8" : "#ac8fbd"; c.fillRect(-2, -2, 2, 4);
  }, false).draw(ctx, { x: Math.round(x), y: Math.round(gy - lift) });
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
