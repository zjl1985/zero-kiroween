/**
 * Washed paper. Where water lifted the colour, the page shows its raw cream
 * paper and the pencil underdrawing (a per-chunk sketch layer baked by
 * craft-world.ts only for chunks with washed cells); blank (erased) cells are
 * clean paper with no pencil; painted cells are untouched. Each chunk keeps a
 * low-resolution vector mask built from the wash grid: one watercolour blot
 * per cell, grouped by quantised level, rebuilt only when that chunk's cells
 * change (a render-side revision, never sim state). A darker tide line dries
 * along every wash edge; fresh changes bloom with pigment (WASH_LOOK timing
 * in timeline.ts). Zero-style cut holes are clean white cut-outs and fold
 * protection is a folded paper cover. Splashes, paper rain and pigment
 * confetti are small flat paper cuts.
 *
 * With no stored wash cells nothing here runs past one check. No per-frame
 * canvas filters or pixel reads, no gradients, no random numbers. Render only:
 * reads SimState, never mutates it.
 */
import { CATS, ENEMY_DEFS } from "../defs/registries.js";
import { WASH } from "../defs/wash.js";
import { cachedSprite } from "../engine/sprite.js";
import { EFFECT_LIFE, type Impact, type SimState, type WashCell } from "../game/types.js";
import { washEmpty } from "../game/wash.js";
import { CHUNK, biomeAt } from "../game/world-gen.js";
import { BIOME_ART, type BiomeArt } from "./art-registry.js";
import { viewRect, type Camera, type ViewRect } from "./camera.js";
import { sketchTile } from "./craft-world.js";
import { visHash } from "./hash.js";
import { crease, flatCut, placePoints, PAPER_LIGHT, PAPER_SHADOW } from "./paper-kit.js";
import { mix, stroke, type Ctx, type Point } from "./paper-material.js";
import { PENCIL } from "./pencil.js";
import { WASH_LOOK, washBloom } from "./timeline.js";

/** Blot radius as a share of the wash cell: neighbours (also diagonal ones) merge into one stain. */
const BLOT = 0.8;
const COLORS = Object.freeze({
  tideInk: "#2b1d16",
  wet: "#a6c8d2",
  cut: "#fffdf8",
  cutLip: "#6a5a4a",
  fold: "#ece4f1",
  foldEdge: "#a99bba",
  foldCorner: "#faf5fc",
  drop: "#8fbfcd",
  dropRim: "#e8f6f6",
});

/** Quantised wash level of a cell: 0 painted .. 4 fully colourless (WASH.colourless and above). */
export function washStep(level: number): number {
  if (!(level > 0)) return 0;
  return Math.min(4, Math.ceil((level / WASH.colourless) * 4 - 1e-9));
}
/** Everything the mask shows about a cell, as one small integer (finite by construction). */
export function cellCode(c: WashCell, now: number): number {
  const blank = c.blank === true;
  return (blank ? 0 : washStep(c.level)) | (blank ? 8 : 0) | ((c.cutUntil ?? 0) > now ? 16 : 0) |
    ((c.foldUntil ?? 0) > now ? 32 : 0) | ((c.wetUntil ?? 0) > now ? 64 : 0);
}
interface Mark {
  readonly ix: number;
  readonly iy: number;
  readonly code: number;
}
interface Bucket {
  sig: number;
  marks: Mark[];
}
interface Mask {
  sig: number;
  /** Sketch blots by quantised level (index 0 = step 1). */
  levels: (Path2D | null)[];
  /** Every colourless or fading blot: where the tide line dries. */
  edge: Path2D | null;
  wet: Path2D | null;
  blank: Path2D | null;
  cut: Set<string>;
  fold: Set<string>;
  tide: string;
  pigment: string;
}
/** What the world renderer needs this frame: chunks ("cx,cy") with something to draw. */
export interface WashFrame {
  readonly chunks: ReadonlySet<string>;
  readonly buckets: ReadonlyMap<string, Bucket>;
  readonly seed: number;
  readonly elapsed: number;
}

const masks = new Map<string, Mask>();
const revisions = new Map<string, number>();
/** How many times a chunk's mask has been rebuilt (render-side revision; tests and tools). */
export function washMaskRevision(cx: number, cy: number): number {
  return revisions.get(cx + "," + cy) ?? 0;
}
/** Live mask count (finite: only chunks with stored wash cells). */
export function washMaskCount(): number {
  return masks.size;
}

