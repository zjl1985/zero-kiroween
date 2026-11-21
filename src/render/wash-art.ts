/** Native pixel wash overlays: dirty-only tile rasterization, bounded LRU,
 * shared simulation colour cells and read-only recolour cues. */
import { surface, type CanvasSurface } from '../engine/surface.js';
import { FX, glyph as pxGlyph, rect as pxRect, line as pxLine, pixelRing, burst } from './pixel-vfx.js';
import { reducedPaperMotion } from './paper-motion.js';
import { WASH } from '../defs/wash.js';
import { EFFECT_LIFE, type Impact, type SimState, type WashCell } from '../game/types.js';
import { washEmpty } from '../game/wash.js';
import { CHUNK } from '../game/world-gen.js';
import type { BiomeArt } from './art-registry.js';
import { viewRect, type Camera, type ViewRect } from './camera.js';
import { visHash } from './hash.js';
import { insidePolygon } from '../defs/weapons/paper-geometry.js';
import { mix, type Ctx } from './paper-material.js';
import { WASH_LOOK } from './timeline.js';
/** Blot radius as a share of the wash cell: neighbours (also diagonal ones) merge into one stain. */
const BLOT = 0.8;
const COLORS = Object.freeze({
    tideInk: "#2b1d16",
    wet: "#a6c8d2",
    cut: "#fffdf8",
    cutLip: "#6a5a4a",
    drop: "#8fbfcd",
    dropRim: "#e8f6f6",
});
/** Quantised wash level of a cell: 0 painted .. 4 fully colourless (WASH.colourless and above). */
export function washStep(level: number): number {
    if (!(level > 0))
        return 0;
    return Math.min(4, Math.ceil((level / WASH.colourless) * 4 - 1e-9));
}
/** Everything the mask shows about a cell, as one small integer (finite by construction). */
export function cellCode(c: WashCell, now: number): number {
    const blank = c.blank === true;
    return (blank ? 0 : washStep(c.level)) | (blank ? 8 : 0) | ((c.cutUntil ?? 0) > now ? 16 : 0) |
        ((c.wetUntil ?? 0) > now ? 64 : 0);
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
    pixels: CanvasSurface;
}
/** What the world renderer needs this frame: chunks ("cx,cy") with something to draw. */
export interface WashFrame {
    readonly chunks: ReadonlySet<string>;
    readonly buckets: ReadonlyMap<string, Bucket>;
    readonly seed: number;
    readonly elapsed: number;
}
const masks = new Map<string, Mask>();
/** Pixel overlays are bounded independently of total explored wash cells. */
const MAX_WASH_TILES = 16;
function releaseMask(key: string): void {
    const old = masks.get(key);
    if (old)
        old.pixels.width = old.pixels.height = 0;
    masks.delete(key);
}
function clearMasks(): void {
    for (const key of masks.keys())
        releaseMask(key);
}
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
    clearMasks();
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
        clearMasks();
        memorySeed = sim.seed;
    }
    memoryClock = sim.elapsed;
    if (washEmpty(sim) && memory.size === 0) {
        if (masks.size)
            clearMasks();
        return null;
    }
    frameNo++;
    const now = sim.elapsed, cells = sim.wash.cells, buckets = new Map<string, Bucket>(), chunks = new Set<string>(), reach = WASH.cell * (BLOT + 0.1);
    for (const key in cells) {
        const c = cells[key]!, comma = key.indexOf(","), ix = +key.slice(0, comma), iy = +key.slice(comma + 1), v = c.blank ? 5 : washStep(c.level);
        let code = cellCode(c, now);
        // A Paper Cut piece draws its own polygon hole: no second (cell) hole under it.
        if (code & 16 && underCutOut(sim, ix, iy))
            code &= ~16;
        const m = memory.get(key);
        if (!m)
            memory.set(key, { v, at: c.changedAt, dir: v > 0 ? 1 : -1, ...(c.hint ? { hint: c.hint } : {}), seen: frameNo });
        else {
            if (m.v !== v) {
                m.dir = v > m.v ? 1 : -1;
                m.v = v;
                m.at = now;
                if (c.hint)
                    m.hint = c.hint;
            }
            m.seen = frameNo;
        }
        if (code === 0)
            continue;
        const x = (ix + 0.5) * WASH.cell, y = (iy + 0.5) * WASH.cell, a = Math.floor((x - reach) / CHUNK.width), b = Math.floor((x + reach) / CHUNK.width), p = Math.floor((y - reach) / CHUNK.height), q = Math.floor((y + reach) / CHUNK.height), mark = { ix, iy, code }, sig = mixSig(ix, iy, code);
        for (let cy = p; cy <= q; cy++)
            for (let cx = a; cx <= b; cx++) {
                const k = cx + "," + cy;
                let bucket = buckets.get(k);
                if (!bucket)
                    buckets.set(k, bucket = { sig: 0, marks: [] });
                // Order-free signature: a sum of per-cell hashes.
                bucket.sig = (bucket.sig + sig) >>> 0;
                bucket.marks.push(mark);
                // Only chunks with colour actually lifted need the pencil layer.
                if (code & 7)
                    chunks.add(k);
            }
    }
    // Cells the sim forgot were fully repainted: bloom once more, then forget them.
    for (const [key, m] of memory) {
        if (m.seen === frameNo)
            continue;
        if (m.v > 0) {
            m.v = 0;
            m.dir = -1;
            m.at = now;
        }
        else if (now - m.at > WASH_LOOK.seconds)
            memory.delete(key);
        m.seen = frameNo;
    }
    for (const key of masks.keys())
        if (!buckets.has(key))
            releaseMask(key);
    return { chunks, buckets, seed: sim.seed, elapsed: now };
}
/** True when the cell centre lies inside a Paper Cut piece cut within the last WASH.cut.seconds. */
function underCutOut(sim: SimState, ix: number, iy: number): boolean {
    const outs = sim.cut?.outs;
    if (!outs?.length)
        return false;
    const x = (ix + 0.5) * WASH.cell, y = (iy + 0.5) * WASH.cell;
    return outs.some((o) => sim.elapsed - o.at < WASH.cut.seconds && insidePolygon(o.points, x, y));
}
/** Tide-line and bloom pigment colours of a district (also used by the gallery swatches). */
export function washLook(art: BiomeArt | undefined): {
    tide: string;
    pigment: string;
} {
    const base = art?.sheet.colors[2] ?? "#6f6a5a";
    return { tide: mix(base, COLORS.tideInk, WASH_LOOK.tideInk), pigment: art?.swatch[1] ?? "#7a8f6a" };
}
/** A free-standing watercolour stain of a few merged blots around (x, y) (gallery swatches). */
export function swatchBlot(x: number, y: number, r: number, seed: number, scale = 1): Path2D {
    const p = new Path2D(), cell = Math.max(2, Math.round(r / 3));
    for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++)
            if (i * i + j * j < 7)
                p.rect(Math.round(x + i * cell), Math.round(y + j * cell * .7), cell, cell);
    return p;
}
function buildMask(seed: number, key: string, bucket: Bucket): Mask {
    const [cx, cy] = key.split(',').map(Number) as [
        number,
        number
    ];
    const pixels = masks.get(key)?.pixels ?? surface(CHUNK.width, CHUNK.height);
    const c = pixels.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, CHUNK.width, CHUNK.height);
    c.imageSmoothingEnabled = false;
    for (const mark of bucket.marks) {
        const x = mark.ix * WASH.cell - cx * CHUNK.width, y = mark.iy * WASH.cell - cy * CHUNK.height, step = mark.code & 7;
        // Overlapping stepped silhouettes avoid isolated square-cell outlines.
        const stain = new Path2D();
        stain.rect(x, y, WASH.cell, WASH.cell);
        stain.rect(x - 4, y + 4, WASH.cell + 8, WASH.cell - 8);
        if (step) {
            c.globalAlpha = step * .19;
            c.fillStyle = '#b0b4a5';
            c.fill(stain);
            c.globalAlpha = step * .12;
            pxRect(c, x + 8, y + 12, 8, 2, '#717e83');
            pxRect(c, x + 16, y + 18, 4, 2, '#717e83');
        }
        if (mark.code & 64) {
            c.globalAlpha = .22;
            c.fillStyle = FX.blue;
            c.fill(stain);
            c.globalAlpha = .6;
            pxRect(c, x + 4, y + 22, 10, 2, FX.blue);
        }
        if (mark.code & 8) {
            c.globalAlpha = .95;
            c.fillStyle = '#d3c9aa';
            c.fill(stain);
        }
        if (mark.code & 16) {
            c.globalAlpha = 1;
            pxRect(c, x + 3, y + 3, WASH.cell - 6, WASH.cell - 6, FX.dark);
            pxRect(c, x + 3, y + 3, WASH.cell - 6, 2, FX.cream);
        }
    }
    c.globalAlpha = 1;
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    return { sig: bucket.sig, pixels };
}
/** The chunk's mask, rebuilt only when its quantised cells changed. */
function maskFor(seed: number, key: string, bucket: Bucket): Mask {
    const old = masks.get(key);
    if (old && old.sig === bucket.sig) {
        masks.delete(key);
        masks.set(key, old);
        return old;
    }
    const m = buildMask(seed, key, bucket);
    masks.set(key, m);
    while (masks.size > MAX_WASH_TILES) {
        const first = masks.keys().next().value;
        if (first === undefined)
            break;
        releaseMask(first);
    }
    return m;
}
/**
 * Fold protection: a quiet folded paper sheet over every live fold circle
 * (SimState.wash.folds), shown for its whole protection time and fading out
 * at its end (FOLD_GUARD_LOOK). Stores nothing; no folds, no work.
 */
