/** Destructible card tombstone, distinct from the static landmark tombs. */
import { rect, line, type Ctx } from './pixel-art.js';

const STONE = [
    ['#494653', '#797785', '#aaa5ae', '#605e6c'],
    ['#4e4949', '#827c76', '#b0a59a', '#69635f'],
    ['#494653', '#807587', '#b0a0af', '#675e70'],
    ['#444d4e', '#758184', '#a6b3af', '#59686a'],
] as const;
const CHAR = ['#303034', '#4b4548', '#76675e', '#3d393e'] as const;
type Stone = readonly [string, string, string, string];

function halfWidth(row: number, variant: number): number {
    if (variant === 0) return row < 7 ? 5 + row : 12;
    if (variant === 1) return row < 3 ? 7 + row : row < 6 ? 10 : 12;
    if (variant === 2) return row < 4 ? 5 : row < 8 ? 10 : 12;
    return row < 3 ? 8 : row < 6 ? 10 : 11;
}

function slab(ctx: Ctx, variant: number, damaged: boolean, p: Stone): void {
    const top = damaged ? -22 : -37;
    for (let yy = top; yy <= 0; yy++) {
        const row = yy - top;
        const half = damaged ? 12 : halfWidth(row, variant);
        let left = -half, right = half;
        if (damaged && row < 4) {
            left += row < 2 ? 5 : 2;
            right -= row < 1 ? 7 : row < 3 ? 3 : 0;
        }
        rect(ctx, left, yy, right - left + 1, 1, p[0]);
        rect(ctx, left, yy, Math.max(1, right - left - 2), 1, p[1]);
        rect(ctx, left, yy, 1, 1, p[2]);
        if (row === 0 || (damaged && row < 4)) rect(ctx, left, yy, right - left - 1, 1, p[2]);
    }
    // Recessed face and a narrow raised inner rim, all below the surviving top.
    const insetTop = damaged ? -16 : -28;
    rect(ctx, -8, insetTop, 15, -insetTop - 4, p[3]);
    rect(ctx, -7, insetTop + 1, 13, -insetTop - 6, p[1]);
    line(ctx, -7, insetTop + 1, -7, -6, p[2]);
    line(ctx, -6, insetTop, 5, insetTop, p[0]);
    if (!damaged) {
        line(ctx, 0, -25, 0, -16, p[0]);
        line(ctx, -4, -22, 4, -22, p[0]);
        rect(ctx, 1, -24, 1, 3, p[2]);
    }
    line(ctx, -4, -11, 3, -11, p[0]);
    line(ctx, -3, -8, 2, -8, p[3]);
    if (damaged) line(ctx, 6, -20, 3, -16, p[0]);
}

function fragment(ctx: Ctx, x: number, y: number, p: Stone): void {
    rect(ctx, x - 4, y, 9, 3, p[0]);
    rect(ctx, x - 3, y - 2, 7, 3, p[1]);
    rect(ctx, x - 2, y - 2, 5, 1, p[2]);
    line(ctx, x - 2, y, x + 1, y - 1, p[3]);
}

/** Local bounds [-18,-40,18,6]; physical footprint remains definition-owned. */
export function drawPixelTombstone(ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean): void {
    const variant = ((Math.floor(v) % 4) + 4) % 4, p = burnt ? CHAR : STONE[variant]!;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rect(ctx, -14, 1, 29, 3, '#353d37');
    rect(ctx, -10, 4, 21, 1, '#353d37');
    if (phase === 'scraps') {
        rect(ctx, -10, -9, 9, 10, p[0]);
        rect(ctx, -10, -8, 7, 9, p[1]);
        rect(ctx, -9, -10, 6, 2, p[2]);
        rect(ctx, 1, -6, 9, 7, p[0]);
        rect(ctx, 2, -6, 6, 6, p[1]);
        rect(ctx, 3, -7, 5, 1, p[2]);
        fragment(ctx, -11, 2, p);
        fragment(ctx, 11, 3, p);
    } else {
        slab(ctx, variant, phase === 'damaged', p);
        if (phase === 'damaged') fragment(ctx, 10, 3, p);
    }
    // Small contiguous moss pads attach to the foot, never scattered texture.
    const moss = burnt ? '#43413a' : '#566347', light = burnt ? '#605747' : '#78805a';
    rect(ctx, -13, 0, 8, 3, moss);
    rect(ctx, -11, -1, 5, 1, light);
    rect(ctx, 6, 1, 8, 2, moss);
    rect(ctx, 8, 0, 4, 1, light);
    ctx.restore();
}
