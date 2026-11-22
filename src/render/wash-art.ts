/** Native pixel wash overlays: dirty-only tile rasterization, bounded LRU,
 * shared simulation colour cells and read-only recolour cues. */
import { surface, type CanvasSurface } from '../engine/surface.js';
import { FX, glyph as pxGlyph, rect as pxRect, line as pxLine, burst } from './pixel-vfx.js';
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
    /** Reused only on dirty rebuilds. One channel per translucent material. */
    coverage: Uint8Array;
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
// Two native pixels keep the irregular edge crisp without exposing the 32px
// simulation grid. Neighbouring marks union by maximum coverage, never alpha
// accumulation: shared cell borders cannot become dark rectangular seams.
const MASK_PIXEL = 2;
const MASK_COLS = Math.ceil(CHUNK.width / MASK_PIXEL);
const MASK_ROWS = Math.ceil(CHUNK.height / MASK_PIXEL);
const MASK_TONES = [
    { color: '#bcc0aa', opacity: .26 / 16 },
    { color: '#899d9b', opacity: .075 / 4 },
    { color: '#d3c9aa', opacity: .68 / 4 },
] as const;
const CHANNELS = MASK_TONES.length;
function buildMask(seed: number, key: string, bucket: Bucket): Mask {
    const [cx, cy] = key.split(',').map(Number) as [number, number];
    const old = masks.get(key), pixels = old?.pixels ?? surface(CHUNK.width, CHUNK.height),
        coverage = old?.coverage ?? new Uint8Array(MASK_COLS * MASK_ROWS * CHANNELS),
        originX = cx * CHUNK.width, originY = cy * CHUNK.height;
    coverage.fill(0);
    const c = pixels.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, CHUNK.width, CHUNK.height);
    c.imageSmoothingEnabled = false;
    for (const mark of bucket.marks) {
        if (!(mark.code & (7 | 8 | 64))) continue;
        const x = (mark.ix + .5) * WASH.cell - originX,
            y = (mark.iy + .5) * WASH.cell - originY, step = mark.code & 7,
            radius = WASH.cell * BLOT + (visHash(seed + mark.ix * 193 + mark.iy * 7919) - .5) * 2,
            core = WASH.cell * .72, feather = radius - core,
            radius2 = radius * radius, edge1 = (radius - feather * .25) ** 2,
            edge2 = (radius - feather * .5) ** 2, edge3 = (radius - feather * .75) ** 2,
            x0 = Math.max(0, Math.floor((x - radius - 1) / MASK_PIXEL)),
            x1 = Math.min(MASK_COLS - 1, Math.ceil((x + radius + 1) / MASK_PIXEL)),
            y0 = Math.max(0, Math.floor((y - radius - 1) / MASK_PIXEL)),
            y1 = Math.min(MASK_ROWS - 1, Math.ceil((y + radius + 1) / MASK_PIXEL));
        for (let row = y0; row <= y1; row++) for (let col = x0; col <= x1; col++) {
            const dx = col * MASK_PIXEL + 1 - x, dy = row * MASK_PIXEL + 1 - y,
                distance2 = dx * dx + dy * dy,
                // Four small, crisp contour steps; no square roots per pixel.
                edge = distance2 >= radius2 ? 0 : distance2 < edge3 ? 4 : distance2 < edge2 ? 3 : distance2 < edge1 ? 2 : 1,
                at = (row * MASK_COLS + col) * CHANNELS;
            if (!edge) continue;
            if (step) coverage[at] = Math.max(coverage[at], step * edge);
            if (mark.code & 64) coverage[at + 1] = Math.max(coverage[at + 1], edge);
            if (mark.code & 8) coverage[at + 2] = Math.max(coverage[at + 2], edge);
        }
    }
    // Keep topology visible through a neutral lifted-pigment veil. Fully
    // colourless, wet and erased are separate cues, without blue paint baths.
    for (const [channel, { color, opacity }] of MASK_TONES.entries()) {
        c.fillStyle = color;
        for (let row = 0; row < MASK_ROWS; row++) {
            let start = 0, value = 0;
            for (let col = 0; col <= MASK_COLS; col++) {
                const next = col < MASK_COLS ? coverage[(row * MASK_COLS + col) * CHANNELS + channel]! : 0;
                if (next === value) continue;
                if (value) {
                    c.globalAlpha = value * opacity;
                    c.fillRect(start * MASK_PIXEL, row * MASK_PIXEL, (col - start) * MASK_PIXEL, MASK_PIXEL);
                }
                start = col; value = next;
            }
        }
    }
    c.globalAlpha = 1;
    // Cutouts are solid paper geometry, separate from translucent stains.
    // Keep their narrow pale edge so a cut reads differently from an erasure.
    for (const mark of bucket.marks) {
        if (!(mark.code & 16)) continue;
        const x = mark.ix * WASH.cell - originX + 3;
        const y = mark.iy * WASH.cell - originY + 3;
        pxRect(c, x, y, WASH.cell - 6, WASH.cell - 6, FX.dark);
        pxRect(c, x, y, WASH.cell - 6, 2, FX.cream);
    }
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    return { sig: bucket.sig, pixels, coverage };
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
 * A small shield marks the centre of a protected fold until it expires.
 */
export function drawFoldGuards(ctx: Ctx, sim: SimState, cam: Camera): void {
    const view = viewRect(cam, 7);
    for (const f of sim.wash?.folds ?? []) {
        const left = f.until - sim.elapsed;
        if (left <= 0 || f.x < view.x0 || f.x > view.x1 || f.y < view.y0 || f.y > view.y1)
            continue;
        ctx.save();
        ctx.globalAlpha *= Math.min(.55, left);
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
 * joined pigment loss, wet film, blank paper and cut holes, then recolour cues.
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
/** Splashes already show their own impact. Only returning pigment needs a
 * separate quiet cue here, so a wet field never sparkles on every grid cell. */
function drawBlooms(ctx: Ctx, view: ViewRect, frame: WashFrame): void {
    let n = 0;
    for (const [key, m] of memory) {
        const age = frame.elapsed - m.at;
        if (m.dir >= 0 || age < 0 || age >= WASH_LOOK.seconds)
            continue;
        const [ix, iy] = key.split(',').map(Number), x = (ix! + .5) * WASH.cell, y = (iy! + .5) * WASH.cell;
        if (x < view.x0 - WASH.cell || x > view.x1 + WASH.cell || y < view.y0 - WASH.cell || y > view.y1 + WASH.cell)
            continue;
        if (n++ >= WASH_LOOK.maxBlooms)
            break;
        const t = age / WASH_LOOK.seconds;
        ctx.save();
        ctx.globalAlpha *= (1 - t) * .45;
        pxRect(ctx, x - 2, y, 5, 2, FX.green);
        ctx.restore();
    }
}
/** Splashes and pigment confetti; true when the impact was one of them. */
export function drawWashEffect(ctx: Ctx, e: Impact, sim: SimState): boolean {
    if (e.kind !== "splash" && e.kind !== "pigment")
        return false;
    const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])), r = Math.min(24, e.radius ?? 24), color = e.kind === 'splash' ? FX.blue : FX.purple;
    ctx.save();
    ctx.globalAlpha *= 1 - t;
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
