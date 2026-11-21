import type { PixelStackModel } from "./pixel-stack.js";
import type { Ctx } from "./paper-material.js";
/** Cottage sections are authored at half-unit precision, consumed by the
 * scene's two-times native model adapter. No screen-facing facade overlays. */
export function cottageModel(variant: number): PixelStackModel {
    const v = ((variant % 3) + 3) % 3;
    const roof = [
        { lit: "#647d9d", mid: "#5b7191", dark: "#394a68", joint: "#4c607f", edge: "#7f93ab" },
        { lit: "#957486", mid: "#866579", dark: "#523f5a", joint: "#74576b", edge: "#af9098" },
        { lit: "#648e8f", mid: "#587f83", dark: "#365863", joint: "#486c76", edge: "#87a6a1" },
    ][v]!;
    const timber = "#68504b", beamLight = "#92755b", plaster = "#d9c8aa", sideWall = "#b7ab9b";
    return { id: `scene:cottage:porch:${v}`, width: 50, depth: 48, count: 53, paint(c: Ctx, z: number) {
            const r = (x: number, y: number, w: number, d: number, color: string) => {
                c.fillStyle = color;
                c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
            };
            // A shallow stone footing contacts the world plane at z=0. No
            // raised turf slab: the surrounding grass is the actual terrain.
            if (z < 3) {
                r(-16.5, -18.5, 33, 37, z < .5 ? "#293e38" : z < 1.5 ? "#626d68" : "#898e7f");
                r(-16.5, -18.5, 1, 37, "#566360");
                if (z >= 2) r(-15.5, 17.5, 31, 1, "#a4a795");
                // Steps descend from the door to the same ground plane.
                // A shallow front veranda shares the footing, instead of hovering
                // above a separate platform. The central step meets the lawn.
                r(-15, 17, 30, 5, z < 1 ? "#4b5c50" : "#989d85");
                if (z >= 2) {
                    r(-15, 21, 30, 1, "#c1b89a");
                    for (let x = -12; x < 15; x += 4) r(x, 17, .5, 4, "#777f6c");
                }
                if (z < 2) r(-5, 21, 10, z < 1 ? 3 : 1, z < 1 ? "#767e70" : "#a4aa94");
                if (z < .5) r(-5, 23, 10, 1, "#394d40");
                return;
            }
            if (z < 28) {
                // Stone footing and broad wall planes, with the shadow under the eaves.
                r(-15, -17, 30, 34, z < 6 ? "#7c807c" : sideWall);
                r(-13.5, -16, 27, 33, z < 6 ? "#a3a393" : plaster);
                r(-15, -17, 1.5, 34, z < 6 ? "#697778" : sideWall);
                if (z < 6) {
                    if (z >= 4 && z < 4.5)
                        r(-15, 16, 30, .5, "#858a82");
                    for (let x = -13; x < 15; x += 7)
                        r(x + (z < 4 ? 2 : 0), 16, .5, 1, "#81867f");
                }
                else {
                    for (const x of [-15, 13.5]) {
                        r(x, -17, 1.5, 34, timber);
                        r(x + .5, 16, .5, 1, beamLight);
                    }
                    for (const yy of [-17, -1, 15.5])
                        r(-15, yy, 1.5, 1.5, timber);
                    // Girt and small diagonal corner braces are real volumes in the wall.
                    if (z >= 24)
                        r(-15, 15.5, 30, 1.5, timber);
                    if (z >= 21 && z < 24)
                        for (const side of [-1, 1])
                            r(side * (10 + (z - 21)) - 0.5, 16, 1, 1, timber);
                }
                // Door recess cuts back into the plaster plane; jambs remain in front.
                if (z < 22) {
                    r(-4.5, 14.5, 9, 2.5, timber);
                    r(-3, 15, 6, 1.5, "#36545a");
                    if (z >= 6 && z < 20) {
                        for (const xx of [-2.5, .5])
                            r(xx, 16.5, 2, .5, z < 12 ? "#54716c" : "#638680");
                        if (z >= 12 && z < 12.5)
                            r(-3, 16.5, 6, .5, "#304b51");
                        if (z >= 11 && z < 12)
                            r(2, 16.5, .5, .5, "#e5bf6e");
                    }
                    if (z >= 20)
                        r(-4.5, 15, 9, 2, "#9b8064");
                }
                // Window geometry is inset glazing bounded by a projecting frame.
                const window = (x: number, y: number, side = false) => {
                    const f = (u: number, dep: number, w: number, d: number, col: string) => side ? r(-15 - dep, y + u, d, w, col) : r(x + u, 15 + dep, w, d, col);
                    if (z < 10 || z >= 23)
                        return;
                    f(-3.5, 0, 7, 2, timber);
                    if (z >= 11 && z < 22) {
                        f(-2.5, 1.5, 5, .5, z >= 19 ? "#ac996d" : "#dfc58c");
                        f(-.25, 1.5, .5, .5, "#846d5a");
                        if (z >= 16 && z < 16.5)
                            f(-2.5, 1.5, 5, .5, "#846d5a");
                        if (z >= 18 && z < 21)
                            f(-2, 1.5, .5, .5, "#f0dbaa");
                    }
                    if (z < 11 || z >= 22)
                        f(-4, 0, 8, 2, "#ddc9a8");
                    for (const sign of [-1, 1]) {
                        f(sign * 4 - .5, .25, 1.5, 1, "#537873");
                        if (z >= 13 && z < 13.5 || z >= 20 && z < 20.5)
                            f(sign * 4 - .5, 1, 1.5, .5, "#385a5d");
                    }
                };
                window(-9.5, 0);
                window(9.5, 0);
                window(0, -8, true);
                window(0, 7, true);
                // Shallow planted sills stay subordinate to the window structure.
                if (z >= 8.5 && z < 10) {
                    for (const x of [-13, 6]) {
                        r(x, 16, 7, 2, z < 9 ? "#725247" : "#a67b59");
                        r(x + .5, 17.5, 6, .5, "#c29b70");
                    }
                }
                if (z >= 10 && z < 11.5)
                    for (const [x, col] of [[-12, "#8c9b60"], [-9, "#b88483"], [7, "#78926a"], [10, "#929f66"]] as const)
                        r(x, 17, 2, 1, col);
                if (z >= 26) {
                    r(-16, -18, 32, 36, z < 27 ? "#57494b" : "#9b8266");
                }
            }
            // Front porch: slim posts, open railing, and a small lean-to roof.
            // Every part occupies a real slice, so it occludes consistently
            // with the house rather than becoming a screen-facing sticker.
            if (z >= 3 && z < 20) {
                for (const x of [-14, 13]) {
                    r(x, 20, 1, 1.5, timber);
                    r(x + .5, 21, .5, .5, "#cbb797");
                }
                if (z < 9) {
                    for (const x of [-12, -9, 8, 11]) r(x, 21, .5, .5, "#b7a98e");
                    if (z >= 8) {
                        r(-14, 21, 9, 1, "#d0bfa0");
                        r(6, 21, 8, 1, "#d0bfa0");
                    }
                }
            }
            if (z >= 19 && z < 22) {
                const edge = 24 - (z - 19) * 2;
                r(-16, edge - 2.5, 32, 3, z < 19.5 ? roof.dark : roof.mid);
                r(-16, edge, 32, .5, z < 19.5 ? "#c3ad8a" : roof.edge);
                for (let x = -13; x < 16; x += 5) r(x, edge - 2, .5, 2, roof.joint);
            }
            // Pitched roof: solid shaded slopes, shallow individual shingle ends,
            // a structural fascia, and a continuous rounded ridge cap.
            if (z >= 28 && z <= 45) {
                const rise = z - 28, half = Math.max(.75, 18 - rise);
                // The roof is a shell, not a filled triangular prism: the gable
                // remains exposed below the sloping fascia rather than behind a comb
                // of overlapping full-width roof slices.
                if (half > 3)
                    r(-half + 2, -17, half * 2 - 3, 34, plaster);
                r(-half, -20, 2, 40, roof.mid);
                r(half - 1, -20, 2, 40, roof.dark);
                const course = Math.floor(rise / 3), local = rise % 3;
                for (let yy = -20; yy < 20; yy += 5) {
                    const start = yy + (course % 2 ? 2.5 : 0), end = Math.min(20, start + 5);
                    if (start >= 20)
                        continue;
                    r(-half, start, .75, end - start, ((Math.floor((yy + 20) / 5) + course) % 3 === 0) ? roof.lit : roof.mid);
                    if (local < .5)
                        r(-half, start + .5, .5, Math.max(.5, end - start - 1), roof.joint);
                    r(-half, start, .5, .5, roof.joint);
                }
                // Fascia boards follow the gable slope at the front and back.
                r(-half, 19, 2, 1, roof.dark);
                r(half - 1, 19, 2, 1, roof.dark);
                r(-half, -20, 2, .5, roof.edge);
                r(half - 1, -20, 2, .5, roof.edge);
                if (half > 3) {
                    r(-half + 2, 16, half * 2 - 3, 1, plaster);
                    r(-half + 2, -17, half * 2 - 3, 1, sideWall);
                    r(-half + 2, 16.5, 1, .5, timber);
                    r(half - 2, 16.5, 1, .5, timber);
                    r(-.5, 16, 1, 1, timber);
                    if (z >= 31 && z < 38) {
                        r(-3, 16, 6, 1, timber);
                        if (z >= 32 && z < 37) {
                            r(-2, 16.5, 4, .5, "#89b2b5");
                            r(-.25, 16.5, .5, .5, timber);
                        }
                        if (z >= 34 && z < 34.5)
                            r(-2, 16.5, 4, .5, timber);
                    }
                }
                if (z >= 43) {
                    r(-1, -20, 3, 40, z >= 44 ? roof.edge : roof.mid);
                }
            }
            // Brick chimney: restrained staggered mortar on the exposed faces, cap
            // projects on all sides and the flue is left visibly dark on its top.
            if (z >= 35) {
                const cap = z >= 50.5;
                r(cap ? 6.5 : 7, cap ? -9.5 : -9, cap ? 7 : 5, cap ? 7 : 6, cap ? "#66616a" : "#945f54");
                r(7, -9, 1, 6, cap ? "#777079" : "#b08065");
                if (!cap) {
                    const course = Math.floor((z - 35) / 3);
                    if ((z - 35) % 3 < .5) {
                        r(7, -3.5, 5, .5, "#b39277");
                        r(7, -9, .5, 6, "#b39277");
                    }
                    r(8.5 + (course % 2) * 1.5, -3.5, .5, .5, "#b39277");
                }
                if (z >= 51.5) {
                    r(8, -8, 4, 4, "#323643");
                    r(8, -8, 4, .5, "#222a38");
                }
            }
        } };
}
