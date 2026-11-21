import { rect as pxRect, FX } from "./pixel-vfx.js";
import { mix, type Point } from "./paper-material.js";
import { placePoints } from "./paper-kit.js";
import { upgradeDef, type UpgradeId } from "../game/upgrades.js";
import { CAT_ART, upgradeIcon } from "./art-registry.js";
/** Tag paper and ink of the shared pool; a cat's own pool uses its art colours. */
const ANY_POOL = { paper: "#3a4a52", ink: "#e6d3a6" } as const;
function poolColors(pool: string): {
    paper: string;
    ink: string;
} {
    if (pool === "any" || !CAT_ART.has(pool))
        return ANY_POOL;
    const c = CAT_ART.get(pool).colors;
    return { paper: c.cardPaper, ink: c.cardInk };
}
/** A generic emblem cat head with ears (not a character face), clockwise on screen, around (0, 0). */
export const CAT_HEAD: readonly Point[] = [
    [-6.5, 0], [-6.2, -4], [-5.2, -9.6], [-1.8, -5.6], [1.8, -5.6], [5.2, -9.6], [6.2, -4], [6.5, 0], [5, 4.6], [0, 6.2], [-5, 4.6],
];
/** A paper heart cut, centred on (x, y) with half-height r; the outline runs clockwise. */
export function heartPath(x: number, y: number, r: number, p = new Path2D()): Path2D {
    p.moveTo(x, y - r * 0.45);
    p.bezierCurveTo(x + r * 0.75, y - r * 1.35, x + r * 1.65, y - r * 0.35, x, y + r);
    p.bezierCurveTo(x - r * 1.65, y - r * 0.35, x - r * 0.75, y - r * 1.35, x, y - r * 0.45);
    p.closePath();
    return p;
}
/** A meowline shard: a bent paper bolt of half-length `len` at angle `a`. */
export function boltPoints(x: number, y: number, a: number, len: number): Point[] {
    return placePoints([[-1, 0.22], [-0.42, -0.18], [-0.08, -0.05], [0.3, -0.34], [1, -0.1], [0.42, 0.2], [0.06, 0.08], [-0.24, 0.38]], x, y, a, len);
}
/** A recessed equipment display: fine metal rim, dark interior and quiet corner fittings. */
export function paintCardEmblem(canvas: HTMLCanvasElement, id: UpgradeId): void {
    const ctx = canvas.getContext('2d')!, def = upgradeDef(id), pool = poolColors(def?.cat ?? 'any'), s = canvas.width / 96;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const trim = def?.slot === 'evolution' ? FX.gold : mix(pool.ink, FX.shade, .55);
    pxRect(ctx, 8, 8, 80, 80, FX.dark);
    pxRect(ctx, 9, 9, 78, 1, trim);
    pxRect(ctx, 9, 10, 1, 76, trim);
    pxRect(ctx, 10, 10, 76, 76, mix(pool.paper, FX.dark, .38));
    pxRect(ctx, 12, 12, 72, 1, FX.shade);
    pxRect(ctx, 12, 13, 1, 71, FX.shade);
    pxRect(ctx, 14, 14, 68, 68, pool.paper);
    pxRect(ctx, 14, 81, 68, 1, mix(pool.paper, FX.dark, .3));
    pxRect(ctx, 86, 10, 1, 77, FX.shade);
    pxRect(ctx, 10, 86, 76, 1, FX.shade);
    for (const x of [11, 82])
        for (const y of [11, 82]) {
            pxRect(ctx, x, y, 3, 3, trim);
            pxRect(ctx, x, y, 1, 1, FX.cream);
        }
    ctx.save();
    ctx.translate(16, 16);
    ctx.scale(2, 2);
    upgradeIcon(id)?.(ctx, pool.ink);
    ctx.restore();
}
/** HUD equipment slot uses single-pixel edge values, leaving the object readable. */
export function paintUpgradeIcon(canvas: HTMLCanvasElement, id: UpgradeId, compact = false): void {
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / 32, 0, 0, canvas.height / 32, 0, 0);
    ctx.imageSmoothingEnabled = false;
    pxRect(ctx, 0, 0, 32, 32, FX.dark);
    pxRect(ctx, 1, 1, 30, 30, mix(FX.shade, FX.dark, .3));
    pxRect(ctx, 1, 1, 30, 1, compact ? FX.shade : '#637080');
    pxRect(ctx, 1, 2, 1, 28, FX.shade);
    pxRect(ctx, 2, 30, 29, 1, '#252c42');
    upgradeIcon(id)?.(ctx, FX.cream);
}
