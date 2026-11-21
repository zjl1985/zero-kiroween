/** Grounded greenhouse furnishings, authored in half-unit voxel sections.
 * Root fineModel doubles the atlas and samples these painters every 0.5 unit. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const P = { woodDark: '#3d4040', wood: '#72614b', woodLight: '#aa9370', end: '#c0aa82',
    clayDark: '#704c47', clay: '#a76d55', clayLight: '#c4936e', soil: '#393733',
    leafDark: '#344f46', leaf: '#56775a', leafLight: '#849866',
    flower: '#c39382', flowerLight: '#dec394', metalDark: '#3e5660', metal: '#708c8b', metalLight: '#a7b7a5' } as const;
function rect(c: Ctx, x: number, y: number, w: number, d: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
}
function disc(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0)
        return;
    for (let row = Math.ceil(-ry * 2); row <= Math.floor(ry * 2); row++) {
        const half = rx * Math.sqrt(Math.max(0, 1 - (row / (ry * 2)) ** 2));
        if (half > .15)
            rect(c, x - half, y + row / 2, half * 2, .5, color);
    }
}
function post(c: Ctx, x: number, y: number, w: number, d: number, cap = false): void {
    rect(c, x, y, w, d, cap ? P.end : P.wood);
    rect(c, x, y, Math.min(1, w * .3), d, P.woodDark);
    rect(c, x + 1, y + d - .5, Math.max(.5, w - 1), .5, P.woodLight);
}
/** Tapered clay body with a thick lip surrounding a darker inset soil surface. */
function pot(c: Ctx, z: number, x: number, y: number, r: number, height: number): void {
    if (z < 0 || z > height)
        return;
    const lip = z > height - 1.5, radius = lip ? r + .6 : r * (.68 + .32 * z / height);
    disc(c, x, y, radius, radius * .75, z < .5 ? P.clayDark : lip ? P.clayLight : P.clay);
    if (!lip)
        disc(c, x - radius * .6, y, radius * .3, radius * .62, P.clayDark);
    if (z >= height - .5)
        disc(c, x, y, r - .7, (r - .7) * .7, P.soil);
    else if (z > 2 && z < height - 2)
        rect(c, x + radius - .7, y, .5, Math.max(.5, r * .35), P.clayLight);
}
/** A broad leaf rises from a visible node, with a dark underside and a light midrib. */
function leaf(c: Ctx, z: number, x: number, y: number, start: number, rise: number, dx: number, dy: number, width: number): void {
    const t = (z - start) / rise;
    if (t < 0 || t > 1)
        return;
    const cx = x + dx * t, cy = y + dy * t, span = Math.max(.3, Math.sin(t * Math.PI) * width);
    disc(c, cx, cy, span, Math.max(.4, span * .48), t < .24 ? P.leafDark : P.leaf);
    if (t > .2 && t < .85)
        rect(c, cx, cy, .5, Math.max(.5, span * .45), P.leafLight);
}
function plant(c: Ctx, z: number, x: number, y: number, base: number, height: number, spread: number, variant: number): void {
    if (z < base || z > base + height)
        return;
    rect(c, x - .25, y - .25, .5, .5, P.leafDark);
    for (const [node, side, depth] of [[.12, -1, 1], [.2, 1, -1], [.38, -1, -1], [.48, 1, 1], [.65, -1, 0], [.72, 1, 0]])
        leaf(c, z, x, y, base + height * node!, height * .28, side! * spread * (node! > .6 ? .55 : 1), depth! * 2.2, spread * .45);
    if (variant % 2 && z > base + height - .75)
        disc(c, x, y, 1.2, .9, P.leafLight);
}
/** Two joined posts enclose an actual diagonal timber lattice and a climbing vine. */
export function greenhouseTrellisModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2;
    return { id: `greenhouse:trellis:joined:${variant}`, width: 44, depth: 16, count: 54,
        groundShadow: { rx: 18, ry: 3.5, dx: 1, dy: 1 },
        paint(c, z) {
            if (z < 3)
                for (const x of [-17, 15])
                    post(c, x - 1, -3, 5, 6);
            if (z < 51)
                for (const x of [-17, 15])
                    post(c, x, -1.5, 3, 3, z > 49.5);
            if (z >= 4 && z < 6 || z >= 48 && z < 50)
                post(c, -18, -1.5, 36, 3, z > 49);
            if (z >= 6 && z < 48)
                for (const direction of [-1, 1])
                    for (let start = -50; start <= 50; start += 12) {
                        const x = start + direction * (z - 6) * .68;
                        if (x > -15 && x < 15)
                            rect(c, x, direction < 0 ? -.5 : .5, 1, .7, direction < 0 ? P.woodDark : P.woodLight);
                    }
            // A paired vine climbs the joined frame. Broad leaf groups leave
            // deliberate open diamonds rather than a curtain of noisy stripes.
            for (const side of [-1, 1])
                if (z < 48) {
                    const x = side * (11 + Math.sin(z * .12) * 2);
                    rect(c, x, 1.5, .5, .5, P.leafDark);
                    for (const node of [9, 21, 33, 41]) {
                        leaf(c, z, side * (11 + Math.sin(node * .12) * 2), 2, node, 7, -side * 5, 1.5, 3.4);
                        leaf(c, z, side * (11 + Math.sin(node * .12) * 2), 2, node + 2, 5, side * 3, -1, 2.8);
                    }
                }
            for (const [x, h] of variant ? [[-9, 25], [10, 40]] : [[10, 17], [-10, 37]]) {
                if (Math.abs(z - h!) < 1.5) {
                    const r = Math.abs(z - h!) < .5 ? 2 : 1.3;
                    disc(c, x!, 3, r, 1, P.flower);
                    if (z >= h!)
                        rect(c, x!, 3, .5, .5, P.flowerLight);
                }
            }
        } };
}
/** Three unequal terracotta pots, joined visually by a shallow wooden staging tray. */
export function greenhousePotsModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2;
    const pots = [[-14, 3, 4.4, 9, 15, 5], [0, -3, 5.5, 12, 22, 7], [14, 3, 4.7, 8, 17, 5.5]] as const;
    return { id: `greenhouse:pots:botanical:${variant}`, width: 48, depth: 26, count: 38,
        groundShadow: { rx: 22, ry: 6, dx: 1, dy: 1 },
        paint(c, z) {
            if (z < 1.5) {
                post(c, -21, -7, 42, 15, z > 1);
                if (z > 1)
                    for (const x of [-10, 2, 13])
                        rect(c, x, -7, .5, 15, P.woodDark);
            }
            for (const [x, y, r, h, tall, wide] of pots) {
                pot(c, z - 1.5, x, y, r, h);
                plant(c, z, x, y, h + 1, tall, wide, variant);
            }
        } };
}
/** Potting bench: load-bearing legs, lower shelf, drawers, seed tray and real tools. */
export function greenhouseWorkbenchModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2;
    return { id: `greenhouse:workbench:potting:${variant}`, width: 52, depth: 28, count: 44,
        groundShadow: { rx: 23, ry: 6.5, dx: 1, dy: 1 },
        paint(c, z) {
            if (z < 25)
                for (const x of [-20, 17])
                    for (const y of [-8, 6])
                        post(c, x, y, 3, 3, z > 24);
            if (z >= 6 && z < 8) {
                post(c, -20, -8, 40, 17, z > 7);
                if (z > 7)
                    for (const x of [-9, 3, 14])
                        rect(c, x, -8, .5, 17, P.woodDark);
            }
            // Two spare pots visibly sit on the storage shelf.
            for (const x of [-10, 2])
                pot(c, z - 8, x, 1, 3, 6);
            if (z >= 18 && z < 24) {
                post(c, -20, -8, 40, 2);
                post(c, -20, 6, 40, 3);
                rect(c, -.5, 8.5, 1, .5, P.woodDark);
                if (z >= 20 && z < 21)
                    for (const x of [-10, 10]) {
                        rect(c, x - 2, 9, 4, .5, P.metalDark);
                        if (z > 20)
                            rect(c, x - 1, 9.5, 2, .5, P.metalLight);
                    }
                if (z < 19)
                    rect(c, -19, 8.5, 38, .5, P.woodDark);
            }
            if (z >= 24 && z <= 26) {
                post(c, -23, -10, 46, 21, z > 25.5);
                if (z === 26)
                    for (const y of [-4, 3])
                        rect(c, -22, y, 44, .5, P.woodLight);
            }
            // A shallow nursery tray rests directly on the worktop; its soil
            // and paired leaves read as planted rows, not detached green dots.
            if (z > 26 && z <= 28) {
                post(c, -19, -6, 22, 13, z > 27);
                if (z > 27.5)
                    rect(c, -18, -5, 20, 11, P.soil);
            }
            for (const x of [-15, -8, -1])
                for (const y of [-2, 4]) {
                    if (z > 28 && z < 32)
                        rect(c, x, y, .5, .5, P.leafDark);
                    leaf(c, z, x, y, 28, 4, -2, -.5, 1.5);
                    leaf(c, z, x, y, 29, 4, 2, .5, 1.5);
                }
            // Rounded watering can, open handle and sloping spout, all attached.
            const canZ = z - 26;
            if (canZ >= 0 && canZ < 8) {
                disc(c, 12, 2, 4, 3, canZ > 7 ? P.metalLight : P.metal);
                if (canZ < 7)
                    rect(c, 8, 1, 1, 2, P.metalDark);
                if (canZ > 7)
                    disc(c, 12, 2, 2.5, 1.8, P.metalDark);
            }
            if (canZ >= 2 && canZ <= 9) {
                const u = (canZ - 2) / 7, sy = 2 - Math.sin(u * Math.PI) * 4;
                rect(c, 16, sy, 1, 1, P.metalLight);
                if (canZ < 3 || canZ > 8)
                    rect(c, 14, sy, 2, 1, P.metal);
            }
            if (canZ >= 3 && canZ < 9) {
                const sx = 8 - (canZ - 3) * .7;
                rect(c, sx, 4, 1.5, 1.5, P.metal);
                if (canZ > 8)
                    disc(c, sx, 4, 1.8, 1, P.metalLight);
            }
            // A hand spade rests against the back edge, its handle visibly
            // entering the steel blade. It remains inside the bench footprint.
            if (z >= 26 && z <= 42) {
                const y = -7 - (z - 26) * .14, x = 19;
                if (z < 31) {
                    const w = z < 28 ? 1.2 : 2;
                    rect(c, x - w, y, w * 2, 1, P.metalDark);
                    rect(c, x, y, w, .5, P.metalLight);
                }
                else if (z < 40)
                    rect(c, x - .5, y, 1, 1, P.woodLight);
                else {
                    rect(c, x - 1.5, y, 1, 1, P.woodLight);
                    rect(c, x + .5, y, 1, 1, P.wood);
                    if (z > 41)
                        rect(c, x - 1.5, y, 3, 1, P.end);
                }
            }
            // Variant changes one tray tie, keeping tools and supports fixed.
            if (z === 28)
                rect(c, variant ? -12 : -5, 7, 1, .5, P.end);
        } };
}
