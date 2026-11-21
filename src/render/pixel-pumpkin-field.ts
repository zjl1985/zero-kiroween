/** Flush pumpkin-field ground, baked with the landmark's terrain chunk.
 * Root positions mirror the existing layout; no props, elevation, simulation
 * state or random source are introduced by these soil and vine marks. */
import { rect, line, polygon, type Ctx } from './pixel-art.js';
const P = {
    soil: '#705640', soilShade: '#624d3c', soilLight: '#7d6148',
    furrow: '#604b39', dryEdge: '#80644a',
    stem: '#596540', stemLight: '#7e8550',
    leafDark: '#3f563d', leaf: '#657b47', leafLight: '#8c985a',
} as const;
const MAIN_ROOTS = [[-74, -34], [82, 8], [-8, 72]] as const;
const OUTER_ROOTS = Array.from({ length: 7 }, (_, i) => {
    const a = i / 7 * Math.PI * 2 + .4;
    return [Math.cos(a) * 140, Math.sin(a) * 78] as const;
});
/** A broad lobed leaf with a connected stalk and a short visible midrib. */
function leaf(ctx: Ctx, x: number, y: number, side: number, size: number): void {
    const point = (dx: number, dy: number): readonly [
        number,
        number
    ] => [Math.round(x + dx * side * size), Math.round(y + dy * size)];
    polygon(ctx, [point(0, 0), point(3, -3), point(3, -6), point(6, -5), point(8, -8), point(10, -5), point(14, -4), point(12, -1), point(13, 2), point(9, 2), point(6, 4), point(4, 2)], P.leafDark);
    polygon(ctx, [point(1, 0), point(5, -2), point(5, -4), point(8, -6), point(9, -3), point(12, -3), point(10, 0), point(7, 2), point(4, 1)], P.leaf);
    line(ctx, ...point(0, 0), ...point(10, -3), P.leafLight);
    line(ctx, ...point(5, -1), ...point(7, -4), P.leafLight);
}
/** Each runner starts at a real pumpkin root. A few leaves and one curling
 * tip form a planted group; there are no detached repeated sine-wave marks. */
function vine(ctx: Ctx, root: readonly [
    number,
    number
], index: number, major: boolean): void {
    const [rx, ry] = root, side = index % 2 ? -1 : 1, spread = major ? 1 : .72;
    const offsets = [[0, 0], [8, 3], [18, 1], [27, 5], [35, 3], [38, -1], [35, -4], [31, -2]] as const;
    const points = offsets.map(([dx, dy]) => [Math.round(rx + dx * side * spread), Math.round(ry + dy * spread)] as const);
    for (let i = 1; i < points.length; i++)
        line(ctx, ...points[i - 1]!, ...points[i]!, P.stem, 2);
    for (const i of major ? [2, 4] : [2]) {
        const at = points[i]!;
        leaf(ctx, at[0], at[1], side, major ? .9 : .65);
    }
    // A short counter-runner keeps the largest plants grounded on both sides.
    if (major) {
        line(ctx, Math.round(rx), Math.round(ry), Math.round(rx - side * 12), Math.round(ry + 6), P.stem, 2);
        leaf(ctx, Math.round(rx - side * 12), Math.round(ry + 6), -side, .8);
        line(ctx, Math.round(rx), Math.round(ry), Math.round(rx + side * 8), Math.round(ry + 3), P.stemLight);
    }
}
/** Native integer ground art in approximately [-180,-110,180,110]. */
export function drawPumpkinField(ctx: Ctx, x: number, y: number): void {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    // Seven independently terminated beds. Bare strips between them remain
    // transparent, so the district ground reads as walkable access paths.
    const beds = [[-87, -137, 132], [-61, -160, 157], [-35, -169, 166], [-9, -174, 174], [17, -169, 171], [43, -157, 165], [69, -138, 149]] as const;
    for (let i = 0; i < beds.length; i++) {
        const [top, left, right] = beds[i]!, notch = i % 2 ? 5 : 8, bottom = top + 20;
        const span = right - left, third = Math.round(span / 3);
        polygon(ctx, [[left + notch, top + 1], [left + third, top + 2],
            [left + third + 9, top], [right - third, top + (i % 2 ? 1 : 3)],
            [right - 7, top + 1], [right, top + 6], [right - 3, bottom - 4],
            [right - 12, bottom - 1], [right - third, bottom - 2],
            [left + third + 17, bottom], [left + third, bottom - 2],
            [left + 6, bottom - 1], [left, bottom - 6], [left + 3, top + 6]], P.soil);
        // Furrows are broken, shallow troughs with independently stepped runs.
        // They do not form continuous parallel bright/dark plank edges.
        for (let row = 0; row < 2; row++) {
            for (let part = 0; part < 3; part++) {
                const start = left + 12 + part * third + ((i + row + part) % 3) * 4,
                    length = third - 24 - ((i + part) % 2) * 7,
                    yy = top + 6 + row * 7 + ((part + i * 2 + row) % 3) - 1,
                    bend = (i + part + row) % 2 ? 1 : -1,
                    split = Math.round(length * .6);
                rect(ctx, start, yy, split, 1, P.furrow);
                rect(ctx, start + split - 1, yy + bend, length - split, 1, P.furrow);
                if (part === row) rect(ctx, start + 8, yy - 2, Math.round(length * .35), 1, P.soilLight);
            }
        }
        // Two low, broad clods and a few attached end crumbles suggest loose
        // worked earth. Their scale is intentional; no blanket of grain dots.
        for (let clod = 0; clod < 2; clod++) {
            const cx = left + Math.round(span * (clod ? .73 : .24)) + (i % 3) * 4,
                cy = top + (clod ? 14 : 5);
            polygon(ctx, [[cx - 5, cy], [cx - 2, cy - 2], [cx + 5, cy - 1],
                [cx + 7, cy + 1], [cx + 3, cy + 3], [cx - 4, cy + 2]], P.soilShade);
            rect(ctx, cx - 2, cy - 1, 6, 1, P.soilLight);
        }
        rect(ctx, left + 1, top + 8, 5, 3, P.dryEdge);
        rect(ctx, left + 3, top + 11, 3, 2, P.soil);
        rect(ctx, right - 7, bottom - 6, 5, 3, P.soilShade);
        rect(ctx, right - 10, bottom - 4, 4, 2, P.soil);
    }
    for (let i = 0; i < OUTER_ROOTS.length; i++)
        vine(ctx, OUTER_ROOTS[i]!, i, false);
    for (let i = 0; i < MAIN_ROOTS.length; i++)
        vine(ctx, MAIN_ROOTS[i]!, i, true);
    ctx.restore();
}
