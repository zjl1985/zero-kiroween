/**
 * Off-map tree wall and night fog (plan step 2.4, decision D9). Outside the
 * projected WORLD diamond the view shows a flat band of dark trees fading
 * into fog; no cliffs, no floating platform. Drawn first, under the ground,
 * in projected coordinates and cached per 256 x 256 screen block. Variety
 * comes from the render-only visHash, never from unseeded randomness or the sim RNG.
 */
import { cachedSprite } from "../../engine/sprite.js";
import { WORLD } from "../../game/world-gen.js";
import { visHash } from "../hash.js";
import { mix } from "../pixel-art.js";
import { depthKey, toScreen, toWorld } from "./projection.js";
import { isoPath } from "./ground.js";
import { paintBlurred } from "./blur.js";
import { surface } from "../../engine/surface.js";

type Ctx = CanvasRenderingContext2D;

export const OFF_MAP = {
  /** Screen block size of the cache (projected pixels). */
  block: 256,
  /** Fog cell size inside a block (projected pixels). */
  cell: 4,
  /** World units past the edge where the tree wall stands and the fog closes in. */
  wall: { from: 10, to: 300 },
  /** World grid step for tree candidates, and the share of candidates that grow a tree. */
  treeStep: 34,
  treeChance: 0.72,
  /** Night colours: forest floor at the edge, then fog bands farther out. */
  floor: "#0f1c28",
  fog: ["#13212f", "#172738", "#1c2d40", "#22344a"],
  trunk: "#1a1715",
  crown: ["#0d1f22", "#163132", "#22423f"],
  /** Dawn tint over the off-map band, top to bottom (the old night-shift sky colours). */
  dawn: ["#52688b", "#7a7e9a", "#ac8c9c", "#d9a08d", "#edbb92"],
  dawnAlpha: 0.45,
  /** Fog veil over the background strip north of WORLD.playTop: bands and peak alpha at y = 0. */
  veil: { bands: 4, alpha: 0.28, color: "#1c2d40" },
  /** Cache-time blur of each block: the pre-blurred far layer of the fake depth of field (plan 8.3). */
  blur: { radius: 1, passes: 2 },
} as const;

/** World units outside the WORLD rectangle (0 inside). */
export function outsideDistance(x: number, y: number): number {
  const dx = Math.max(WORLD.minX - x, 0, x - WORLD.maxX), dy = Math.max(WORLD.minY - y, 0, y - WORLD.maxY);
  return Math.hypot(dx, dy);
}

/** Is this projected point outside the projected WORLD diamond? */
export function offMapAt(sx: number, sy: number): boolean {
  const w = toWorld(sx, sy);
  return outsideDistance(w.x, w.y) > 0;
}

/** Does a projected block touch the area outside the diamond? */
export function blockOffMap(bx: number, by: number): boolean {
  const B = OFF_MAP.block, x0 = bx * B, y0 = by * B;
  // The inside is convex, so a block is fully inside exactly when its four corners are.
  return [[x0, y0], [x0 + B, y0], [x0 + B, y0 + B], [x0, y0 + B]].some(([x, y]) => offMapAt(x!, y!));
}

interface Tree { sx: number; sy: number; h: number; r: number; fog: number; seed: number }

/** Trees whose sprite box can touch block (bx, by), nearest last. Pure of (bx, by). */
export function blockTrees(bx: number, by: number): Tree[] {
  const B = OFF_MAP.block, pad = 80, step = OFF_MAP.treeStep, { from, to } = OFF_MAP.wall;
  const x0 = bx * B - pad, y0 = by * B - pad, x1 = (bx + 1) * B + pad, y1 = (by + 1) * B + pad * 2;
  const corners = [toWorld(x0, y0), toWorld(x1, y0), toWorld(x1, y1), toWorld(x0, y1)];
  const wx0 = Math.min(...corners.map((c) => c.x)), wx1 = Math.max(...corners.map((c) => c.x));
  const wy0 = Math.min(...corners.map((c) => c.y)), wy1 = Math.max(...corners.map((c) => c.y));
  const out: Tree[] = [];
  for (let gy = Math.floor(wy0 / step); gy <= Math.ceil(wy1 / step); gy++)
    for (let gx = Math.floor(wx0 / step); gx <= Math.ceil(wx1 / step); gx++) {
      const seed = gx * 92821 + gy * 68917;
      if (visHash(seed) > OFF_MAP.treeChance) continue;
      const x = (gx + visHash(seed + 1)) * step, y = (gy + visHash(seed + 2)) * step, d = outsideDistance(x, y);
      if (d < from || d > to) continue;
      const s = toScreen(x, y);
      if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1) continue;
      const fog = (d - from) / (to - from), h = Math.round(38 + visHash(seed + 3) * 34 - fog * 10), r = Math.round(h * 0.34);
      // The whole crown stays off the map, so the ground never cuts a tree.
      if (!offMapAt(s.x - r, s.y - h) || !offMapAt(s.x + r, s.y - h) || !offMapAt(s.x - r, s.y) || !offMapAt(s.x + r, s.y)) continue;
      out.push({ sx: s.x, sy: s.y, h, r, fog, seed });
    }
  return out.sort((a, b) => depthKey(...xy(a)) - depthKey(...xy(b)) || a.seed - b.seed);
}
const xy = (t: Tree): [number, number] => { const w = toWorld(t.sx, t.sy); return [w.x, w.y]; };

const fogColour = (d: number) => {
  if (d <= OFF_MAP.wall.from) return OFF_MAP.floor;
  const k = Math.min(1, (d - OFF_MAP.wall.from) / (OFF_MAP.wall.to * 1.6));
  return OFF_MAP.fog[Math.min(OFF_MAP.fog.length - 1, Math.floor(k * OFF_MAP.fog.length))]!;
};