interface Memory {
  /** Quantised look: step, or 5 for blank. */
  v: number;
  at: number;
  dir: 1 | -1;
  hint?: string;
  seen: number;
}
/** Render memory of each cell's last quantised look, so changes can bloom. */
const memory = new Map<string, Memory>();
let memorySeed = NaN, memoryClock = -1, frameNo = 0;

/** Forget masks, revisions and bloom memory (a new run). */
export function clearWashRender(): void {
  masks.clear();
  revisions.clear();
  memory.clear();
  memorySeed = NaN;
  memoryClock = -1;
}
function mixSig(ix: number, iy: number, code: number): number {
  let h = Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(code + 1, 83492791);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}
/**
 * Buckets the wash grid by chunk for this frame and notes quantised changes
 * for the bloom. Returns null, after one check, when nothing was washed.
 */
export function washFrame(sim: SimState): WashFrame | null {
  if (sim.seed !== memorySeed || sim.elapsed < memoryClock) {
    memory.clear();
    masks.clear();
    memorySeed = sim.seed;
  }
  memoryClock = sim.elapsed;
  if (washEmpty(sim) && memory.size === 0) {
    if (masks.size) masks.clear();
    return null;
  }
  frameNo++;
  const now = sim.elapsed,
    cells = sim.wash.cells,
    buckets = new Map<string, Bucket>(),
    chunks = new Set<string>(),
    reach = WASH.cell * (BLOT + 0.1);
  for (const key in cells) {
    const c = cells[key]!,
      comma = key.indexOf(","),
      ix = +key.slice(0, comma),
      iy = +key.slice(comma + 1),
      code = cellCode(c, now),
      v = c.blank ? 5 : code & 7;
    const m = memory.get(key);
    if (!m) memory.set(key, { v, at: c.changedAt, dir: v > 0 ? 1 : -1, ...(c.hint ? { hint: c.hint } : {}), seen: frameNo });
    else {
      if (m.v !== v) {
        m.dir = v > m.v ? 1 : -1;
        m.v = v;
        m.at = now;
        if (c.hint) m.hint = c.hint;
      }
      m.seen = frameNo;
    }
    if (code === 0) continue;
    const x = (ix + 0.5) * WASH.cell, y = (iy + 0.5) * WASH.cell,
      a = Math.floor((x - reach) / CHUNK.width), b = Math.floor((x + reach) / CHUNK.width),
      p = Math.floor((y - reach) / CHUNK.height), q = Math.floor((y + reach) / CHUNK.height),
      mark = { ix, iy, code }, sig = mixSig(ix, iy, code);
    for (let cy = p; cy <= q; cy++)
      for (let cx = a; cx <= b; cx++) {
        const k = cx + "," + cy;
        let bucket = buckets.get(k);
        if (!bucket) buckets.set(k, bucket = { sig: 0, marks: [] });
        // Order-free signature: a sum of per-cell hashes.
        bucket.sig = (bucket.sig + sig) >>> 0;
        bucket.marks.push(mark);
        // Only chunks with colour actually lifted need the pencil layer.
        if (code & 7) chunks.add(k);
      }
  }
  // Cells the sim forgot were fully repainted: bloom once more, then forget them.
  for (const [key, m] of memory) {
    if (m.seen === frameNo) continue;
    if (m.v > 0) {
      m.v = 0;
      m.dir = -1;
      m.at = now;
    } else if (now - m.at > WASH_LOOK.seconds) memory.delete(key);
    m.seen = frameNo;
  }
  for (const key of masks.keys()) if (!buckets.has(key)) masks.delete(key);
  return { chunks, buckets, seed: sim.seed, elapsed: now };
}

