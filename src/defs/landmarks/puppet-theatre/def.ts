import type { LandmarkDef } from "../../types.js";

/** A toy puppet theatre with paper curtains; a moon-lantern lights the front row. */
export const PUPPET_THEATRE: LandmarkDef = {
  id: "puppet-theatre",
  radius: 190,
  layout(_l, b) {
    b.add("theatre", 0, -50, 1);
    b.wall(-66, -58, 66, -58, 16);
    b.add("lamp", 0, 70, 0.95, 1);
    b.spot("lantern", 0, 70, 0.95);
    // Two rows of card benches facing the stage.
    for (let row = 0; row < 2; row++)
      for (const side of [-1, 1]) {
        const dx = side * (52 + row * 10),
          dy = 18 + row * 34;
        b.add("bench", dx, dy, 1 - row * 0.06, 2 + row * 2 + (side > 0 ? 1 : 0));
        b.wall(dx - 22, dy - 3, dx + 22, dy - 3, 4);
      }
    b.add("candles", -132, -20, 0.75, 6);
    b.add("candles", 136, -16, 0.7, 7);
    b.add("lamp", -150, 60, 0.9, 8);
    b.add("flowers", 120, 80, 1, 9);
    b.add("tuft", -100, 96, 1, 10);
  },
};
