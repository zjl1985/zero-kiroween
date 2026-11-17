import { cachedSprite, type CanvasSprite } from "../engine/sprite.js";

/**
 * Tint only a cached sprite's existing alpha, never the scene beneath it.
 * Callers use fixed or quantized amounts so animation cannot grow cache keys.
 * Without a backing canvas, retain the untinted painter: compositing directly
 * onto a caller's canvas would also tint unrelated scene pixels.
 */
export function tintedSprite(sprite: CanvasSprite, color: string, amount: number): CanvasSprite {
  const alpha = Math.max(0, Math.min(1, amount));
  if (!sprite.canvas || alpha === 0) return sprite;
  return cachedSprite(
    `tint:${sprite.id}:${color}:${alpha}`,
    sprite.width,
    sprite.height,
    sprite.scale,
    (ctx, canvas) => {
      sprite.draw(ctx, { x: sprite.anchor.x * sprite.width, y: sprite.anchor.y * sprite.height });
      if (!canvas) return;
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width / sprite.scale, canvas.height / sprite.scale);
      ctx.restore();
    },
    sprite.anchor,
  );
}
