import type { LandmarkDef } from "../../types.js";

/** The old chapel and its yard of tombs behind a wrought fence. */
export const GRAVEYARD: LandmarkDef = {
  id: "graveyard",
  radius: 200,
  layout(_l, b) {
    b.add("chapel", 0, -60, 1);
    b.wall(-52, -70, 52, -70, 18);
    for (let i = 0; i < 7; i++) {
      const dx = -120 + i * 40,
        dy = 34 + (i % 2) * 34 + b.hash(i, 0, 31) * 10;
      b.add("tomb", dx, dy, 0.8 + (i % 3) * 0.12, i);
      b.wall(dx - 6, dy - 2, dx + 6, dy - 2, 6);
    }
    b.add("candles", -150, -20, 0.75, 1);
    b.add("candles", 150, -14, 0.7, 2);
    b.add("lamp", 120, 112, 0.9, 3);
    b.add("tree", -170, -90, 0.95, 4);
    b.add("leaves", 30, 120, 1, 5);
  },
};
