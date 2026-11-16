import {
  officialRects,
  MASCOT_VIEWBOX_WIDTH,
  MASCOT_VIEWBOX_HEIGHT,
} from "../cats/official.js";
import type { CatId } from "../cats/types.js";
import type { CatPose } from "./layout.js";
import {
  piece,
  path,
  oval,
  box,
  grain,
  stitch,
  stroke,
  line,
  glow,
  shadow,
  surface,
  type Ctx,
} from "./paper-material.js";
const heads = new Map<CatId, HTMLCanvasElement>();
const SCALE = 0.16;
function head(id: CatId): HTMLCanvasElement {
  let cached = heads.get(id);
  if (cached) return cached;
  const w = Math.ceil(MASCOT_VIEWBOX_WIDTH * SCALE + 8),
    h = Math.ceil(MASCOT_VIEWBOX_HEIGHT * SCALE + 8);
  cached = surface(w * 2, h * 2);
  const ctx = cached.getContext("2d")!;
  ctx.scale(2, 2);
  for (const r of officialRects(id)) {
    const n = parseInt(r.fill.slice(1), 16);
    ctx.fillStyle =
      n >> 16 < 44 && ((n >> 8) & 255) < 44 && (n & 255) < 44
        ? "#30252f"
        : r.fill;
    // Shared physical-pixel boundaries keep adjacent printed blocks seamless.
    const x0 = Math.round((4 + r.x * SCALE) * 2) / 2;
    const y0 = Math.round((4 + r.y * SCALE) * 2) / 2;
    const x1 = Math.round((4 + (r.x + r.w) * SCALE) * 2) / 2;
    const y1 = Math.round((4 + (r.y + r.h) * SCALE) * 2) / 2;
    ctx.fillRect(x0, y0, Math.max(0.5, x1 - x0), Math.max(0.5, y1 - y0));
  }
  const mask = surface(w * 2, h * 2);
  mask.getContext("2d")!.drawImage(cached, 0, 0);
  grain(ctx, box(0, 0, w, h), 0.65);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.restore();

  heads.set(id, cached);
  return cached;
}
/** The official stepped face is a printed paper cutout, on a separately layered body. */
export function drawCraftCat(ctx: Ctx, pose: CatPose): void {
  const k = (pose.scale ?? SCALE) / SCALE,
    nicole = pose.id === "nicole";
  const bob = pose.dashing
    ? 0
    : Math.sin(pose.time * (pose.moving ? 12 : 2)) * (pose.moving ? 1.1 : 0.25);
  const stride = pose.moving ? Math.sin(pose.time * 12) * 2 : 0;
  ctx.save();
  ctx.globalAlpha *= pose.decoy ? 0.3 : pose.hurt ? 0.65 : 1;
  ctx.translate(pose.x, pose.y);
  ctx.scale(k, k);
  shadow(ctx, 0, 1, 21, 4);
  ctx.scale(pose.facing, 1);
  const tail = new Path2D("M -9 -9 Q -30 -4 -25 -19");
  stroke(ctx, tail, "#2d2431", 4.5);
  stroke(ctx, tail, nicole ? "#a98e77" : "#c6a05b", 2.3);
  for (const side of [-1, 1]) {
    const lift = Math.max(0, stride * side),
      x = side < 0 ? -10 : 3;
    piece(ctx, box(x, -15, 7, 12 - lift), "#39313c", {
      shadow: 0.7,
      edge: "#77625e",
      texture: 0.7,
      thickness: 0.7,
    });
    piece(
      ctx,
      oval(x + 3, -2 - lift, 5, 2.2, side + 5, 0.06),
      nicole ? "#ceb28f" : "#51424a",
      {
        shadow: 0.7,
        edge: nicole ? "#ead4af" : "#8d746c",
        texture: 0.6,
        thickness: 0.6,
      },
    );
  }
  ctx.translate(0, bob);
  const cape = new Path2D(
    "M -12 -37 Q -15 -19 -29 -9 Q -20 -4 -7 -11 Q 0 -10 10 -7 Q 20 -4 28 -8 Q 20 -21 12 -37 Z",
  );
  piece(ctx, cape, nicole ? "#74536f" : "#483a50", {
    shadow: 2,
    edge: nicole ? "#a77d83" : "#a18664",
    texture: 0.9,
    thickness: 1.2,
  });
  const fold = new Path2D(
    "M -9 -32 Q -11 -19 -20 -9 M 9 -33 Q 10 -17 21 -8 M -2 -28 Q -4 -18 -7 -11",
  );
  stroke(ctx, fold, nicole ? "#4c354f" : "#282537", 1.3, 0.7);
  stroke(ctx, fold, "#ac8b7d", 0.45, 0.55);
  stitch(
    ctx,
    new Path2D("M -25 -10 Q -17 -7 -7 -13 Q 8 -9 23 -10"),
    "#d6b174",
    0.9,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side * (12 + i * 4),
        y = -14 + i * 0.7,
        p = new Path2D();
      p.moveTo(x - 1, y - 2);
      p.quadraticCurveTo(x + 3, y - 3, x + 1, y + 1);
      p.quadraticCurveTo(x - 2, y + 2, x - 1, y - 2);
      stroke(ctx, p, "#c6a267", 0.55, 0.9);
    }
  const body = new Path2D(
    "M -10 -29 Q 0 -34 11 -29 L 13 -14 Q 7 -7 -9 -10 L -13 -16 Z",
  );
  piece(ctx, body, nicole ? "#e0d1b8" : "#302a34", {
    shadow: 1.3,
    edge: nicole ? "#f0dec1" : "#726055",
    texture: 0.8,
    thickness: 0.8,
  });
  piece(
    ctx,
    path([
      [-10, -26],
      [0, -20],
      [10, -26],
      [5, -30],
      [-5, -30],
    ]),
    nicole ? "#f3e8ce" : "#4c3c3c",
    { shadow: 0.6, edge: "#c6af85", texture: 0.5, thickness: 0.5 },
  );
  line(ctx, -10, -12, 10, -12, nicole ? "#79556b" : "#77613f", 2.2);
  piece(ctx, oval(0, -12, 2, 2), "#c9a35f", {
    shadow: 0.5,
    texture: 0.5,
    edge: "#f1cf8c",
    thickness: 0.4,
  });
  if (!nicole) {
    const chain = new Path2D("M -6 -24 Q 0 -16 6 -24");
    stroke(ctx, chain, "#d6b465", 1.4);
    piece(ctx, box(-1, -19, 2, 3), "#e2c47d", {
      shadow: 0.3,
      texture: 0.4,
      thickness: 0.3,
    });
  }
  const ly = -13 + stride * 0.2;
  stroke(
    ctx,
    new Path2D(`M 11 -23 Q 15 -17 21 ${ly}`),
    nicole ? "#c6b498" : "#3c303b",
    4,
  );
  piece(ctx, oval(21, ly, 2.6, 2.1), "#d3b48d", {
    shadow: 0.4,
    texture: 0.5,
    thickness: 0.4,
  });
  line(ctx, 24, ly, 24, ly - 6, "#c0a06b", 0.8);
  piece(
    ctx,
    path([
      [18, ly - 7],
      [24, ly - 11],
      [30, ly - 7],
    ]),
    "#80603e",
    { shadow: 0.8, edge: "#d3ad69", texture: 0.7, thickness: 0.6 },
  );
  piece(
    ctx,
    path([
      [19, ly - 6],
      [29, ly - 6],
      [28, ly + 5],
      [20, ly + 5],
    ]),
    "#e6b15d",
    { shadow: 0.8, edge: "#735236", texture: 0.45, thickness: 0.7 },
  );
  ctx.fillStyle = "#ffe7a7";
  ctx.fill(box(22, ly - 4, 4, 8));
  line(ctx, 19, ly - 6, 20, ly + 5, "#6c4c31", 0.8);
  line(ctx, 29, ly - 6, 28, ly + 5, "#6c4c31", 0.8);
  line(ctx, 24, ly - 6, 24, ly + 5, "#8a663b", 0.7);
  line(ctx, 20, ly + 5, 28, ly + 5, "#aa8046", 1.3);
  // Face data stays untouched; only its printing material, thickness and cast shadow change.
  const image = head(pose.id),
    w = image.width / 2,
    h = image.height / 2;
  const facePaper = new Path2D(
    "M -26 -35 L -27 -64 L -11 -56 Q 0 -59 11 -56 L 28 -64 L 27 -34 Q 24 -24 12 -22 Q 0 -19 -13 -23 Q -25 -24 -26 -35 Z",
  );
  piece(ctx, facePaper, nicole ? "#d9c2a1" : "#d7b98c", {
    shadow: 1.5,
    edge: "#ead3af",
    texture: 0.55,
    thickness: 0.65,
  });
  ctx.drawImage(image, -w / 2, -20 - h + 4, w, h);
  glow(ctx, 24, ly - 1, 16, "#f9c46d", 0.11);
  ctx.restore();
}
