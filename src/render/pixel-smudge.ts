/** Native ink-filled scrap enemy. The enclosing enemy sprite owns its cache. */
import { rect, line, polygon, type Ctx } from './pixel-art.js';

const PALETTES = [
    {
        edge: '#302b39', card: '#b8a68d', cardLight: '#dfccb0', cardShade: '#887465',
        ink: '#49364f', inkLight: '#77566f', inkShade: '#302835',
        eye: '#e6bd7c', glint: '#b497ae', pupil: '#241f2b',
    },
    {
        edge: '#3e3c40', card: '#b8ae9b', cardLight: '#d9ceba', cardShade: '#8c8377',
        ink: '#69616c', inkLight: '#91838b', inkShade: '#48444d',
        eye: '#d9c7a0', glint: '#b8acb1', pupil: '#343139',
    },
    {
        edge: '#4c4d49', card: '#c2bdab', cardLight: '#e0dac5', cardShade: '#979587',
        ink: '#82867e', inkLight: '#a5aa9d', inkShade: '#5b625d',
        eye: '#e1dcca', glint: '#c5c9b9', pupil: '#3f4944',
    },
] as const;

/** Local foot (0,0), idle within [-18,-27,19,1], charge reaches x26/top -39.
 * Frame zero still contains the complete attack cue under Reduced Motion. */
export function drawPixelSmudge(ctx: Ctx, frame: number, attack: boolean, wash: number): void {
    const p = PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0]!;
    const step = frame % 2 === 0 ? 0 : 1;
    ctx.save();
    // A rooted asymmetric carrier. Folded corners change pose, not the foot.
    polygon(ctx, [[-18, -16], [-14, -23 - step], [-7, -21], [1, -25], [10, -23],
        [17, -18 + step], [15, -7], [18, -2], [10, 0], [3, -2], [-3, 1], [-12, -1], [-16, -6]], p.edge);
    polygon(ctx, [[-16, -16], [-13, -21 - step], [-6, -19], [1, -23], [10, -21],
        [15, -17], [13, -7], [15, -3], [9, -2], [2, -4], [-4, -1], [-11, -3], [-14, -7]], p.card);
    polygon(ctx, [[-16, -16], [-13, -21 - step], [-6, -19], [-10, -13], [-12, -5], [-14, -7]], p.cardLight);
    polygon(ctx, [[-11, -7], [0, -12], [13, -7], [15, -3], [9, -2], [2, -4], [-4, -1]], p.cardShade);
    line(ctx, -10, -5, -4, -2, p.cardLight);
    line(ctx, 8, -3, 14, -4, p.cardLight);
    // Raised back corner joins the rim, with its shadow directly beneath it.
    polygon(ctx, [[8, -23], [15, -21], [15, -15], [10, -17]], p.cardLight);
    line(ctx, 10, -17, 14, -15, p.cardShade);

    if (attack) {
        // Gathering ink grows from the reservoir through a visible thick neck.
        // This is body art only: projectile launch and warning timing are external.
        // Route around the elite crown's central footprint. The bent neck
        // emerges from the right shoulder and meets the drop's lower point.
        line(ctx, 10, -17, 18, -21, p.inkShade, 4);
        line(ctx, 18, -21, 19, -27, p.inkShade, 4);
        line(ctx, 11, -17, 19, -21, p.inkLight, 2);
        line(ctx, 19, -21, 20, -27, p.inkLight, 2);
        for (let yy = -39; yy <= -25; yy++) {
            const row = yy + 39;
            const half = row < 8 ? Math.floor(row / 2) : row < 11 ? 5 : 14 - row;
            rect(ctx, 20 - half, yy, half * 2 + 1, 1, p.inkShade);
            if (half > 0) rect(ctx, 20 - half + 1, yy, half * 2 - 1, 1, p.ink);
            if (half >= 3) rect(ctx, 20 - half + 1, yy, 2, 1, p.inkLight);
        }
        rect(ctx, 17, -31, 1, 3, p.glint);
    }

    // Dark pool has a broad upper surface and a shaded front lip.
    polygon(ctx, [[-12, -17], [-8, -22 - step], [-1, -24 - step], [7, -22], [12, -18],
        [13, -12], [9, -7], [2, -5], [-7, -7], [-12, -11]], p.inkShade);
    polygon(ctx, [[-10, -17], [-7, -21 - step], [-1, -22 - step], [7, -20], [10, -17],
        [11, -12], [7, -9], [0, -7], [-7, -9], [-10, -12]], p.ink);
    polygon(ctx, [[-10, -17], [-7, -21 - step], [-1, -22 - step], [4, -21], [3, -19],
        [-5, -18], [-8, -14]], p.inkLight);
    line(ctx, -6, -21 - step, -2, -22 - step, p.glint);

    // Wide-set, differently shaped eyes distinguish the folded lobber from
    // the round chase blob. Attack lowers the brows without moving the feet.
    rect(ctx, -8, -16, 5, 5, p.inkShade);
    rect(ctx, 3, -15, 5, 5, p.inkShade);
    rect(ctx, -7, -15, 3, attack ? 2 : 3, p.eye);
    rect(ctx, 4, -14, 3, attack ? 2 : 3, p.eye);
    rect(ctx, -5 + step, -14, 1, 2, p.pupil);
    rect(ctx, 5 + step, -13, 1, 2, p.pupil);
    if (attack) {
        line(ctx, -8, -17, -3, -15, p.edge);
        line(ctx, 3, -14, 8, -16, p.edge);
    }
    rect(ctx, -2, -10, 4, 1, p.inkShade);
    rect(ctx, -1, -9, 2, 1, p.inkShade);
    // A small adhered ink tongue rests against the front fold, never floating.
    rect(ctx, 1 + step, -6, 3, 3, p.inkShade);
    rect(ctx, 2 + step, -5, 1, 1, p.inkLight);
    ctx.restore();
}
