import type { LandmarkDef } from "../../types.js";

/** Pond numbers of the wishing well (ground art reads them too). */
export const POND = { rx: 120, ry: 58, dy: 42 } as const;

/** A roofed stone well by a paper-boat pond; a moon-lantern hangs by the rope. */
export const WISHING_WELL: LandmarkDef = {
  id: "wishing-well",
  radius: 170,
  layout(_l, b) {
    b.add("well", 0, -36, 1);
    b.wall(-22, -40, 22, -40, 16);
    b.add("lamp", 52, -30, 0.95, 1);
    b.spot("lantern", 52, -30, 0.95);
    for (const [dx, dy, s, salt] of [
      [-150, 28, 0.9, 2],
      [150, 30, 0.75, 3],
      [-70, -70, 0.6, 4],
    ] as const)
      b.add("stone", dx, dy, s, salt);
    b.add("bush", -140, -30, 0.9, 5);
    b.add("bush", 150, -50, 0.85, 6);
    b.add("tuft", 90, 96, 1, 7);
    b.add("tuft", -96, 92, 1, 8);
    b.add("flowers", -20, -100, 1, 9);
  },
};
