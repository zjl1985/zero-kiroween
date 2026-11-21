/** Small observatory instruments. Model coordinates are half-unit sections;
 * root fineModel doubles atlas dimensions and calls paint(z / 2).
 * The instruments are supported solids, with open space between brass rings. */
import type { PixelStackModel } from './pixel-stack.js';
import type { Ctx } from './paper-material.js';
const P = {
    stoneDark: '#414957', stone: '#747b81', stoneLight: '#a5aaa1',
    woodDark: '#3d3544', wood: '#765747', woodLight: '#a2805b',
    brassDark: '#756249', brass: '#b49a65', brassLight: '#e0cb92',
    blueDark: '#263b51', blue: '#38566e', blueLight: '#82a3af',
    mapLine: '#617d8b', star: '#e1d3a3', paper: '#d1c19a', paperShade: '#a49578',
} as const;
function rect(c: Ctx, x: number, y: number, w: number, d: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
}
function disc(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0)
        return;
    for (let iy = Math.ceil(-ry * 2); iy <= Math.floor(ry * 2); iy++) {
        const half = rx * Math.sqrt(Math.max(0, 1 - (iy / (ry * 2)) ** 2));
        if (half > .15)
            rect(c, x - half, y + iy / 2, half * 2, .5, color);
    }
}
type Voxel = readonly [
    number,
    number,
    string
];
/** Rasterize a closed physical ring once, then index its voxels by section.
 * Dense angular sampling plus a two-voxel brass thickness prevents gaps at
 * the top/bottom tangencies; each curve closes back onto its first section. */