export function drawFoldGuards(ctx: Ctx, sim: SimState, cam: Camera): void {
    const view = viewRect(cam, 4);
    for (const f of sim.wash?.folds ?? []) {
        const left = f.until - sim.elapsed;
        if (left <= 0 || f.x + f.radius < view.x0 || f.x - f.radius > view.x1 || f.y + f.radius < view.y0 || f.y - f.radius > view.y1)
            continue;
        ctx.save();
        ctx.globalAlpha *= Math.min(.55, left);
        pixelRing(ctx, f.x, f.y, f.radius, FX.purple, .62);
        pxGlyph(ctx, 'shield', f.x, f.y, 5, FX.cream);
        ctx.restore();
    }
}
function forChunks(view: ViewRect, fn: (cx: number, cy: number) => void): void {
    for (let cy = Math.floor(view.y0 / CHUNK.height); cy <= Math.floor(view.y1 / CHUNK.height); cy++)
        for (let cx = Math.floor(view.x0 / CHUNK.width); cx <= Math.floor(view.x1 / CHUNK.width); cx++)
            fn(cx, cy);
}
/**
 * Washed ground for the visible chunks, under everything that stands on it:
 * tide line, pencil layer through the level blots (raw cream until the tile
 * is baked), wet film, blank paper and cut holes, then blooms.
 */
