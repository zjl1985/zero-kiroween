/** A graphite underdrawing that runs on the washed page. No cached state. */
import { rect, line, polygon, type Ctx } from './pixel-art.js';

const PALETTES = [
    { ink: '#45404c', pencil: '#827985', fibre: '#dfd3b9', light: '#f0e6d0', shade: '#b9b2a5' },
    { ink: '#494650', pencil: '#85818a', fibre: '#dcd5c1', light: '#eee8d5', shade: '#b7b6aa' },
    { ink: '#454b49', pencil: '#7e8880', fibre: '#d9d8c5', light: '#eeecd9', shade: '#b2baab' },
] as const;

/** Both run poses remain within [-20,-32,21,1], attached to ground-level feet.
 * Attack is intentionally unused: Sketch has chase only, no windup or elite. */
export function drawPixelSketchEnemy(ctx: Ctx, frame: number, _attack: boolean, wash: number): void {
    const p = PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0]!;
    const stride = frame % 2 !== 0;
    const lean = stride ? 2 : 0;
    ctx.save();
    // Complete articulated legs: alternating long stride / tucked knee, with
    // both soles staying at y0 instead of bobbing an unchanged body sprite.
    if (stride) {
        polygon(ctx, [[-7, -11], [-2, -9], [-8, -4], [-12, -1], [-11, 1], [-19, 1], [-19, -2], [-13, -4]], p.ink);
        line(ctx, -6, -9, -12, -3, p.fibre, 2);
        line(ctx, -12, -3, -16, -1, p.fibre);
        polygon(ctx, [[3, -10], [8, -10], [13, -6], [10, -3], [17, -2], [18, 1], [8, 1], [6, -3], [8, -6]], p.ink);
        line(ctx, 6, -9, 11, -6, p.light, 2);
        line(ctx, 10, -6, 8, -3, p.fibre);
        line(ctx, 9, -1, 15, -1, p.fibre);
    } else {
        polygon(ctx, [[-7, -11], [-2, -10], [-5, -5], [-3, -2], [-7, 1], [-15, 1], [-16, -2], [-9, -3], [-10, -6]], p.ink);
        line(ctx, -6, -9, -8, -5, p.fibre, 2);
        line(ctx, -8, -5, -6, -2, p.fibre);
        line(ctx, -7, -1, -13, -1, p.fibre);
        polygon(ctx, [[3, -11], [8, -10], [11, -5], [17, -2], [20, -2], [20, 1], [12, 1], [6, -4]], p.ink);
        line(ctx, 6, -9, 9, -4, p.light, 2);
        line(ctx, 9, -4, 15, -1, p.fibre);
    }
    // Arms join the shoulder contour and switch their forward reach.
    line(ctx, -8 + lean, -18, stride ? -14 : -17, stride ? -12 : -16, p.ink, 3);
    line(ctx, stride ? -14 : -17, stride ? -12 : -16, stride ? -11 : -16, -9, p.ink, 2);
    line(ctx, 8 + lean, -19, stride ? 18 : 15, stride ? -17 : -12, p.ink, 3);
    line(ctx, stride ? 18 : 15, stride ? -17 : -12, stride ? 18 : 12, stride ? -22 : -8, p.ink, 2);

    ctx.translate(lean, 0);
    polygon(ctx, [[-11, -11], [-12, -18], [-10, -24], [-5, -27], [-4, -31],
        [0, -27], [4, -29], [6, -29], [6, -26], [10, -23], [11, -17], [8, -10], [1, -7], [-6, -8]], p.ink);
    polygon(ctx, [[-9, -12], [-10, -18], [-8, -23], [-4, -25], [-3, -28],
        [0, -25], [4, -27], [5, -24], [8, -22], [9, -17], [6, -11], [1, -9], [-5, -10]], p.fibre);
    polygon(ctx, [[-9, -17], [-6, -13], [0, -12], [7, -16], [6, -11], [1, -9], [-5, -10], [-9, -12]], p.shade);
    line(ctx, -8, -22, -4, -24, p.light);
    line(ctx, 1, -25, 4, -25, p.light);
    // Offset pencil construction strokes stay attached to the pale body;
    // intentional gaps distinguish them from a second solid cartoon outline.
    line(ctx, -10, -20, -9, -23, p.pencil);
    line(ctx, 8, -21, 9, -17, p.pencil);
    line(ctx, -6, -18, 6, -19, p.pencil);
    line(ctx, 0, -23, 1, -21, p.pencil);
    // Two compact hollow graphite eyes, with asymmetric pressed pupils.
    rect(ctx, -7, -21, 5, 5, p.ink);
    rect(ctx, -6, -20, 3, 3, p.light);
    rect(ctx, -4, -19, 1, 2, p.ink);
    rect(ctx, 2, -21, 5, 5, p.ink);
    rect(ctx, 3, -20, 3, 3, p.light);
    rect(ctx, 4, -19, 1, 2, p.ink);
    line(ctx, -2, -14, 2, -14, p.ink);
    // Small deliberate hatch groups follow the underside, not a noise fill.
    line(ctx, -8, -14, -6, -11, p.pencil);
    line(ctx, -5, -14, -3, -10, p.pencil);
    line(ctx, -2, -13, 0, -10, p.pencil);
    line(ctx, 6, -24, 7, -22, p.pencil);
    rect(ctx, -3, -23, 2, 1, p.light);
    ctx.restore();
}
