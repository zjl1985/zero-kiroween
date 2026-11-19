import type { TownsfolkArt } from "../../../render/art-registry.js";
import { paperEmblem } from "../../../render/paper-kit.js";
import { figure, inkDot, inkLine, stepFeet } from "../../../render/townsfolk-kit.js";

const SKIN = "#6f8d5e",
  BELLY = "#dcd5a8",
  STRAW = "#d2ad69",
  POLE = "#7a5a3c",
  BAND = "#4e6a7c";

/** A sage-green frog in a straw hat, leaning on a ferry pole. */
export const FERRY_FROG_ART: TownsfolkArt = {
  id: "ferry-frog",
  bounds: { l: -20, r: 22, t: -54, b: 4 },
  foot: 12,
  paint(ctx, f, frame) {
    const [bx, by, fx, fy] = stepFeet(frame);
    // The pole stands behind the frog's front hand.
    paperEmblem(ctx, [
      { color: POLE, lift: 0.8, shape: figure(f, (b) => {
        b.poly([[12, 1], [14, 1], [15.5, -50], [13.5, -50]]);
        b.oval(14.5, -50, 2.4, 3.4);
      }) },
    ]);
    paperEmblem(ctx, [
      { color: SKIN, shape: figure(f, (b) => {
        b.oval(-5 + bx, -2 + by, 5.5, 2.4);
        b.oval(5 + fx, -2 + fy, 5.5, 2.4);
        b.oval(0, -12, 11.5, 10);
        b.oval(2, -22, 11, 7.5);
        b.oval(-3, -28, 4.2, 4);
        b.oval(7, -28, 4.2, 4);
        b.oval(11, -15, 3, 3.6);
      }) },
      { color: BELLY, shape: figure(f, (b) => {
        b.oval(3, -10, 7, 7);
        b.oval(-3, -28, 2.4, 2.4);
        b.oval(7, -28, 2.4, 2.4);
      }) },
      { color: STRAW, lift: 0.7, shape: figure(f, (b) => {
        b.oval(2, -32.5, 13, 3);
        b.poly([[-4, -33], [-3, -40], [7, -40], [8, -33]]);
      }) },
    ]);
    inkLine(ctx, f, -3.5, -36, 7.5, -36, BAND, 1.6, 0.85);
    inkDot(ctx, f, -3, -28, 1.4);
    inkDot(ctx, f, 7, -28, 1.4);
    inkLine(ctx, f, -1, -19.5, 9, -19.5, "#2e3a28", 0.7, 0.75);
  },
};
