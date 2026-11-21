import type { PixelStackModel } from "./pixel-stack.js";

/** Joined timber sections; broad planes stay readable at gameplay resolution. */
export function fenceModel(variant: number): PixelStackModel {
  const v = Math.abs(variant) % 3;
  const [shade, wood, light, end, metal] = [
    ["#514550", "#896650", "#b18b60", "#d0ae80", "#464b54"],
    ["#424a50", "#69776b", "#94a087", "#bac0a0", "#3c4851"],
    ["#583e49", "#926558", "#b38b70", "#d5b397", "#47444f"],
  ][v]!;
  return {
    id: `scene:fence:joinery:${v}`, width: 48, depth: 12, count: 22,
    paint(c, z) {
      const r = (x: number, y: number, w: number, d: number, color: string) => {
        c.fillStyle = color;
        c.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(d * 2)));
      };
      // Two solid rails pass through the posts. Their top/end grain is exposed
      // only at the real section ends, never as repeated slice striping.
      for (const base of [6, 14]) {
        if (z >= base && z < base + 3) {
          r(-22, -1, 44, 2, z >= base + 2.5 ? light : wood);
          r(-22, -1, 1, 2, end);
          r(21, -1, 1, 2, shade);
          r(-21, .5, 42, .5, z < base + .5 ? shade : light);
          // One short grain line per span, rather than procedural noise.
          if (z === base + 1) {
            r(-13, .5, 7, .5, wood);
            r(6, .5, 5, .5, wood);
          }
        }
      }
      for (const x of [-18, 0, 18]) {
        if (z < 18.5) {
          r(x - 2, -2, 4, 4, wood);
          r(x - 2, -2, 1, 4, shade);
          r(x - 1, 1.5, 3, .5, light);
          if (z < 1.5) r(x - 2, -2, 4, 4, shade);
          // A narrow split and a small knot break the flat shaft without
          // obscuring its silhouette or turning the timber into checkerboard.
          if (z >= 3 && z < 6 || z >= 10 && z < 13)
            r(x + .5, 1.5, .5, .5, wood);
          if (z === 10) r(x, 1.5, 1, .5, shade);
          for (const nail of [7, 15]) {
            if (z === nail || z === nail + .5) r(x - .5, 2, 1, .5, metal);
            if (z === nail + 1) r(x - .5, 2, .5, .5, end);
          }
        } else {
          // Projecting collar and four-sided cap, visibly joined to the post.
          const half = z < 19.5 ? 2.5 : Math.max(.5, 2.5 - (z - 19.5));
          r(x - half, -half, half, half * 2, z < 19 ? shade : wood);
          r(x, -half, half, half * 2, z < 19 ? light : end);
        }
      }
    },
  };
}
