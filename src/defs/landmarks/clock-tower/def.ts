import type { LandmarkDef } from "../../types.js";

/** The town clock tower on a cobbled plaza, lamps on both sides. */
export const CLOCK_TOWER: LandmarkDef = {
  id: "clock-tower",
  radius: 150,
  layout(_l, b) {
    b.add("clock-tower", 0, 0, 1);
    b.wall(-34, -8, 34, -8, 18);
    b.add("lamp", -96, 44, 0.95, 1);
    b.add("lamp", 96, 44, 0.95, 2);
    b.add("bush", -62, 10, 0.9, 3);
    b.add("bush", 64, 12, 0.85, 4);
    b.add("flowers", -40, 70, 1, 5);
    b.add("flowers", 48, 76, 1, 6);
  },
};
