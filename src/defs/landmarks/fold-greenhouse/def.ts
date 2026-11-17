import type { LandmarkDef } from "../../types.js";

/** Paper-glass growing house; the potting yard stays open down its middle. */
export const FOLD_GREENHOUSE: LandmarkDef = {
  id: "fold-greenhouse",
  radius: 205,
  layout(_l, b) {
    b.add("fold-greenhouse-trellis", -141, -52, 0.9, 1);
    b.add("fold-greenhouse-building", -4, -36, 1);
    b.wall(-76, -40, 54, -40, 20);
    b.wall(60, -52, 80, -52, 18);
    b.add("fold-greenhouse-pots", -112, 80, 1, 2);
    b.add("fold-greenhouse-workbench", 109, 70, 0.95, 3);
    b.wall(91, 69, 127, 69, 9);
    b.add("pumpkin", -54, 66, 0.95, 4);
    b.spot("pumpkin", -54, 66, 0.95);
    b.add("flowers", 145, -16, 0.8, 5);
    b.add("tuft", -154, 34, 0.8, 6);
  },
};
