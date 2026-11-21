/** Native bat with two complete shoulder-hinged wing poses. */
import { rect, line, polygon, type Ctx, type Point } from './pixel-art.js';

const PALETTES = [
    { edge: '#292735', dark: '#41364e', mid: '#6d557c', light: '#9c80a2',
        spar: '#bda2b6', ear: '#b78b99', eye: '#e4c480', tooth: '#e7dac0' },
    { edge: '#37373e', dark: '#514b58', mid: '#7c7280', light: '#a89ba5',
        spar: '#c0b3b9', ear: '#b39ba0', eye: '#d7c9a8', tooth: '#ded7c5' },
    { edge: '#444b48', dark: '#626b63', mid: '#889085', light: '#adb5a5',
        spar: '#cbd0bb', ear: '#b1b4a3', eye: '#dfddc7', tooth: '#e6e0cc' },
] as const;

// Right wing definitions. Their innermost shared root is always (4,-21).
const SPREAD: readonly Point[] = [[4, -23], [11, -27], [26, -29], [23, -23],
    [26, -18], [20, -20], [18, -14], [13, -18], [9, -12], [7, -18], [4, -17]];
const RAISED: readonly Point[] = [[4, -23], [10, -28], [18, -37], [23, -35],
    [21, -28], [25, -25], [19, -24], [20, -18], [13, -21], [9, -15], [4, -17]];
const SPREAD_UPPER: readonly Point[] = [[5, -22], [12, -26], [24, -28], [18, -22]];
const SPREAD_MID: readonly Point[] = [[5, -21], [18, -22], [24, -19], [19, -21], [17, -16]];
const SPREAD_LOWER: readonly Point[] = [[5, -20], [17, -16], [13, -19], [9, -14], [7, -19]];
const RAISED_UPPER: readonly Point[] = [[5, -22], [11, -28], [18, -35], [21, -34], [18, -27]];
const RAISED_MID: readonly Point[] = [[5, -21], [18, -27], [23, -25], [18, -25], [18, -20]];
const RAISED_LOWER: readonly Point[] = [[5, -20], [18, -20], [13, -22], [9, -17], [7, -19]];

/** Foot-space origin is below this flying sprite. No independent attack pose:
 * this enemy's actual chase/swoop path remains entirely simulation-owned. */
export function drawPixelPaperBat(ctx: Ctx, frame: number, _attack: boolean, wash: number): void {
    const p = PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0]!;
    const raised = frame % 2 !== 0;
    ctx.save();
    for (let side = -1; side <= 1; side += 2) {
        ctx.save(); ctx.scale(side, 1);
        polygon(ctx, raised ? RAISED : SPREAD, p.edge);
        // Light stays on the same world-facing side instead of mirroring.
        polygon(ctx, raised ? RAISED_UPPER : SPREAD_UPPER, side > 0 ? p.light : p.mid);
        polygon(ctx, raised ? RAISED_MID : SPREAD_MID, side > 0 ? p.mid : p.dark);
        polygon(ctx, raised ? RAISED_LOWER : SPREAD_LOWER, side > 0 ? p.dark : p.mid);
        if (raised) {
            line(ctx, 4, -22, 11, -28, p.spar);
            line(ctx, 11, -28, 18, -36, side > 0 ? p.spar : p.light);
            line(ctx, 5, -21, 20, -27, p.dark);
            line(ctx, 5, -20, 18, -19, p.edge);
            line(ctx, 5, -19, 9, -16, p.light);
        } else {
            line(ctx, 4, -22, 12, -26, p.spar);
            line(ctx, 12, -26, 25, -28, side > 0 ? p.spar : p.light);
            line(ctx, 5, -21, 24, -19, p.dark);
            line(ctx, 5, -20, 17, -15, p.edge);
            line(ctx, 5, -19, 9, -13, p.light);
        }
        // Shoulder cuff joins the complete wing to the body in both poses.
        rect(ctx, 3, -23, 3, 7, p.dark);
        rect(ctx, 4, -22, 2, 2, p.light);
        ctx.restore();
    }
    // Central ear tips stop below the elite crown corridor. No central wing
    // or face detail is placed in x±7 above y-28.
    polygon(ctx, [[-5, -26], [-4, -28], [-1, -25], [1, -25], [4, -28], [5, -26],
        [6, -20], [5, -13], [2, -10], [0, -9], [-3, -11], [-5, -14], [-6, -20]], p.edge);
    polygon(ctx, [[-4, -24], [-1, -23], [0, -24], [3, -24], [4, -20], [4, -14],
        [0, -11], [-3, -14], [-4, -19]], p.dark);
    polygon(ctx, [[0, -24], [3, -24], [4, -20], [4, -14], [0, -11]], p.mid);
    rect(ctx, -4, -26, 1, 3, p.ear);
    rect(ctx, 3, -26, 1, 3, p.ear);
    // Small horizontal eyes remain clear beneath elite crown and wing spars.
    rect(ctx, -4, -21, 3, 3, p.eye);
    rect(ctx, 2, -21, 3, 3, p.eye);
    rect(ctx, -2, -20, 1, 2, p.edge);
    rect(ctx, 2, -20, 1, 2, p.edge);
    rect(ctx, -4, -21, 1, 1, p.tooth);
    rect(ctx, 4, -21, 1, 1, p.tooth);
    line(ctx, -2, -16, 2, -16, p.edge);
    rect(ctx, -2, -16, 1, 2, p.tooth);
    rect(ctx, 2, -16, 1, 2, p.tooth);
    line(ctx, 0, -14, 0, -12, p.light);
    ctx.restore();
}
