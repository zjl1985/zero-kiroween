/**
 * Canvas layers for the presentation cues in timeline.ts: evolution, Boss
 * arrival, Boss defeat, dawn and the dawn finale. Render-only: reads SimState
 * and the cue clocks, never writes state or touches the sim RNG.
 */
import type { SimState } from "../game/types.js";
import { bossEnemy } from "../game/sim.js";
import { glow, path, piece, type Ctx, type Point } from "./paper-material.js";
import { visHash } from "./hash.js";
import { catArt } from "./art-registry.js";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./viewport.js";
import type { Camera } from "./camera.js";
import {
  beatFor,
  clamp01,
  cueEnvelope,
  cuePhase,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  PHASES,
  type Cue,
  type Phase,
} from "./timeline.js";

const CONFETTI = ["#f0cf83", "#efe3c8", "#e58e5f", "#c9b2f0", "#f4d48e"] as const;

/** Real seconds since `phase` began (negative before it). */
function since(c: Cue, phase: Phase): number {
  const b = beatFor(c.kind, false);
  let start = 0;
  for (const p of PHASES) {
    if (p === phase) break;
    start += b[p];
  }
  return c.t - start;
}
/** A jianzhi rosette: petals with notched tips, cut from one sheet. */
function rosette(x: number, y: number, r: number, petals: number, rot: number, squash = 1): Path2D {
  const pts: Point[] = [];
  const n = petals * 4;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2,
      k = i % 4 === 0 ? 0.48 : i % 4 === 2 ? 0.86 : 1;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * squash]);
  }
  return path(pts, true);
}
/** A small cut-paper strip, used for gathering pieces and confetti. */
function strip(ctx: Ctx, x: number, y: number, size: number, spin: number, flip: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.scale(1, flip);
  piece(
    ctx,
    path([
      [-size, -size * 0.45],
      [size * 0.3, -size * 0.7],
      [size, size * 0.2],
      [-size * 0.3, size * 0.6],
    ]),
    color,
    { shadow: 0.4, texture: 0.25, thickness: 0.35 },
  );
  ctx.restore();
}
/** Paper confetti thrown out from (x, y): `k` 0..1 flight, then flutter down. */
function confetti(ctx: Ctx, x: number, y: number, k: number, count: number, reach: number, seed: number, fade: number): void {
  if (k <= 0 || fade <= 0) return;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const h1 = visHash(seed + i * 13),
      h2 = visHash(seed + i * 29 + 5),
      a = (i / count) * Math.PI * 2 + h1 * 0.5,
      out = easeOutCubic(k) * reach * (0.55 + h2 * 0.6),
      fall = k * k * (18 + h1 * 22),
      px = x + Math.cos(a) * out + Math.sin(k * 9 + i) * 4 * k,
      py = y + Math.sin(a) * out * 0.6 + fall;
    ctx.globalAlpha = fade * (1 - k ** 2.2);
    strip(ctx, px, py, 2.4 + h2 * 1.8, a + k * (5 + h1 * 6), 0.25 + Math.abs(Math.cos(k * 8 + i)) * 0.75, CONFETTI[i % CONFETTI.length]!);
  }
  ctx.restore();
}
/** Soft light rays from a point, drawn additively. */
function rays(ctx: Ctx, x: number, y: number, len: number, count: number, rot: number, alpha: number, color: string): void {
  if (alpha <= 0 || len <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2,
      w = 0.07 + visHash(i * 7 + 3) * 0.05,
      l = len * (0.7 + visHash(i * 11) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * l, y + Math.sin(a - w) * l * 0.7);
    ctx.lineTo(x + Math.cos(a + w) * l, y + Math.sin(a + w) * l * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawEvolutionWorld(ctx: Ctx, c: Cue, sim: SimState, time: number): void {
  const p = cuePhase(c, false);
  if (!p.phase) return;
  const cx = sim.player.x,
    cy = sim.player.y - 20,
    tone = catArt(sim.player.id).colors.tone;
  // Anticipation: paper pieces gather toward the cat.
  if (p.phase === "anticipation" || p.phase === "reveal") {
    const k = p.phase === "anticipation" ? easeInOut(p.local) : 1,
      fade = p.phase === "reveal" ? 1 - p.local : Math.min(1, p.local * 3);
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + visHash(i * 5) * 0.4 + k * 1.4,
        r = 96 * (1 - k) + 12 + visHash(i * 9) * 8;
      ctx.globalAlpha = fade * 0.9;
      strip(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.65, 3, a * 2 + time * 3, 0.6, i % 2 ? tone : "#efe3c8");
    }
    ctx.restore();
  }
  // Reveal: a double-layer cutout unfolds over the cat; it holds through the burst.
  const open = since(c, "reveal");
  if (open >= 0 && p.phase !== "anticipation") {
    const unfold = p.phase === "reveal" ? easeOutBack(p.local, 2.2) : 1,
      fade = p.phase === "settle" ? 1 - easeInOut(p.local) : 1,
      pulse = p.phase === "burst" ? 1 + Math.sin(p.local * Math.PI) * 0.14 : 1,
      r = 30 * pulse * (p.phase === "settle" ? 1 + p.local * 0.3 : 1),
      rot = open * 0.6;
    ctx.save();
    ctx.globalAlpha = 0.92 * fade;
    piece(ctx, rosette(cx + 3, cy + 3, r * 1.08, 10, rot + 0.15, unfold), "#e8c06f", { shadow: 1.2, texture: 0.35, thickness: 0.6 });
    ctx.globalAlpha = 0.85 * fade;
    piece(ctx, rosette(cx, cy, r * 0.82, 8, -rot, unfold), tone, { shadow: 0.6, texture: 0.35, thickness: 0.5 });
    ctx.restore();
  }
  // Burst: light rays and paper confetti; settle lets the pieces drift and fade.
  const b = since(c, "burst"),
    beat = beatFor("evolution", false);
  if (b >= 0) {
    const k = clamp01(b / (beat.burst + beat.settle)),
      rayK = clamp01(b / beat.burst);
    rays(ctx, cx, cy, 40 + easeOutCubic(rayK) * 110, 12, open * 0.4, 0.28 * (1 - k), "#f6dc9a");
    glow(ctx, cx, cy, 70, "#ffd98a", 0.5 * (1 - k));
    confetti(ctx, cx, cy, k, 26, 120, 911, 1);
  }
}

function drawBossWorld(ctx: Ctx, c: Cue, x: number, y: number): void {
  const p = cuePhase(c, false);
  if (!p.phase) return;
  if (p.phase === "anticipation") {
    // An ink pool spreads where the Eraser is about to stand.
    ctx.save();
    ctx.globalAlpha = 0.35 * easeInOut(p.local);
    ctx.fillStyle = "#1a1228";
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + p.local * 40, 10 + p.local * 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const b = since(c, "burst"),
    beat = beatFor(c.kind, false);
  if (b >= 0) {
    const k = clamp01(b / (beat.burst + beat.settle));
    if (c.kind === "boss-down") {
      rays(ctx, x, y - 30, 60 + easeOutCubic(k) * 160, 14, b * 0.3, 0.3 * (1 - k), "#f6dc9a");
      confetti(ctx, x, y - 30, k, 34, 170, 517, 1);
    } else {
      // Eraser crumbs and ink flakes thrown off as it lands.
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + visHash(i * 3) * 0.3,
          out = 30 + easeOutCubic(k) * (70 + visHash(i * 17) * 40);
        ctx.globalAlpha = 1 - k;
        strip(ctx, x + Math.cos(a) * out, y - 20 + Math.sin(a) * out * 0.55 + k * k * 16, 3, a + k * 6, 0.5, i % 3 ? "#2c2340" : "#f0a3b1");
      }
      ctx.restore();
    }
  }
}

/** World-space cue layers, drawn inside the camera transform after the effects. */
export function drawCueWorld(ctx: Ctx, cues: readonly Cue[], sim: SimState, time: number, reduced: boolean): void {
  if (reduced) return;
  for (const c of cues) {
    if (c.kind === "evolution") drawEvolutionWorld(ctx, c, sim, time);
    else if ((c.kind === "boss" || c.kind === "boss-down") && c.x !== undefined && c.y !== undefined)
      drawBossWorld(ctx, c, c.x, c.y);
  }
}

function fill(ctx: Ctx, color: string, alpha: number, mode: GlobalCompositeOperation = "source-over"): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
}
/** Darkens the edges and leaves a clear hole around (x, y) so the fight stays readable. */
function vignette(ctx: Ctx, x: number, y: number, inner: number, color: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  const g = ctx.createRadialGradient(x, y, inner, x, y, Math.max(VIEW_WIDTH, VIEW_HEIGHT) * 0.75);
  g.addColorStop(0, color + "00");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
}
/** A paper chevron pinned to the view edge, pointing at an off-screen world point. */
function edgeArrow(ctx: Ctx, sx: number, sy: number, time: number, alpha: number): void {
  const m = 30,
    inside = sx > m && sx < VIEW_WIDTH - m && sy > m && sy < VIEW_HEIGHT - m;
  const cx = VIEW_WIDTH / 2,
    cy = VIEW_HEIGHT / 2,
    a = Math.atan2(sy - cy, sx - cx),
    kx = (VIEW_WIDTH / 2 - m) / Math.max(1e-6, Math.abs(Math.cos(a))),
    ky = (VIEW_HEIGHT / 2 - m) / Math.max(1e-6, Math.abs(Math.sin(a))),
    r = Math.min(kx, ky),
    x = inside ? sx : cx + Math.cos(a) * r,
    y = inside ? sy - 46 : cy + Math.sin(a) * r,
    dir = inside ? Math.PI / 2 : a,
    s = 1 + Math.max(0, Math.sin(time * 12)) * 0.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(dir);
  ctx.scale(s, s);
  piece(ctx, path([[10, 0], [-6, -9], [-2, 0], [-6, 9]]), "#e58e9f", { shadow: 1, texture: 0.3, thickness: 0.6 });
  ctx.restore();
}

/** Screen-space cue layers, drawn after the world and before the HUD frame. */
export function drawCueScreen(ctx: Ctx, cues: readonly Cue[], sim: SimState, cam: Camera, time: number, reduced: boolean): void {
  const ox = cam.x - VIEW_WIDTH / 2,
    oy = cam.y - VIEW_HEIGHT / 2,
    px = sim.player.x - ox,
    py = sim.player.y - 20 - oy;
  for (const c of cues) {
    const env = cueEnvelope(c, reduced),
      p = cuePhase(c, reduced);
    if (!p.phase) continue;
    if (reduced) {
      // Short fades only: a tint that clears in REDUCED_BEAT time.
      const tint = { evolution: "#f0cf83", boss: "#7d1f2e", "boss-down": "#f6dc9a", dawn: "#ffcf8a", finale: "#ffcf8a" }[c.kind];
      fill(ctx, tint, (c.kind === "finale" ? 0.35 : 0.14) * (c.kind === "finale" ? 1 : env));
      continue;
    }
    switch (c.kind) {
      case "evolution":
        // The world dims around the cat, then a warm flash at the burst.
        vignette(ctx, px, py, 50, "#070b16", 0.55 * env);
        if (p.phase === "burst") fill(ctx, "#ffe2a6", 0.18 * (1 - p.local), "screen");
        break;
      case "boss": {
        vignette(ctx, px, py, 110, "#3a0f22", 0.5 * env);
        const boss = bossEnemy(sim),
          bx = (boss?.x ?? c.x ?? cam.x) - ox,
          by = (boss?.y ?? c.y ?? cam.y) - oy;
        if (p.phase === "anticipation" || p.phase === "reveal") edgeArrow(ctx, bx, by, time, Math.min(1, env * 1.4));
        if (p.phase === "burst") fill(ctx, "#f0a3b1", 0.12 * (1 - p.local), "screen");
        break;
      }
      case "boss-down":
        if (p.phase === "burst") fill(ctx, "#fff1cc", 0.3 * (1 - p.local), "screen");
        vignette(ctx, px, py, 120, "#1a0f1d", 0.25 * env);
        break;
      case "dawn": {
        // A cool breath, then warm light sweeps across the town from the east.
        if (p.phase === "anticipation") fill(ctx, "#0b1430", 0.14 * p.local);
        const sweep = since(c, "reveal");
        if (sweep >= 0) {
          const beat = beatFor("dawn", false),
            k = easeInOut(sweep / (beat.reveal + beat.burst * 0.5)),
            x = -220 + k * (VIEW_WIDTH + 440);
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.45 * env;
          const g = ctx.createLinearGradient(x - 200, 0, x + 60, 0);
          g.addColorStop(0, "#ffcf8a00");
          g.addColorStop(0.7, "#ffcf8a");
          g.addColorStop(1, "#ffcf8a00");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
          ctx.restore();
          // The light stays behind the sweep as a warm wash.
          ctx.save();
          ctx.globalAlpha = 0.12 * env;
          ctx.fillStyle = "#f6b866";
          ctx.globalCompositeOperation = "soft-light";
          ctx.fillRect(0, 0, Math.max(0, Math.min(VIEW_WIDTH, x)), VIEW_HEIGHT);
          ctx.restore();
        }
        break;
      }
      case "finale": {
        // The sun rises over the town; the wash holds so the result page opens on warm paper.
        const rise = p.phase === "anticipation" ? easeInOut(p.local) : 1,
          sx = VIEW_WIDTH * 0.5,
          sy = VIEW_HEIGHT * (0.32 - 0.12 * rise);
        fill(ctx, "#ffcf8a", 0.12 + 0.3 * p.total, "screen");
        const b = since(c, "reveal");
        if (b >= 0) rays(ctx, sx, sy, 160 + easeOutCubic(clamp01(b / 0.8)) * 380, 16, time * 0.1, 0.16, "#ffe2a6");
        glow(ctx, sx, sy, 110 + rise * 40, "#fff1cc", 0.7 * rise);
        const k = since(c, "burst");
        if (k >= 0) confetti(ctx, sx, sy, clamp01(k / 1.05), 30, 340, 1203, 1);
        break;
      }
    }
  }
}
