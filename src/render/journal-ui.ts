/**
 * Small code-drawn pieces of the night-watch journal UI: the moon arc, the
 * lantern string, the skill wick, the folded minimap and the paw stamp. Every painter only reads its
 * arguments; none touches SimState or the sim RNG.
 */
import { glow, hash, line, mix, oval, path, piece, stitch, stroke, type Ctx } from "./paper-material.js";
import { crescent } from "./craft-combat.js";
import { arcHeight, chunkCoords, mapPoint, type ArcPoint } from "../ui/journal-geometry.js";
import { CHUNK, SCREEN, WORLD, type Landmark } from "../game/world-gen.js";
import { LANDMARK_ART } from "./art-registry.js";

/** Every journal canvas is drawn at 2x its CSS size. */
function begin(canvas: HTMLCanvasElement): { ctx: Ctx; w: number; h: number } {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  return { ctx, w: canvas.width / 2, h: canvas.height / 2 };
}

// ---------------------------------------------------------------- moon arc
/** Dotted night arc with the paper moon on it; in the dawn window the moon has flipped to a sun. */
export function paintSkyArc(canvas: HTMLCanvasElement, arc: ArcPoint, dawnShare: number): void {
  const { ctx, w, h } = begin(canvas),
    pad = 14,
    top = 9,
    base = h - 10,
    at = (t: number) => [pad + t * (w - pad * 2), top + arcHeight(t) * (base - top)] as const;
  // Low paper hills the moon sinks behind.
  const hills = path(
    [
      [0, h],
      [0, h - 7],
      [w * 0.18, h - 11],
      [w * 0.36, h - 6],
      [w * 0.55, h - 10],
      [w * 0.76, h - 5],
      [w, h - 9],
      [w, h],
    ],
    true,
  );
  piece(ctx, hills, arc.dawn ? "#5b4a5e" : "#283149", { shadow: 0.4, thickness: 0.6, texture: 0.3 });
  // The dotted path; the last stretch before dawn is warm.
  const split = 1 - dawnShare;
  for (const [from, to, color] of [
    [0, split, "#e9dab6"],
    [split, 1, "#f3a86c"],
  ] as const) {
    const p = new Path2D();
    for (let i = 0; i <= 32; i++) {
      const [x, y] = at(from + ((to - from) * i) / 32);
      if (i) p.lineTo(x, y);
      else p.moveTo(x, y);
    }
    ctx.save();
    ctx.setLineDash([1.2, 4.2]);
    stroke(ctx, p, color, 1.7, 0.8);
    ctx.restore();
  }
  const [mx, my] = at(arc.t);
  if (arc.dawn) {
    glow(ctx, mx, my, 22, "#ffb86b", 0.75);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2,
        r0 = 8.5,
        r1 = 12.5 + (i % 2) * 1.5;
      piece(
        ctx,
        path([
          [mx + Math.cos(a - 0.2) * r0, my + Math.sin(a - 0.2) * r0],
          [mx + Math.cos(a) * r1, my + Math.sin(a) * r1],
          [mx + Math.cos(a + 0.2) * r0, my + Math.sin(a + 0.2) * r0],
        ]),
        "#f6b45e",
        { shadow: 0.4, thickness: 0.5, texture: 0.2 },
      );
    }
    piece(ctx, oval(mx, my, 7.5, 7.5, 3), "#f7c56c", { shadow: 0.8, thickness: 0.7, texture: 0.4 });
  } else {
    glow(ctx, mx, my, 20, "#f5e2a6", 0.55);
    piece(ctx, oval(mx, my, 7.5, 7.5, 5), "#efdcaa", { shadow: 0.8, thickness: 0.7, texture: 0.45 });
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = "#9d8a68";
    ctx.fill(crescent(mx + 2.4, my, 6.6, 0));
    ctx.restore();
    piece(ctx, oval(mx - 2.4, my - 2, 1.4, 1.2, 7), "#d9c38f", { shadow: 0, thickness: 0.3, texture: 0 });
    piece(ctx, oval(mx + 1.5, my + 2.6, 1, 0.9, 8), "#d9c38f", { shadow: 0, thickness: 0.3, texture: 0 });
  }
}

