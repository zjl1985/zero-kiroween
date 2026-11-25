import { FX, rect as pxRect, line as pxLine } from "./pixel-vfx.js";
/**
 * World props (fences, bushes, paper grass) in their sim phase, the fire grid
 * (flames, scorch, ash) and the scraps that flutter off torn props. Reads
 * SimState only; flutter comes from the sim's prop impacts, flicker from the
 * view time and render hashes. Never touches the sim RNG.
 */
import { reducedPaperMotion } from "./paper-motion.js";
import { FIRE } from "../defs/fire.js";
import { PROP_DEFS } from "../defs/registries.js";
import { PROP_PHASES, type PropSpot } from "../defs/types.js";
import { cachedSprite, type CanvasSprite } from "../engine/sprite.js";
import type { Impact, SimState } from "../game/types.js";
import { EFFECT_LIFE } from "../game/types.js";
import { chunkContent, chunkOf } from "../game/world-gen.js";
import { inFootprint } from "../game/props.js";
import { PROP_ART, PROP_LOOK, type PropArt } from "./art-registry.js";
import type { Camera } from "./camera.js";
import { viewRect } from "./camera.js";
import { isoOccludesActor, nativeOccludesActor } from "./iso/depth.js";
import { drawGen, drawGenFolded, drawGenShadow, genBounds, genGlows, washLook, type GenGlow } from "./iso/gen-sprites.js";
import { propSprite as bakedPropSprite } from "./iso/scenery.js";
import { atFoot } from "./iso/place.js";
import { hash, type Ctx } from "./paper-material.js";
import { drawPaperFlame, drawRegrowCue } from "./paper-status-art.js";
import { variant } from "./variants.js";
import { sketchAmount } from "./sprite-sketch.js";
const PAD = 8;
/** `foot` is the world point the painter draws around (placed at its projected foot in the iso view). */
type Add = (y: number, draw: () => void, occludesPlayer?: boolean, foot?: { x: number; y: number }, native?: boolean) => void;
function propSprite(art: PropArt, p: PropSpot, phase: 0 | 1 | 2, burnt: boolean) {
    const b = art.bounds, s = Math.round(p.s * 20) / 20, v = Math.abs(p.seed) % art.variants, w = (b.r - b.l) * s + PAD * 2, h = (b.b - b.t) * s + PAD * 2, ax = -b.l * s + PAD, ay = -b.t * s + PAD, name = PROP_PHASES[phase]!;
    return cachedSprite(`prop:${art.id}:${name}:${burnt ? 1 : 0}:${s}:${v}`, w, h, 2, (c, canvas) => {
        c.imageSmoothingEnabled = false;
        art.paint(c, ax, ay, s, v, name, burnt);
    }, { x: ax / w, y: ay / h });
}
/** Ink soaks into the cut's own alpha, with two restrained pooling/sheened edges. */
function inkCoating(sprite: CanvasSprite): CanvasSprite {
    if (!sprite.canvas)
        return sprite;
    return cachedSprite(`prop-ink:${sprite.id}`, sprite.width, sprite.height, sprite.scale, c => {
        sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = .65;
        pxRect(c, 0, 0, sprite.width, sprite.height, '#30233f');
        c.globalAlpha = .45;
        pxRect(c, 0, sprite.height * .65, sprite.width, sprite.height * .35, FX.dark);
        c.globalAlpha = .7;
        for (let i = 0; i < 3; i++)
            pxRect(c, sprite.width * (.22 + i * .23), sprite.height * (.44 + i * .08), 6, 2, FX.purple);
        c.restore();
    }, sprite.anchor);
}
/** Four fixed washed palette steps preserve the native block silhouette. */
function washedPixel(sprite: CanvasSprite, amount: number): CanvasSprite {
    const step = Math.min(4, Math.max(0, Math.round(amount * 4)));
    if (!sprite.canvas || !step) return sprite;
    return cachedSprite(`prop-washed-pixel:${sprite.id}:${step}`, sprite.width, sprite.height, sprite.scale, c => {
        sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = step / 4 * .78;
        pxRect(c, 0, 0, sprite.width, sprite.height, '#b7b9aa');
        c.restore();
    }, sprite.anchor);
}
const flame = drawPaperFlame;
/** Burn damage is baked into the prop's own alpha, never punched into the scene.
 * Three small holes leave the silhouette/obstacle readable. No time-based cache keys.
 */