/** A flat pixel tree: trunk, three stepped crown tiers, lit on the right (moon top-right). */
function paintTree(c: Ctx, t: Tree, ox: number, oy: number): void {
  const x = Math.round(t.sx - ox), y = Math.round(t.sy - oy), fogAt = OFF_MAP.fog[3];
  const tone = (col: string) => mix(col, fogAt, t.fog * 0.75);
  c.fillStyle = tone(OFF_MAP.trunk);
  c.fillRect(x - 2, y - Math.round(t.h * 0.3), 4, Math.round(t.h * 0.3));
  for (let tier = 0; tier < 3; tier++) {
    const top = y - t.h + Math.round(tier * t.h * 0.22), w = Math.round(t.r * (0.55 + tier * 0.25)), rows = Math.round(t.h * 0.3);
    for (let row = 0; row < rows; row += 2) {
      const half = Math.max(1, Math.round((w * (row + 2)) / rows));
      c.fillStyle = tone(OFF_MAP.crown[0]);
      c.fillRect(x - half, top + row, half, 2);
      c.fillStyle = tone(OFF_MAP.crown[1]);
      c.fillRect(x, top + row, half, 2);
      if (row % 4 === 0 && visHash(t.seed + tier * 7 + row) > 0.5) {
        c.fillStyle = tone(OFF_MAP.crown[2]);
        c.fillRect(x + Math.max(1, half - 3), top + row, 2, 2);
      }
    }
  }
}

/**
 * Paints one block: banded fog cells outside the diamond, then the tree
 * wall, with the block's top-left corner at (dx, dy) of `c`. With a margin
 * (dx, dy > 0) the fog cells and trees around the block are painted too, from
 * the same global functions, so blurred neighbours meet without a seam.
 * Pure of (bx, by, dx, dy).
 */
function paintBlock(c: Ctx, bx: number, by: number, dx = 0, dy = 0): void {
  const B = OFF_MAP.block, S = OFF_MAP.cell, ox = bx * B - dx, oy = by * B - dy;
  const w = B + 2 * dx, h = B + 2 * dy;
  // Fog cells stay on the global 4 px grid whatever the margin.
  const gx0 = Math.floor(ox / S) * S, gy0 = Math.floor(oy / S) * S;
  for (let gy = gy0; gy < oy + h; gy += S) {
    // Run-length rows: one rectangle per run of one fog colour.
    let run = gx0, colour = "";
    const end = (gx: number) => {
      if (colour) { c.fillStyle = colour; c.fillRect(run - ox, gy - oy, gx - run, S); }
    };
    for (let gx = gx0; gx < ox + w; gx += S) {
      const p = toWorld(gx + S / 2, gy + S / 2), d = outsideDistance(p.x, p.y), next = d > 0 ? fogColour(d) : "";
      if (next === colour) continue;
      end(gx);
      run = gx;
      colour = next;
    }
    end(Math.ceil((ox + w - gx0) / S) * S + gx0);
  }
  for (const t of blockTrees(bx, by)) paintTree(c, t, ox, oy);
}

/**
 * Draws the off-map band over the projected rectangle (x0, y0) - (x1, y1).
 * `ctx` carries the camera transform (projected coordinates). `dawn` (0..1)
 * restores the warm dawn bands the old sky gave the off-map area.
 */
export function drawOffMap(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, dawn = 0): void {
  const B = OFF_MAP.block;
  for (let by = Math.floor(y0 / B); by <= Math.floor(y1 / B); by++)
    for (let bx = Math.floor(x0 / B); bx <= Math.floor(x1 / B); bx++) {
      if (!blockOffMap(bx, by)) continue;
      cachedSprite(`offmap:${bx}:${by}`, B, B, 1, (c) =>
        paintBlurred(c, surface, B, B, OFF_MAP.blur.radius, OFF_MAP.blur.passes, (s, dx, dy) => paintBlock(s as Ctx, bx, by, dx, dy)),
      ).draw(ctx, { x: bx * B, y: by * B });
    }
  if (dawn > 0) {
    ctx.save();
    ctx.globalAlpha *= dawn * OFF_MAP.dawnAlpha;
    const n = OFF_MAP.dawn.length, h = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = OFF_MAP.dawn[i]!;
      ctx.fillRect(x0, Math.floor(y0 + i * h), x1 - x0, Math.ceil(h) + 1);
    }
    ctx.restore();
  }
}

/**
 * The background strip north of WORLD.playTop: a banded fog veil on the
 * ground (projected vertices), thickest at the world's north edge.
 */
export function drawNorthVeil(ctx: Ctx, x0: number, x1: number): void {
  const { bands, alpha, color } = OFF_MAP.veil, top = WORLD.playTop;
  const a = Math.max(WORLD.minX, x0), b = Math.min(WORLD.maxX, x1);
  if (a >= b) return;
  ctx.save();
  ctx.fillStyle = color;
  const base = ctx.globalAlpha;
  for (let i = 0; i < bands; i++) {
    const ya = WORLD.minY + (top * i) / bands, yb = WORLD.minY + (top * (i + 1)) / bands;
    ctx.globalAlpha = base * alpha * (1 - i / bands);
    const band: [number, number][] = [[a, ya], [b, ya], [b, yb], [a, yb]];
    if (typeof Path2D === "undefined") {
      ctx.beginPath();
      isoPath(ctx, band);
      ctx.fill();
      continue;
    }
    const p = new Path2D();
    isoPath(p, band);
    ctx.fill(p);
  }
  ctx.restore();
}
