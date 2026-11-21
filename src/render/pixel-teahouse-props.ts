/** Quiet tea-garden furnishings, authored as half-unit sections for fineModel.
 * Static models sit at ground zero; paint emits doubled integer atlas pixels. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const P = { woodDark: '#44373d', wood: '#785744', woodLight: '#ad8863', woodTop: '#b59a73',
    cloth: '#777c8c', clothDark: '#515b70', clothEdge: '#b4b5a4',
    ceramicDark: '#496667', ceramic: '#7e9d92', ceramicLight: '#bac7ad', tea: '#514332',
    plate: '#c8ba99', cookie: '#b99160', cookieEdge: '#876347', soil: '#353c31',
    leafDark: '#354c40', leaf: '#567651', leafLight: '#829366', branch: '#715847',
    bloom: '#c1aaa2', bloomLight: '#e0cba8' } as const;
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
function timber(c: Ctx, x: number, y: number, w: number, d: number, cap = false): void {
    rect(c, x, y, w, d, cap ? P.woodTop : P.wood);
    rect(c, x, y, Math.min(1, w * .25), d, P.woodDark);
    rect(c, x + 1, y + d - .5, Math.max(.5, w - 1), .5, P.woodLight);
}
function teaPot(c: Ctx, z: number, x: number, y: number): void {
    if (z >= 0 && z < 6) {
        const r = 2.3 + Math.sin(z / 6 * Math.PI) * 1.4;
        disc(c, x, y, r, r * .8, z < .5 ? P.ceramicDark : P.ceramic);
        disc(c, x + r * .48, y - .5, r * .3, r * .5, P.ceramicLight);
        if (z > 4.5)
            disc(c, x, y, 2.8, 2.1, P.ceramicLight);
    }
    if (z >= 6 && z < 7.5)
        disc(c, x, y, .8, .7, P.ceramicDark);
    // Hollow loop handle has two ceramic roots entering the vessel wall.
    if (z >= 1 && z < 6) {
        const t = (z - 1) / 5, xx = x + 3 + Math.sin(t * Math.PI) * 2;
        rect(c, xx, y - .5, .8, 1, P.ceramicLight);
        if (z < 2 || z > 5)
            rect(c, x + 2.5, y - .5, xx - x - 2, 1, P.ceramic);
    }
    if (z >= 1.5 && z < 6.5) {
        const t = (z - 1.5) / 5, xx = x - 2.5 - t * 4;
        disc(c, xx, y, 1.2 - t * .5, .75, P.ceramic);
        if (z > 5.5)
            rect(c, xx - .5, y, .7, .5, P.ceramicDark);
    }
}
function cup(c: Ctx, z: number, x: number, y: number): void {
    if (z < 0 || z > 3)
        return;
    const radius = 1.2 + z * .2;
    disc(c, x, y, radius, radius * .75, z > .5 ? P.ceramic : P.ceramicDark);
    if (z > 2.5) {
        disc(c, x, y, radius, radius * .75, P.ceramicLight);
        disc(c, x, y, radius - .5, (radius - .5) * .7, P.tea);
    }
}
/** Joined low table, two stools and a complete ceramic tea service. */
export function teahouseTableModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2;
    return { id: `teahouse:table:tea-service:${variant}`, width: 62, depth: 26, count: 26,
        groundShadow: { rx: 28, ry: 5.5, dx: 0, dy: 1 },
        paint(c, z) {
            if (z < 14)
                for (const x of [-13, 10])
                    for (const y of [-5, 4])
                        timber(c, x, y, 3, 3);
            if (z >= 9 && z < 13) {
                timber(c, -13, 5, 26, 2);
                timber(c, -13, -5, 26, 2);
            }
            if (z >= 13 && z <= 16) {
                timber(c, -17, -8, 34, 17, z > 15.5);
                if (z === 16) {
                    rect(c, -16, -2, 32, .5, P.woodLight);
                    rect(c, -16, 4, 32, .5, P.woodLight);
                }
            }
            // Short stools have their own feet and apron, rather than solid blocks.
            for (const x of [-24, 24]) {
                if (z < 8)
                    for (const dx of [-2.5, 1.5])
                        for (const y of [1, 6])
                            timber(c, x + dx, y, 1.5, 1.5);
                if (z >= 6 && z < 8)
                    timber(c, x - 3, 5.5, 6, 1.5);
                if (z >= 8 && z <= 10)
                    timber(c, x - 4, 0, 8, 9, z > 9.5);
            }
            // Runner lies on the slab and bends over its near edge; one narrow
            // woven border, no random fabric speckles or repeated z striping.
            if (z === 16.5) {
                rect(c, -4, -8, 8, 17, P.cloth);
                rect(c, -4, -8, .5, 17, P.clothEdge);
                rect(c, 3.5, -8, .5, 17, P.clothEdge);
            }
            if (z >= 13 && z <= 16)
                rect(c, -4, 8.5, 8, .5, P.clothDark);
            if (z === 13)
                for (let x = -4; x < 4; x++)
                    rect(c, x, 8.5, .5, 1, P.clothEdge);
            teaPot(c, z - 16.5, -6, -2);
            cup(c, z - 16.5, variant ? 3 : 1, 4);
            cup(c, z - 16.5, 5, -4);
            if (z >= 16.5 && z <= 17.5)
                disc(c, 10, 3, 4, 3, z > 17 ? P.plate : P.ceramicDark);
            if (z >= 18 && z <= 19)
                for (const [dx, dy] of [[-1.7, -.7], [1.3, -.5], [0, 1.5]]) {
                    disc(c, 10 + dx!, 3 + dy!, 1.2, 1, z > 18.5 ? P.cookie : P.cookieEdge);
                    if (z === 19)
                        rect(c, 10 + dx!, 3 + dy!, 1, .5, P.plate);
                }
        } };
}
/** Branch interpolated through actual sections: every crown has a woody connection. */
function branch(c: Ctx, z: number, base: number, top: number, x0: number, y0: number, x1: number, y1: number, width: number): void {
    if (z < base || z > top)
        return;
    const t = (z - base) / (top - base), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = width * (1 - t * .5);
    rect(c, x - w / 2, y - w / 2, w, w, P.branch);
    rect(c, x, y, .5, Math.max(.5, w * .5), P.woodLight);
}
function crown(c: Ctx, z: number, x: number, y: number, h: number, rx: number, ry: number, rz: number): void {
    const dz = (z - h) / rz;
    if (Math.abs(dz) >= 1)
        return;
    const k = Math.sqrt(1 - dz * dz), halfY = ry * k;
    // Shade the complete section, including its exposed near contour. Small
    // light discs inside a section disappear under the next slice; these
    // broad inclined material planes survive stacking as a readable crown.
    // The same directional boundary is used at every height, so it creates
    // one continuous lit face rather than a stack of horizontal bands.
    for (let row = Math.ceil(-halfY * 2); row <= Math.floor(halfY * 2); row++) {
        const yy = row / 2, halfX = rx * k * Math.sqrt(Math.max(0, 1 - (yy / halfY) ** 2));
        if (halfX <= .15) continue;
        let start = Math.ceil(-halfX * 2), previous = "";
        const end = Math.floor(halfX * 2);
        for (let column = start; column <= end; column++) {
            const light = .48 * (column / 2 / rx) + .24 * (yy / ry) + .8 * dz;
            const color = light > .23 ? P.leafLight : light < -.22 ? P.leafDark : P.leaf;
            if (previous && color !== previous) {
                rect(c, x + start / 2, y + yy, (column - start) / 2, .5, previous);
                start = column;
            }
            previous = color;
        }
        if (previous) rect(c, x + start / 2, y + yy, (end - start + 1) / 2, .5, previous);
    }
}
function ceramicPlanter(c: Ctx, z: number, x: number, y: number, r: number, h: number, color: string): void {
    if (z < 0 || z > h)
        return;
    const radius = z > h - 1.5 ? r + .6 : r * (.7 + .3 * z / h);
    disc(c, x, y, radius, radius * .72, z < .5 ? P.ceramicDark : color);
    disc(c, x - radius * .65, y, radius * .25, radius * .6, P.ceramicDark);
    if (z > h - 1.5)
        disc(c, x, y, radius, radius * .72, P.ceramicLight);
    if (z > h - .5)
        disc(c, x, y, r - .7, (r - .7) * .7, P.soil);
}
/** Paired glazed pots with clipped tea shrubs, branch forks and a few quiet blossoms. */
export function teahousePlanterModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 3;
    const pots = [[-11, 2, 6, 12], [11, -1, 5, 10]] as const;
    return { id: `teahouse:planter:tea-shrubs:${variant}`, width: 52, depth: 28, count: 47,
        groundShadow: { rx: 22, ry: 6, dx: 0, dy: 1 },
        paint(c, z) {
            for (const [x, y, r, h] of pots) {
                ceramicPlanter(c, z, x, y, r, h, variant === 1 ? '#849081' : P.ceramic);
                const tall = x < 0 ? 1 : .8, top = h + 29 * tall;
                branch(c, z, h - .5, top, x, y, x - 1, y, 1.6);
                const boughs = [[-6, -2, 12], [6, 1, 17], [-3, 3, 23], [2, -2, 28]] as const;
                for (const [dx, dy, rise] of boughs) {
                    const height = h + rise * tall, bx = x + dx, by = y + dy;
                    branch(c, z, h + (rise - 8) * tall, height, x, y, bx, by, 1.2);
                    crown(c, z, bx, by, height, dx === 2 ? 5 : 5.7, 3.4, dx === 2 ? 4.5 : 4);
                }
                const flowerHeight = h + (variant === 2 ? 23 : 17) * tall;
                if (Math.abs(z - flowerHeight) < 1) {
                    const bx = x + (variant === 2 ? -3 : 6), by = y + (variant === 2 ? 3 : 1) + 1;
                    disc(c, bx, by, 1.2, .8, P.bloom);
                    if (z >= flowerHeight)
                        rect(c, bx, by, .5, .5, P.bloomLight);
                }
            }
        } };
}