/** One soft watercolour blot (smooth closed curve through hashed radii) appended to `p`. */
function blot(p: Path2D, ix: number, iy: number, scale = 1): void {
  const x = (ix + 0.5) * WASH.cell, y = (iy + 0.5) * WASH.cell, n = 10,
    turn = visHash(ix * 31 + iy * 17) * 0.6,
    pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + turn,
      k = (0.86 + visHash((ix * 7349) ^ (iy * 1931) ^ (i * 97)) * 0.24) * WASH.cell * BLOT * scale;
    pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k * 0.92]);
  }
  const mid = (i: number): Point => {
    const u = pts[i % n]!, v = pts[(i + 1) % n]!;
    return [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  };
  const start = mid(0);
  p.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const c = pts[i % n]!, e = mid(i);
    p.quadraticCurveTo(c[0], c[1], e[0], e[1]);
  }
  p.closePath();
}
function chunkLook(seed: number, cx: number, cy: number): { tide: string; pigment: string } {
  return washLook(BIOME_ART.find(biomeAt(seed, cx, cy).id));
}
/** Tide-line and bloom pigment colours of a district (also used by the gallery swatches). */
export function washLook(art: BiomeArt | undefined): { tide: string; pigment: string } {
  const base = art?.sheet.colors[2] ?? "#6f6a5a";
  return { tide: mix(base, COLORS.tideInk, 0.35), pigment: art?.swatch[1] ?? "#7a8f6a" };
}
/** A free-standing watercolour stain of a few merged blots around (x, y) (gallery swatches). */
export function swatchBlot(x: number, y: number, r: number, seed: number, scale = 1): Path2D {
  const p = new Path2D(), cell = WASH.cell * BLOT;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + visHash(seed + i) * 0.8, d = i === 0 ? 0 : r * (0.45 + visHash(seed * 3 + i) * 0.25),
      bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.7,
      // Reuse the cell blot shape, scaled so one blot spans about half the stain.
      k = ((r * 0.62) / cell) * scale;
    appendBlot(p, bx, by, k, seed + i * 17);
  }
  return p;
}
function appendBlot(p: Path2D, x: number, y: number, k: number, salt: number): void {
  const n = 10, pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + visHash(salt) * 0.6,
      rr = (0.86 + visHash(salt * 131 + i * 97) * 0.24) * WASH.cell * BLOT * k;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.92]);
  }
  const mid = (i: number): Point => {
    const u = pts[i % n]!, v = pts[(i + 1) % n]!;
    return [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  };
  const start = mid(0);
  p.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const c = pts[i % n]!, e = mid(i);
    p.quadraticCurveTo(c[0], c[1], e[0], e[1]);
  }
  p.closePath();
}
function buildMask(seed: number, key: string, bucket: Bucket): Mask {
  const [cx, cy] = key.split(",").map(Number) as [number, number],
    levels: (Path2D | null)[] = [null, null, null, null],
    look = chunkLook(seed, cx, cy),
    m: Mask = { sig: bucket.sig, levels, edge: null, wet: null, blank: null, cut: new Set(), fold: new Set(), ...look };
  for (const { ix, iy, code } of bucket.marks) {
    const step = code & 7;
    if (step > 0) {
      blot(levels[step - 1] ??= new Path2D(), ix, iy);
      blot(m.edge ??= new Path2D(), ix, iy);
    }
    if (code & 8) blot(m.blank ??= new Path2D(), ix, iy, 0.94);
    if (code & 16) m.cut.add(ix + "," + iy);
    if (code & 32) m.fold.add(ix + "," + iy);
    if (code & 64) blot(m.wet ??= new Path2D(), ix, iy, 0.9);
  }
  revisions.set(key, (revisions.get(key) ?? 0) + 1);
  return m;
}
/** The chunk's mask, rebuilt only when its quantised cells changed. */
function maskFor(seed: number, key: string, bucket: Bucket): Mask {
  const old = masks.get(key);
  if (old && old.sig === bucket.sig) return old;
  const m = buildMask(seed, key, bucket);
  masks.set(key, m);
  return m;
}

