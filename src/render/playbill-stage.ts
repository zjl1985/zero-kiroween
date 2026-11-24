/** Character selection art uses a front-facing portrait at an integer pixel scale. */
import { cachedSprite } from "../engine/sprite.js";
import type { CatId } from "../cats/types.js";
import { catArt, type IsoPuppet } from "./art-registry.js";
import { genImage, genSprite } from "./iso/gen-sprites.js";
import { drawPuppetFigure } from "./iso/puppet.js";
import type { CatPose } from "./layout.js";
import type { Ctx } from "./paper-material.js";

function pedestal(accent: string) {
  const width = 144, height = 52, base = 20;
  return cachedSprite("pixel-roster-stone:" + accent, width, height, 1, ctx => {
    const center = width / 2;
    const disk = (rx: number, ry: number, y: number, color: string) => {
      ctx.fillStyle = color;
      for (let row = -ry; row <= ry; row++) {
        const x = Math.floor(rx * Math.sqrt(1 - (row / (ry + 1)) ** 2));
        ctx.fillRect(center - x, y + row, x * 2, 1);
      }
    };
    disk(69, 15, base + 10, "#0b1924");
    disk(61, 15, base + 6, "#182c35");
    disk(61, 15, base + 2, "#2b4349");
    disk(59, 14, base, "#728783");
    disk(55, 12, base, "#3f555b");
    disk(48, 10, base + 1, "#4d6263");
    disk(20, 5, base, "#2c4248");
    ctx.fillStyle = "#a9ab91";
    for (const [x, y, span] of [[28, 12, 11], [45, 9, 13], [89, 10, 15], [112, 14, 5], [34, 29, 9], [98, 29, 9]] as const) {
      ctx.fillRect(x, y, span, 1);
    }
    ctx.fillStyle = "#253b45";
    for (const [x, y] of [[41, 23], [93, 23], [102, 18], [57, 13], [110, 24], [37, 18]] as const) ctx.fillRect(x, y, 3, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(center - 3, base + 15, 6, 2);
    ctx.fillRect(center - 2, base + 13, 4, 6);
  }, { x: 0.5, y: base / height });
}

export function drawPlaybillStage(ctx: Ctx, pose: CatPose): void {
  const art = catArt(pose.id), layer = pose.costume;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  pedestal(art.colors.hud).draw(ctx, { x: pose.x, y: pose.y });
  if (!art.iso || !drawPuppetFigure(ctx, art.iso, { x: pose.x, y: pose.y, scale: 2, layer })) art.draw(ctx, pose);
  ctx.restore();
}

/** Fit the baked portrait above the foot point (x, y) within w by h pixels. */
export function drawSelectionFigure(
  ctx: Ctx,
  puppet: IsoPuppet,
  frame: { x: number; y: number; w: number; h: number; costume?: string | null },
): boolean {
  const id = frame.costume ? `${puppet.identity}@${frame.costume}-select` : `${puppet.identity}-select`;
  const sprite = genSprite(id), img = genImage(id);
  if (!sprite || !img) return false;
  const scale = Math.floor(Math.min(frame.w / sprite.w, frame.h / sprite.h));
  if (scale < 1) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(frame.x) - sprite.ax * scale, Math.round(frame.y) - sprite.ay * scale,
    sprite.w * scale, sprite.h * scale);
  ctx.restore();
  return true;
}

export function paintPlaybillPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: string | null): void {
  const ctx = canvas.getContext("2d")!, art = catArt(id);
  const { width, height } = canvas;
  const x = Math.round(width / 2), y = Math.round(height * .77), zoom = Math.min(width / 232, height / 186);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  const glowY = y - 48 * zoom;
  const backdrop = ctx.createRadialGradient(x, glowY, 0, x, glowY, 96 * zoom);
  backdrop.addColorStop(0, "#182b3df5");
  backdrop.addColorStop(.55, "#142637d9");
  backdrop.addColorStop(1, "#10233200");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);
  pedestal(art.colors.hud).draw(ctx, { x, y, scale: zoom });

  if (art.iso) {
    if (drawSelectionFigure(ctx, art.iso, { x, y, w: width * .68, h: height * .70, costume })) return;
    if (drawPuppetFigure(ctx, art.iso, { x, y, scale: Math.max(1, Math.round(height / 62)), layer: costume ?? undefined })) return;
  }
  ctx.setTransform(zoom, 0, 0, zoom, x, y);
  art.draw(ctx, { id, x: 0, y: 0, scale: .3, facing: 1, moving: false, dashing: false, hurt: false, time: 0, ...(costume ? { costume } : {}) });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
