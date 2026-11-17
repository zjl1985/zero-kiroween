import type { LandmarkDef } from "../../types.js";

/** Slit-dome observatory above an open compass court and a separate chart deck. */
export const STAR_OBSERVATORY: LandmarkDef = {
  id: "star-observatory",
  radius: 200,
  layout(_l, b) {
    b.add("star-observatory-armillary", 126, -48, 0.95, 1);
    b.add("star-observatory-building", -12, -30, 1);
    b.wall(-52, -28, 40, -28, 22);
    b.add("star-observatory-chart", -106, 78, 1, 2);
    b.wall(-121, 76, -91, 76, 10);
    b.add("lamp", 88, 86, 1, 3);
    b.spot("lantern", 88, 86, 1);
    b.add("flowers", -143, -30, 0.8, 4);
    b.add("leaves", 139, 31, 0.75, 5);
  },
};
