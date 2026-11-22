/** Authored opening-yard furniture. Baked independently so the world can
 * sort it against actors at the same ground anchor used by collision. */
import { cachedSprite } from "../engine/sprite.js";
import type { YARD_FURNITURE } from "../game/scenery.js";
import { rect, line, polygon, type Ctx } from './pixel-art.js';
const P = {
    shadow: '#25262d', contact: '#1e2228',
    wood: '#80553e', woodDark: '#503e36', woodSide: '#624632',
    woodLight: '#a9774d', woodTop: '#b18b5d', cut: '#bc9868', ring: '#8c6847',
    straw: '#ab9257', strawTop: '#c2a767', strawSide: '#827347', strawDark: '#686143',
    rope: '#d3b98a', ropeDark: '#7b6246',
    leaf: '#626e49', leafDark: '#414d39', leafLight: '#879057',
    orange: '#bd8054', gold: '#d4a365', flowerDark: '#815544',
    iron: '#6c7e80', ironLight: '#a0aaa0', ironDark: '#404e59', soil: '#39312d',
} as const;
function shadow(ctx: Ctx, x: number, y: number, w: number, h: number): void {
    rect(ctx, x + 3, y, w - 6, h, P.shadow);
    rect(ctx, x, y + 2, w, h - 4, P.shadow);
    rect(ctx, x + 6, y + 2, w - 12, 3, P.contact);
}
/** One split log: long bark plane and a stepped, ringed end grain. */
function log(ctx: Ctx, x: number, y: number, length: number): void {
    polygon(ctx, [[x + 5, y - 5], [x + length, y - 8], [x + length + 4, y - 4], [x + 9, y]], P.woodLight);
    polygon(ctx, [[x + 9, y], [x + length + 4, y - 4], [x + length + 4, y + 3], [x + 9, y + 6]], P.woodDark);
    line(ctx, x + 11, y - 2, x + length - 1, y - 6, P.woodTop);
    line(ctx, x + 12, y + 2, x + length, y - 1, P.woodSide);
    rect(ctx, x + 2, y - 4, 7, 10, P.woodDark);
    rect(ctx, x, y - 2, 11, 6, P.woodDark);
    rect(ctx, x + 2, y - 2, 7, 6, P.cut);
    rect(ctx, x + 3, y - 3, 5, 8, P.cut);
    rect(ctx, x + 4, y - 1, 3, 4, P.ring);
    rect(ctx, x + 5, y, 2, 2, P.woodTop);
    line(ctx, x + 7, y + 3, x + 9, y + 4, P.woodSide);
}
/** Bound square bale. Directional straw is deliberately sparse and aligned. */
function bale(ctx: Ctx, x: number, y: number, w: number, h: number): void {
    polygon(ctx, [[x, y], [x + 9, y - 6], [x + w + 9, y - 6], [x + w, y]], P.strawTop);
    rect(ctx, x, y, w, h, P.straw);
    polygon(ctx, [[x + w, y], [x + w + 9, y - 6], [x + w + 9, y + h - 6], [x + w, y + h]], P.strawSide);
    line(ctx, x, y, x + w - 1, y, P.rope);
    line(ctx, x, y + h - 1, x + w, y + h - 1, P.strawDark);
    for (let row = 3; row < h - 1; row += 4) {
        line(ctx, x + 2, y + row, x + w - 3, y + row, P.strawTop);
        line(ctx, x + w + 2, y + row - 2, x + w + 6, y + row - 5, P.strawDark);
    }
    for (const offset of [Math.round(w * .26), Math.round(w * .75)]) {
        line(ctx, x + offset, y, x + offset + 8, y - 5, P.rope);
        rect(ctx, x + offset, y, 2, h, P.ropeDark);
        rect(ctx, x + offset, y, 1, h - 1, P.rope);
    }
    rect(ctx, x + Math.round(w * .26) - 1, y + Math.floor(h / 2), 4, 2, P.ropeDark);
}
function flower(ctx: Ctx, x: number, y: number, warm: boolean): void {
    line(ctx, x, y + 10, x, y + 2, P.leafDark);
    polygon(ctx, [[x, y + 7], [x - 5, y + 3], [x - 4, y + 8], [x, y + 10]], P.leaf);
    polygon(ctx, [[x + 1, y + 6], [x + 5, y + 2], [x + 5, y + 6], [x + 1, y + 9]], P.leafLight);
    rect(ctx, x - 2, y - 2, 5, 6, P.flowerDark);
    rect(ctx, x - 3, y - 1, 7, 3, warm ? P.orange : P.gold);
    rect(ctx, x - 1, y - 3, 3, 7, warm ? P.orange : P.gold);
    rect(ctx, x, y - 1, 2, 2, P.gold);
    rect(ctx, x, y, 1, 1, P.soil);
}
/** Slatted planter, filled foliage sits behind the front rim rather than floating. */
function planter(ctx: Ctx, x: number, y: number, w: number, compact = false): void {
    shadow(ctx, x - 2, y + 12, w + 12, 6);
    polygon(ctx, [[x, y], [x + 7, y - 5], [x + w + 7, y - 5], [x + w, y]], P.woodTop);
    polygon(ctx, [[x + 3, y], [x + 8, y - 3], [x + w + 3, y - 3], [x + w - 2, y]], P.soil);
    for (let i = 0; i < 4; i++) {
        const fx = x + 5 + i * Math.floor((w - 10) / 3), fy = compact ? y - 3 - (i % 2) : y - 7 - (i % 2) * 4;
        flower(ctx, fx, fy, i % 2 === 0);
    }
    rect(ctx, x, y + 1, w, 12, P.wood);
    polygon(ctx, [[x + w, y], [x + w + 7, y - 5], [x + w + 7, y + 8], [x + w, y + 13]], P.woodSide);
    rect(ctx, x - 1, y, w + 2, 3, P.woodLight);
    line(ctx, x, y, x + w, y, P.woodTop);
    line(ctx, x + 2, y + 7, x + w - 2, y + 7, P.woodDark);
    rect(ctx, x + 2, y + 12, w - 4, 2, P.woodDark);
    for (const offset of [3, w - 6]) {
        rect(ctx, x + offset, y + 2, 3, 11, P.woodLight);
        rect(ctx, x + offset + 1, y + 3, 1, 1, P.ironDark);
        rect(ctx, x + offset + 1, y + 10, 1, 1, P.ironDark);
    }
    line(ctx, x + w + 2, y + 5, x + w + 5, y + 3, P.woodDark);
}
function woodpile(ctx: Ctx): void {
    shadow(ctx, 166, 478, 88, 11);
    // Skids keep the stack clear of the soil and give its lower contour a footing.
    rect(ctx, 169, 478, 45, 4, P.woodDark);
    rect(ctx, 174, 480, 4, 4, P.woodLight);
    rect(ctx, 205, 477, 4, 5, P.woodSide);
    log(ctx, 170, 474, 34);
    log(ctx, 180, 476, 34);
    log(ctx, 175, 465, 34);
    log(ctx, 185, 467, 34);
    log(ctx, 181, 456, 31);
    // Two tied bales belong to the same storage arrangement, with one behind the other.
    bale(ctx, 218, 454, 23, 15);
    bale(ctx, 215, 471, 27, 14);
    // A folded coarse cloth and its seam lie across the top bale.
    polygon(ctx, [[221, 448], [232, 448], [228, 452], [217, 452]], P.ironDark);
    rect(ctx, 217, 452, 11, 3, P.ironDark);
    line(ctx, 218, 452, 227, 452, P.iron);
}
function toolRack(ctx: Ctx): void {
    shadow(ctx, 754, 330, 47, 10);
    // Short freestanding rack; all tools lean inside its silhouette.
    polygon(ctx, [[758, 303], [761, 301], [764, 332], [761, 334]], P.woodDark);
    rect(ctx, 758, 302, 3, 31, P.wood);
    rect(ctx, 758, 302, 1, 28, P.woodLight);
    rect(ctx, 789, 301, 3, 31, P.woodSide);
    rect(ctx, 789, 301, 1, 30, P.woodLight);
    rect(ctx, 757, 306, 37, 4, P.wood);
    rect(ctx, 757, 305, 37, 1, P.woodTop);
    rect(ctx, 761, 323, 28, 3, P.woodDark);
    line(ctx, 761, 325, 788, 309, P.woodSide, 2);
    // Spade: forked handle, long straight shaft and dark bevel under the steel blade.
    rect(ctx, 765, 299, 6, 1, P.woodTop);
    rect(ctx, 765, 300, 1, 4, P.woodLight);
    rect(ctx, 770, 300, 1, 4, P.woodSide);
    line(ctx, 767, 304, 774, 323, P.woodTop, 2);
    polygon(ctx, [[770, 321], [778, 318], [780, 328], [777, 333], [773, 331]], P.ironDark);
    polygon(ctx, [[771, 322], [777, 320], [778, 327], [776, 331], [774, 329]], P.iron);
    line(ctx, 772, 323, 776, 321, P.ironLight);
    // Rake with individually separated teeth, a fitted collar and restrained metal gleam.
    line(ctx, 784, 304, 782, 328, P.woodLight, 2);
    rect(ctx, 783, 303, 2, 4, P.ironDark);
    rect(ctx, 778, 301, 14, 2, P.iron);
    for (let x = 778; x <= 790; x += 3)
        rect(ctx, x, 297, 1, 5, P.ironLight);
    rect(ctx, 780, 328, 4, 2, P.woodDark);
    // Watering can on the rack's foot; bent spout and hollow handle are explicit pixels.
    rect(ctx, 755, 324, 9, 9, P.ironDark);
    rect(ctx, 756, 325, 7, 6, P.iron);
    rect(ctx, 757, 323, 5, 2, P.ironLight);
    line(ctx, 762, 326, 768, 322, P.iron, 2);
    rect(ctx, 768, 320, 3, 3, P.ironLight);
    line(ctx, 754, 325, 752, 326, P.ironLight);
    line(ctx, 752, 326, 752, 329, P.ironLight);
    line(ctx, 752, 329, 755, 330, P.ironLight);
}
type Furniture = typeof YARD_FURNITURE[number];
const parts = {
    woodpile: { origin: [210,482], paint: woodpile },
    "west-planter": { origin: [368,340], paint: (c:Ctx) => planter(c,348,327,37,true) },
    "tool-rack": { origin: [772,334], paint: toolRack },
    "east-planter": { origin: [813,334], paint: (c:Ctx) => planter(c,797,321,28) },
} as const;

export function drawYardFurniture(ctx: Ctx, p: Furniture): void {
    const { origin, paint } = parts[p.kind];
    cachedSprite(`yard-furniture:${p.kind}`, 96, 56, 1, c => {
        c.translate(48 - origin[0], 44 - origin[1]);
        paint(c);
    }, { x: .5, y: 44 / 56 }).draw(ctx, { x: p.x, y: p.y });
}
