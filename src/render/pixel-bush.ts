/** Rooted, native-pixel foliage for the destructible bush prop. */
import { rect, line, type Ctx } from './pixel-art.js';

const LEAVES = [
    ['#354b3d', '#53684a', '#7b895b', '#65784f'],
    ['#454e3b', '#65704c', '#969563', '#7b8054'],
    ['#3d493f', '#586d59', '#8a9b71', '#708565'],
] as const;
const CHAR = ['#303333', '#45443e', '#716955', '#585448'] as const;
type Foliage = readonly [string, string, string, string];
const ROOTS = [-29, -14, 3, 19, 33] as const;
const HEIGHTS = [-11, -20, -22, -17, -9] as const;

/** Irregular stepped crown, with a broad upper-left face exposed at its edge. */
function crown(ctx: Ctx, x: number, y: number, rx: number, ry: number, p: Foliage, shape: number): void {
    for (let row = -ry; row <= ry; row++) {
        const t = row / ry;
        let half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
        // Two controlled shoulders make leaf groups, not a perfect oval.
        if (row < -ry + 3) half = Math.max(2, half - 2);
        const shoulder = row >= -3 && row <= 0 ? 2 : 0;
        const left = x - half - shoulder, right = x + half - (row > ry - 3 ? 2 : 0);
        if (right < left) continue;
        rect(ctx, left, y + row, right - left + 1, 1, p[0]);
        if (row < ry - 2 && right - left > 3) {
            rect(ctx, left + 1, y + row, right - left - 1, 1, p[1]);
            const faceEnd = x + Math.round(rx * 0.22) - Math.max(0, row + 1);
            if (row < 3 && faceEnd > left)
                rect(ctx, left, y + row, Math.min(right, faceEnd) - left + 1, 1, p[2]);
        }
    }
    // Just two broad leaf folds. Their dark undersides divide the crown
    // without a texture blanket or repeated horizontal slice bands.
    const dx = shape % 2 ? 2 : -2;
    rect(ctx, x - 6 + dx, y - 2, 6, 2, p[3]);
    rect(ctx, x - 4 + dx, y, 5, 1, p[0]);
    rect(ctx, x + 3, y + 2, 5, 2, p[3]);
    rect(ctx, x + 5, y + 4, 4, 1, p[0]);
}

function fallenLeaf(ctx: Ctx, x: number, y: number, p: Foliage, flip: boolean): void {
    rect(ctx, x - 3, y, 7, 2, p[0]);
    rect(ctx, x - 2, y - 1, 5, 2, p[1]);
    rect(ctx, x + (flip ? 0 : -2), y - 1, 3, 1, p[2]);
    rect(ctx, x + (flip ? -4 : 3), y + 1, 2, 1, p[3]);
}

/** Same static-cache signature as other prop painters; all phases ground at y0. */
export function drawPixelBush(
    ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean,
): void {
    const variant = ((Math.floor(v) % 6) + 6) % 6;
    const p = burnt ? CHAR : LEAVES[variant % 3]!;
    const scraps = phase === 'scraps', damaged = phase === 'damaged';
    const bark = burnt ? '#353333' : '#65533b', cut = burnt ? '#766657' : '#ae9865';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // A thin contact patch beneath the root fan, not a detached canopy shadow.
    rect(ctx, -23, 1, 45, 3, '#354039');
    rect(ctx, -16, 4, 31, 1, '#354039');
    line(ctx, -4, 1, -12, scraps ? -5 : -17, bark, 3);
    line(ctx, 3, 1, 12, scraps ? -7 : -19, bark, 3);
    line(ctx, 0, 1, 1, scraps ? -9 : -23, bark, 3);
    if (scraps) {
        rect(ctx, -12, -5, 3, 1, cut);
        rect(ctx, 12, -7, 3, 1, cut);
        rect(ctx, 1, -9, 3, 1, cut);
        line(ctx, -21, 2, -9, 5, bark, 2);
        line(ctx, 9, 4, 24, 2, bark, 2);
        for (let i = 0; i < 5; i++) fallenLeaf(ctx, -26 + i * 13, 3 + (i + variant) % 3, p, i % 2 === 0);
    } else {
        for (let i = 0; i < 5; i++) {
            const cx = ROOTS[i]! + (variant >= 3 ? (i % 2 ? 2 : -2) : 0);
            const cy = HEIGHTS[i]! + ((variant + i) % 3 - 1);
            line(ctx, i < 2 ? -8 : 7, -3, cx, cy + 3, bark, 2);
            if (damaged && (i === 1 || i === 4)) {
                // Pruned branches stay visibly joined to the root fan.
                rect(ctx, cx, cy + 3, 2, 1, cut);
                continue;
            }
            crown(ctx, cx, damaged ? cy + 4 : cy, damaged ? 10 : 12 + (i + variant) % 2,
                damaged ? 6 : 8 + (i + variant) % 2, p, variant + i);
        }
        // Low front leaves tuck the crown into the visible root mass.
        crown(ctx, variant >= 3 ? -5 : 5, -5, 13, 6, p, variant);
        if (damaged) {
            fallenLeaf(ctx, -25, 6, p, false);
            fallenLeaf(ctx, 22, 5, p, true);
        }
    }
    ctx.restore();
}
