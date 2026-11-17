import type { PropArt } from "../../../render/art-registry.js";
import { foldLine, paperCut, stitchAlong, warmGlow } from "../../../render/paper-kit.js";
import { hash, line, mix, oval, path, shadow, stroke, type Ctx, type Point } from "../../../render/paper-material.js";
import { phasedPaint, post } from "../../../render/prop-kit.js";
import { variant } from "../../../render/variants.js";

const BOXES = ["#4f6a7a", "#6a4f62", "#5d6a4c"] as const;
const BOUNDS = { l: -16, r: 18, t: -50, b: 6 } as const;

function mailbox(ctx: Ctx, v: number): void {
  const look = variant(v, { palette: BOXES, shift: 0.3, wear: [0.1, 0.5] });
  shadow(ctx, 0, 1, 9, 3);
  post(ctx, 0, 1, -30, 4, "#6b4d34", v);
  // A tunnel box with a turned side face.
  const body = new Path2D("M -12 -28 L -12 -38 Q -12 -46 0 -46 Q 12 -46 12 -38 L 12 -28 Z");
  paperCut(ctx, [[12, -28], [12, -38], [15, -41], [15, -31]], { color: mix(look.color, "#1c142b", 0.35), shadow: 1, thickness: 0.6 });
  paperCut(ctx, body, { color: look.color, shadow: 2, thickness: 0.9, texture: 0.85, wear: look.wear, seed: v });
  stitchAlong(ctx, body, mix(look.color, "#f2d9a4", 0.55), 0.6);
  paperCut(ctx, [[-7, -38], [7, -38], [7, -36], [-7, -36]], { color: "#241b26", shadow: 0, thickness: 0.3, texture: 0.2 });
  // The little red flag is up: there is post.
  post(ctx, 14, -32, -46, 1.6, "#3a2a2a", v + 2);
  paperCut(ctx, [[14.5, -46], [21, -44.5], [14.5, -42]], { color: "#c2483e", shadow: 0.8, thickness: 0.5, texture: 0.5, edge: "#f29a80" });
  paperCut(ctx, [[-5, -33], [5, -33.5], [5.5, -29], [-5, -28.5]], { color: "#efe2c2", shadow: 0.6, thickness: 0.4, texture: 0.4 });
}

export const MAILBOX_ART: PropArt = {
  id: "mailbox",
  bounds: BOUNDS,
  variants: 3,
  flames: [],
  scraps: [...BOXES, "#efe2c2", "#c2483e"],
  paint: phasedPaint({
    bounds: BOUNDS,
    intact: mailbox,
    stub: "#6b4d34",
    stubs: [[0, 14]],
    scraps: ["#efe2c2", "#f4ead2", ...BOXES],
    spread: [16, 5],
    keep: 0.55,
  }),
};