export function drawWashGround(ctx: Ctx, cam: Camera, frame: WashFrame | null): void {
    if (!frame)
        return;
    const view = viewRect(cam, 4), W = CHUNK.width, H = CHUNK.height;
    forChunks(view, (cx, cy) => {
        const key = cx + "," + cy, bucket = frame.buckets.get(key);
        if (!bucket)
            return;
        const mask = maskFor(frame.seed, key, bucket);
        ctx.drawImage(mask.pixels, cx * W, cy * H, W, H);
    });
    drawBlooms(ctx, view, frame);
}
/** Fresh changes bloom: lifted pigment and a pushed tide line, or new pigment drying in. */
function drawBlooms(ctx: Ctx, view: ViewRect, frame: WashFrame): void {
    let n = 0;
    for (const [key, m] of memory) {
        const age = frame.elapsed - m.at;
        if (age < 0 || age >= WASH_LOOK.seconds)
            continue;
        const [ix, iy] = key.split(',').map(Number), x = (ix! + .5) * WASH.cell, y = (iy! + .5) * WASH.cell;
        if (x < view.x0 - WASH.cell || x > view.x1 + WASH.cell || y < view.y0 - WASH.cell || y > view.y1 + WASH.cell)
            continue;
        if (n++ >= WASH_LOOK.maxBlooms)
            break;
        const t = age / WASH_LOOK.seconds, color = m.dir < 0 ? FX.green : FX.blue;
        burst(ctx, x, y, t, WASH.cell * .55, color, 4);
    }
}
/** Splashes and pigment confetti; true when the impact was one of them. */
export function drawWashEffect(ctx: Ctx, e: Impact, sim: SimState): boolean {
    if (e.kind !== "splash" && e.kind !== "pigment")
        return false;
    const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])), k = reducedPaperMotion() ? .25 : t, r = e.radius ?? 30, color = e.kind === 'splash' ? FX.blue : FX.purple;
    ctx.save();
    ctx.globalAlpha *= 1 - t;
    pixelRing(ctx, e.x, e.y, r * (.35 + k * .6), color, .55);
    burst(ctx, e.x, e.y, t, r, color, 9);
    ctx.restore();
    return true;
}
/** How strongly paper rain is falling now (0 outside the WASH.rain spell, eased at its edges). */
export function rainAmount(sim: SimState): number {
    const r = WASH.rain, s = sim.sessionSeconds, start = r.at * s, end = r.until * s, edge = Math.min(2, (end - start) / 4);
    if (sim.elapsed < start || sim.elapsed >= end)
        return 0;
    return Math.min(1, (sim.elapsed - start) / edge, (end - sim.elapsed) / edge);
}
/** Paper rain falling across the view while the spell lasts: cached cut-paper drops, moved by view time. */
export function drawPaperRain(ctx: Ctx, sim: SimState, cam: Camera, time: number, reduced: boolean): void {
    const k = rainAmount(sim);
    if (k <= 0)
        return;
    const v = viewRect(cam, 20), w = v.x1 - v.x0, h = v.y1 - v.y0, n = Math.round((reduced ? 18 : 46) * k), fall = reduced ? 0 : time * 300;
    for (let i = 0; i < n; i++) {
        const y = (visHash(i * 13 + 5) * h + fall * (.8 + visHash(i) * .4)) % h, x = (visHash(i * 7 + 1) * w + y * .42 + w * 4) % w;
        pxLine(ctx, v.x0 + x, v.y0 + y, v.x0 + x + 2, v.y0 + y + 6, FX.blue, 2);
    }
}