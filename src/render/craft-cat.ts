import {
  officialRects,
  MASCOT_VIEWBOX_WIDTH,
  MASCOT_VIEWBOX_HEIGHT,
} from "../cats/official.js";
import type { CatId } from "../cats/types.js";
import type { CatPose } from "./layout.js";
import type { CatBodyPalette } from "./art-registry.js";
import { cachedSprite } from "../engine/sprite.js";
import { catDetailPose, drawCatDetails } from "./cat-detail.js";
import { box, grain, surface, type Ctx } from "./paper-material.js";
const SCALE = 0.16;
const HEAD_W = Math.ceil(MASCOT_VIEWBOX_WIDTH * SCALE + 8),
  HEAD_H = Math.ceil(MASCOT_VIEWBOX_HEIGHT * SCALE + 8);
/** The printed head, cached per cat at 2x. */
function head(id: CatId): HTMLCanvasElement {
  return cachedSprite(`cat-head:${id}`, HEAD_W, HEAD_H, 2, (ctx, canvas) => {
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
    const mask = surface(HEAD_W * 2, HEAD_H * 2);
    mask.getContext("2d")!.drawImage(canvas!, 0, 0);
    grain(ctx, box(0, 0, HEAD_W, HEAD_H), 0.65);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
  }).canvas!;
}
/** Padding of the edge canvas around the head, in head-canvas (2x) pixels. */
const EDGE_PAD = 4;
/** Tints a copy of the head alpha, stamped at the given offsets. */
function silhouette(
  image: HTMLCanvasElement,
  offsets: readonly (readonly [number, number])[],
  color: string,
): HTMLCanvasElement {
  const c = surface(image.width + EDGE_PAD * 2, image.height + EDGE_PAD * 2);
  const sc = c.getContext("2d")!;
  for (const [dx, dy] of offsets)
    sc.drawImage(image, EDGE_PAD + dx, EDGE_PAD + dy);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = color;
  sc.fillRect(0, 0, c.width, c.height);
  return c;
}
/**
 * A narrow warm-grey cut edge that follows the printed head silhouette, with a
 * low-alpha under-side copy for paper thickness. Cached per cat and rim colour.
 */
function headEdge(id: CatId, rimColor: string): HTMLCanvasElement {
  const pad = EDGE_PAD / 2;
  return cachedSprite(`cat-edge:${id}:${rimColor}`, HEAD_W + pad * 2, HEAD_H + pad * 2, 2, (ctx) => {
    const image = head(id);
    const ring: [number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ring.push([Math.cos(a) * 1.25, Math.sin(a) * 1.25]);
    }
    const under = silhouette(
      image,
      ring.map(([x, y]) => [x * 0.6, y * 0.4 + 2.2] as const),
      "#241b26",
    );
    const rim = silhouette(image, ring, rimColor);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.42;
    ctx.drawImage(under, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(rim, 0, 0);
  }).canvas!;
}
/** The official stepped face is a printed paper cutout, on a separately layered body. */
export function drawCraftCat(ctx: Ctx, pose: CatPose, look: CatBodyPalette): void {
  const k = (pose.scale ?? SCALE) / SCALE;
  const detail = catDetailPose(pose);
  ctx.save();
  ctx.globalAlpha *= pose.decoy ? 0.3 : pose.hurt ? 0.65 : 1;
  ctx.translate(pose.x, pose.y);
  ctx.scale(k, k);
  ctx.scale(pose.facing, 1);
  drawCatDetails(ctx, look, detail);
  ctx.translate(0, detail.bob);
  // Face data stays untouched; only its printing material, thickness and cast shadow change.
  const image = head(pose.id),
    w = image.width / 2,
    h = image.height / 2;
  const edge = headEdge(pose.id, look.rim),
    pad = EDGE_PAD / 2;
  ctx.drawImage(
    edge,
    -w / 2 - pad,
    -20 - h + 4 - pad,
    edge.width / 2,
    edge.height / 2,
  );
  ctx.drawImage(image, -w / 2, -20 - h + 4, w, h);
  ctx.restore();
}
