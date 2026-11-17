import type { CatPose } from "./layout.js";
import type { CatBodyPalette } from "./art-registry.js";
import { catDetailPose, drawCatDetails } from "./cat-detail.js";
import type { Ctx } from "./paper-material.js";
import { paperFace, paperFaceEdge, PAPER_FACE_SCALE, PAPER_FACE_SIZE } from "./paper-face.js";

/** Official colour regions become layered paper cuts; the tailored body keeps its own hinges. */
export function drawCraftCat(ctx: Ctx, pose: CatPose, look: CatBodyPalette): void {
  const k = (pose.scale ?? PAPER_FACE_SCALE) / PAPER_FACE_SCALE;
  const detail = catDetailPose(pose);
  ctx.save();
  ctx.globalAlpha *= pose.decoy ? 0.3 : pose.hurt ? 0.65 : 1;
  ctx.translate(pose.x, pose.y);
  ctx.scale(k * pose.facing, k);
  drawCatDetails(ctx, look, detail);
  ctx.translate(0, detail.bob);
  ctx.translate(0, -38);
  ctx.rotate(detail.headTilt);
  ctx.translate(0, 38);
  const { w, h } = PAPER_FACE_SIZE;
  paperFaceEdge(pose.id, look.rim).draw(ctx, { x: -w / 2 - 2, y: -20 - h + 2 });
  paperFace(pose.id).draw(ctx, { x: -w / 2, y: -20 - h + 4 });
  ctx.restore();
}
