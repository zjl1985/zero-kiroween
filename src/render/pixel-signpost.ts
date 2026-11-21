/** Native roadside timber marker; cached by the existing prop sprite cache. */
import { rect, line, type Ctx } from './pixel-art.js';

const TIMBER = [
    ['#534132', '#a38a60', '#c9ae79', '#7d6245'],
    ['#503d32', '#967650', '#bd9968', '#70543d'],
    ['#584638', '#b09a71', '#d1bc8e', '#88704e'],
] as const;
const CHAR = ['#2f2e2d', '#51463c', '#786553', '#3e3832'] as const;
type Timber = readonly [string, string, string, string];

function board(ctx: Ctx, y: number, dir: number, p: Timber, chipped: boolean, tilted: boolean): void {
    // Column-authored arrowhead: its diagonal contour is real silhouette,
    // rather than an arrow painted onto a rectangular panel.
    for (let u = -10; u <= 23; u++) {
        const half = u <= 17 ? 5 : 23 - u;
        const tilt = tilted ? Math.floor((u + 2) / 7) : 0;
        const xx = dir * u, top = y - half + tilt;
        const notch = chipped && u >= 14 && u <= 17 ? 2 : 0;
        rect(ctx, xx, top + notch, 1, half * 2 + 2 - notch, p[0]);
        if (half > 0) {
            rect(ctx, xx, top + notch, 1, half * 2 - notch, p[1]);
            rect(ctx, xx, top + notch, 1, 1, p[2]);
            rect(ctx, xx, y + half + tilt - 1, 1, 1, p[3]);
        }
    }
    // Endgrain and short incisions are intentionally sparse, not words.
    const backY = y + (tilted ? -2 : 0);
    rect(ctx, -dir * 9, backY - 3, 1, 6, p[3]);
    for (let j = 0; j < 3; j++) {
        const u = 4 + j * 4, yy = y - 1 + (tilted ? Math.floor((u + 2) / 7) : 0);
        line(ctx, dir * u, yy, dir * (u + 2), yy, p[0]);
    }
    const boltY = y + (tilted ? 0 : -1);
    rect(ctx, -1, boltY, 3, 3, p[0]);
    rect(ctx, -1, boltY, 2, 1, p[2]);
    rect(ctx, 0, boltY + 1, 1, 1, p[3]);
}

function fallenArrow(ctx: Ctx, x: number, y: number, dir: number, p: Timber): void {
    for (let u = -8; u <= 12; u++) {
        const half = u < 9 ? 2 : Math.min(2, Math.max(0, 12 - u));
        rect(ctx, x + dir * u, y - half, 1, half * 2 + 1, p[0]);
        if (half > 0) {
            rect(ctx, x + dir * u, y - half, 1, half * 2, p[1]);
            rect(ctx, x + dir * u, y - half, 1, 1, p[2]);
        }
    }
    line(ctx, x - dir * 5, y, x + dir * 3, y, p[3]);
    rect(ctx, x - 1, y - 1, 2, 2, p[0]);
}

/** Ground-zero post, unchanged registered bounds [-26,-60,26,6]. */
export function drawPixelSignpost(
    ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean,
): void {
    const variant = ((Math.floor(v) % 3) + 3) % 3;
    const p = burnt ? CHAR : TIMBER[variant]!;
    const scraps = phase === 'scraps', damaged = phase === 'damaged';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    rect(ctx, -5, 0, 10, 2, '#363a32');
    rect(ctx, -3, -1, 6, 1, '#363a32');
    const top = scraps ? -13 : -58;
    rect(ctx, -2, top, 5, 1 - top, p[0]);
    rect(ctx, -1, top + 1, 2, -top, p[3]);
    rect(ctx, -1, top + 2, 1, -top - 2, p[1]);
    if (scraps) {
        rect(ctx, -1, top - 1, 1, 3, p[2]);
        rect(ctx, 1, top, 2, 1, p[2]);
        fallenArrow(ctx, -10, 2, -1, p);
        fallenArrow(ctx, 11, 3, 1, p);
        rect(ctx, -3, 3, 5, 2, p[3]);
    } else {
        // The capped post is continuous beneath both board fasteners.
        rect(ctx, -3, -58, 7, 2, p[0]);
        rect(ctx, -2, -59, 5, 1, p[2]);
        rect(ctx, -1, -58, 3, 1, p[1]);
        board(ctx, -48, 1, p, damaged, false);
        board(ctx, -34, -1, p, false, damaged);
        if (damaged) {
            // A small chipped tip rests at the foot; the tilted lower board
            // still meets its bolt and therefore never hangs unsupported.
            rect(ctx, 6, 1, 5, 2, p[3]);
            rect(ctx, 7, 0, 3, 1, p[2]);
        }
    }
    ctx.restore();
}
