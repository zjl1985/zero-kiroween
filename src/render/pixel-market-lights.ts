/** Native pixel lantern strings suspended from the three market stall roofs.
 * Coordinates match the existing lights piece at market (0,-96); this painter
 * is called by its static cache and allocates no surfaces or runtime state. */
import { rect, line, type Ctx } from './pixel-art.js';
const P = {
    cord: '#42372f', cordEdge: '#9b855d', cap: '#59483a', capLight: '#a78b59',
    redDark: '#77473e', red: '#b66d4f', redLight: '#d39868', redRib: '#955840',
    goldDark: '#89633d', gold: '#c49a58', goldLight: '#e0bd78', goldRib: '#ab8047',
    tie: '#bd9b63', tassel: '#8c5c43',
} as const;
interface Span {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
    readonly sag: number;
    readonly lamps: number;
}
// Side roof corners and the raised centre roof are the three actual supports.
// Both spans share the centre knot: no free-standing poles or unsupported kinks.
const SPANS: readonly Span[] = [
    { x0: -154, y0: -18, x1: 0, y1: -48, sag: 30, lamps: 8 },
    { x0: 0, y0: -48, x1: 154, y1: -18, sag: 30, lamps: 8 },
];
/** The lamp attachment and cord rasterization share this exact curve. */
function cordY(span: Span, x: number): number {
    const t = (x - span.x0) / (span.x1 - span.x0);
    return Math.round(span.y0 + (span.y1 - span.y0) * t + span.sag * 4 * t * (1 - t));
}
function lantern(ctx: Ctx, x: number, top: number, red: boolean): void {
    const shade = red ? P.redDark : P.goldDark, body = red ? P.red : P.gold, light = red ? P.redLight : P.goldLight, rib = red ? P.redRib : P.goldRib;
    // Caps have their own top edge and dark underside, and the envelope
    // begins immediately underneath them rather than hovering on a peg.
    rect(ctx, x - 3, top, 6, 2, P.cap);
    rect(ctx, x - 2, top, 4, 1, P.capLight);
    const widths = red ? [2, 3, 4, 5, 5, 5, 5, 4, 3, 2] : [3, 4, 4, 4, 4, 4, 4, 4, 3];
    for (let row = 0; row < widths.length; row++) {
        const half = widths[row]!, y = top + 2 + row;
        rect(ctx, x - half, y, half * 2 + 1, 1, body);
        rect(ctx, x - half, y, 1, 1, shade);
        // Broad right face and two fine bamboo ribs follow the round contour.
        rect(ctx, x + 1, y, Math.max(1, half - 1), 1, light);
        if (half >= 4) {
            rect(ctx, x - 2, y, 1, 1, rib);
            rect(ctx, x + 2, y, 1, 1, body);
        }
        if (row === 1 || row === widths.length - 2)
            rect(ctx, x - half + 1, y, half * 2 - 1, 1, rib);
    }
    const bottom = top + 2 + widths.length;
    rect(ctx, x - 2, bottom, 5, 1, P.cap);
    rect(ctx, x - 1, bottom, 3, 1, P.capLight);
    rect(ctx, x, bottom + 1, 1, 2, P.tie);
    rect(ctx, x - 1, bottom + 3, 3, 1, P.tassel);
}
/** Direct native painter, local bounds [-168,-56,168,24]. */
export function drawMarketLights(ctx: Ctx, x: number, y: number, s: number, v: number): void {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(s, s);
    let index = 0;
    for (const span of SPANS) {
        let previousY = cordY(span, span.x0);
        for (let xx = span.x0 + 1; xx <= span.x1; xx++) {
            const yy = cordY(span, xx);
            line(ctx, xx - 1, previousY, xx, yy, P.cord);
            previousY = yy;
        }
        for (let i = 0; i < span.lamps; i++) {
            const lx = Math.round(span.x0 + (i + .5) / span.lamps * (span.x1 - span.x0)), ly = cordY(span, lx);
            // A tiny tied suspension connects to a pixel known to be on the
            // cord. No separate polyline approximation for the hanging lamps.
            rect(ctx, lx, ly, 1, 3, P.tie);
            const red = (index + Math.abs(Math.trunc(v))) % 3 !== 1;
            lantern(ctx, lx, ly + 3, red);
            index++;
        }
    }
    for (const [ax, ay] of [[-154, -18], [0, -48], [154, -18]]) {
        rect(ctx, ax! - 1, ay! - 1, 3, 3, P.cap);
        rect(ctx, ax!, ay! - 1, 1, 2, P.cordEdge);
        line(ctx, ax!, ay! + 2, ax! + 2, ay! + 4, P.cord);
    }
    ctx.restore();
}
