/** Destructible four-picket fence; simulation retains ownership of the barrier. */
import { rect, line, type Ctx } from './pixel-art.js';

const WOOD = [
    ['#4e3c30', '#896848', '#b0905f', '#d0b07a'],
    ['#4c3d34', '#7d644b', '#aa8a62', '#c8ad81'],
    ['#584335', '#94724d', '#ba9766', '#d5b77f'],
    ['#493e32', '#7d6a4c', '#a9996e', '#c5b98a'],
] as const;
const CHAR = ['#2c2e2d', '#49423a', '#6a5b48', '#847158'] as const;
type Wood = readonly [string, string, string, string];

function picket(ctx: Ctx, x: number, height: number, lean: boolean, pointed: boolean, p: Wood): void {
    for (let yy = -height; yy <= 1; yy++) {
        const row = yy + height;
        const half = pointed && row < 5 ? Math.min(4, row) : 3;
        const shift = lean ? Math.floor(-yy / 10) : 0;
        rect(ctx, x + shift - half, yy, half * 2 + 1, 1, p[0]);
        if (half > 0) {
            rect(ctx, x + shift - half + 1, yy, half * 2 - 1, 1, p[1]);
            rect(ctx, x + shift - half + 1, yy, 1, 1, p[2]);
        }
        if (!pointed && row < 2) rect(ctx, x + shift - half, yy, half * 2, 1, p[3]);
    }
    line(ctx, x, -Math.min(height - 5, 17), x, -4, p[2]);
}

function rail(ctx: Ctx, y: number, p: Wood, damaged: boolean): void {
    rect(ctx, -39, y, 80, 5, p[0]);
    rect(ctx, -39, y, 79, 3, p[1]);
    rect(ctx, -38, y, 78, 1, p[2]);
    if (damaged) {
        // A cracked joint remains joined, matching the still-active collider.
        line(ctx, 24, y, 21, y + 3, p[0]);
        rect(ctx, 25, y + 1, 5, 1, p[3]);
    }
}

/** Local bounds [-46,-42,46,12], ground-zero pickets at -34/-10/14/38. */
export function drawPixelPropFence(ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean): void {
    const variant = ((Math.floor(v) % 4) + 4) % 4, p: Wood = burnt ? CHAR : WOOD[variant]!;
    const scraps = phase === 'scraps', damaged = phase === 'damaged';
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 4; i++) rect(ctx, -38 + i * 24, 1, 9, 3, '#363b32');
    if (!scraps) {
        rail(ctx, -20, p, damaged);
        rail(ctx, -9, p, damaged);
    }
    for (let i = 0; i < 4; i++) {
        const xx = -34 + i * 24;
        const missing = damaged && i === variant;
        const shortened = damaged && i === (variant + 2) % 4;
        const leaning = damaged && i === (variant + 1) % 4 && i !== 3;
        const height = scraps ? 7 + (i + variant) % 3 * 3 : missing ? 10 : shortened ? 24 : 36 + (variant + i) % 2;
        picket(ctx, xx, height, leaning, !scraps && !missing && !shortened, p);
        if (!scraps && !missing) {
            const shift = leaning ? 1 : 0;
            rect(ctx, xx + shift, -18, 2, 2, p[0]);
            rect(ctx, xx, -7, 2, 2, p[0]);
        }
    }
    if (scraps) {
        // Rails lie flat below the remaining stubs, with pale broken ends.
        line(ctx, -30, 5, 1, 7, p[0], 3);
        line(ctx, -29, 5, 0, 7, p[2]);
        line(ctx, 5, 6, 29, 3, p[1], 3);
        rect(ctx, 5, 6, 2, 2, p[3]);
        line(ctx, -12, 3, -3, 9, p[1], 2);
    } else if (damaged) {
        line(ctx, -21, 5, -9, 8, p[1], 3);
        line(ctx, -21, 5, -10, 8, p[2]);
        rect(ctx, -21, 5, 2, 2, p[3]);
    }
    ctx.restore();
}