function brassRings(variant: number): ReadonlyMap<number, readonly Voxel[]> {
    const cells = new Map<string, readonly [
        number,
        number,
        number,
        string
    ]>();
    const yaw = variant % 2 ? -.35 : .35;
    const curves = [
        (a: number) => [Math.cos(a) * 14, 0, 31 + Math.sin(a) * 14],
        (a: number) => [Math.cos(a) * 13 * Math.sin(yaw), Math.cos(a) * 13 * Math.cos(yaw), 31 + Math.sin(a) * 13],
        (a: number) => [Math.cos(a) * 14, Math.sin(a) * 10, 31 + Math.sin(a) * 4],
    ];
    for (const curve of curves)
        for (let i = 0; i <= 512; i++) {
            const a = i / 512 * Math.PI * 2, [x, y, z] = curve(a);
            const ix = Math.round(x! * 2), iy = Math.round(y! * 2), iz = Math.round(z! * 2);
            const color = Math.sin(a) > .35 ? P.brassLight : Math.cos(a) < -.2 ? P.brassDark : P.brass;
            for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
                const xx = ix + dx!, yy = iy + dy!, zz = iz + dz!;
                cells.set(`${xx},${yy},${zz}`, [xx / 2, yy / 2, zz / 2, color]);
            }
        }
    const sections = new Map<number, Voxel[]>();
    for (const [x, y, z, color] of cells.values()) {
        const row = sections.get(z) ?? [];
        row.push([x, y, color]);
        sections.set(z, row);
    }
    return sections;
}
const RINGS = [brassRings(0), brassRings(1)];
/** Brass meridians/equator, supported axle and blue central globe on a stone plinth. */
export function observatoryArmillaryModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2, rings = RINGS[variant]!;
    return { id: `observatory:armillary:instrument:${variant}`, width: 36, depth: 32, count: 49,
        groundShadow: { rx: 12, ry: 4, dx: 1, dy: 1 },
        paint(c, z) {
            if (z < 3) {
                const radius = z < 1 ? 10.5 : 9;
                disc(c, 0, 0, radius, 6, z < .5 ? P.stoneDark : z > 2 ? P.stoneLight : P.stone);
                if (z < 2)
                    rect(c, -radius + 1, 1, radius * .7, 3, P.stoneDark);
            }
            if (z >= 3 && z < 16.5) {
                const radius = 4.2 - Math.min(z - 3, 9) * .18;
                rect(c, -radius, -2, radius * 2, 4, P.stone);
                rect(c, -radius, -2, 1.3, 4, P.stoneDark);
                rect(c, radius - 1, 0, 1, 2, P.stoneLight);
                if (z > 13.5)
                    disc(c, 0, 0, 4.2, 3, z > 15 ? P.brassLight : P.brassDark);
            }
            // The axis joins pedestal, globe and polar fittings. It is drawn
            // behind the rings so their near faces visibly cross over it.
            if (z >= 16 && z <= 45.5)
                rect(c, -.5, -.5, 1, 1, P.brassDark);
            if (z >= 17 && z < 19 || z > 43.5 && z < 46)
                disc(c, 0, 0, 1.6, 1.2, P.brass);
            const dz = z - 31;
            if (Math.abs(dz) < 3.3) {
                const radius = Math.sqrt(3.3 * 3.3 - dz * dz);
                disc(c, 0, 0, radius, radius * .85, P.blue);
                disc(c, .6, -.3, radius * .65, radius * .6, P.blueLight);
                if (Math.abs(dz) < .5)
                    rect(c, -radius, 0, radius * 2, .5, P.brassDark);
            }
            for (const [x, y, color] of rings.get(z) ?? [])
                rect(c, x, y, .5, .5, color);
            // Polar finial is attached to the same axle, not a floating star.
            if (z > 45.5 && z < 48)
                disc(c, 0, 0, z < 47 ? 1.2 : .6, .7, z > 46.5 ? P.brassLight : P.brass);
        } };
}
type MapCell = readonly [
    number,
    number,
    string
];
function chartMarks(variant: number): readonly MapCell[] {
    const marks = new Map<string, MapCell>();
    const dot = (x: number, y: number, color: string) => marks.set(`${x},${y}`, [x / 2, y / 2, color]);
    const segment = (x0: number, y0: number, x1: number, y1: number, color: string) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++)
            dot(Math.round(x0 + (x1 - x0) * i / Math.max(1, n)), Math.round(y0 + (y1 - y0) * i / Math.max(1, n)), color);
    };
    // Two designed constellations, with connected bright stars and quiet lines.
    const stars = variant ? [[-28, -9], [-19, -3], [-8, -8], [1, -1], [7, -7]] : [[-28, -7], [-20, -12], [-12, -5], [-18, 3], [-4, 7], [6, 1]];
    for (let i = 1; i < stars.length; i++)
        segment(...stars[i - 1]! as [
            number,
            number
        ], ...stars[i]! as [
            number,
            number
        ], P.mapLine);
    for (const [x, y] of stars) {
        dot(x!, y!, P.star);
        dot(x! + 1, y!, P.star);
        dot(x!, y! + 1, P.star);
    }
    // A single compass and degree ruler give the chart a readable purpose.
    segment(15, -10, 15, -3, P.brass);
    segment(11, -7, 19, -7, P.brass);
    dot(15, -11, P.star);
    dot(15, -7, P.star);
    segment(-30, 12, 14, 12, P.brass);
    for (let x = -30; x <= 14; x += 4)
        segment(x, 12, x, x % 8 === 2 ? 9 : 10, P.star);
    return [...marks.values()];
}
const CHART_MARKS = [chartMarks(0), chartMarks(1)];
/** A tilted star chart with a continuous wooden slab, joined trestles and rolled scroll. */
export function observatoryChartModel(v: number): PixelStackModel {
    const variant = Math.abs(Math.trunc(v)) % 2;
    return { id: `observatory:chart:desk:${variant}`, width: 48, depth: 30, count: 28,
        groundShadow: { rx: 22, ry: 6, dx: 1, dy: 2 },
        paint(c, z) {
            // Two fore/aft trestle frames carry the whole work surface.
            if (z < 2)
                for (const x of [-15, 15])
                    rect(c, x - 4, -8, 8, 16, z < .5 ? P.woodDark : P.wood);
            if (z >= 2 && z < 24)
                for (const x of [-15, 15])
                    for (const side of [-1, 1]) {
                        const y = side * (7 - z * .14), width = z > 20 ? 2.5 : 2;
                        if (z > 19.5 - y * .25) continue;
                        rect(c, x - 1, y - 1, width, 2, P.wood);
                        rect(c, x - .5, y + .5, width - .5, .5, P.woodLight);
                    }
            if (z >= 7 && z < 9)
                rect(c, -15, -1, 30, 2, P.woodDark);
            if (z >= 16 && z < 18)
                for (const x of [-15, 15])
                    rect(c, x - 1, -7, 2, 14, P.woodLight);
            // Every front-to-back row has a real slab thickness. A half-unit
            // stepped incline exposes both the map plane and its front apron.
            for (let y = -10; y < 10; y += .5) {
                const top = Math.round((21 - y * .25) * 2) / 2;
                if (z >= top - 2 && z <= top) {
                    rect(c, -22, y, 44, .5, z < top ? P.wood : P.brassDark);
                    // Ink covers the exposed half-step riser as well as the top,
                    // so the inclined map is one plane rather than wooden stripes.
                    if (z >= top - .5) {
                        rect(c, -21, y, 42, .5, P.woodLight);
                        if (y > -9 && y < 8.5)
                            rect(c, -19, y, 38, .5, P.blueDark);
                    }
                    if (y >= 9)
                        rect(c, -22, y, 44, .5, z > top - .5 ? P.brass : P.woodDark);
                }
            }
            for (const [x, y, color] of CHART_MARKS[variant]!) {
                const surface = Math.round((21 - y * .25) * 2) / 2;
                if (z === surface)
                    rect(c, x, y, .5, .5, color);
            }
            // Rolled parchment rests along the right edge, following the
            // incline. Its ends have darker paper cores and brass retaining ties.
            for (let y = -8; y <= 7; y += .5) {
                const center = Math.round((22 - y * .25) * 2) / 2, dz = z - center;
                if (Math.abs(dz) > 1.5)
                    continue;
                const half = Math.sqrt(Math.max(0, 2.25 - dz * dz));
                if (half < .25)
                    continue;
                rect(c, 16 - half, y, half * 2, .5, Math.abs(y - 4) < .5 ? P.brassDark : dz > .5 ? P.paper : P.paperShade);
                if (y === 7 && Math.abs(dz) < .5)
                    rect(c, 15.5, y, 1, .5, P.woodDark);
            }
        } };
}
