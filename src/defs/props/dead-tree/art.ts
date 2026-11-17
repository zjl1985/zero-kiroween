import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const BARK = ["#4e4248", "#5a4a44", "#463c46"] as const;
const BOUNDS = { l: -42, r: 42, t: -98, b: 10 } as const;

/** A tapering branch from (x, y) along angle `a`, with one forked twig. */
function branch(ctx: Ctx, x: number, y: number, a: number, len: number, w: number, color: string, seed: number): void {
  const ex = x + Math.cos(a) * len,
    ey = y + Math.sin(a) * len,
    nx = -Math.sin(a),
    ny = Math.cos(a);
  paperCut(ctx, [[x + nx * w, y + ny * w], [ex + nx * 0.6, ey + ny * 0.6], [ex - nx * 0.6, ey - ny * 0.6], [x - nx * w, y - ny * w]], {
    color,
    shadow: 1.4,
    thickness: 0.6,
    texture: 0.8,
  });
  const fx = x + Math.cos(a) * len * 0.6,
    fy = y + Math.sin(a) * len * 0.6,
    fa = a + (hash(seed) > 0.5 ? 0.7 : -0.7);
  paperCut(ctx, [[fx, fy - 0.8], [fx + Math.cos(fa) * len * 0.4, fy + Math.sin(fa) * len * 0.4], [fx, fy + 0.8]], { color, shadow: 0.8, thickness: 0.4, texture: 0.6 });
}
function deadTree(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: BARK, shift: 0.3, wear: [0.2, 0.5] });
  shadow(ctx, 0, 2, 24, 6);
  const trunk: Point[] = [[-9, 2], [-6, -30], [-8, -52], [-3, -76], [1, -76], [5, -50], [4, -30], [9, 2]];
  paperCut(ctx, trunk, { color: look.color, shadow: 2.2, thickness: 1, texture: 0.9, wear: look.wear, seed: v, edge: "#8a7a78" });
  foldLine(ctx, 1, -2, 0, -70, 0.4);
  // Roots and crooked branches.
  for (const [rx, ra] of [[-7, 2.7], [7, 0.4]] as const) branch(ctx, rx, 0, ra, 11, 2.4, look.color, v + rx);
  const arms: [number, number, number, number][] = [
    [-4, -46, -2.5, 30],
    [3, -54, -0.6, 32],
    [-1, -70, -1.9, 24],
    [1, -74, -1.1, 22],
  ];
  arms.forEach(([x, y, a, len], i) => branch(ctx, x, y, a + (hash(v + i) - 0.5) * 0.3, len, 2.6, look.color, v + i * 7));
  // A knot hole with a little cold eye-shine.
  paperCut(ctx, oval(0, -36, 2.6, 3.6, v), { color: "#1e1820", shadow: 0, thickness: 0.4, texture: 0.2 });
}

export const DEAD_TREE_ART: PropArt = {
  id: "dead-tree",
  bounds: BOUNDS,
  variants: 4,
  flames: [],
  scraps: [...BARK, "#8a7a78"],
  look: { scale: [0.92, 1.08], angle: [-0.04, 0.04], flip: true },
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: deadTree,
    stub: "#4e4248",
    stubs: [[0, 22]],
    scraps: BARK,
    spread: [22, 6],
    keep: 0.42,
  }),
};
