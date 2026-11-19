import type { TownsfolkArt } from "../../../render/art-registry.js";
import { paperEmblem } from "../../../render/paper-kit.js";
import { figure, inkDot, stepFeet } from "../../../render/townsfolk-kit.js";

const FEATHER = "#86684c",
  DISC = "#e4d3ae",
  BRASS = "#c9a35a",
  TUBE = "#5a6e84";

/** A round brown owl with a cream face disc, holding a little brass-ringed telescope. */
export const STARGAZER_OWL_ART: TownsfolkArt = {
  id: "stargazer-owl",
  bounds: { l: -20, r: 26, t: -44, b: 4 },
  foot: 11,
  paint(ctx, f, frame) {
    const [bx, by, fx, fy] = stepFeet(frame);
    paperEmblem(ctx, [
      { color: FEATHER, fold: { from: [-5 * f, -27], to: [-8 * f, -6], depth: 0.3 }, shape: figure(f, (b) => {
        b.oval(0, -18, 12, 16);
        b.poly([[-10, -28], [-9, -38], [-4, -31]]);
        b.poly([[6, -31], [11, -38], [11, -28]]);
        b.oval(-7, -16, 5.5, 10, 0.2);
      }) },
      { color: DISC, shape: figure(f, (b) => {
        b.oval(-2, -24, 5.6, 5.6);
        b.oval(6, -24, 5.6, 5.6);
        b.oval(3, -11, 6.5, 7.5);
      }) },
      { color: BRASS, lift: 0.6, shape: figure(f, (b) => {
        b.poly([[1.5, -22.5], [4.5, -22.5], [3, -18.5]]);
        b.oval(-4 + bx, -1.4 + by, 3.6, 1.8);
        b.oval(4 + fx, -1.4 + fy, 3.6, 1.8);
      }) },
    ]);
    inkDot(ctx, f, -2, -24, 2.1);
    inkDot(ctx, f, 6, -24, 2.1);
    // A short telescope tucked under the near wing, pointing at the sky.
    paperEmblem(ctx, [
      { color: TUBE, lift: 0.9, shape: figure(f, (b) => {
        b.poly([[7, -12], [21, -27], [24, -24], [10, -9]]);
      }) },
      { color: BRASS, lift: 0.4, shape: figure(f, (b) => {
        b.poly([[19.5, -28.5], [22, -31], [26, -27], [23.5, -24.5]]);
        b.poly([[12.5, -18], [14, -19.5], [17, -16.5], [15.5, -15]]);
      }) },
    ]);
  },
};