function scorchedPaper(sprite: CanvasSprite): CanvasSprite {
    if (!sprite.canvas)
        return sprite;
    return cachedSprite(`prop-char-pixel:${sprite.id}`, sprite.width, sprite.height, sprite.scale, c => {
        sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
        const w = sprite.width, h = sprite.height;
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = .55;
        pxRect(c, 0, 0, w, h, '#423135');
        c.globalAlpha = 1;
        for (let i = 0; i < 3; i++) {
            const x = Math.round(w * (.36 + i * .14)), y = Math.round(h * (.55 + (i % 2) * .17)), r = Math.max(2, Math.round(Math.min(6, w * .045, h * .045)));
            pxRect(c, x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4, FX.dark);
            pxRect(c, x - r - 2, y - r - 2, r * 2 + 4, 2, '#9d6046');
        }
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 3; i++) {
            const x = Math.round(w * (.36 + i * .14)), y = Math.round(h * (.55 + (i % 2) * .17)), r = Math.max(2, Math.round(Math.min(6, w * .045, h * .045)));
            pxRect(c, x - r, y - r, r * 2, r * 2, '#000000');
        }
        c.restore();
    }, sprite.anchor);
}
/** Soaked paper: a cool damp sheen showing it resists fire and tears more easily. */
function soakedCoating(sprite: CanvasSprite): CanvasSprite {
    if (!sprite.canvas)
        return sprite;
    return cachedSprite(`prop-wet:${sprite.id}`, sprite.width, sprite.height, sprite.scale, c => {
        sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.globalAlpha = .42;
        pxRect(c, 0, 0, sprite.width, sprite.height, '#3d7a8f');
        c.globalAlpha = .65;
        for (let i = 0; i < 2; i++)
            pxRect(c, sprite.width * (.28 + i * .32), sprite.height * (.38 + i * .16), 4, 2, '#baf4f0');
        c.restore();
    }, sprite.anchor);
}
export interface PropVisualState {
    readonly folded?: boolean;
    readonly inked?: boolean;
    readonly soaked?: boolean;
    readonly regrow?: number;
    /** Pencil amount (0 painted .. 1 colourless) of the paper under the prop. */
    readonly sketch?: number;
}
const flicker = (time: number, seed: number) => 0.5 + 0.5 * Math.sin(time * (8 + hash(seed) * 5) + seed);
/**
 * One prop at its base point in a phase. The cached sprite holds the art
 * variant; the placement look (size, tilt, mirror) comes from the prop's
 * seed through render/variants.ts. Also used by the ?gallery=1 page.
 */
export function drawProp(ctx: Ctx, art: PropArt, p: PropSpot, phase: 0 | 1 | 2, burnt: boolean, burning: boolean, time: number, state: PropVisualState = {}): void {
    const sprite = propSprite(art, p, phase, burnt), look = variant(p.seed, { palette: art.scraps, ...(art.look ?? PROP_LOOK) });
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(0);
    ctx.scale(look.flip * look.scale, look.scale);
    const folded = state.folded && phase < 2;
    ctx.save();
    if (folded)
        ctx.transform(1, 0, -0.2, 0.2, 0, 0);
    const treated = state.inked && phase < 2 ? inkCoating(sprite) : state.soaked && phase < 2 ? soakedCoating(sprite) : sprite,
        paper = state.sketch ? washedPixel(treated, state.sketch) : treated;
    if (burning) {
        // Charring stays inside the cached paper silhouette; flames remain live.
        scorchedPaper(paper).draw(ctx, { x: 0, y: 0 });
        art.flames.forEach(([fx, fy], i) => flame(ctx, fx * p.s, fy * p.s, 13 * p.s, flicker(time, p.seed + i), p.seed + i));
    }
    else
        paper.draw(ctx, { x: 0, y: 0 });
    ctx.restore();
    if (folded) {
        const b = art.bounds, y = b.t * p.s * 0.08;
        pxLine(ctx, b.l * p.s * .65, y, b.r * p.s * .65, y, FX.purple, 2);
    }
    if (phase === 2 && state.regrow)
        drawRegrowCue(ctx, 0, 0, state.regrow, p.s);
    ctx.restore();
}
/**
 * One prop drawn from its baked voxel sprite (iso/gen/props-pixels.ts) at the projected foot:
 * the phase picks the sprite, status looks are palette swaps of it (char while burning, ink
 * coat, wash steps) and a fold squashes it flat. Flames and the regrow cue stay live painters
 * at the legacy upright scale (FEAT-007 may refine them).
 */
