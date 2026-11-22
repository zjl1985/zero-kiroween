import { groundShape } from "./homestead-ground.js";
import { candlesModel } from "./pixel-candles.js";
import { barnModel } from "./pixel-barn.js";
import { pumpkinModel } from "./pixel-pumpkin.js";
import { stoneModel } from "./pixel-stone.js";
import { fenceModel } from "./pixel-fence.js";
import { lanternModel } from "./pixel-lantern.js";
import { treeModel } from "./pixel-tree.js";
import { cottageModel } from "./pixel-cottage.js";
import { drawPixelStack, type PixelStackModel } from "./pixel-stack.js";
import { type Ctx } from "./paper-material.js";
// Geometry stays in its original world proportions; half-unit sections and
// half-unit surface details are baked as genuine one-pixel voxels.
function fineModel(m: PixelStackModel): PixelStackModel {
    return { ...m, id: m.id + ":fine", width: m.width * 2, depth: m.depth * 2, count: m.count * 2 - 1,
        ...(m.groundShadow ? { groundShadow: { rx: m.groundShadow.rx * 2, ry: m.groundShadow.ry * 2, dx: (m.groundShadow.dx ?? 0) * 2, dy: (m.groundShadow.dy ?? 0) * 2 } } : {}),
        paint(c, z) { m.paint(c, z / 2); } };
}
function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2)));
}
function pixelDisc(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0)
        return;
    for (let iy = Math.ceil(-ry * 2); iy <= Math.floor(ry * 2); iy++) {
        const reach = Math.sqrt(Math.max(0, 1 - (iy / (ry * 2)) ** 2)) * rx;
        if (reach > .2)
            rect(c, x - reach, y + iy / 2, reach * 2, .5, color);
    }
}
const foliage = [
    ["#34544f", "#527b61", "#7f995f"],
    ["#714b50", "#ac7160", "#cf9a70"],
    ["#414f5b", "#6e8980", "#9cae87"],
] as const;
function model(kind: string, variant: number): PixelStackModel {
    const bush = kind === "bush", palettes = foliage[Math.abs(variant) % foliage.length]!;
    if (kind === "cottage")
        return { ...cottageModel(variant % 3), groundShadow: { rx: 15, ry: 4, dx: 8, dy: 12 } };
    if (kind === "barn")
        return { ...barnModel(), groundShadow: { rx: 18, ry: 4, dx: 8, dy: 12 } };
    if (kind === "tree")
        return { ...treeModel(variant), groundShadow: { rx: 8, ry: 2.8, dx: 1, dy: 1 } };
    if (kind === "candles")
        return candlesModel();
    if (kind === "lamp")
        return lanternModel(variant);
    if (kind === "fence")
        return fenceModel(variant);
    if (kind === "stone")
        return stoneModel(variant);
    if (kind === "pumpkin")
        return pumpkinModel(variant);
    return {
        id: `scene:${kind}:leaf-clusters-v2:${variant % 6}`, width: 36,
        depth: 28, count: 19,
        groundShadow: { rx: 13, ry: 4, dx: 1, dy: 1 },
        paint(c, z) {
            if (!bush)
                return;
            // The dark inner stems and small low crowns are visible through gaps.
            // No enclosing sphere: every outer contour belongs to a supported leaf cluster.
            if (z < 6) {
                rect(c, -1, -1, 2, 2, '#655044');
                if (z > 2) {
                    rect(c, -6, -.5, 6, 1, '#51473d');
                    rect(c, 1, -2, 7, 1, '#6b5943');
                }
            }
            const crowns = [
                [-9, -1, 8, 6.5, 4, 4], [1, -4, 10, 7, 4, 5], [10, -1, 9, 5.5, 4, 4],
                [-6, 4, 6, 7, 4, 3.5], [5, 5, 7, 7, 4, 4],
                [-6, -1, 13, 5, 3.2, 3.5], [4, 0, 14, 5.7, 3.4, 4],
                [-10, 4, 10, 4.5, 3, 3], [0, 6, 11, 5, 3, 3.5], [10, 4, 11, 4, 3, 3],
            ] as const;
            for (const [x, y, height, rx, ry, rz] of crowns) {
                const dz = (z - height) / rz;
                if (Math.abs(dz) >= 1)
                    continue;
                const span = Math.sqrt(1 - dz * dz);
                pixelDisc(c, x, y, rx * span, ry * span, palettes[dz < -.15 ? 0 : 1]);
                // A few broad overlapping leaflets follow the cluster's surface. Their
                // half-pixel side edges create internal depth instead of speckled noise.
                if (dz > .05 && dz < .85) {
                    const top = 1 - Math.abs(dz - .35);
                    pixelDisc(c, x - rx * .35, y - .7, rx * .43 * top, ry * .38 * top, palettes[1]);
                    pixelDisc(c, x + rx * .22, y - .4, rx * .48 * top, ry * .36 * top, palettes[2]);
                    pixelDisc(c, x - .4, y + ry * .43, rx * .48 * top, ry * .3 * top, palettes[1]);
                    if (dz > .25 && dz < .55)
                        rect(c, x + .5, y - .7, 1.5, .5, palettes[2]);
                }
            }
        },
    };
}
export function drawPixelDecor(ctx: Ctx, kind: string, x: number, y: number, s = 1, seed = 0, turn?: number): void {
    const v = ((Math.trunc(seed) % 6) + 6) % 6;
    const building = kind === "cottage" || kind === "barn";
    if(building){
      // Only a small threshold scuff accompanies the model. No enclosing
      // coloured ground polygon: the scene's own earth remains visible.
      ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
      ctx.globalAlpha *= .35;
      groundShape(ctx,[[20,27],[33,25],[42,31],[34,37],[23,34]],"#69705a");
      ctx.restore();
    }
    drawPixelStack(ctx, fineModel(model(kind, v)), { x, y, scale: (building ? .9 : 1) * s, turn: turn ?? (building ? -.58 : .22), squash: .75, shadow: true });
}
