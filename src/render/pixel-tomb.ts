/** Six small grave markers, in half-unit sections for the shared fineModel.
 * Carvings sit on the exposed front face, with enough depth to survive the
 * rotated projection; they are quiet incised marks, never readable writing. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const STONE = [
    ['#49464f', '#777275', '#a29a90', '#5d5960'],
    ['#494852', '#797887', '#a8a4a4', '#5c5c6a'],
    ['#454d50', '#738080', '#9fae9f', '#535f62'],
] as const;
function rect(c: Ctx, x: number, y: number, w: number, d: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
}
/** Crosses retain the original every-third-variant identity. The remaining
 * profiles use a round arch, shouldered cap, pointed arch and chipped slab. */
function profile(v: number, z: number): number {
    if (v === 0)
        return z < 17 ? (z >= 10.5 && z < 13 ? 5.5 : 1.6) : 0;
    if (v === 3)
        return z < 16.5 ? (z >= 9.5 && z < 12 ? 6 : z > 15 ? 1.5 : 2) : 0;
    if (v === 1)
        return z < 11 ? 5.2 : z < 17 ? 5.2 * Math.sqrt(Math.max(0, 1 - ((z - 11) / 6) ** 2)) : 0;
    if (v === 2)
        return z < 11.5 ? 5.5 : z < 13 ? 4.8 : z < 15.5 ? 3.6 : z < 16 ? 3 : 0;
    if (v === 4)
        return z < 10.5 ? 5.7 : z < 17 ? 5.7 * (1 - (z - 10.5) / 6.5) : 0;
    return z < 14 ? 5.6 : z < 15.5 ? 5 : z < 16.5 ? 3.5 : 0;
}
export function tombModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 6, [shade, stone, light, inset] = STONE[variant % 3]!;
    return { id: `graveyard:tomb:carved:${variant}`, width: 16, depth: 8, count: 18,
        groundShadow: { rx: 6.7, ry: 1.8, dx: 0, dy: .6 },
        paint(c, z) {
            if (z < 1.5) {
                rect(c, -6.2, -2.2, 12.4, 4.4, z < .5 ? shade : stone);
                rect(c, -5.7, 1.5, 11.4, .7, z > 1 ? light : inset);
            }
            let half = profile(variant, z);
            if (half > .25) {
                // Deep side and broad forward plane, not a one-pixel sheet.
                const back = -1.5, front = 1.5;
                rect(c, -half, back, half * 2, 3, stone);
                rect(c, -half, back, Math.min(1.2, half * .7), 3, shade);
                rect(c, -half + .5, front - .5, Math.max(.5, half * 2 - .5), 1, stone);
                rect(c, half - .5, back, .5, 3.5, light);
                const next = profile(variant, z + .5);
                if (next < half)
                    rect(c, -half, back, half * 2, 3.5, light);
                if (variant === 0 || variant === 3) {
                    // Incised centre groove and beam joint remain attached to
                    // the front of the cross rather than hovering in its gap.
                    if (z > 3 && z < 14.5)
                        rect(c, -.25, front, .5, .5, inset);
                    if (z === 11 || variant === 3 && z === 10)
                        rect(c, -half + .7, front, half * 2 - 1.4, .5, inset);
                    if (variant === 3 && z > 13.5 && z < 15)
                        rect(c, -.5, front, 1, .5, light);
                }
                else {
                    // Recessed panel: two jambs and an arch/cap follow the
                    // actual stone silhouette across successive sections.
                    if (z >= 3 && z < 14 && half > 2) {
                        const panel = Math.max(1.5, half - 1.1);
                        rect(c, -panel, front, .5, .5, inset);
                        rect(c, panel - .5, front, .5, .5, light);
                        if (z === 3)
                            rect(c, -panel, front, panel * 2, .5, inset);
                        if (z > 11 && next < half)
                            rect(c, -panel, front, panel * 2, .5, inset);
                    }
                    // Two deliberately unequal short inscriptions; abstract
                    // grooves have a cut shadow and a lower illuminated lip.
                    for (const [height, width] of [[6, 4.5], [8, 6]]) {
                        if (z === height)
                            rect(c, -width! / 2, front, width!, .5, shade);
                        if (z === height! - .5)
                            rect(c, -width! / 2, front, width!, .5, light);
                    }
                    if (z >= 10 && z <= 11.5) {
                        const width = z === 10.5 ? 2 : 1;
                        rect(c, -width / 2, front, width, .5, inset);
                    }
                }
                // One broad missing corner on the weathered variant; the
                // chip is a changed section, not procedural texture noise.
                if (variant === 5 && z > 13) {
                    // An exposed fracture face at the surviving right shoulder.
                    rect(c, half - 1, front, 1, .5, inset);
                }
            }
            // Moss joins the stone foot. Sparse shaped pads, not floating grass.
            if (z < 2.5) {
                const left = z < 1.5 ? 3.5 : 2, right = z < 1 ? 2.5 : 1.5;
                rect(c, -5.5, 1.5, left, 1, z < 1 ? '#465744' : '#6e7c55');
                if (z < 1.5)
                    rect(c, 2.5, 1.5, right, 1, '#536547');
            }
        } };
}
