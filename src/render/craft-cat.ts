import type { CatPose } from "./layout.js";
import { costumeArtOf, type CatBodyPalette } from "./art-registry.js";
import { catDetailPose, drawCatDetails, drawCatWear } from "./cat-detail.js";
import { costumeLook, outfitHooks } from "./costume-outfit.js";
import type { Ctx } from "./paper-material.js";
import { paperFace, paperFaceEdge, paperFaceMakeup, MAKEUP_BOX, PAPER_FACE_SCALE, PAPER_FACE_SIZE } from "./paper-face.js";

/** Authored head cuts share original identity colours; the tailored body keeps its own hinges. */
export function drawCraftCat(ctx: Ctx, pose: CatPose, look: CatBodyPalette): void {
  const k = (pose.scale ?? PAPER_FACE_SCALE) / PAPER_FACE_SCALE;
  const detail = catDetailPose(pose);
  // A worn costume changes the garment colours, adds outfit cuts and a makeup layer over the head.
  const costume = costumeArtOf(pose.costume), worn = costume ? costumeLook(look, costume) : look;
  ctx.save();
  ctx.globalAlpha *= pose.decoy ? 0.3 : pose.hurt ? 0.65 : 1;
  ctx.translate(pose.x, pose.y);
  ctx.scale(k * pose.facing, k);
  if (costume) drawCatDetails(ctx, worn, detail, outfitHooks(ctx, costume, look.tailoring));
  else drawCatDetails(ctx, look, detail);
  if (pose.wear && !pose.decoy) drawCatWear(ctx, worn, pose.wear, detail.bob);
  ctx.translate(0, detail.bob);
  ctx.translate(0, -38);
  ctx.rotate(detail.headTilt);
  ctx.translate(0, 38);
  const { w, h } = PAPER_FACE_SIZE;
  paperFaceEdge(pose.id, look.rim).draw(ctx, { x: -w / 2 - 2, y: -20 - h + 2 });
  paperFace(pose.id).draw(ctx, { x: -w / 2, y: -20 - h + 4 });
  if (costume) paperFaceMakeup(pose.id, costume).draw(ctx, { x: -w / 2 + MAKEUP_BOX.l, y: -20 - h + 4 + MAKEUP_BOX.t });
  ctx.restore();
}
