/** Compatibility exports for native pixel status rendering. */
import { reducedPaperMotion } from './paper-motion.js';
import { EFFECT_LIFE, type Impact, type PaperStatus } from '../game/types.js';
import type { Ctx } from './pixel-art.js';
import { FX, glyph, rect } from './pixel-vfx.js';
export function drawPaperFlame(ctx: Ctx, x: number, y: number, size: number, phase: number, variant = 0): void {
    const frame = reducedPaperMotion() ? 0 : Math.floor(phase * 3) % 2,
        scale = Math.max(.5, Math.min(1.5, size / 16));
    // A narrow two-tone flame grows from a charred curl, not an icon or halo.
    rect(ctx, x - 3 * scale, y - 2 * scale, 6 * scale, 2 * scale, '#3b3030');
    for (let row = 0; row < 9; row++) {
        const width = row < 2 ? 1 : row < 5 ? 3 : row < 8 ? 5 : 3,
            lean = row < 4 ? (frame ? 1 : -1) : 0;
        rect(ctx, x + (lean - width / 2) * scale, y - (11 - row) * scale,
            width * scale, scale, row < 3 ? '#bc6041' : variant % 2 ? '#c68747' : '#d89648');
        if (row > 5) rect(ctx, x - scale, y - (11 - row) * scale, 2 * scale, scale, '#e3bf75');
    }
    rect(ctx, x + 2 * scale, y - 3 * scale, 2 * scale, scale, '#bd9e73');
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
    const lower = actor.y - Math.min(height * .28, radius * .7);
    if (burning) {
        for (const side of [-1, 1]) {
            const x = actor.x + side * radius * .42;
            // Char core, brown scorch and a one-pixel turned paper back sit on
            // the lower body so original faces and eyewear remain untouched.
            rect(ctx, x - 3, lower - 2, 6, 4, '#665044');
            rect(ctx, x - 2, lower - 1, 4, 3, '#302c30');
            rect(ctx, x + side * 3, lower - 3, 1, 3, '#ad8b65');
            rect(ctx, x + side * 4, lower - 4, 1, 2, '#d0b992');
            drawPaperFlame(ctx, x, lower + 2, Math.min(13, height * .35),
                .5 + Math.sin(time * 10 + side) * .5, side < 0 ? 0 : 1);
        }
    } else {
        for (const side of [-1, 1]) {
            const x = actor.x + side * radius * .38;
            // Uneven pigment edges and paired light/shadow wrinkles read as
            // soaked material, without a circular range/puddle marker.
            ctx.globalAlpha *= .7;
            rect(ctx, x - 3, lower - 3, 5, 3, '#64828a');
            rect(ctx, x - 2, lower, 4, 2, '#7b9699');
            ctx.globalAlpha /= .7;
            rect(ctx, x - 2, lower - 2, 2, 1, '#b8c8b9');
            rect(ctx, x, lower - 1, 2, 1, '#3f6472');
            rect(ctx, x - 1, lower + 1, 2, 1, '#aec1b6');
            if (!reducedPaperMotion()) {
                const fall = (time * 1.3 + (side + 1) * .25) % 1;
                rect(ctx, x + side * 2, lower + 3 + fall * 5, 1, 2, '#89b1b7');
            }
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
        // Small layered flecks, independent of an effect's gameplay radius.
        for (let i = 0; i < 3; i++) {
            const x = e.x - 6 + i * 5, y = e.y - 7 - k * (4 + i * 2);
            rect(ctx, x, y + 1, 3, 1, '#827460');
            rect(ctx, x, y, 2, 1, e.kind === 'ink-wash' ? '#a7b5ba' : '#dfd0b0');
        }
    }
    ctx.restore();
    return true;
}
