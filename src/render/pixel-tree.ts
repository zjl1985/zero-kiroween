import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";
const PALETTES = [
    ["#35584e", "#567d57", "#819b61", "#698c59"],
    ["#704b4c", "#a86f56", "#d1a16d", "#bb865f"],
    ["#43595c", "#718d7c", "#a3b18a", "#879e80"],
] as const;
// Each bough supports an offset, flattened group of leaves. The gaps between
// lower boughs are intentional; there is no enclosing sphere behind them.
const CROWNS = [
    [-20, -1, 35, 9, 6, 5.5], [-13, -7, 43, 12, 6, 7],
    [19, -3, 40, 9, 7, 6], [12, -9, 48, 9, 5, 8],
    [-3, -7, 51, 12, 7, 7], [-7, -5, 59, 8.5, 6, 7],
    [-16, 6, 45, 10, 6, 5], [3, 6, 41, 8, 5, 5.5],
    [15, 6, 50, 9, 6, 5], [-2, 7, 53, 11, 6, 6],
] as const;
/** Half-unit voxel geometry; scene adapter supplies the native doubled atlas. */
export function treeModel(variant: number): PixelStackModel {
    const palette = PALETTES[Math.abs(variant) % 3]!;
    return { id: `scene:tree:boughs:${variant % 3}`, width: 64, depth: 48, count: 67, paint(c: Ctx, z: number) {
            const rect = (x: number, y: number, w: number, h: number, color: string) => {
                c.fillStyle = color;
                c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2)));
            };
            const disc = (x: number, y: number, rx: number, ry: number, color: string) => {
                for (let yy = Math.ceil(-ry * 2); yy <= Math.floor(ry * 2); yy++) {
                    const reach = rx * Math.sqrt(Math.max(0, 1 - (yy / (ry * 2)) ** 2));
                    if (reach > .15)
                        rect(x - reach, y + yy / 2, reach * 2, .5, color);
                }
            };
            // Angular buttress roots taper into a leaning trunk. These are separate
            // wooden volumes, not a round pedestal drawn at the foot of a pole.
            if (z < 6) {
                const length = 7 - z * .8;
                rect(-length, -1, length + 3, 2, "#5b4847");
                rect(0, -length * .7, 2, length * .7 + 2, "#745344");
                rect(1, 1, length * .65, 2, "#8b674d");
                rect(-2, 0, 2, Math.max(1, length * .7), "#665044");
            }
            const branch = (bottom: number, top: number, x0: number, y0: number, x1: number, y1: number, radius: number) => {
                if (z < bottom || z > top)
                    return;
                const t = (z - bottom) / (top - bottom), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, r = radius * (1 - t * .65);
                // Faceted cross-section: large warm front plane, cool left face and a
                // narrow illuminated right edge that stays on the exposed surface.
                rect(x - r, y - r * .65, r * 2, r * 1.3, "#6a4d45");
                rect(x - r, y - r * .65, r * .65, r * 1.3, "#51464a");
                rect(x + r * .35, y - r * .65, r * .65, r * 1.3, "#9b7452");
                if (top - bottom > 25 && z > 6 && z < 26) {
                    if (z < 16 || z > 20)
                        rect(x - .75, y + r * .65 - .5, .5, .5, "#503f41");
                    if (z > 11 && z < 23)
                        rect(x + .75, y + r * .65 - .5, .5, .5, "#ba8b5b");
                }
            };
            branch(0, 46, 0, 0, -3, -1, 3.4);
            branch(17, 36, -1, 0, -20, 0, 2.4);
            branch(23, 42, -2, 0, 19, -3, 2.3);
            branch(32, 50, -3, -1, -13, -7, 1.7);
            branch(35, 54, -3, -1, 12, -8, 1.6);
            branch(28, 43, -2, 0, 3, 6, 1.6);
            branch(41, 59, -3, -1, -7, -5, 1.5);
            branch(37, 48, -3, -1, -16, 6, 1.4);
            branch(43, 53, 0, 0, 15, 6, 1.3);
            for (let i = 0; i < CROWNS.length; i++) {
                const [x, y, center, rx, ry, rz] = CROWNS[i]!, dz = (z - center) / rz;
                if (Math.abs(dz) >= 1)
                    continue;
                const reach = Math.sqrt(1 - dz * dz), taper = 1 - Math.max(0, dz) * .23;
                // Tiers lean in different directions and have broader shoulders than
                // tips. Shadow is confined to the underside, never a belt halfway up.
                const lean = [-2, 1.5, 1, -1.5, -2, 1, -1, 1.5, 1, -1.5][i]!;
                const cx = x + Math.max(0, dz) * lean, cy = y - Math.max(0, dz) * .7;
                const highlight = .48 + (i % 3) * .09;
                const tone = dz < -.78 ? palette[0] : dz > highlight ? palette[2] : i % 3 === 0 ? palette[3] : palette[1];
                disc(cx, cy, rx * reach * taper, ry * reach, tone);
                // Small offset lobes give each supported group a scalloped edge. Their
                // own heights keep highlights from becoming repeated horizontal bands.
                for (const [dx, dy, dz0, rr] of [[-rx * .55, ry * .35, (i % 3) - 1, 3 + (i % 2) * .5], [rx * .4, ry * .6, 1, 2.5 + (i % 3) * .5], [rx * .15, ry * .5, rz * .55, 2.5]]) {
                    const q = (z - center - dz0!) / rr!;
                    if (Math.abs(q) >= 1)
                        continue;
                    const k = Math.sqrt(1 - q * q);
                    disc(x + dx!, y + dy!, rr! * k, rr! * .7 * k, q > .2 ? palette[3] : palette[1]);
                }
            }
        } };
}
