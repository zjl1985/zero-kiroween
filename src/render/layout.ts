import {
  officialRects,
  MASCOT_VIEWBOX_HEIGHT,
  MASCOT_VIEWBOX_WIDTH,
  type MascotRect,
} from "../cats/official.js";
import type { CatId } from "../cats/types.js";
import { ellipse, line, rect, polygon, light, type Ctx } from "./pixel-art.js";

export const HEAD_SCALE = 0.16;
export interface CatPose {
  id: CatId;
  x: number;
  y: number;
  facing: 1 | -1;
  moving: boolean;
  dashing: boolean;
  hurt: boolean;
  decoy?: boolean;
  time: number;
  scale?: number;
  /** Paper wear from the run: creases / tears (0..3) and fading heal tape (0..1). */
  wear?: { readonly marks: number; readonly tape: number };
  /** Costume (def id) the cat wears; omitted on a plain run. */
  costume?: string;
}
const cache = new Map<CatId, readonly MascotRect[]>();
export function officialCatRects(id: CatId): readonly MascotRect[] {
  let result = cache.get(id);
  if (!result) {
    result = officialRects(id);
    cache.set(id, result);
  }
  return result;
}
export function bobOffset(pose: CatPose): number {
  return pose.dashing
    ? 0
    : Math.round(
        Math.sin(pose.time * (pose.moving ? 12 : 2)) *
          (pose.moving ? 1.2 : 0.4),
      );
}
export function drawOfficialHead(
  ctx: Ctx,
  pose: CatPose,
  options: { scale?: number; clipBottom?: number } = {},
): void {
  const scale = options.scale ?? pose.scale ?? HEAD_SCALE,
    w = MASCOT_VIEWBOX_WIDTH * scale,
    h = MASCOT_VIEWBOX_HEIGHT * scale;
  const ox = Math.round(pose.x - w / 2),
    oy = Math.round(pose.y - h);
  ctx.save();
  if (pose.facing === -1) {
    ctx.translate(Math.round(pose.x) * 2, 0);
    ctx.scale(-1, 1);
  }
  if (options.clipBottom) {
    ctx.beginPath();
    ctx.rect(ox - 2, oy - 2, w + 4, h * options.clipBottom + 2);
    ctx.clip();
  }
  for (const r of officialCatRects(pose.id)) {
    const x = Math.round(ox + r.x * scale),
      y = Math.round(oy + r.y * scale);
    rect(
      ctx,
      x,
      y,
      Math.max(1, Math.round(ox + (r.x + r.w) * scale) - x),
      Math.max(1, Math.round(oy + (r.y + r.h) * scale) - y),
      r.fill,
    );
  }
  ctx.restore();
}
export function drawMascot(ctx: Ctx, pose: CatPose): void {
  const x = Math.round(pose.x),
    y = Math.round(pose.y),
    s = (pose.scale ?? HEAD_SCALE) / HEAD_SCALE;
  const bob = bobOffset(pose),
    stride = pose.moving ? Math.round(Math.sin(pose.time * 12) * 3) : 0;
  const nicole = pose.id === "nicole",
    bust = y - 20 * s + bob;
  ctx.save();
  ctx.globalAlpha = pose.decoy ? 0.32 : pose.hurt ? 0.6 : 1;
  ellipse(ctx, x, y + 1, 19 * s, 4 * s, "#15272e");
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pose.facing * s, s);
  // Tail is rooted behind the hip; it follows the gait with a short delay.
  const sway = Math.round(Math.sin(pose.time * (pose.moving ? 8 : 2)) * 2);
  line(ctx, -9, -9, -20, -8, "#181c29", 4);
  line(ctx, -20, -8, -25, -12 - sway, "#181c29", 3);
  line(
    ctx,
    -25,
    -12 - sway,
    -24,
    -18 - sway,
    nicole ? "#b69a7e" : "#cca052",
    3,
  );
  // Draped fabric with a moonlit shoulder, dark folds, a warm embroidered hem.
  const cape = nicole ? "#584164" : "#30303e",
    trim = nicole ? "#bd9670" : "#c6a15d";
  polygon(
    ctx,
    [
      [-12, -36],
      [-30 - sway, -8],
      [-25, -4],
      [-4, -10],
      [25, -5],
      [28, -14],
      [12, -36],
    ],
    "#191e2b",
  );
  polygon(
    ctx,
    [
      [-11, -35],
      [-27 - sway, -10],
      [-22, -7],
      [-3, -13],
      [23, -8],
      [24, -16],
      [10, -34],
    ],
    cape,
  );
  polygon(
    ctx,
    [
      [-11, -33],
      [-20, -10],
      [-8, -14],
      [0, -30],
    ],
    nicole ? "#735477" : "#474050",
  );
  line(ctx, -11, -33, -26 - sway, -10, "#8f6a85");
  line(ctx, -26 - sway, -8, -5, -13, trim);
  line(ctx, 0, -12, 23, -8, trim);
  for (let i = 0; i < 6; i++) {
    const xx = -24 + i * 4,
      yy = -10 - Math.round(i / 2);
    rect(ctx, xx, yy, 1, 1, "#e1bd78");
    if (i % 2 === 0) {
      line(ctx, xx, yy - 4, xx + 2, yy - 2, trim);
      line(ctx, xx + 2, yy - 2, xx + 3, yy - 5, trim);
    }
  }
  // The torso continues the mother's shirt and collar into a real standing body.
  polygon(
    ctx,
    [
      [-11, -28],
      [11, -28],
      [13, -12],
      [8, -8],
      [-9, -8],
      [-13, -12],
    ],
    nicole ? "#d8c9ae" : "#292933",
  );
  rect(ctx, -8, -24, 16, 2, nicole ? "#eee0c5" : "#50433b");
  rect(ctx, -9, -11, 18, 3, nicole ? "#67516a" : "#514236");
  rect(ctx, -1, -12, 3, 3, "#c6a367");
  if (nicole) {
    rect(ctx, -4, -23, 2, 8, "#f1e3c9");
    rect(ctx, 4, -23, 2, 8, "#b39f86");
  } else {
    line(ctx, -6, -23, 0, -19, "#c5a15d");
    line(ctx, 0, -19, 6, -23, "#c5a15d");
    rect(ctx, -1, -18, 3, 3, "#e4bf6a");
  }
  // Anatomical paws: separate knee, ankle, sole, and toe highlights.
  for (const side of [-1, 1]) {
    const lift = Math.max(0, stride * side),
      px = side < 0 ? -10 : 3;
    rect(ctx, px, -12, 7, 10 - lift, "#20222c");
    rect(ctx, px + 1, -10, 2, 6 - lift, nicole ? "#ad967f" : "#41414a");
    rect(ctx, px - 1, -3 - lift, 9, 4, nicole ? "#b49a80" : "#30313d");
    rect(ctx, px + 1, -3 - lift, 4, 1, nicole ? "#e1c19b" : "#60616a");
  }
  // Sleeve / paw actually holds the brass lamp, with a little gait swing.
  const ly = -13 + bob + Math.round(stride * 0.25);
  line(ctx, 12, -21, 20, ly, nicole ? "#e2d4ba" : "#33313d", 4);
  rect(ctx, 19, ly, 3, 3, "#d7b486");
  line(ctx, 23, ly, 23, ly - 5, "#c5a36b");
  rect(ctx, 18, ly - 7, 11, 2, "#8c6640");
  polygon(
    ctx,
    [
      [18, ly - 7],
      [23, ly - 11],
      [29, ly - 7],
    ],
    "#a37943",
  );
  rect(ctx, 19, ly - 5, 9, 10, "#f1be64");
  rect(ctx, 21, ly - 4, 5, 8, "#ffe5a1");
  line(ctx, 19, ly - 5, 20, ly + 5, "#755537");
  line(ctx, 27, ly - 5, 26, ly + 5, "#755537");
  rect(ctx, 19, ly + 5, 9, 2, "#9b7341");
  ctx.restore();
  drawOfficialHead(ctx, { ...pose, x, y: bust }, { clipBottom: 0.94 });
  light(
    ctx,
    x + pose.facing * 23 * s,
    y - 13 * s,
    15 * s,
    "#ffba5b",
    pose.decoy ? 0.05 : 0.12,
    1,
  );
  ctx.restore();
}
export function fillHex(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}
