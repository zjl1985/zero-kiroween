/** Pixel presentation cues. Cue phases/camera timing remain in timeline.ts;
 * this module only replaces the visual language and never writes game state. */
import type { SimState } from "../game/types.js";
import { bossEnemy } from "../game/sim.js";
import { rect, line, ellipse, polygon, type Ctx } from "./pixel-art.js";
import { visHash } from "./hash.js";
import { catArt } from "./art-registry.js";
import { cameraProjection, type Camera, type ViewSize } from "./camera.js";
import { beatFor, clamp01, cueEnvelope, cuePhase, easeInOut, easeOutCubic, PHASES, type Cue, type Phase } from "./timeline.js";

const SPARKS = ["#f3ca70", "#a2d1b2", "#e88970", "#bda6db", "#f7e5a4"] as const;
function since(c: Cue, phase: Phase): number {
  const beat = beatFor(c.kind, false); let start = 0;
  for (const p of PHASES) { if (p === phase) break; start += beat[p]; }
  return c.t - start;
}
function spark(ctx: Ctx, x: number, y: number, size: number, color: string): void {
  const k = Math.max(1, Math.round(size / 2));
  rect(ctx, x - k, y - k * 2, k * 2, k * 4, color);
  rect(ctx, x - k * 2, y - k, k * 4, k * 2, color);
  rect(ctx, x, y, k, k, "#fff1be");
}
function burst(ctx: Ctx, x: number, y: number, k: number, count: number, reach: number, seed: number): void {
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.globalAlpha *= 1 - k;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + visHash(seed + i) * .3,
      r = easeOutCubic(k) * reach * (.6 + visHash(seed + i * 13) * .4),
      px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * .65 + k * k * 20;
    spark(ctx, px, py, i % 3 ? 2 : 4, SPARKS[i % SPARKS.length]!);
  }
  ctx.restore();
}
function ring(ctx: Ctx, x: number, y: number, r: number, color: string, phase: number): void {
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 + phase, b = a + .2;
    line(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * .55,
      x + Math.cos(b) * r, y + Math.sin(b) * r * .55, color, 2);
  }
}
export function drawCueWorld(ctx: Ctx, cues: readonly Cue[], sim: SimState, time: number, reduced: boolean): void {
  if (reduced) return;
  for (const c of cues) {
    const p = cuePhase(c, false);
    if (!p.phase) continue;
    const evolution = c.kind === "evolution";
    if (!evolution && c.kind !== "boss" && c.kind !== "boss-down") continue;
    const x = evolution ? sim.player.x : c.x, y = evolution ? sim.player.y - 20 : c.y;
    if (x === undefined || y === undefined) continue;
    const tone = evolution ? catArt(sim.player.id).colors.evolve : c.kind === "boss" ? "#e58687" : "#e8c372";
    ctx.save();
    ctx.globalAlpha *= cueEnvelope(c, false);
    if (p.phase === "anticipation") {
      ring(ctx, x, y + 14, evolution ? 90 - p.local * 55 : 30 + p.local * 40, tone, Math.floor(time * 12) / 24);
      if (!evolution) ellipse(ctx, x, y, 30 + p.local * 40, 10 + p.local * 14, "#1c2339");
    }
    if (p.phase === "reveal" || p.phase === "burst") {
      const r = 22 + Math.sin(p.local * Math.PI) * 8;
      for (const side of [-1, 1]) {
        const dx = x + side * r;
        rect(ctx, dx - 2, y - 14, 4, 28, tone);
        rect(ctx, dx - (side > 0 ? 6 : 0), y - 18, 8, 4, "#f4dfa1");
        rect(ctx, dx - (side > 0 ? 6 : 0), y + 14, 8, 4, "#f4dfa1");
      }
      ring(ctx, x, y + 18, 35 + p.local * 20, tone, 0);
    }
    const b = since(c, "burst"), beat = beatFor(c.kind, false);
    if (b >= 0) burst(ctx, x, y, clamp01(b / (beat.burst + beat.settle)), evolution ? 26 : 34,
      evolution ? 120 : 170, evolution ? 911 : 517);
    ctx.restore();
  }
}
function fill(ctx: Ctx, view: ViewSize, color: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, alpha);
  rect(ctx, 0, 0, view.width, view.height, color); ctx.restore();
}
function frame(ctx: Ctx, view: ViewSize, color: string, alpha: number): void {
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < 4; i++) {
    const inset = i * 4;
    rect(ctx, inset, inset, view.width - inset * 2, 4, color);
    rect(ctx, inset, view.height - inset - 4, view.width - inset * 2, 4, color);
    rect(ctx, inset, inset, 4, view.height - inset * 2, color);
    rect(ctx, view.width - inset - 4, inset, 4, view.height - inset * 2, color);
    ctx.globalAlpha *= .6;
  }
  ctx.restore();
}
function edgeArrow(ctx: Ctx, view: ViewSize, sx: number, sy: number, alpha: number): void {
  const margin = 30, cx = view.width / 2, cy = view.height / 2,
    inside = sx > margin && sx < view.width - margin && sy > margin && sy < view.height - margin,
    a = Math.atan2(sy - cy, sx - cx),
    r = Math.min((cx - margin) / Math.max(1e-6, Math.abs(Math.cos(a))), (cy - margin) / Math.max(1e-6, Math.abs(Math.sin(a)))),
    x = inside ? sx : cx + Math.cos(a) * r, y = inside ? Math.max(margin, sy - 46) : cy + Math.sin(a) * r,
    dir = inside ? Math.PI / 2 : a;
  const points = [[10, 0], [-6, -9], [-2, 0], [-6, 9]].map(([px, py]) =>
    [x + px! * Math.cos(dir) - py! * Math.sin(dir), y + px! * Math.sin(dir) + py! * Math.cos(dir)] as const);
  ctx.save(); ctx.globalAlpha *= alpha; polygon(ctx, points, "#f29c8d"); ctx.restore();
}
export function drawCueScreen(ctx: Ctx, cues: readonly Cue[], sim: SimState, cam: Camera, _time: number, reduced: boolean, view = cameraProjection(cam)): void {
  for (const c of cues) {
    const env = cueEnvelope(c, reduced), p = cuePhase(c, reduced);
    if (!p.phase) continue;
    const tone = c.kind === "boss" ? "#d5757e" : "#e9c47d";
    if (reduced) { frame(ctx, view, tone, .4 * env); continue; }
    if (c.kind === "boss") {
      frame(ctx, view, "#843c58", .65 * env);
      const boss = bossEnemy(sim);
      if (p.phase === "anticipation" || p.phase === "reveal") edgeArrow(ctx, view,
        (boss?.x ?? c.x ?? cam.x) * view.zoom + view.x,
        (boss?.y ?? c.y ?? cam.y) * view.zoom + view.y, Math.min(1, env * 1.4));
    } else if (c.kind === "evolution" || c.kind === "boss-down") {
      frame(ctx, view, "#e3bf74", .5 * env);
      if (p.phase === "burst") fill(ctx, view, "#ffe5a6", .1 * (1 - p.local));
    } else if (c.kind === "dawn") {
      const beat = beatFor(c.kind, false), k = easeInOut(since(c, "reveal") / (beat.reveal + beat.burst * .5));
      ctx.save(); ctx.globalAlpha *= .08 * env;
      rect(ctx, 0, 0, view.width * k, view.height, "#e7bb72"); ctx.restore();
    } else if (c.kind === "finale") {
      fill(ctx, view, "#e7bb72", .1 + .16 * p.total);
      frame(ctx, view, "#f3dc99", .5 * env);
      const b = since(c, "burst");
      if (b >= 0) burst(ctx, view.width / 2, view.height * .26, clamp01(b / 1.05), 30, 340, 1203);
    }
  }
}
