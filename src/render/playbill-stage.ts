/** Pixel roster dais. Shared by the title world and the character detail panel. */
import { cachedSprite } from "../engine/sprite.js";
import type { CatId } from "../cats/types.js";
import { catArt } from "./art-registry.js";
import type { CatPose } from "./layout.js";
import type { Ctx } from "./paper-material.js";

const STAGE = { w: 220, h: 180, base: 146 } as const;
function pedestal(accent: string) {
  return cachedSprite("pixel-roster-dais:" + accent, STAGE.w, STAGE.h, 0.5, ctx => {
    const block = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    };
    block(30, 138, 164, 22, "#0a1d2b");
    block(22, 124, 176, 24, "#284650");
    block(30, 116, 160, 28, "#3c625f");
    block(38, 108, 144, 28, "#537e6c");
    block(42, 108, 136, 4, "#8fb58f");
    block(30, 138, 160, 4, "#193541");
    block(44, 144, 4, 12, "#6b8f7c"); block(172, 144, 4, 12, "#6b8f7c");
    // Small inset rune on the front face, rather than paper curtains behind it.
    block(102, 139, 16, 13, "#17323e");
    block(108, 141, 4, 9, accent); block(104, 144, 12, 3, accent);
    for (const [x, y] of [[52, 62], [166, 52], [46, 95], [178, 84]]) {
      block(x, y, 4, 4, "#8ab6a0"); block(x + 2, y - 2, 2, 8, "#e0cf8e");
    }
  }, { x: 0.5, y: STAGE.base / STAGE.h });
}
export function drawPlaybillStage(ctx: Ctx, pose: CatPose): void {
  const art = catArt(pose.id);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  pedestal(art.colors.hud).draw(ctx, { x: pose.x, y: pose.y + 12 });
  art.draw(ctx, pose);
  ctx.restore();
}
export function paintPlaybillPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: string | null): void {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const zoom = Math.min(canvas.width / 220, canvas.height / 180);
  ctx.setTransform(zoom, 0, 0, zoom, canvas.width / 2, canvas.height * .77);
  drawPlaybillStage(ctx, {
    id, x: 0, y: 0, scale: .3, facing: 1, moving: false, dashing: false, hurt: false, time: 0,
    ...(costume ? { costume } : {}),
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
