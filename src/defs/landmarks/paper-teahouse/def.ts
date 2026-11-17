import { TEAHOUSE_ACTIVITY } from "../../landmark-activities.js";
import type { LandmarkDef } from "../../types.js";

/** Timber tea shop, with a clear central approach between the planter and tea table. */
export const PAPER_TEAHOUSE: LandmarkDef = {
  id: "paper-teahouse",
  radius: 200,
    activity: TEAHOUSE_ACTIVITY,
  layout(_l, b) {
    b.add("paper-teahouse-planter", -135, -58, 0.9, 1);
    b.add("paper-teahouse-building", 0, -38, 1);
    // Only the ground footprint is solid; the roof and awning overhang it.
    b.wall(-66, -42, 63, -42, 20);
    b.wall(65, -48, 89, -64, 14);
    b.add("paper-teahouse-planter", -126, 78, 1, 2);
    b.add("paper-teahouse-table", 102, 78, 1, 3);
    b.wall(86, 78, 118, 78, 10);
    b.add("lamp", -68, 64, 0.95, 4);
    b.spot("lantern", -68, 64, 0.95);
    b.add("leaves", -146, 30, 0.8, 5);
    b.add("flowers", 142, -16, 0.8, 6);
  },
};