/** Square cells of a set as one path, plus their outer edges split by side (for lit rim / dark lip). */
function cellShapes(cells: ReadonlySet<string>, inset: number): { body: Path2D; lit: Path2D; lip: Path2D } {
  const body = new Path2D(), lit = new Path2D(), lip = new Path2D(), c = WASH.cell;
  for (const key of cells) {
    const [ix, iy] = key.split(",").map(Number) as [number, number],
      x0 = ix * c, y0 = iy * c, x1 = x0 + c, y1 = y0 + c,
      has = (dx: number, dy: number) => cells.has(ix + dx + "," + (iy + dy));
    body.rect(x0 - (has(-1, 0) ? 0 : -inset), y0 - (has(0, -1) ? 0 : -inset),
      c - (has(-1, 0) ? 0 : inset) - (has(1, 0) ? 0 : inset), c - (has(0, -1) ? 0 : inset) - (has(0, 1) ? 0 : inset));
    // Top and right edges face the moon; bottom and left carry the dark lip.
    if (!has(0, -1)) { lit.moveTo(x0 + inset, y0 + inset); lit.lineTo(x1 - inset, y0 + inset); }
    if (!has(1, 0)) { lit.moveTo(x1 - inset, y0 + inset); lit.lineTo(x1 - inset, y1 - inset); }
    if (!has(0, 1)) { lip.moveTo(x0 + inset, y1 - inset); lip.lineTo(x1 - inset, y1 - inset); }
    if (!has(-1, 0)) { lip.moveTo(x0 + inset, y0 + inset); lip.lineTo(x0 + inset, y1 - inset); }
  }
  return { body, lit, lip };
}
/** Zero-style cut holes: clean white cut-outs lifted a little off the page. */
function drawCutHoles(ctx: Ctx, cells: ReadonlySet<string>): void {
  const { body, lit, lip } = cellShapes(cells, 2.5);
  ctx.save();
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 1.8, PAPER_SHADOW.dy * 1.8);
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(body);
  ctx.restore();
  ctx.fillStyle = COLORS.cut;
  ctx.fill(body);
  stroke(ctx, lip, COLORS.cutLip, 0.9, 0.7);
  stroke(ctx, lit, PAPER_LIGHT.rim, 1.1, 0.9);
  ctx.restore();
}
/** Fold protection: a translucent folded sheet laid over the cells, creased, with a turned corner. */
function drawFoldCover(ctx: Ctx, cells: ReadonlySet<string>): void {
  const { body, lit, lip } = cellShapes(cells, 1.5), c = WASH.cell;
  ctx.save();
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 1.2, PAPER_SHADOW.dy * 1.2);
  ctx.globalAlpha *= 0.18;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(body);
  ctx.restore();
  ctx.globalAlpha *= 0.46;
  ctx.fillStyle = COLORS.fold;
  ctx.fill(body);
  ctx.restore();
  stroke(ctx, lip, COLORS.foldEdge, 0.8, 0.6);
  stroke(ctx, lit, COLORS.foldCorner, 0.9, 0.8);
  for (const key of cells) {
    const [ix, iy] = key.split(",").map(Number) as [number, number], x0 = ix * c, y0 = iy * c;
    if ((ix + iy) % 2 === 0) crease(ctx, x0 + 4, y0 + c - 4, x0 + c - 4, y0 + 4, 0.35);
    // The top-right corner of a cover is turned back toward the moon.
    if (!cells.has(ix + 1 + "," + iy) && !cells.has(ix + "," + (iy - 1))) {
      const x1 = x0 + c - 1.5, y1 = y0 + 1.5;
      flatCut(ctx, [[x1 - 10, y1], [x1, y1 + 10], [x1 - 10, y1 + 10]], { color: COLORS.foldCorner, thickness: 0.5, lift: 0.6, texture: 0 });
    }
  }
}
function forChunks(view: ViewRect, fn: (cx: number, cy: number) => void): void {
  for (let cy = Math.floor(view.y0 / CHUNK.height); cy <= Math.floor(view.y1 / CHUNK.height); cy++)
    for (let cx = Math.floor(view.x0 / CHUNK.width); cx <= Math.floor(view.x1 / CHUNK.width); cx++) fn(cx, cy);
}
/**
 * Washed ground for the visible chunks, under everything that stands on it:
 * tide line, pencil layer through the level blots (raw cream until the tile
 * is baked), wet film, blank paper, fold covers and cut holes, then blooms.
 */
