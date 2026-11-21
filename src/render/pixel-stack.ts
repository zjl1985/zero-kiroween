/** Native-pixel horizontal sprite stacks. Each z is a real XY material section;
 * all sections share a heading before being squashed and lifted. Whole projected
 * objects are baked once, then stamped nearest-neighbour through the bounded LRU.
 */
import { cachedSprite } from "../engine/sprite.js";
import type { Ctx } from "./paper-material.js";
export interface PixelStackModel {
  readonly id: string; readonly width: number; readonly depth: number; readonly count: number;
  /** Contact ellipse in model pixels, independent of the atlas footprint. */
  readonly groundShadow?: { readonly rx: number; readonly ry: number; readonly dx?: number; readonly dy?: number };
  paint(ctx: Ctx, z: number): void;
}
export interface PixelStackPose { x?: number; y?: number; scale?: number; turn?: number; squash?: number; spacing?: number; shadow?: boolean; }
export function projectPixelStack(x: number, y: number, z: number, turn = 0.25, squash = 0.75, spacing = 1): readonly [number, number] {
  return [Math.round(x * Math.cos(turn) - y * Math.sin(turn)), Math.round((x * Math.sin(turn) + y * Math.cos(turn)) * squash - z * spacing)];
}
export function drawPixelStack(ctx: Ctx, model: PixelStackModel, pose: PixelStackPose = {}): void {
  const { x = 0, y = 0, scale = 2, turn = 0.25, squash = 0.75, spacing = 1, shadow = true } = pose;
  if (![model.width, model.depth, model.count].every(n => Number.isInteger(n) && n > 0 && n <= 256)
    || ![x,y,scale,turn,squash,spacing].every(Number.isFinite) || scale <= 0 || squash <= 0 || squash > 1 || spacing < 0 || model.count * spacing > 2048)
    throw new RangeError("Invalid pixel stack");
  const contact = model.groundShadow, dx = contact?.dx ?? 0, dy = contact?.dy ?? 0;
  if (contact && (![contact.rx, contact.ry, dx, dy].every(Number.isFinite)
    || contact.rx <= 0 || contact.ry <= 0 || contact.rx + Math.abs(dx) > 2048 || contact.ry + Math.abs(dy) > 2048))
    throw new RangeError("Invalid pixel stack contact shadow");
  const columns = Math.min(8, model.count), rows = Math.ceil(model.count / columns),
    radius = Math.ceil(Math.hypot(model.width, model.depth) / 2),
    rise = Math.ceil((model.count - 1) * spacing),
    padLeft = contact && shadow ? Math.max(0, Math.ceil(contact.rx - dx + 1) - radius - 4) : 0,
    padRight = contact && shadow ? Math.max(0, Math.ceil(contact.rx + dx + 1) - radius - 8) : 0,
    padTop = contact && shadow ? Math.max(0, Math.ceil(contact.ry - dy + 1) - rise - radius - 4) : 0,
    padBottom = contact && shadow ? Math.max(0, Math.ceil(contact.ry + dy + 1) - radius - 8) : 0,
    width = radius * 2 + 12 + padLeft + padRight, height = rise + radius * 2 + 12 + padTop + padBottom,
    ox = radius + 4 + padLeft, oy = rise + radius + 4 + padTop,
    key = `pixel-stack:${model.id}:${model.width}:${model.depth}:${model.count}`,
    contactKey = contact ? `:ground:${contact.rx}:${contact.ry}:${dx}:${dy}` : "";
  const sprite = cachedSprite(`${key}:pose:${turn}:${squash}:${spacing}:${shadow}${contactKey}`, width, height, 1, c => {
    const atlas = cachedSprite(`${key}:atlas`, model.width * columns, model.depth * rows, 1, a => {
      a.imageSmoothingEnabled = false;
      for (let z = 0; z < model.count; z++) {
        a.save();
        a.beginPath(); a.rect(z % columns * model.width, Math.floor(z / columns) * model.depth, model.width, model.depth); a.clip();
        a.translate(z % columns * model.width + model.width / 2, Math.floor(z / columns) * model.depth + model.depth / 2);
        model.paint(a, z); a.restore();
      }
    });
    c.imageSmoothingEnabled = false;
    if (shadow) {
      c.fillStyle = "#1c2230";
      if (contact) {
        // Scanline ellipse with integer rows and no blur or layered alpha.
        // Its compact dimensions describe contact, not the full object width.
        pixelDisc(c, ox + dx, oy + dy, contact.rx, contact.ry, "#1c2230");
      } else {
        // Preserve the historical footprint for models not yet art-reviewed.
        for (let yy = -3; yy <= 3; yy++) {
          const rx = Math.max(2, Math.floor(model.width * 0.44) - Math.abs(yy) * 2);
          c.fillRect(ox - rx + 3, oy + yy + 2, rx * 2, 1);
        }
      }
    }
    for (let z = 0; z < model.count; z++) {
      c.save(); c.translate(ox, oy - Math.round(z * spacing)); c.scale(1, squash); c.rotate(turn);
      if (atlas.canvas) c.drawImage(atlas.canvas, z % columns * model.width, Math.floor(z / columns) * model.depth,
        model.width, model.depth, -model.width / 2, -model.depth / 2, model.width, model.depth);
      else model.paint(c, z);
      c.restore();
    }
  }, { x: ox / width, y: oy / height });
  ctx.save(); ctx.imageSmoothingEnabled = false;
  sprite.draw(ctx, { x: Math.round(x), y: Math.round(y), scale }); ctx.restore();
}
/** Filled pixel ellipse, authored as integer scanlines rather than vector curves. */
export function pixelDisc(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = color;
  for (let row = Math.ceil(y - ry); row <= Math.floor(y + ry); row++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - ((row - y) / ry) ** 2)));
    ctx.fillRect(Math.round(x) - half, row, half * 2 + 1, 1);
  }
}
