import type { LandmarkDef } from "../../types.js";

/** Three lightable pumpkins in furrowed soil, ringed by small ones. */
export const PUMPKIN_FIELD: LandmarkDef = {
  id: "pumpkin-field",
  radius: 200,
  layout(_l, b) {
    for (const [dx, dy, s] of [
      [-74, -34, 1.1],
      [82, 8, 1.2],
      [-8, 72, 1],
    ] as const) {
      b.add("pumpkin", dx, dy, s, 1);
      b.spot("pumpkin", dx, dy, s);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      b.add("pumpkin", Math.cos(a) * 140, Math.sin(a) * 78, 0.45 + (i % 3) * 0.1, 10 + i * 4);
    }
    b.add("fence", -118, -112, 1, 2);
    b.add("fence", 118, -112, 1, 3);
    b.wall(-157, -115, -78, -118, 3);
    b.wall(79, -115, 158, -118, 3);
    b.add("leaves", -30, 20, 1, 4);
    b.add("tuft", 40, -50, 1, 5);
  },
};