export function drawWashGround(ctx: Ctx, cam: Camera, frame: WashFrame | null): void {
  if (!frame) return;
  const view = viewRect(cam, 4), W = CHUNK.width, H = CHUNK.height;
  forChunks(view, (cx, cy) => {
    const key = cx + "," + cy, bucket = frame.buckets.get(key);
    if (!bucket) return;
    const m = maskFor(frame.seed, key, bucket), x = cx * W, y = cy * H, clip = new Path2D();
    clip.rect(x, y, W, H);
    ctx.save();
    ctx.clip(clip);
    if (m.edge) {
      stroke(ctx, m.edge, m.tide, 4.2, WASH_LOOK.tideAlpha);
      stroke(ctx, m.edge, mix(m.tide, COLORS.tideInk, 0.3), 1.1, 0.5);
    }
    const tile = sketchTile(frame.seed, cx, cy);
    m.levels.forEach((p, i) => {
      if (!p) return;
      ctx.save();
      ctx.clip(p);
      ctx.globalAlpha *= (i + 1) / 4;
      if (tile) ctx.drawImage(tile, x, y, W, H);
      else {
        ctx.fillStyle = PENCIL.paper;
        ctx.fillRect(x, y, W, H);
      }
      ctx.restore();
    });
    if (m.wet) {
      ctx.save();
      ctx.globalAlpha *= 0.15;
      ctx.fillStyle = COLORS.wet;
      ctx.fill(m.wet);
      ctx.restore();
    }
    if (m.blank) {
      // Rubbed out: a faint graphite smear around clean paper, no pencil at all.
      stroke(ctx, m.blank, PENCIL.soft, 6, 0.1);
      ctx.save();
      ctx.fillStyle = PENCIL.blank;
      ctx.fill(m.blank);
      ctx.restore();
      stroke(ctx, m.blank, PENCIL.blank, 2.4, 0.9);
    }
    if (m.fold.size) drawFoldCover(ctx, m.fold);
    if (m.cut.size) drawCutHoles(ctx, m.cut);
    ctx.restore();
  });
  drawBlooms(ctx, view, frame);
}
/** Fresh changes bloom: lifted pigment and a pushed tide line, or new pigment drying in. */
function drawBlooms(ctx: Ctx, view: ViewRect, frame: WashFrame): void {
  let n = 0;
  for (const [key, m] of memory) {
    const age = frame.elapsed - m.at;
    if (!(age >= 0 && age < WASH_LOOK.seconds)) continue;
    if (n >= WASH_LOOK.maxBlooms) break;
    const comma = key.indexOf(","), ix = +key.slice(0, comma), iy = +key.slice(comma + 1),
      x = (ix + 0.5) * WASH.cell, y = (iy + 0.5) * WASH.cell;
    if (x < view.x0 - WASH.cell || x > view.x1 + WASH.cell || y < view.y0 - WASH.cell || y > view.y1 + WASH.cell) continue;
    n++;
    const b = washBloom(age),
      look = chunkLook(frame.seed, Math.floor(x / CHUNK.width), Math.floor(y / CHUNK.height)),
      color = m.hint ?? look.pigment,
      p = new Path2D();
    if (m.dir > 0) blot(p, ix, iy, 0.86 + b.spread * 0.3);
    else blot(p, ix, iy, 0.35 + b.spread * 0.75);
    ctx.save();
    ctx.globalAlpha *= b.pigment * (m.dir > 0 ? 1 : 1.1);
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.restore();
    stroke(ctx, p, m.dir > 0 ? look.tide : mix(color, COLORS.tideInk, 0.3), 1.8, b.tide);
  }
}

// ---------------------------------------------------------------- effects
/** A round cut-paper water drop with its lit rim and hard shadow (cached: three sizes). */
function drop(size: 0 | 1 | 2) {
  const r = [1.8, 2.5, 3.3][size]!;
  return cachedSprite(`wash-drop:${size}`, r * 2 + 6, r * 2 + 6, 2, (c) => {
    flatCut(c, ovalPoints(r + 2, r + 2, r, r * 0.86), { color: COLORS.drop, edge: COLORS.dropRim, thickness: 0.5, lift: 0.5, texture: 0 });
  }, { x: 0.5, y: 0.5 });
}
function ovalPoints(x: number, y: number, rx: number, ry: number, n = 10): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as Point;
  });
}
/** A slanted cut-paper raindrop (cached: two sizes); all rain falls at one angle, so no rotation key. */
function rainDrop(size: 0 | 1) {
  const k = size ? 1.3 : 1;
  return cachedSprite(`wash-rain:${size}`, 14 * k, 16 * k, 2, (c) => {
    const pts = placePoints([[0, -6], [1.7, -1.2], [2.3, 1.2], [1.1, 3], [-1.1, 3], [-2.3, 1.2], [-1.7, -1.2]], 7 * k, 8 * k, RAIN_TILT, k);
    flatCut(c, pts, { color: COLORS.drop, edge: COLORS.dropRim, thickness: 0.5, lift: 0.6, texture: 0 });
  }, { x: 0.5, y: 0.5 });
}
/** Rain slants the way the paper-rain bands run. */
const RAIN_TILT = -0.42;
const CONFETTI: readonly (readonly Point[])[] = [
  [[-3, -2], [3, -2.4], [2.6, 2], [-2.8, 2.2]],
  [[0, -3.4], [3.2, 2.4], [-3.2, 2.2]],
  [[-3.6, -1.2], [-0.6, -2.6], [3.4, -1], [1.2, 2.4], [-2.6, 1.8]],
];
/** One confetti piece: a pigment paper scrap at one of six turns (finite keys per colour). */
function confetti(shape: number, turn: number, color: string) {
  return cachedSprite(`wash-confetti:${shape}:${turn}:${color}`, 14, 14, 2, (c) => {
    flatCut(c, placePoints(CONFETTI[shape]!, 7, 7, (turn / 6) * Math.PI, 1), { color, thickness: 0.5, lift: 0.7, texture: 0 });
  }, { x: 0.5, y: 0.5 });
}