// ---------------------------------------------------------------- lantern string
export interface LanternView {
  hp: number;
  maxHp: number;
  shield: number;
  /** Last lit lantern gutters when this is set. */
  critical: boolean;
  /** Seconds, for sway; 0 when motion is reduced. */
  time: number;
}
/** CSS width the lantern string needs; the canvas is sized from this. */
export function lanternWidth(maxHp: number, shield: number): number {
  return Math.max(3, maxHp + shield) * 22 + 14;
}
/** Paper lanterns on a sagging string, one per max heart; lost hearts are unlit. Shield charges hang as paper rings. */
export function paintLanterns(canvas: HTMLCanvasElement, v: LanternView): void {
  const { ctx, w } = begin(canvas),
    n = v.maxHp + v.shield,
    sag = Math.min(8, 2 + n * 0.6),
    x0 = 5,
    x1 = w - 5,
    y0 = 5,
    point = (u: number) => {
      const cx = (x0 + x1) / 2,
        cy = y0 + sag * 2;
      return [
        (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1,
        (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y0,
      ] as const;
    };
  const cord = new Path2D();
  for (let i = 0; i <= 24; i++) {
    const [x, y] = point(i / 24);
    if (i) cord.lineTo(x, y);
    else cord.moveTo(x, y);
  }
  stroke(ctx, cord, "#1d1626", 1.6, 0.55);
  stroke(ctx, cord, "#cdb48a", 0.8, 0.9);
  for (let i = 0; i < n; i++) {
    const [x, y] = point((i + 0.5) / n),
      sway = v.time ? Math.sin(v.time * 1.7 + i * 1.3) * 0.07 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    if (i < v.maxHp) lantern(ctx, i < v.hp, v.critical && i === v.hp - 1, v.time, i);
    else shieldRing(ctx);
    ctx.restore();
  }
}
function lantern(ctx: Ctx, lit: boolean, guttering: boolean, time: number, i: number): void {
  line(ctx, 0, 0, 0, 4, "#2a2030", 0.9);
  const body = lit ? "#e5823f" : "#4a5168",
    flicker = guttering && time ? 0.45 + 0.55 * Math.abs(Math.sin(time * 7 + i)) : 1;
  if (lit) glow(ctx, 0, 13, 15, "#ffb35a", 0.55 * flicker);
  piece(ctx, oval(0, 13, 7, 8.4, 11 + i), body, { shadow: 0.9, thickness: 0.7, texture: 0.35 });
  // Paper ribs: the folds of the lantern.
  for (const rx of [3.6, 6]) {
    ctx.save();
    ctx.clip(oval(0, 13, 7, 8.4, 11 + i));
    stroke(ctx, oval(0, 13, rx, 8.6, 3), mix(body, "#1c142b", 0.35), 0.6, 0.7);
    ctx.restore();
  }
  if (lit) {
    ctx.save();
    ctx.globalAlpha = 0.75 * flicker;
    ctx.fillStyle = "#ffe0a0";
    ctx.fill(oval(0, 14, 3, 4, 2));
    ctx.restore();
  }
  piece(ctx, path([[-4, 4.6], [4, 4.6], [3.4, 6.4], [-3.4, 6.4]]), "#2f2430", { shadow: 0, thickness: 0.5, texture: 0 });
  piece(ctx, path([[-3.6, 19.6], [3.6, 19.6], [3, 21.4], [-3, 21.4]]), "#2f2430", { shadow: 0, thickness: 0.5, texture: 0 });
  line(ctx, 0, 21.4, 0, 25, lit ? "#c9533b" : "#3a3f50", 1);
}
function shieldRing(ctx: Ctx): void {
  line(ctx, 0, 0, 0, 3, "#2a2030", 0.9);
  const ring = oval(0, 11, 7, 7, 9);
  glow(ctx, 0, 11, 13, "#bfe0f4", 0.4);
  stroke(ctx, ring, "#1c2433", 4.2, 0.55);
  stroke(ctx, ring, "#a9cbe2", 3.2);
  stroke(ctx, oval(-0.4, 10.4, 7, 7, 9), "#eef7ff", 0.8, 0.8);
  stitch(ctx, ring, "#5d7f99", 0.9);
}

// ---------------------------------------------------------------- wick
/** A paper candle whose flame grows as the skill recharges; ready = tall bright flame. */
export function paintWick(canvas: HTMLCanvasElement, charge: number, ready: boolean, time: number): void {
  const { ctx, w, h } = begin(canvas),
    cx = w / 2,
    top = h - 30;
  piece(ctx, oval(cx, h - 4, 15, 3.6, 4), "#5f4334", { shadow: 1, thickness: 0.7, texture: 0.3 });
  const candle = path([
    [cx - 7, top + 1],
    [cx - 2, top - 0.6],
    [cx + 7, top + 0.8],
    [cx + 7.3, h - 6],
    [cx - 7.2, h - 5.6],
  ]);
  piece(ctx, candle, "#eadcbc", { shadow: 1, thickness: 0.8, texture: 0.5 });
  // A drip of wax down the side.
  piece(ctx, path([[cx + 2, top], [cx + 5, top + 0.4], [cx + 4.6, top + 9], [cx + 3.3, top + 10.2], [cx + 2.4, top + 6]], true), "#f4e9cf", {
    shadow: 0.3,
    thickness: 0.4,
    texture: 0.2,
  });
  line(ctx, cx, top, cx, top - 4, "#2a1d1c", 1.2);
  const k = Math.max(0, Math.min(1, charge)),
    flameH = 5 + k * 19,
    sway = time ? Math.sin(time * 8.3) * (0.6 + k) : 0,
    base = top - 3.5,
    fx = cx + sway,
    flame = (s: number) =>
      path(
        [
          [cx - 4.2 * s, base],
          [cx - 4.8 * s, base - flameH * 0.35 * s],
          [fx - 1.4 * s, base - flameH * 0.8 * s],
          [fx + 0.4, base - flameH * s],
          [fx + 2.2 * s, base - flameH * 0.65 * s],
          [cx + 4.6 * s, base - flameH * 0.3 * s],
          [cx + 3.8 * s, base + 1],
        ],
        true,
      );
  if (ready) glow(ctx, cx, base - flameH * 0.45, 26, "#ffb24f", 0.8);
  ctx.save();
  ctx.globalAlpha = ready ? 1 : 0.55 + 0.35 * k;
  piece(ctx, flame(1), ready ? "#f39a3d" : "#b9784e", { shadow: 0.5, thickness: 0.6, texture: 0.25 });
  piece(ctx, flame(0.55), ready ? "#ffe6a3" : "#d9a774", { shadow: 0, thickness: 0.4, texture: 0.1 });
  ctx.restore();
}

// ---------------------------------------------------------------- minimap
/** Minimap dot ink of a landmark kind (LandmarkArt.ink). */
const landmarkInk = (kind: string) => LANDMARK_ART.find(kind)?.ink ?? "#c9a35f";
export interface MinimapView {
  player: { x: number; y: number };
  accent: string;
  explored: ReadonlySet<number>;
  landmarks: readonly Landmark[];
  found: readonly string[];
  chests: readonly { x: number; y: number; big: boolean }[];
  boss: { x: number; y: number } | null;
}
/** Folded paper map of the bounded town: seen chunks in cream, the rest in ink wash. */
export function paintMinimap(canvas: HTMLCanvasElement, v: MinimapView): void {
  const { ctx, w, h } = begin(canvas),
    m = 3,
    mw = w - m * 2,
    mh = h - m * 2,
    at = (x: number, y: number) => {
      const p = mapPoint(x, y, mw, mh);
      return [p.x + m, p.y + m] as const;
    },
    sheet = path([
      [m, m + 0.6],
      [m + mw * 0.5, m],
      [m + mw, m + 0.8],
      [m + mw - 0.4, m + mh * 0.55],
      [m + mw, m + mh],
      [m + mw * 0.45, m + mh - 0.6],
      [m, m + mh],
      [m + 0.5, m + mh * 0.45],
    ]);
  piece(ctx, sheet, "#2d3448", { shadow: 1, thickness: 0.8, texture: 0.4 });
  ctx.save();
  ctx.clip(sheet);
  const cw = (CHUNK.width / WORLD.width) * mw,
    ch = (CHUNK.height / WORLD.height) * mh;
  ctx.fillStyle = "#e4d3ae";
  for (const index of v.explored) {
    const { cx, cy } = chunkCoords(index),
      [x, y] = at(cx * CHUNK.width, cy * CHUNK.height);
    ctx.fillRect(x - 0.15, y - 0.15, cw + 0.3, ch + 0.3);
  }
  // The start yard: a tiny house.
  const [hx, hy] = at(SCREEN.width / 2, SCREEN.height * 0.6);
  piece(ctx, path([[hx - 2.6, hy + 2], [hx - 2.6, hy - 0.6], [hx, hy - 3], [hx + 2.6, hy - 0.6], [hx + 2.6, hy + 2]]), "#9a5a45", {
    shadow: 0,
    thickness: 0.4,
    texture: 0,
  });
  for (const l of v.landmarks) {
    const [x, y] = at(l.x, l.y);
    if (v.found.includes(l.id)) {
      piece(ctx, path([[x, y - 3.2], [x + 3, y], [x, y + 3.2], [x - 3, y]]), landmarkInk(l.kind), {
        shadow: 0.4,
        thickness: 0.5,
        texture: 0,
      });
    } else {
      ctx.save();
      ctx.setLineDash([1, 1.6]);
      stroke(ctx, oval(x, y, 2.6, 2.6, 2), "#e4d3ae", 0.8, 0.55);
      ctx.restore();
    }
  }
  for (const c of v.chests) {
    const [x, y] = at(c.x, c.y),
      s = c.big ? 2.4 : 1.7;
    piece(ctx, path([[x - s, y - s * 0.7], [x + s, y - s * 0.7], [x + s, y + s * 0.7], [x - s, y + s * 0.7]]), c.big ? "#a9c3e6" : "#e6b34f", {
      shadow: 0.3,
      thickness: 0.5,
      texture: 0,
    });
  }
  const [px, py] = at(v.player.x, v.player.y);
  if (v.boss) {
    const [bx, by] = at(v.boss.x, v.boss.y);
    ctx.save();
    ctx.setLineDash([1.4, 1.8]);
    line(ctx, px, py, bx, by, "#e98d9b", 0.8, 0.8);
    ctx.restore();
    piece(ctx, path([[bx - 3.4, by - 2], [bx + 3.4, by - 2.4], [bx + 3.6, by + 2], [bx - 3.2, by + 2.3]]), "#e98d9b", {
      shadow: 0.5,
      thickness: 0.6,
      texture: 0,
    });
    ctx.fillStyle = "#4a6c9a";
    ctx.fillRect(bx - 3.4, by - 2.2, 2.4, 4.4);
  }
  // The camera view and the cat.
  const vw = (SCREEN.width / WORLD.width) * mw,
    vh = (SCREEN.height / WORLD.height) * mh;
  stroke(ctx, path([[px - vw / 2, py - vh / 2], [px + vw / 2, py - vh / 2], [px + vw / 2, py + vh / 2], [px - vw / 2, py + vh / 2], [px - vw / 2, py - vh / 2]]), "#1d1626", 0.7, 0.5);
  glow(ctx, px, py, 7, v.accent, 0.7);
  piece(ctx, oval(px, py, 2.1, 2.1, 4), v.accent, { shadow: 0.4, thickness: 0.6, texture: 0 });
  // Fold creases: one down the middle, two across thirds.
  const crease = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    line(ctx, x0, y0, x1, y1, "#120c1c", 1.1, 0.28);
    line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny, "#fff4d8", 0.6, 0.22);
  };
  crease(m + mw / 3, m, m + mw / 3, m + mh, 0.8, 0);
  crease(m + (mw * 2) / 3, m, m + (mw * 2) / 3, m + mh, 0.8, 0);
  crease(m, m + mh / 2, m + mw, m + mh / 2, 0, 0.8);
  ctx.restore();
  stitch(ctx, sheet, "#cfae77", 0.8);
}

