/** Cached, ground-anchored lantern string. Cord and hangers share one curve. */
import { rect, line, type Ctx } from './pixel-art.js';

const COLORS = [
    ['#79483e', '#b86e50', '#dfa477', '#96563f'],
    ['#82603c', '#bc9254', '#dfbd7c', '#9d7748'],
    ['#75434a', '#a65f62', '#cb9380', '#8d5052'],
    ['#726044', '#aa975f', '#cfbd86', '#8c7b50'],
] as const;
const CHAR = ['#302f30', '#49413e', '#706052', '#383534'] as const;

function cordY(x: number, damaged: boolean): number {
    const t = (x + 34) / 68, u = 1 - t;
    return Math.round(-60 * u * u + 2 * u * t * (damaged ? -28 : -42)
        + t * t * (damaged ? -44 : -60));
}

function post(ctx: Ctx, x: number, top: number, broken: boolean, burnt: boolean): void {
    // Separate contact patches leave the walkable gap visually open.
    rect(ctx, x - 4, 0, 8, 2, '#353a32');
    rect(ctx, x - 3, -1, 6, 1, '#353a32');
    rect(ctx, x - 2, top, 4, 1 - top, burnt ? '#332f2e' : '#523f32');
    rect(ctx, x - 1, top + 1, 2, -top, burnt ? '#594b40' : '#8d7251');
    rect(ctx, x - 1, top, broken ? 1 : 3, 1, burnt ? '#756252' : '#b49a6b');
    if (broken) rect(ctx, x + 1, top - 1, 1, 3, burnt ? '#49413e' : '#aa895d');
    else rect(ctx, x - 2, top + 3, 4, 2, burnt ? '#302f30' : '#665338');
}

function lamp(ctx: Ctx, x: number, top: number, v: number, burnt: boolean, torn: boolean): void {
    const p = burnt ? CHAR : COLORS[v % 4]!;
    const round = v % 2 === 0;
    const widths = round ? [3, 4, 5, 6, 6, 6, 6, 5, 4, 3] : [3, 4, 4, 4, 4, 4, 4, 4, 3, 3];
    rect(ctx, x - 3, top, 7, 2, burnt ? CHAR[0] : '#574635');
    rect(ctx, x - 2, top, 5, 1, burnt ? CHAR[2] : '#b69861');
    for (let row = 0; row < widths.length; row++) {
        const half = widths[row]!, yy = top + 2 + row;
        rect(ctx, x - half, yy, half * 2 + 1, 1, p[0]);
        rect(ctx, x - half + 1, yy, half * 2 - 1, 1, p[1]);
        rect(ctx, x - half + 1, yy, Math.max(2, half - 1), 1, p[2]);
        rect(ctx, x + 2, yy, 1, 1, p[3]);
        if (row === 1 || row === 8) rect(ctx, x - half + 1, yy, half * 2 - 1, 1, p[3]);
        if (torn && row >= 5 && row <= 7) rect(ctx, x, yy, row === 6 ? 3 : 2, 1, p[0]);
    }
    rect(ctx, x - 3, top + 12, 7, 2, burnt ? CHAR[0] : '#594635');
    rect(ctx, x - 2, top + 12, 5, 1, burnt ? CHAR[2] : '#a78b59');
    rect(ctx, x, top + 14, 1, 2, p[0]);
    rect(ctx, x - 1, top + 16, 3, 2, p[3]);
}

function collapsed(ctx: Ctx, x: number, y: number, v: number, burnt: boolean): void {
    const p = burnt ? CHAR : COLORS[v % 4]!;
    rect(ctx, x - 7, y + 2, 14, 2, '#353a32');
    rect(ctx, x - 6, y, 12, 3, p[0]);
    rect(ctx, x - 4, y - 2, 9, 4, p[1]);
    rect(ctx, x - 3, y - 2, 6, 1, p[2]);
    line(ctx, x - 4, y - 1, x + 1, y + 2, p[3]);
    line(ctx, x + 2, y - 1, x + 5, y + 1, p[2]);
    rect(ctx, x - 6, y - 1, 2, 3, burnt ? CHAR[0] : '#6a543b');
    rect(ctx, x + 5, y + 1, 3, 1, burnt ? CHAR[2] : '#ac8d5b');
}

/** Local bounds [-44,-74,44,10]; posts remain exactly at x ±34. */
export function drawPixelPaperLanterns(
    ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean,
): void {
    const scraps = phase === 'scraps', damaged = phase === 'damaged';
    const variant = ((Math.floor(v) % 4) + 4) % 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    post(ctx, -34, scraps ? -13 : -64, scraps, burnt);
    post(ctx, 34, scraps ? -9 : damaged ? -45 : -64, scraps || damaged, burnt);
    if (!scraps) {
        for (let xx = -34; xx < 34; xx++) {
            line(ctx, xx, cordY(xx, damaged), xx + 1, cordY(xx + 1, damaged), burnt ? '#393332' : '#493d32');
        }
        // Bind the cord around each post, rather than ending beside it.
        rect(ctx, -36, -60, 5, 2, burnt ? '#5a4b42' : '#aa8b5b');
        rect(ctx, 32, damaged ? -44 : -60, 5, 2, burnt ? '#5a4b42' : '#aa8b5b');
    }
    for (let i = 0; i < 4; i++) {
        if (scraps || (damaged && i === 2)) {
            collapsed(ctx, -24 + i * 15, 2 + i % 2, variant + i, burnt);
        } else {
            const lx = Math.round(-34 + 68 * (i + 0.6) / 4.2);
            const ly = cordY(lx, damaged), top = ly + 4;
            rect(ctx, lx, ly, 1, 5, burnt ? '#4a403b' : '#8d744d');
            lamp(ctx, lx, top, variant + i, burnt, damaged && i % 2 === 1);
        }
    }
    if (scraps) {
        // Loose cord lies on the ground and joins only the collapsed pieces.
        line(ctx, -29, 4, -14, 6, burnt ? '#393332' : '#705d42');
        line(ctx, -14, 6, 4, 5, burnt ? '#393332' : '#705d42');
    }
    ctx.restore();
}