/** Splashes and pigment confetti; true when the impact was one of them. */
export function drawWashEffect(ctx: Ctx, e: Impact, sim: SimState): boolean {
  if (e.kind !== "splash" && e.kind !== "pigment") return false;
  const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])),
    fade = 1 - t,
    ease = 1 - (1 - t) ** 3,
    radius = e.radius ?? 30,
    seed = e.seed ?? Math.round(e.x * 3 + e.y * 7);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, fade * 1.6);
  if (e.kind === "splash") {
    // A flat ripple ring pressed into the page, then cut-paper drops thrown outward.
    const ring = new Path2D();
    ring.ellipse(e.x, e.y, radius * (0.35 + ease * 0.6), radius * (0.2 + ease * 0.34), 0, 0, Math.PI * 2);
    stroke(ctx, ring, COLORS.dropRim, 1.4, 0.6 * fade);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + visHash(seed + i) * 0.5,
        d = radius * (0.2 + ease * (0.6 + visHash(seed + i * 3) * 0.35)),
        hop = Math.sin(t * Math.PI) * (8 + visHash(seed + i * 5) * 10);
      drop((i % 3) as 0 | 1 | 2).draw(ctx, { x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.55 - hop });
    }
  } else {
    const hint = e.src ? ENEMY_DEFS.find(e.src)?.pigment : undefined,
      color = hint ?? CATS.get(sim.player.id).stats.accent;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + visHash(seed * 3 + i) * 0.7,
        d = radius * (0.15 + ease * (0.45 + visHash(seed + i * 7) * 0.3)),
        hop = Math.sin(Math.min(1, t * 1.3) * Math.PI) * (10 + visHash(seed + i * 11) * 12),
        turn = (Math.floor(visHash(seed + i * 13) * 6) + Math.floor(t * 9)) % 6;
      confetti(i % 3, turn, color).draw(ctx, { x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.5 - hop + t * 6 });
    }
  }
  ctx.restore();
  return true;
}
/** How strongly paper rain is falling now (0 outside the WASH.rain spell, eased at its edges). */
export function rainAmount(sim: SimState): number {
  const r = WASH.rain, s = sim.sessionSeconds,
    start = r.at * s, end = r.until * s, edge = Math.min(2, (end - start) / 4);
  if (sim.elapsed < start || sim.elapsed >= end) return 0;
  return Math.min(1, (sim.elapsed - start) / edge, (end - sim.elapsed) / edge);
}
/** Paper rain falling across the view while the spell lasts: cached cut-paper drops, moved by view time. */
export function drawPaperRain(ctx: Ctx, sim: SimState, cam: Camera, time: number, reduced: boolean): void {
  const k = rainAmount(sim);
  if (k <= 0) return;
  const v = viewRect(cam, 20), w = v.x1 - v.x0, h = v.y1 - v.y0,
    n = Math.round((reduced ? 18 : 46) * k),
    fall = reduced ? 0 : time * 300;
  ctx.save();
  ctx.globalAlpha *= 0.85;
  for (let i = 0; i < n; i++) {
    const sx = visHash(i * 7 + 1) * w, sy = visHash(i * 13 + 5) * h,
      y = (sy + fall * (0.8 + visHash(i) * 0.4)) % h,
      x = (sx + y * Math.tan(-RAIN_TILT) + w * 4) % w;
    rainDrop((i % 2) as 0 | 1).draw(ctx, { x: v.x0 + x, y: v.y0 + y });
  }
  ctx.restore();
}