function drawBakedProp(ctx: Ctx, id: string, art: PropArt, p: PropSpot, phase: 0 | 1 | 2, burning: boolean, time: number, state: PropVisualState): void {
    const look = burning ? "char" : state.inked && phase < 2 ? "ink" : state.soaked && phase < 2 ? "wet" : washLook(state.sketch ?? 0);
    if (state.folded && phase < 2) drawGenFolded(ctx, id, p.x, p.y, look);
    else drawGen(ctx, id, p.x, p.y, look);
    if (burning)
        atFoot(ctx as CanvasRenderingContext2D, p.x, p.y, () => art.flames.forEach(([fx, fy], i) =>
            flame(ctx, p.x + fx * p.s, p.y + fy * p.s, 13 * p.s, flicker(time, p.seed + i), p.seed + i)));
    if (phase === 2 && state.regrow)
        atFoot(ctx as CanvasRenderingContext2D, p.x, p.y, () => drawRegrowCue(ctx, p.x, p.y, state.regrow!, p.s));
}
/** Props inside the view as y-sorted sprites, burning ones with flames; baked props also cast shadows and glow. */
export function propSprites(ctx: Ctx, sim: SimState | null, seed: number, cam: Camera, time: number, add: Add, glows?: GenGlow[]): void {
    const activeFire = sim ? cellsInView(sim.fire.cells, cam).filter(([, , left]) => left > 0) : [];
    const view = viewRect(cam, 60), a = chunkOf(view.x0 - 120, view.y0 - 60), b = chunkOf(view.x1 + 120, view.y1 + 60);
    for (let cy = a.cy; cy <= b.cy; cy++)
        for (let cx = a.cx; cx <= b.cx; cx++)
            for (const p of chunkContent(seed, cx, cy).props) {
                const def = PROP_DEFS.get(p.kind), art = PROP_ART.find(def.art);
                if (!art)
                    continue;
                const bd = art.bounds;
                if (p.x + bd.r * p.s < view.x0 || p.x + bd.l * p.s > view.x1 || p.y + bd.b * p.s < view.y0 || p.y + bd.t * p.s > view.y1)
                    continue;
                const m = sim?.props[p.id], phase = m?.phase ?? 0, burnt = !!m?.burnt, burning = !!sim && m?.burnAt !== undefined && phase < 2 && sim.elapsed - m.burnAt < FIRE.tick * 1.6 &&
                    activeFire.some(([x, y]) => inFootprint(p, def, x, y, 0));
                const elapsed = sim?.elapsed ?? 0, folded = m?.foldedUntil !== undefined, regrow = m?.regrowAt !== undefined && m.destroyedAt !== undefined
                    ? Math.max(0, Math.min(1, (elapsed - m.destroyedAt) / Math.max(0.01, m.regrowAt - m.destroyedAt))) : 0;
                const state: PropVisualState = {
                    folded,
                    inked: (m?.inkedUntil ?? 0) > elapsed,
                    soaked: (m?.soakedUntil ?? 0) > elapsed,
                    regrow,
                    sketch: sim ? sketchAmount(sim, p.x, p.y) : 0,
                };
                const id = bakedPropSprite(art.id, PROP_PHASES[phase]!, burnt);
                if (id) {
                    if (!(folded && phase < 2)) drawGenShadow(ctx, id, p.x, p.y);
                    if (glows && phase < 2 && !folded && !state.inked) genGlows(id, p.x, p.y, glows);
                    add(p.y, () => drawBakedProp(ctx, id, art, p, phase, burning, time, state),
                        !!sim && phase < 2 && !folded && nativeOccludesActor(p.x, p.y, genBounds(id), sim.player), p, true);
                    continue;
                }
                add(p.y, () => drawProp(ctx, art, p, phase, burnt, burning, time, state), !!sim && phase < 2 && !folded && isoOccludesActor(p.x, p.y, p.s, bd, sim.player), p);
            }
}
function cellsInView(cells: Record<string, number>, cam: Camera): [
    number,
    number,
    number
][] {
    const view = viewRect(cam, FIRE.cell * 2), out: [
        number,
        number,
        number
    ][] = [];
    for (const key in cells) {
        const [ix, iy] = key.split(",").map(Number) as [
            number,
            number
        ], x = (ix + 0.5) * FIRE.cell, y = (iy + 0.5) * FIRE.cell;
        if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1)
            continue;
        out.push([x, y, cells[key]!]);
    }
    return out;
}
/** Scorched ground under burning cells and the ash left behind (flat layer). */
export function drawFireGround(ctx: Ctx, sim: SimState, cam: Camera): void {
    ctx.save();
    for (const [x, y] of cellsInView(sim.fire.ash, cam)) {
        const half = FIRE.cell / 2;
        ctx.globalAlpha = .72;
        pxRect(ctx, x - half + 2, y - half + 5, FIRE.cell - 4, FIRE.cell - 10, '#2b2628');
        pxRect(ctx, x - half + 6, y - half + 2, FIRE.cell - 12, FIRE.cell - 4, '#2b2628');
        pxRect(ctx, x - 4, y - 2, 8, 3, '#5c5450');
    }
    for (const [x, y, left] of cellsInView(sim.fire.cells, cam)) {
        if (left <= 0)
            continue;
        const half = FIRE.cell / 2;
        ctx.globalAlpha = .32;
        pxRect(ctx, x - half, y - half, FIRE.cell, FIRE.cell, '#633a2b');
        ctx.globalAlpha = .6;
        pxLine(ctx, x - half, y - half, x + half - 1, y - half, FX.red, 1);
        pxLine(ctx, x - half, y + half - 1, x + half - 1, y + half - 1, FX.red, 1);
        pxLine(ctx, x - half, y - half, x - half, y + half - 1, FX.red, 1);
        pxLine(ctx, x + half - 1, y - half, x + half - 1, y + half - 1, FX.red, 1);
    }
    ctx.restore();
}
/** One flame per burning cell, y-sorted with the rest of the world. */
export function fireSprites(ctx: Ctx, sim: SimState, cam: Camera, time: number, add: Add): void {
    for (const [x, y, left] of cellsInView(sim.fire.cells, cam)) {
        if (left <= 0)
            continue;
        const sd = Math.floor(x * 3 + y * 5),
        // Flames grow as a cell catches and shrink as it burns out.
        life = Math.max(0, Math.min(1, (FIRE.burnTime - left) / 0.4, left / 0.6));
        add(y + FIRE.cell * 0.3, () => {
            flame(ctx, x + (hash(sd) - 0.5) * 6, y + 4, 16 * Math.max(0.35, life), flicker(time, sd), sd);
        }, false, { x, y });
    }
}
/** Flecks, scraps and embers from prop impacts. Returns true when drawn. */
export function drawPropEffect(ctx: Ctx, e: Impact): boolean {
    if (e.kind !== 'prop-tear' && e.kind !== 'prop-scraps' && e.kind !== 'ember')
        return false;
    const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])), motion = reducedPaperMotion() ? .2 : t, art = e.src ? PROP_ART.find(e.src) : undefined, burnt = e.kind === 'prop-scraps' && e.amount === 1, colors = burnt ? ['#3b3534', '#59504b', '#1f1a1d'] : (art?.scraps ?? [FX.gold]);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (1 - t) * 1.6);
    const count = e.kind === 'ember' ? 9 : e.kind === 'prop-tear' ? 4 : 7, spread = e.kind === 'prop-tear' ? 22 : 38;
    for (let i = 0; i < count; i++) {
        const sd = (e.seed ?? 0) * 17 + i, x = e.x + (hash(sd) - .5) * 2 * spread * motion, y = e.y - (.6 + hash(sd + 3) * .8) * 30 * motion + (e.kind === 'ember' ? -20 * motion : 44 * motion * motion), size = e.kind === 'ember' ? 2 : 3 + (i % 2);
        pxRect(ctx, x, y, size, size, e.kind === 'ember' ? (i % 3 ? FX.red : FX.gold) : colors[i % colors.length]!);
    }
    ctx.restore();
    return true;
}
