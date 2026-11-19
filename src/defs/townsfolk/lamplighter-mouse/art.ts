import type { TownsfolkArt } from "../../../render/art-registry.js";
import { paperEmblem } from "../../../render/paper-kit.js";
import { figure, inkDot, inkLine, stepFeet } from "../../../render/townsfolk-kit.js";

const FUR = "#9a9189",
  COAT = "#4f6a78",
  CREAM = "#e2c99c",
  POLE = "#6b4d34",
  LAMP = "#efc16a",
  CAP = "#4b3b30";

/** A grey mouse in a blue-grey coat and cream scarf, carrying a lantern pole. */
export const LAMPLIGHTER_MOUSE_ART: TownsfolkArt = {
  id: "lamplighter-mouse",
  bounds: { l: -24, r: 26, t: -54, b: 4 },
  foot: 11,
  paint(ctx, f, frame) {
    const [bx, by, fx, fy] = stepFeet(frame);
    paperEmblem(ctx, [
      { color: FUR, shape: figure(f, (b) => {
        // Tail behind, curling up.
        b.poly([[-7, -7], [-15, -5], [-20, -11], [-19, -17], [-17, -12], [-13, -9], [-7, -10]]);
        b.oval(-4 + bx, -1.6 + by, 4, 2.2);
        b.oval(4 + fx, -1.6 + fy, 4, 2.2);
        b.oval(1, -30, 8.5, 7.8);
        b.poly([[6, -34], [16, -29.5], [7, -25]]);
        b.oval(-5, -39, 5.4, 5.6, -0.25);
        b.oval(5, -40, 5, 5.4, 0.2);
        b.oval(9, -16, 2.6, 4.2, 0.3);
      }) },
      { color: COAT, fold: { from: [0, -21], to: [-2 * f, -4] }, shape: figure(f, (b) => {
        b.poly([[-8, -22], [7, -22], [10, -3.5], [-10, -3.5]]);
        b.poly([[5, -21], [10, -18], [10, -13], [6, -14]]);
      }) },
      { color: CREAM, lift: 0.6, shape: figure(f, (b) => {
        b.oval(-5, -39, 2.8, 3.1, -0.25);
        b.oval(5, -40, 2.6, 3, 0.2);
        b.poly([[-7, -24], [8, -24], [8, -20.5], [-7, -20.5]]);
        b.poly([[-5, -21], [-2, -21], [-4, -12], [-7, -13]]);
      }) },
    ]);
    inkDot(ctx, f, 6, -32, 1.3);
    inkDot(ctx, f, 15.6, -29.6, 1.1, "#3a2a2a");
    inkLine(ctx, f, 13, -28, 19, -26.5);
    inkLine(ctx, f, 13, -29, 19, -30);
    // The lantern pole in the front paw, a small warm paper lantern on its hook.
    paperEmblem(ctx, [
      { color: POLE, lift: 0.8, shape: figure(f, (b) => {
        b.poly([[9, -12], [11, -12], [15, -47], [13, -47]]);
        b.poly([[13, -47.5], [21, -48.5], [21.5, -46.5], [14, -45.5]]);
      }) },
      { color: LAMP, shape: figure(f, (b) => {
        b.poly([[17, -43], [24, -43], [25, -35], [16, -35]]);
      }) },
      { color: CAP, lift: 0.5, shape: figure(f, (b) => {
        b.poly([[16.5, -45], [24.5, -45], [23.5, -42.5], [17.5, -42.5]]);
        b.poly([[16, -35.5], [25, -35.5], [24, -33.5], [17, -33.5]]);
        b.poly([[20, -46.5], [21, -46.5], [21, -44.5], [20, -44.5]]);
      }) },
    ]);
    inkLine(ctx, f, 20.5, -42.5, 20.5, -35.5, CAP, 0.6, 0.6);
  },
};
