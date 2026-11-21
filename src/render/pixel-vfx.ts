/** Authored integer-grid combat pixels. No vector paper painters or runtime textures. */
import { rect, line, polygon, type Ctx, type Point } from './pixel-art.js';
import { reducedPaperMotion } from './paper-motion.js';
export { rect, line, polygon };
export const FX = { dark: '#181d32', shade: '#39435d', cream: '#f8e8ad', gold: '#efb84f', purple: '#ad8be0', blue: '#71c7d0', red: '#e97858', green: '#8aba74' } as const;
export function stamp(ctx: Ctx, rows: readonly string[], x: number, y: number, color: string, cell = 2): void {
    const u = Math.max(1, Math.round(cell));
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++)
        if (row[i] !== '.')
            rect(ctx, x + i * u, y + j * u, u, u, row[i] === '2' ? FX.cream : row[i] === '3' ? FX.dark : color); });
}
export const GLYPHS = {
    star: ['....1....', '....2....', '...121...', '..11211..', '122222221', '..11211..', '...121...', '....2....', '....1....'],
    bolt: ['......11.', '....111..', '..1121...', '.1121111.', '....121..', '...11....', '..1......'],
    crane: ['1.......1', '11.....11', '.111.111.', '..11211..', '...121111', '..1111...', '.11..1...', '1....1...'],
    seed: ['...11...', '..1221..', '.112211.', '.112211.', '..1121..', '...11...'],
    flame: ['...1....', '...11...', '.1.121..', '.11121..', '1122211.', '1122221.', '.12221..', '..111...'],
    drop: ['...1...', '..111..', '..121..', '.11211.', '.11211.', '..111..'],
    skull: ['.11111.', '1122211', '1131311', '1122211', '.11111.', '..1.1..'],
    heart: ['.11.11.', '1221221', '1222221', '.12221.', '..121..', '...1...'],
    shield: ['1111111', '1222221', '1221221', '.12121.', '.12121.', '..121..', '...1...'],
    leaf: ['....111', '..11221', '.11221.', '11221..', '1111...', '11.....'],
    moon: ['..1111.', '.122...', '112....', '112....', '112....', '.122...', '..1111.'],
    brush: ['.....11', '....121', '...121.', '..121..', '.111...', '1121...', '111....'],
    sword: ['......12', '.....121', '....121.', '...121..', '1.121...', '.111....', '..1.....', '.1......'],
    book: ['111.111', '1221221', '1211121', '1211121', '1221221', '1111111'],
    boot: ['111....', '121....', '121....', '12111..', '122221.', '111111.'],
    eye: ['..111..', '.12221.', '1233321', '.12221.', '..111..'],
    magnet: ['11...11', '12...21', '12...21', '12...21', '1222221', '.11111.'],
};
export function glyph(ctx: Ctx, kind: keyof typeof GLYPHS, x: number, y: number, size: number, color: string): void {
    const rows = GLYPHS[kind], cell = Math.max(1, Math.round(size / 4));
    stamp(ctx, rows, x - rows[0]!.length * cell / 2, y - rows.length * cell / 2, color, cell);
}
export function pixelRing(ctx: Ctx, x: number, y: number, r: number, color: string, ratio = 1, progress = 1): void {
    if (r <= 0 || progress <= 0)
        return;
    const n = Math.max(16, Math.min(96, Math.ceil(r * 1.4))), end = Math.min(1, progress) * Math.PI * 2;
    for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2;
        if (a > end)
            break;
        rect(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * ratio, 2, 2, color);
    }
}
export function burst(ctx: Ctx, x: number, y: number, t: number, r: number, color: string, count = 8): void {
    const k = reducedPaperMotion() ? 0.25 : t;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, 1 - t);
    for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2, d = 4 + k * r;
        rect(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * .65, 3, 3, i % 3 === 0 ? FX.cream : color);
    }
    ctx.restore();
}
/** Polygon rasterization uses the same vertices as the simulation footprint. */
export function area(ctx: Ctx, pts: readonly {
    x: number;
    y: number;
}[], color: string): void { polygon(ctx, pts.map(p => [p.x, p.y] as Point), color); }
export function edge(ctx: Ctx, pts: readonly {
    x: number;
    y: number;
}[], color: string, close = true): void { for (let i = 1; i < pts.length; i++)
    line(ctx, pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y, color, 2); if (close && pts.length > 2)
    line(ctx, pts[pts.length - 1]!.x, pts[pts.length - 1]!.y, pts[0]!.x, pts[0]!.y, color, 2); }
