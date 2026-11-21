import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";
/** Small street lantern, built from half-unit sections of metal and glazing. */
export function lanternModel(variant: number): PixelStackModel {
    const v = Math.abs(variant) % 3;
    const metal = [
        ["#303c4e", "#536171", "#819096"],
        ["#403b4c", "#6b5c68", "#9b8287"],
        ["#2e454b", "#4d6b6b", "#80948a"],
    ][v]!;
    return { id: `scene:lantern:framed:${v}`, width: 36, depth: 28, count: 34, paint(c: Ctx, z: number) {
            const r = (x: number, y: number, w: number, d: number, color: string) => {
                c.fillStyle = color;
                c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
            };
            const bevel = (rx: number, ry: number, color: string) => {
                r(-rx + .5, -ry, rx * 2 - 1, ry * 2, color);
                r(-rx, -ry + .5, rx * 2, ry * 2 - 1, color);
            };
            // Octagonal stepped foot: a broad bevel, short socket, then slim post.
            if (z < 3) {
                const rx = z < 1 ? 4.5 : z < 2 ? 4 : 3, ry = z < 1 ? 3.5 : z < 2 ? 3 : 2.5;
                bevel(rx, ry, z < 1 ? metal[0] : metal[1]);
                r(-rx + .5, ry - .5, rx - 1, .5, z < 1 ? metal[1] : metal[2]);
                if (z >= 2)
                    r(-2, -2, 4, 4, metal[0]);
            }
            if (z >= 3 && z < 16.5) {
                r(-1.5, -1.5, 3, 3, metal[1]);
                r(-1.5, -1.5, 1, 3, metal[0]);
                r(.5, -1.5, .5, 3, metal[2]);
                if (z < 4.5 || z >= 13.5 && z < 14.5) {
                    bevel(2, 2, metal[0]);
                    r(-1.5, 1.5, 3, .5, "#a58b65");
                }
                if (z >= 15.5) {
                    bevel(2.5, 2, metal[1]);
                    r(-2, 1.5, 4, .5, metal[2]);
                }
            }
            // Flared socket joins the post to the lower frame without a floating box.
            if (z >= 16.5 && z < 18) {
                const t = z - 16.5;
                bevel(2.5 + t, 2 + t * .7, metal[0]);
                if (z >= 17.5)
                    r(-3, 2.5, 6, .5, "#ad936b");
            }
            if (z >= 18 && z < 27) {
                const t = (z - 18) / 9, rx = 3.5 + t * 1.5, ry = 3 + t;
                // Different broad glass faces: amber on the side, pale honey at front.
                // These colors cover the exposed section contour instead of hidden
                // inset highlights, and there is no glow outside the physical glazing.
                bevel(rx, ry, "#d9a553");
                r(-rx, -ry + .5, 1.25, ry * 2 - 1, "#b57940");
                r(-rx + .5, ry - .5, rx * 2 - 1, .5, "#f0c977");
                if (z >= 20 && z < 25.5)
                    r(-rx + 1, ry - .5, .5, .5, "#ffe2a0");
                if (z < 19 || z >= 26) {
                    bevel(rx + .5, ry + .5, metal[0]);
                    r(-rx, ry, rx * 2, .5, z < 19 ? metal[1] : "#a99068");
                }
                else {
                    for (const side of [-1, 1]) {
                        r(side < 0 ? -rx : rx - .75, -ry, .75, ry * 2, metal[0]);
                        r(side < 0 ? -rx + .25 : rx - .5, ry - .5, .5, .5, metal[2]);
                    }
                    // Fine front muntin and short transverse rail divide real panes.
                    r(-.25, ry - .5, .5, .5, "#806c51");
                    if (z >= 22.5 && z < 23)
                        r(-rx + .5, ry - .5, rx * 2 - 1, .5, "#987d53");
                }
            }
            // Hipped metal hood has an overhanging folded eave and four broad faces.
            if (z >= 27 && z < 32) {
                const rx = z < 28 ? 7.5 : 7 - (z - 28) * 1.5, ry = z < 28 ? 6 : 5.5 - (z - 28) * 1.2;
                // Broad planes extend to their actual outer contour. An inset band
                // here would expose a different-colored rim on every lifted slice.
                r(-rx, -ry, rx, ry * 2, metal[0]);
                r(0, -ry, rx, ry * 2, metal[2]);
                // Front edge of the eave is one deliberate thick folded strip.
                if (z < 28) {
                    r(-rx + .5, ry - .5, rx * 2 - 1, .5, z < 27.5 ? metal[0] : metal[1]);
                }
                // The meeting edge is already defined by the two solid metal planes;
                // no per-section outline or stripe is added along either roof slope.
            }
            if (z >= 32) {
                bevel(z < 32.5 ? 1.5 : .75, z < 32.5 ? 1.25 : .75, z < 32.5 ? metal[0] : "#b59b6d");
            }
        } };
}
