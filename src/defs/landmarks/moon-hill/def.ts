import type { LandmarkDef } from "../../types.js";

/** A terraced paper hill with a moon-lantern on top. */
export const MOON_HILL: LandmarkDef = {
  id: "moon-hill",
  radius: 190,
  layout(_l, b) {
    b.add("lamp", 0, -8, 1.05, 1);
    b.spot("lantern", 0, -8, 1.05);
    for (const [dx, dy, s] of [
      [-110, 40, 1.1],
      [96, -46, 0.9],
      [130, 58, 0.75],
      [-70, -70, 0.6],
    ] as const) {
      b.add("stone", dx, dy, s, dx);
      if (s > 0.8) b.wall(dx - 8 * s, dy - 3, dx + 8 * s, dy - 3, 9 * s);
    }
    b.add("bush", -150, -20, 1, 2);
    b.add("bush", 160, 20, 0.9, 3);
    b.add("flowers", 30, 60, 1, 4);
    b.add("tuft", -40, 50, 1, 5);
  },
};
