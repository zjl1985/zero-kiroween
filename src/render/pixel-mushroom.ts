/** Three rooted mushrooms; the prop cache owns raster storage and lifecycle. */
import { rect, line, type Ctx } from './pixel-art.js';

const CAPS = [
    ['#623e40', '#a05c59', '#c38976', '#dfc9a1'],
    ['#70513b', '#ae8051', '#cfaa73', '#e0d0a4'],
    ['#534252', '#856780', '#b093a0', '#d9ccb1'],
] as const;
const CHAR = ['#302f32', '#494143', '#716255', '#8b7b64'] as const;
type Cap = readonly [string, string, string, string];

function stem(ctx: Ctx, x: number, ground: number, height: number, p: Cap, burnt: boolean): void {
    rect(ctx, x - 2, ground - height, 5, height + 1, burnt ? p[0] : '#a79878');
    rect(ctx, x - 1, ground - height, 2, height, burnt ? p[2] : '#ddcfaa');
    rect(ctx, x - 2, ground - 1, 6, 2, burnt ? p[1] : '#b3a27d');
}

function mushroom(ctx: Ctx, x: number, ground: number, h: number, radius: number, p: Cap, burnt: boolean): void {
    stem(ctx, x, ground, h, p, burnt);
    const rim = ground - h;
    // An exposed dark underside stays joined to the stem and rim.
    rect(ctx, x - radius + 2, rim + 1, radius * 2 - 3, 2, p[0]);
    rect(ctx, x - radius + 3, rim + 1, radius * 2 - 5, 1, burnt ? p[1] : '#998368');
    for (let row = -radius; row <= 0; row++) {
        const half = Math.max(2, Math.round(radius * Math.sqrt(Math.max(0, 1 - (row / radius) ** 2))));
        rect(ctx, x - half, rim + row, half * 2 + 1, 1, p[0]);
        if (row < 0) {
            rect(ctx, x - half + 1, rim + row, half * 2 - 1, 1, p[1]);
            if (row < -2) rect(ctx, x - half + 1, rim + row, Math.max(1, half), 1, p[2]);
        } else rect(ctx, x - half + 1, rim, half * 2 - 1, 1, p[2]);
    }
    // Three intentional flecks sit on the cap surface, never repeated per slice.
    rect(ctx, x - 3, rim - radius + 2, 3, 2, p[3]);
    rect(ctx, x + 2, rim - 3, 2, 1, p[3]);
    if (radius >= 9) rect(ctx, x - 6, rim - 3, 2, 2, p[3]);
}

function capFragment(ctx: Ctx, x: number, y: number, p: Cap): void {
    rect(ctx, x - 4, y, 9, 2, p[0]);
    rect(ctx, x - 3, y - 2, 6, 3, p[1]);
    rect(ctx, x - 2, y - 2, 4, 1, p[2]);
    line(ctx, x - 3, y + 1, x + 2, y, p[3]);
}

/** Local bounds [-22,-32,22,6]; no emissive halo or live fire painting. */
export function drawPixelMushroom(ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean): void {
    const variant = ((Math.floor(v) % 3) + 3) % 3, p = burnt ? CHAR : CAPS[variant]!;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rect(ctx, -15, 1, 30, 3, '#354039');
    rect(ctx, -10, 4, 20, 1, '#354039');
    if (phase === 'scraps') {
        stem(ctx, -8, 1, 5, p, burnt);
        stem(ctx, 6, 1, 6, p, burnt);
        rect(ctx, -10, -4, 5, 1, p[3]);
        rect(ctx, 4, -5, 5, 1, p[3]);
        capFragment(ctx, -13, 3, p);
        capFragment(ctx, 12, 3, p);
    } else {
        mushroom(ctx, -10, 0, 8 + variant % 2, 7, p, burnt);
        mushroom(ctx, 10, 1, 7, 6, p, burnt);
        if (phase === 'damaged') {
            stem(ctx, 0, 2, 10, p, burnt);
            rect(ctx, -2, -8, 5, 1, p[3]);
            rect(ctx, -1, -9, 2, 1, p[3]);
            capFragment(ctx, 0, 4, p);
        } else mushroom(ctx, 0, 2, 16, 10, p, burnt);
    }
    ctx.restore();
}
