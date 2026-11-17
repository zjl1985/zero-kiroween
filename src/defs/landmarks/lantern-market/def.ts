import type { LandmarkDef } from "../../types.js";

/** Three striped stalls under string lights, with a moon-lantern in front. */
export const LANTERN_MARKET: LandmarkDef = {
  id: "lantern-market",
  radius: 210,
  layout(_l, b) {
    for (const [dx, dy] of [
      [-118, -24],
      [0, -56],
      [118, -24],
    ] as const) {
      b.add("stall", dx, dy, 1, dx);
      b.wall(dx - 40, dy - 6, dx + 40, dy - 6, 10);
    }
    b.add("lights", 0, -96, 1, 1);
    b.add("lamp", 0, 62, 0.95, 2);
    b.spot("lantern", 0, 62, 0.95);
    b.add("pumpkin", -70, 70, 0.55, 3);
    b.add("pumpkin", 82, 64, 0.5, 5);
    b.add("candles", -160, 40, 0.7, 4);
    b.add("flowers", 150, 60, 1, 6);
  },
};
