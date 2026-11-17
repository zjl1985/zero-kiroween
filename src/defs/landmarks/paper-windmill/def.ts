import { WINDMILL_ACTIVITY } from "../../landmark-activities.js";
import type { LandmarkDef } from "../../types.js";

/** A paper windmill on a mound over the farmland, two lightable pumpkins at its door. */
export const PAPER_WINDMILL: LandmarkDef = {
  id: "paper-windmill",
  radius: 180,
    activity: WINDMILL_ACTIVITY,
  layout(_l, b) {
    b.add("windmill", 0, -10, 1);
    b.wall(-30, -16, 30, -16, 18);
    for (const [dx, dy, s] of [
      [-88, 52, 1],
      [92, 40, 1.05],
    ] as const) {
      b.add("pumpkin", dx, dy, s, 1);
      b.spot("pumpkin", dx, dy, s);
    }
    for (let i = 0; i < 5; i++) b.add("pumpkin", -60 + i * 30, 104 + (i % 2) * 10, 0.45 + (i % 3) * 0.08, 20 + i * 3);
    b.add("fence", -128, -40, 1, 2);
    b.wall(-167, -43, -88, -46, 3);
    b.add("fence", 132, -36, 0.95, 3);
    b.wall(94, -39, 170, -42, 3);
    b.add("bush", -150, 40, 0.85, 4);
    b.add("lamp", 40, 70, 0.9, 5);
    b.add("tuft", -30, 80, 1, 6);
    b.add("leaves", 70, -60, 1, 7);
    b.add("tuft", 130, 90, 1, 8);
  },
};
