/** Card art for watercolour-brush, and the painted paper ribbon it trails. */
import { CATS } from "../registries.js";
import type { SimState } from "../../game/types.js";
import type { WeaponArt } from "../../render/art-registry.js";
import { paperEmblem, PAPER_LIGHT, PAPER_SHADOW } from "../../render/paper-kit.js";
import { mix, stroke, type Ctx, type Point } from "../../render/paper-material.js";

/** Ribbon look: seconds a stretch of trail stays, half-width at the brush, sample spacing. */
const RIBBON = { life: 0.9, width: 9, spacing: 7, max: 48 } as const;
/**
 * Render-only memory of where the brush passed (never SimState): positions
 * sampled from the cat, stamped with sim time, so pausing freezes the ribbon
 * and a new run (time going back) starts a fresh one.
 */
const trail: { x: number; y: number; t: number }[] = [];
let trailClock = -1;
function sampleTrail(state: SimState): void {
  const now = state.elapsed, p = state.player;
  if (now < trailClock) trail.length = 0;
  trailClock = now;
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= RIBBON.spacing) trail.push({ x: p.x, y: p.y, t: now });
  else last.t = now;
  while (trail.length && now - trail[0]!.t > RIBBON.life) trail.shift();
  if (trail.length > RIBBON.max) trail.splice(0, trail.length - RIBBON.max);
}
/**
 * A painted paper ribbon behind the cat in its own colour: hard shadow
 * down-right, translucent flat pigment tapering toward the tail, a lit cut
 * rim on the moon side, a darker watercolour edge and two dry bristle
 * streaks. Flat strokes only: no gradients.
 */
function drawRibbon(ctx: Ctx, state: SimState): void {
  sampleTrail(state);
  if (trail.length < 2) return;
  const color = CATS.get(state.player.id).stats.accent,
    n = trail.length,
    left: Point[] = [], right: Point[] = [], mid: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = trail[Math.max(0, i - 1)]!, b = trail[Math.min(n - 1, i + 1)]!, q = trail[i]!,
      dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1,
      age = Math.min(1, (state.elapsed - q.t) / RIBBON.life),
      w = RIBBON.width * (0.25 + 0.75 * (i / (n - 1))) * (1 - age * 0.6),
      nx = -dy / len, ny = dx / len, y = q.y - 2;
    left.push([q.x + nx * w, y + ny * w * 0.6]);
    right.push([q.x - nx * w, y - ny * w * 0.6]);
    mid.push([q.x, y]);
  }
  const body = new Path2D(), outline = [...left, ...[...right].reverse()];
  outline.forEach(([x, y], i) => (i ? body.lineTo(x, y) : body.moveTo(x, y)));
  body.closePath();
  const edge = (pts: readonly Point[]) => {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    return p;
  };
  // The higher edge faces the moon and gets the lit rim; the other the darker watercolour edge.
  const sumY = (pts: readonly Point[]) => pts.reduce((s, p) => s + p[1], 0),
    litLeft = sumY(left) < sumY(right);
  ctx.save();
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 1.4, PAPER_SHADOW.dy * 1.4);
  ctx.globalAlpha *= 0.22;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(body);
  ctx.restore();
  ctx.globalAlpha *= 0.66;
  ctx.fillStyle = color;
  ctx.fill(body);
  ctx.restore();
  stroke(ctx, edge(litLeft ? left : right), mix(color, PAPER_LIGHT.rim, 0.55), 1, 0.7);
  stroke(ctx, edge(litLeft ? right : left), mix(color, "#1c142b", 0.35), 1.2, 0.55);
  for (const k of [-0.35, 0.3]) {
    const streak = mid.map(([x, y], i) => [x + (left[i]![0] - x) * k, y + (left[i]![1] - y) * k] as Point);
    stroke(ctx, edge(streak), mix(color, "#fff6e4", 0.4), 0.7, 0.45);
  }
}

/** A ragged pigment bloom: a few lobes cut from one sheet (points, so the shadow keeps its direction). */
function bloom(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, k = i % 2 ? 0.72 : 1 - (i % 4 === 0 ? 0.08 : 0);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.86]);
  }
  return pts;
}

export const WATERCOLOUR_BRUSH_ART: WeaponArt = {
  id: "watercolour-brush",
  ground: drawRibbon,
  /** A cut pigment bloom behind a wooden brush whose wet tip carries the card's ink. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: bloom(13, 21, 9.5), color: "#7fb3c8", rim: "#d8eef4", lift: 0.5 },
      {
        shape: [[21, 3], [24.5, 5.2], [15.4, 18.6], [12.4, 16.6]],
        color: "#b8895a",
        rim: "#f0d3a8",
        lift: 1.1,
        fold: { from: [22.7, 4], to: [13.9, 17.6], depth: 0.14, side: 1 },
      },
      {
        shape: [[12, 15.6], [15.8, 18.4], [13.4, 23.6], [7, 28.6], [8.4, 21.8]],
        color: ink,
        lift: 1.3,
        fold: { from: [13.9, 17], to: [7.6, 27.6], depth: 0.16, side: 1 },
      },
    ]);
  },
};
