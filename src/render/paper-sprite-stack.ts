/** Procedural sprite stacking: horizontal XY sections, rotated together and
 * lifted by Z. Inspired by danielwh2/sprite-stacking (see docs/sprite-stacking.md).
 * These are volume sections, not copies of a front-facing silhouette.
 * Invoke while baking scenery; the existing whole-object cache does the live blit.
 */
import { cachedSprite } from "../engine/sprite.js";
import { type Ctx } from "./paper-material.js";

export interface PaperSliceModel {
  readonly id: string;
  readonly width: number;
  readonly depth: number;
  readonly count: number;
  /** Centred top-down section at integer height z, ground first. No outlines. */
  paint(ctx: Ctx, z: number): void;
}
export interface PaperStackPose {
  x?: number; y?: number; turn?: number; squash?: number; spacing?: number; shadow?: boolean;
}

export function projectStackPoint(x: number, y: number, z: number, turn = 0, squash = 0.75, spacing = 1): readonly [number, number] {
  const c = Math.cos(turn), s = Math.sin(turn);
  return [x * c - y * s, (x * s + y * c) * squash - z * spacing];
}

export function drawPaperStack(ctx: Ctx, model: PaperSliceModel, pose: PaperStackPose = {}): void {
  const { x = 0, y = 0, turn = 0, squash = 0.75, spacing = 1, shadow = true } = pose;
  if (![model.width, model.depth, model.count].every(n => Number.isInteger(n) && n > 0)
    || model.count > 128 || model.width > 256 || model.depth > 256
    || model.width * model.depth * Math.min(16, model.count) * Math.ceil(model.count / 16) * 4 > 16_777_216
    || ![x, y, turn, squash, spacing].every(Number.isFinite) || squash <= 0 || squash > 1 || spacing < 0
    || model.count * spacing > 2048)
    throw new RangeError("Invalid paper slice dimensions or projection");
  // Two device pixels per drawing unit retain the game's cut-paper edges.
  // The atlas is code-generated, never an image asset or an extra game canvas.
  const key = `paper-slices:${model.id}:${model.width}:${model.depth}:${model.count}`;
  // Pack rows instead of an enormous horizontal strip (Safari canvas limits).
  const columns = Math.min(16, model.count), rows = Math.ceil(model.count / columns);
  const atlas = cachedSprite(key, model.width * columns, model.depth * rows, 2, c => {
    for (let z = 0; z < model.count; z++) {
      const col = z % columns, row = Math.floor(z / columns);
      c.save();
      c.beginPath(); c.rect(col * model.width, row * model.depth, model.width, model.depth); c.clip();
      c.translate((col + 0.5) * model.width, (row + 0.5) * model.depth);
      model.paint(c, z);
      c.restore();
    }
  });
  const section = (c: Ctx, z: number) => {
    if (atlas.canvas) c.drawImage(atlas.canvas,
      (z % columns) * model.width * 2, Math.floor(z / columns) * model.depth * 2, model.width * 2, model.depth * 2,
      -model.width / 2, -model.depth / 2, model.width, model.depth);
    else model.paint(c, z);
  };
  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    if (shadow) {
      const radius = Math.ceil(Math.hypot(model.width, model.depth) / 2),
        reach = Math.ceil((model.count - 1) * spacing * 0.38),
        size = radius * 2 + reach + 8;
      // Union all projected sections first, then tint that isolated surface.
      // Applying opacity once prevents a tall stack's shadow becoming black.
      const cast = cachedSprite(`${key}:shadow:${turn}:${squash}:${spacing}`, size, size, 1, (c, canvas) => {
        for (let z = 0; z < model.count; z++) {
          c.save();
          c.translate(radius + 2 + z * spacing * 0.26, radius + 3 + z * spacing * 0.38);
          c.scale(1, squash); c.rotate(turn); section(c, z); c.restore();
        }
        if (canvas) {
          c.save(); c.globalCompositeOperation = "source-in";
          c.fillStyle = "#231e2c"; c.fillRect(0, 0, size, size); c.restore();
        }
      });
      ctx.save(); ctx.globalAlpha *= 0.24;
      cast.draw(ctx, { x: -radius, y: -radius }); ctx.restore();
    }
    for (let z = 0; z < model.count; z++) {
      ctx.save();
      try {
        ctx.translate(0, -z * spacing); ctx.scale(1, squash); ctx.rotate(turn);
        section(ctx, z);
      } finally { ctx.restore(); }
    }
  } finally { ctx.restore(); }
}
