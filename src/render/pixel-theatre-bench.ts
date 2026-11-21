/** Low theatre audience bench. Half-unit sections are doubled by fineModel;
 * the foot stays at ground zero, with no backrest or added collision shape. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const WOODS = [
    ['#493b3d', '#806049', '#ac8b63', '#c1a47b'],
    ['#3f4646', '#637565', '#92a087', '#b4bda0'],
    ['#503d44', '#875e50', '#b58a6c', '#ccaa87'],
] as const;
function rect(c: Ctx, x: number, y: number, w: number, d: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
}
/** Joined trestle legs, a stretcher and two thick seat boards; three timber finishes. */
export function theatreBenchModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 3, [shade, wood, light, end] = WOODS[variant]!;
    return { id: `theatre:audience-bench:joinery:${variant}`, width: 26, depth: 8, count: 6,
        groundShadow: { rx: 11, ry: 1.6, dx: 0, dy: .5 },
        paint(c, z) {
            // Two short trestles connect both sides of the seat. Their feet
            // spread only across its shallow depth, preserving the low bounds.
            if (z < 3.5)
                for (const x of [-8, 6]) {
                    const depth = z < 1 ? 3 : 2.5;
                    rect(c, x, -depth / 2, 2, depth, wood);
                    rect(c, x, -depth / 2, .5, depth, shade);
                    rect(c, x + .5, depth / 2 - .5, 1.5, .5, light);
                    if (z < .5)
                        rect(c, x - .5, -1.5, 3, 3, shade);
                }
            if (z >= 1 && z < 2) {
                rect(c, -7, -.5, 14, 1, wood);
                rect(c, -7, 0, 14, .5, z > 1.5 ? light : shade);
            }
            if (z >= 2.5 && z < 3.5) {
                rect(c, -8, -1.5, 16, 1, shade);
                rect(c, -8, .5, 16, 1, wood);
                rect(c, -8, 1, 16, .5, light);
            }
            if (z >= 3.5 && z <= 4.5) {
                // Continuous solid boards expose a dark thickness below the
                // upper grain; only a single fine seam separates the boards.
                rect(c, -11, -2, 22, 4, z < 4 ? wood : light);
                rect(c, -11, -2, .5, 4, end);
                rect(c, 10.5, -2, .5, 4, shade);
                if (z === 4.5) {
                    rect(c, -10.5, -.5, 21, .5, shade);
                    rect(c, -8, -1.5, 5, .5, wood);
                    rect(c, 2, .5, 6, .5, wood);
                    // Small fasteners lie directly over the two trestle joints.
                    for (const x of [-7, 7])
                        for (const y of [-1.5, 1])
                            rect(c, x, y, .5, .5, shade);
                }
            }
        } };
}
