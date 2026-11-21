/** Wide ink vats in half-unit sections, doubled by the root fineModel.
 * Material faces, damaged rims and curved remnants share one footprint.
 * All liquid is contained visual dressing, never a new simulation hazard. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const BODY = [['#3e5457', '#658583', '#91a5a0'], ['#414e60', '#677e96', '#9baab5'], ['#51475e', '#80738c', '#b1a0ac']] as const;
function rect(c: Ctx, x: number, y: number, w: number, d: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
}
function disc(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
    for (let row = Math.ceil(-ry * 2); row <= Math.floor(ry * 2); row++) {
        const half = rx * Math.sqrt(Math.max(0, 1 - (row / (ry * 2)) ** 2));
        if (half > .15)
            rect(c, x - half, y + row / 2, half * 2, .5, color);
    }
}
/** A true annular section or a broken arc, with exposed material at both ends. */
function arc(c: Ctx, x: number, y: number, rx: number, ry: number, thickness: number, start: number, end: number, shade: string, face: string, rim: string): void {
    for (let ix = Math.ceil(-rx * 2); ix <= Math.floor(rx * 2); ix++)
        for (let iy = Math.ceil(-ry * 2); iy <= Math.floor(ry * 2); iy++) {
            const xx = (ix + .5) / 2, yy = (iy + .5) / 2, outer = (xx / rx) ** 2 + (yy / ry) ** 2;
            if (outer > 1 || ((xx / (rx - thickness)) ** 2 + (yy / Math.max(.3, ry - thickness * .65)) ** 2) < 1)
                continue;
            const angle = (Math.atan2(yy / ry, xx / rx) + Math.PI * 2) % (Math.PI * 2);
            if (angle < start || angle > end)
                continue;
            rect(c, x + ix / 2, y + iy / 2, .5, .5, angle - start < .12 || end - angle < .12 ? rim : xx < -rx * .35 ? shade : yy > 0 ? face : rim);
        }
}
export function inkVatModel(v: number, phase: string, burnt: boolean): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 3, damaged = phase === 'damaged', scraps = phase === 'scraps';
    const [shade, body, light] = burnt ? ['#292c32', '#454248', '#625950'] : BODY[variant]!;
    const hoop = burnt ? '#54514c' : '#9a8c6a', hoopLight = burnt ? '#6b6257' : '#c5b58b', ink = burnt ? '#25282d' : '#302b43', inkEdge = burnt ? '#3b3b3d' : '#625c78', wood = burnt ? '#47403c' : '#a5825d', woodLight = burnt ? '#62564a' : '#ccb082';
    return { id: `ink-vat:coopered-grounded:${variant}:${phase}:${burnt ? 1 : 0}`, width: 32, depth: 24, count: scraps ? 8 : 29,
        groundShadow: { rx: scraps ? 10.5 : 8.5, ry: 2.5, dx: 0, dy: .25 },
        paint(c, z) {
            if (scraps) {
                if (z < .5)
                    disc(c, 0, 1, 12.5, 5.5, ink);
                // Collapsed hoop and three curved sections retain the vat's
                // construction, instead of falling back to generic rectangles.
                if (z >= .5 && z < 1.5)
                    arc(c, 0, 1, 10, 4.7, .8, .2, 5.8, shade, hoop, hoopLight);
                // Low curved remnants begin at z=0, with their entire foot
                // inside the ink footprint. Rear fragments no longer start
                // above and behind the spill, which left a visible air gap.
                for (const [cx, cy, r, height, start, end] of [[-4, 0, 4.5, 3.5, 2.5, 5.6], [4, 2, 4.5, 2.5, .1, 2.9], [0, -.5, 3.5, 3.5, 3.2, 5.3]]) {
                    if (z >= 0 && z < height!) {
                        const radius = r! + z * .1;
                        arc(c, cx!, cy!, radius, radius * .65, 1.1, start!, end!, shade, z > height! - 1 ? light : body, light);
                        if (z >= 1 && z < 1.5)
                            arc(c, cx!, cy!, radius + .15, radius * .65 + .1, .6, start!, end!, shade, hoop, hoopLight);
                    }
                }
                // The short snapped stirrer rests in the spill beside the wall.
                if (z < 1.5)
                    rect(c, 4, -3, 7, 1, z < .5 ? shade : wood);
                return;
            }
            const height = 16, radius = 9 + (variant - 1) * .25 + Math.min(z, height) / height * 1.7, depth = radius * .66;
            if (z < height) {
                for (let ix = Math.ceil(-radius * 2); ix <= Math.floor(radius * 2); ix++) {
                    const xx = (ix + .5) / 2;
                    let front = -Infinity;
                    for (let iy = Math.ceil(-depth * 2); iy <= Math.floor(depth * 2); iy++) {
                        const yy = (iy + .5) / 2, outer = (xx / radius) ** 2 + (yy / depth) ** 2;
                        if (outer > 1)
                            continue;
                        const angle = Math.atan2(yy / depth, xx / radius);
                        // Two broad rim losses expose the wall's pale broken
                        // section; the remaining rim and ink still read clearly.
                        const notch = damaged && ((angle > .15 && angle < .65) || (angle > 2 && angle < 2.6));
                        const localTop = notch ? 12 + (variant % 2) * .5 : height;
                        if (z >= localTop)
                            continue;
                        if ((xx / (radius - 1.2)) ** 2 + (yy / (depth - .8)) ** 2 < 1 && z > .5)
                            continue;
                        let color = xx < -radius * .45 ? shade : xx > radius * .3 ? light : body;
                        if (z < 1)
                            color = shade;
                        if (z >= 3 && z < 4 || z >= 12.5 && z < 13.5)
                            color = xx > 0 ? hoopLight : hoop;
                        if (z > localTop - .6)
                            color = light;
                        rect(c, ix / 2, iy / 2, .5, .5, color);
                        front = iy / 2;
                    }
                    if (!Number.isFinite(front))
                        continue;
                    // A few stave joints, one label, and two deliberate ink
                    // runs sit on the exposed contour at each physical height.
                    if (z > 4 && z < 12 && [-6, -2, 3, 7].some(a => Math.abs(xx - a) < .25))
                        rect(c, ix / 2, front, .5, .5, shade);
                    if (xx > -4 && xx < 3 && z >= 6 && z < 11.5) {
                        let color = burnt ? '#5b5550' : '#c9bea0';
                        const dz = z - 8;
                        if ((dz >= 0 && Math.abs(xx + .5) < 1.4 - dz * .35) || (dz < 0 && Math.abs(xx + .5) < 1.1))
                            color = ink;
                        rect(c, ix / 2, front, .5, .5, color);
                    }
                    if ((Math.abs(xx - 5.5) < .65 && z > 8) || (Math.abs(xx + 7) < .5 && z > 11))
                        rect(c, ix / 2, front, .5, .5, ink);
                }
            }
            const liquid = damaged ? 10.5 : 13.5;
            if (z === liquid) {
                disc(c, 0, 0, 8.8, 5.4, ink);
                rect(c, -5, -2, 6, .5, inkEdge);
                rect(c, 2, 1, 3, .5, inkEdge);
            }
            if (z >= 14.5 && z < 16.5) {
                // Damaged rim deliberately has the same angular gaps as walls.
                if (damaged) {
                    arc(c, 0, 0, 11.2, 7.4, 1.2, .65, 2, shade, hoop, hoopLight);
                    arc(c, 0, 0, 11.2, 7.4, 1.2, 2.6, Math.PI * 2, shade, hoop, hoopLight);
                }
                else
                    arc(c, 0, 0, 11.2, 7.4, 1.2, 0, Math.PI * 2, shade, hoop, hoopLight);
            }
            // Angled stirring stick descends into the liquid. A broad stained
            // paddle at its lower end distinguishes this vessel from a pail.
            const top = damaged ? 22 : 27;
            if (z >= liquid - 1 && z < top) {
                const rise = z - liquid, sx = 3 + variant * .5 + rise * .4, sy = -1 - rise * .12;
                rect(c, sx, sy, z < liquid + 2 ? 2 : 1, 1, z < liquid + 2 ? ink : wood);
                if (z >= liquid + 2)
                    rect(c, sx + .5, sy, .5, .5, z > top - 1 ? light : woodLight);
            }
            if (damaged && z < .5) {
                disc(c, 5, 2, 8, 4.5, ink);
                disc(c, 10, 3, 3, 2, ink);
            }
        } };
}
