/** Three wax candles share a compact pool of contact shadow. Sections are in
 * half-unit geometry; the scene adapter doubles them for the native atlas. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const WAX = { shade: '#9c8767', body: '#c9b08a', light: '#e7d0a4', rim: '#f3ddb2', pool: '#806b52', wick: '#4a3836' };
function box(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2)));
}
function disc(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
    for (let j = Math.ceil(-ry * 2); j <= Math.floor(ry * 2); j++) {
        const half = Math.sqrt(Math.max(0, 1 - (j / (ry * 2)) ** 2)) * rx;
        if (half > .15)
            box(c, x - half, y + j / 2, half * 2, .5, color);
    }
}
export function candlesModel(): PixelStackModel {
    const candles = [[-6, 0, 11, 2.1], [1, -2, 14.5, 2.3], [7, 2, 9, 1.9]] as const;
    return { id: 'scene:candles:wax-v2', width: 36, depth: 28, count: 18,
        groundShadow: { rx: 10.5, ry: 2.5, dx: 1, dy: 1 },
        paint(c, z) {
            for (const [x, y, h, r] of candles) {
                if (z < 1) {
                    disc(c, x + .5, y + .5, r + 1.3, r * .85, WAX.shade);
                    disc(c, x, y, r + .6, r * .65, WAX.body);
                }
                if (z <= h) {
                    const shoulder = z > h - 1 ? r - .3 : r;
                    disc(c, x, y, shoulder, shoulder * .7, WAX.shade);
                    disc(c, x + .35, y, shoulder - .35, shoulder * .62, WAX.body);
                    box(c, x + r - .8, y - .5, .5, 1.2, WAX.light);
                    // Short irregular wax runs connect directly to the shoulder.
                    if (z > h - 3.5 && z < h - .5)
                        box(c, x - .8, y + r * .5, .7, .6, WAX.light);
                    if (z > h - 2 && z < h)
                        box(c, x + 1, y + r * .4, .7, .6, WAX.rim);
                    if (z >= h - .5) {
                        disc(c, x, y, r - .2, r * .6, WAX.rim);
                        disc(c, x, y, .9, .55, WAX.pool);
                        box(c, x, y, .5, .5, WAX.wick);
                    }
                }
                // Warm tear-shaped flame, still small enough to read as a wick flame.
                const f = z - h;
                if (f > .0 && f <= .5)
                    box(c, x, y, .5, .5, WAX.wick);
                if (f > .5 && f <= 2.5) {
                    const width = f < 1.6 ? 1.1 : .55, lean = f > 1.5 ? .3 : 0;
                    disc(c, x + lean, y, width, .5, '#d9914d');
                    if (f < 2)
                        box(c, x, y, .5, .5, f < 1.2 ? '#fff0bc' : '#f7c56e');
                }
            }
        } };
}