// ---------------------------------------------------------------- paw stamp
/** An inked paw stamp inside a dashed seal ring, with speckles where the ink missed. */
export function paintPaw(canvas: HTMLCanvasElement, ink: string, seed: number): void {
  const { ctx, w, h } = begin(canvas),
    cx = w / 2,
    cy = h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.stroke(oval(0, 0, w * 0.44, h * 0.44, seed, 0.06));
  ctx.lineWidth = 0.9;
  ctx.setLineDash([2.4, 2]);
  ctx.stroke(oval(0, 0, w * 0.37, h * 0.37, seed + 1, 0.05));
  ctx.setLineDash([]);
  const s = w / 72;
  ctx.fill(oval(0, 9 * s, 11 * s, 9 * s, seed + 2, 0.18));
  for (const [x, y, r] of [
    [-12, -5, 4.6],
    [-4.5, -12, 5],
    [4.5, -12, 5],
    [12, -5, 4.6],
  ] as const)
    ctx.fill(oval(x * s, y * s, r * s, r * s * 1.15, seed + x, 0.2));
  // Where the ink missed the paper.
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 40; i++) {
    const a = hash(seed * 31 + i) * Math.PI * 2,
      r = hash(seed * 17 + i) * w * 0.42;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.35 + hash(seed + i * 7) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
