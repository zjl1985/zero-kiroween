/** Compatibility exports for native pixel status rendering. */
import { reducedPaperMotion } from './paper-motion.js';
import { EFFECT_LIFE, type Impact, type PaperStatus } from '../game/types.js';
import type { Ctx } from './pixel-art.js';
import { FX, glyph, rect, pixelRing, burst } from './pixel-vfx.js';
export function drawPaperFlame(ctx: Ctx, x: number, y: number, size: number, phase: number, variant = 0): void {
    const frame = reducedPaperMotion() ? 0 : Math.floor(phase * 3) % 2;
    glyph(ctx, 'flame', x, y - size * .4, size / 3, variant % 2 ? FX.gold : FX.red);
    if (frame)
        rect(ctx, x + 2, y - size, 2, 3, FX.gold);
}
export function drawActorPaperStatus(ctx: Ctx, actor: PaperStatus & {
    x: number;
    y: number;
}, time: number, radius: number, height = radius * 2): void {
    const wet = (actor.wetTime ?? 0) > 0, burning = !wet && (actor.burnTime ?? 0) > 0;
    if (!wet && !burning)
        return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (wet ? actor.wetTime ?? 0 : actor.burnTime ?? 0) * 2);
    if (burning)
        for (const side of [-1, 1])
            drawPaperFlame(ctx, actor.x + side * radius * .65, actor.y, Math.min(23, height * .52), .5 + Math.sin(time * 10 + side) * .5, side < 0 ? 0 : 1);
    else {
        pixelRing(ctx, actor.x, actor.y + 1, radius + 4, FX.blue, .2);
        for (let i = 0; i < 3; i++) {
            const k = reducedPaperMotion() ? i / 3 : (time * .8 + i / 3) % 1;
            glyph(ctx, 'drop', actor.x + (i - 1) * radius * .72, actor.y - height * .65 + k * height * .55, 3, FX.blue);
        }
    }
    ctx.restore();
}
export function drawRegrowCue(ctx: Ctx, x: number, y: number, progress: number, scale: number): void { if (progress <= 0)
    return; ctx.save(); ctx.globalAlpha *= Math.min(1, progress + .3); glyph(ctx, 'leaf', x, y - 8 * scale, 5 * scale, FX.green); ctx.restore(); }
export function drawPaperStatusEffect(ctx: Ctx, e: Impact): boolean {
    if (!['steam', 'regrow', 'ink-wash', 'landmark-reward'].includes(e.kind))
        return false;
    const t = Math.max(0, Math.min(1, 1 - e.life / (EFFECT_LIFE as Record<string, number>)[e.kind]!)), k = reducedPaperMotion() ? .2 : t;
    ctx.save();
    ctx.globalAlpha *= 1 - t;
    if (e.kind === 'steam') {
        for (let i = 0; i < 3; i++) {
            rect(ctx, e.x - 9 + i * 7, e.y - 8 - k * 28 - i * 3, 5, 5, i % 2 ? FX.blue : FX.cream);
        }
    }
    else {
        glyph(ctx, e.kind === 'regrow' ? 'leaf' : e.kind === 'ink-wash' ? 'drop' : 'star', e.x, e.y - 12 - k * 12, 6, e.kind === 'regrow' ? FX.green : e.kind === 'ink-wash' ? FX.purple : FX.gold);
        burst(ctx, e.x, e.y - 8, t, e.radius ?? 26, FX.blue, 5);
    }
    ctx.restore();
    return true;
}
