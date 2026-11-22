/** A taped card package, not a timber shipping crate. Cached by propSprite. */
import { rect, line, polygon, type Ctx } from './pixel-art.js';

const CARD = [
    ['#604736', '#a88459', '#c6a777', '#d9c49a'],
    ['#5e4536', '#96754f', '#b79769', '#cbb88e'],
    ['#6b503d', '#b28c60', '#d1af7c', '#e1cd9e'],
] as const;
const CHAR = ['#302f30', '#494039', '#6a5948', '#83715b'] as const;
type Card = readonly [string, string, string, string];

function fish(ctx: Ctx, x: number, y: number, c: string): void {
    rect(ctx, x - 4, y - 1, 7, 3, c);
    rect(ctx, x - 2, y - 2, 3, 5, c);
    rect(ctx, x + 3, y - 2, 1, 5, c);
    rect(ctx, x + 4, y - 3, 1, 7, c);
}

/** Local bounds [-24,-38,24,8], all package walls meet the same ground. */
export function drawPixelCardboardCrate(ctx: Ctx, x: number, y: number, s: number, v: number, phase: string, burnt: boolean): void {
    const variant = ((Math.floor(v) % 3) + 3) % 3, p: Card = burnt ? CHAR : CARD[variant]!;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rect(ctx, -18, 1, 37, 3, '#373b32');
    rect(ctx, -13, 4, 27, 1, '#373b32');
    if (phase === 'scraps') {
        // Flat connected card panels retain folds, stamp and split tape.
        polygon(ctx, [[-21, 0], [-12, -7], [2, -5], [9, 3], [-7, 6]], p[0]);
        polygon(ctx, [[-20, -1], [-12, -7], [1, -5], [6, 2], [-7, 4]], p[1]);
        line(ctx, -11, -6, -7, 3, p[2]);
        // Separated liner skins reveal a lighter paper back and a thin dark
        // corrugated core, rather than thick timber splinters.
        line(ctx, -19, -1, -12, -6, burnt ? '#9c8b70' : '#e1d4b5');
        line(ctx, -17, 0, -12, -4, p[0]);
        rect(ctx, -17, -2, 2, 1, burnt ? '#a19076' : '#eee0bf');
        rect(ctx, -13, -5, 2, 1, burnt ? '#8c7e69' : '#eee0bf');
        polygon(ctx, [[0, -2], [12, -9], [21, -2], [15, 5], [6, 5]], p[2]);
        line(ctx, 12, -8, 15, 4, p[0]);
        polygon(ctx, [[12, -8], [18, -4], [16, -1], [13, -3]], burnt ? '#8a7b66' : '#dfd0ae');
        line(ctx, 13, -3, 16, -1, p[0]);
        line(ctx, 16, 3, 20, -1, burnt ? '#ad9a7c' : '#e8d9b8');
        line(ctx, 3, -2, 10, 3, p[3], 2);
        fish(ctx, -10, 0, p[0]);
    } else {
        const open = phase === 'damaged';
        // Side wall is present before top/cavity/front, including fire anchor14,-23.
        polygon(ctx, [[9, 0], [9, -24], [19, -30], [19, -6]], p[0]);
        polygon(ctx, [[11, -1], [11, -24], [18, -28], [18, -7]], p[1]);
        line(ctx, 19, -29, 19, -6, p[2]);
        if (open) {
            // Rear flap hinges directly onto the back rim; it never floats.
            polygon(ctx, [[-16, -23], [-12, -35], [3, -33], [7, -26], [-4, -19]], p[0]);
            polygon(ctx, [[-15, -23], [-11, -34], [2, -32], [5, -26], [-4, -20]], p[2]);
            line(ctx, -13, -25, 4, -27, p[1]);
            polygon(ctx, [[-11, -34], [2, -32], [4, -28], [-10, -30]], burnt ? '#8b7a63' : '#dfd0ae');
            line(ctx, -11, -34, 2, -32, burnt ? '#b1a086' : '#efe0bf');
            polygon(ctx, [[-18, -23], [-9, -29], [18, -28], [10, -19]], p[0]);
            line(ctx, -9, -29, 18, -28, p[2]);
            line(ctx, -18, -23, -9, -29, p[3]);
            rect(ctx, -18, -21, 28, 22, p[1]);
            line(ctx, -18, -21, -18, 0, p[2]);
            // Exposed corrugated edge, deliberately short, attached to front wall.
            for (let xx = -16; xx <= 8; xx += 4) {
                rect(ctx, xx, -22, 2, 2, p[3]);
                rect(ctx, xx + 2, -21, 2, 1, p[0]);
            }
            polygon(ctx, [[-7, -21], [9, -21], [6, -12], [-12, -12]], p[0]);
            polygon(ctx, [[-7, -21], [8, -21], [5, -13], [-11, -13]], p[2]);
            line(ctx, -5, -21, 7, -21, p[3]);
            rect(ctx, -5, -18, 3, 6, p[3]);
        } else {
            rect(ctx, -18, -24, 28, 25, p[1]);
            line(ctx, -18, -23, -18, 0, p[2]);
            polygon(ctx, [[-18, -24], [-9, -30], [19, -30], [10, -24]], p[2]);
            line(ctx, -4, -24, 5, -30, p[0]);
            polygon(ctx, [[-6, -24], [3, -30], [7, -30], [-2, -24]], p[3]);
            rect(ctx, -6, -24, 4, 10 + variant, p[3]);
            line(ctx, -18, -24, 10, -24, p[2]);
        }
        line(ctx, -17, 0, 9, 0, p[0]);
        fish(ctx, -10, -7, p[0]);
        rect(ctx, -12, -8, 1, 1, p[2]);
        line(ctx, 2, -5, 6, -5, p[2]);
        if (burnt) {
            // The scorched face has a stepped dark cavity, a carbon edge and
            // an attached curled liner. No destination-out reaches the scene.
            polygon(ctx, [[-15, -17], [-12, -20], [-7, -18], [-5, -13], [-8, -9], [-13, -11]], '#272a2d');
            line(ctx, -15, -17, -13, -11, '#846548');
            line(ctx, -7, -18, -5, -13, '#9c7954');
            polygon(ctx, [[-5, -13], [-2, -16], [-1, -13], [-4, -10]], '#a58f70');
            line(ctx, -2, -16, -1, -13, '#c2b08c');
            rect(ctx, 12, -17, 2, 5, '#343033');
            rect(ctx, 14, -15, 1, 3, '#a18a69');
        } else {
            // Small compression folds stay subordinate to the broad card
            // planes, distinguishing soft packaging from nailed wood slats.
            line(ctx, -16, -17, -13, -15, p[2]);
            line(ctx, -13, -15, -12, -12, p[0]);
            line(ctx, 14, -10, 16, -16, p[2]);
            rect(ctx, -6, -10, 1, 2, '#dbcba7');
        }
    }
    ctx.restore();
}
