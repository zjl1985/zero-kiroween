import { surface, type CanvasSurface } from "../../engine/surface.js";
import type { Ctx } from "../paper-material.js";
import { CAT_REFERENCE_VIEWS } from "./gen/cat-reference-atlas.js";
import type { PuppetDraw } from "./puppet.js";
import type { IsoAnim, IsoDir } from "./sprite-sheet.js";

export const REFERENCE_CAT_HEIGHT = 34;
const PAW_RISE = 4;
const STEPS = [
  [[1, 0], [-1, -1]],
  [[0, 0], [0, -1]],
  [[-1, 0], [1, -1]],
  [[-1, -1], [1, 0]],
  [[0, -1], [0, 0]],
  [[1, -1], [-1, 0]],
] as const;

let atlas: HTMLImageElement | undefined;
let flashAtlas: CanvasSurface | undefined;

export async function loadReferenceCatAtlas(): Promise<void> {
  const image = new Image();
  image.src = new URL("../../../assets/characters/render/cat-reference-atlas.png", import.meta.url).href;
  await image.decode();
  atlas = image;
}

function flashImage(image: HTMLImageElement): CanvasImageSource {
  if (flashAtlas) return flashAtlas;
  const tinted = surface(image.naturalWidth, image.naturalHeight), ctx = tinted.getContext("2d");
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff0c8";
  ctx.fillRect(0, 0, tinted.width, tinted.height);
  flashAtlas = tinted;
  return tinted;
}

/** Stamp the original-resolution crop at the scene foot. Walking shifts only the paw strips. */
export function drawReferenceCat(
  ctx: Ctx, identity: string, dir: IsoDir, anim: IsoAnim, frame: number,
  x: number, y: number, draw: PuppetDraw,
): boolean {
  const views = CAT_REFERENCE_VIEWS[identity];
  if (!atlas || !views) return false;
  const { x: u, y: v, w, h, ax } = dir === "se" || dir === "sw" ? views.front : views.rear;
  const source = draw.look === "flash" ? flashImage(atlas) : atlas;
  const scale = REFERENCE_CAT_HEIGHT / h;
  const mirror = dir === "sw" || dir === "nw";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((draw.sx ?? 1) * (mirror ? -1 : 1), draw.sy ?? 1);
  ctx.imageSmoothingEnabled = false;
  const left = -ax * scale;
  if (anim === "walk") {
    const pawRows = Math.round(PAW_RISE / scale), upper = h - pawRows;
    const bob = frame === 1 || frame === 2 || frame === 4 || frame === 5 ? 1 : 0;
    ctx.drawImage(source, u, v, w, upper, left, -REFERENCE_CAT_HEIGHT + bob, w * scale, upper * scale);
    const step = STEPS[frame % STEPS.length]!;
    const [dx0, dy0] = step[0], [dx1, dy1] = step[1], pawTop = -pawRows * scale;
    ctx.drawImage(source, u, v + upper, ax, pawRows, left + dx0, pawTop + dy0, ax * scale, pawRows * scale);
    ctx.drawImage(source, u + ax, v + upper, w - ax, pawRows, dx1, pawTop + dy1, (w - ax) * scale, pawRows * scale);
  } else {
    const bob = anim === "hurt" || frame > 0 ? 1 : 0;
    ctx.drawImage(source, u, v, w, h, left, -REFERENCE_CAT_HEIGHT + bob, w * scale, REFERENCE_CAT_HEIGHT);
  }
  ctx.restore();
  return true;
}
