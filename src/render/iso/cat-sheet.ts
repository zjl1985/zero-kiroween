/**
 * The chosen cat as a baked voxel puppet (scripts/iso-art/puppet.py ->
 * gen/cats-pixels.ts). Idle 2 frames, walk 6, hurt 1, each turned in four
 * real directions: an asymmetric identity point (the chain pendant, the hair
 * sweep) stays on the cat's own side in every view instead of flipping with a
 * mirrored frame. The cat stands 30 to 32 native pixels from its foot to the
 * ear tips.
 *
 * Every cat-specific colour and accessory is baked from the official head
 * palette and accessories (src/cats/, unchanged) and the clothing palette of
 * the cat's art definition (src/defs/cats/<id>/iso.art.ts). This module
 * names no cat.
 */
import type { IsoPuppet } from "../art-registry.js";
import type { CatPose } from "../layout.js";
import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
import { CAT_PUPPET_FRAMES } from "./gen/cats-pixels.js";
import { rampColour } from "./palette.js";
import { snap, toScreen } from "./projection.js";
import { PUPPET, drawPuppet, drawPuppetShadow, puppetFrame, puppetSprite } from "./puppet.js";
import type { IsoAnim, IsoDir } from "./sprite-sheet.js";

export const ISO_CAT = {
  /** Native-pixel box every baked frame stays inside, around its foot: half width, rows above the foot, rows under it. */
  box: { halfWidth: 12, top: 32, bottom: 4 },
  /** Rows from the foot to the ear tips of a standing cat in its front view (outline included). */
  stand: 31,
  /** Hard contact shadow, in native pixels, offset to the screen lower-left (spec section 5). */
  shadow: { rx: 7, ry: 2, dx: -1, dy: 1 },
  /** Paper wear marks on the torso, relative to the foot (native pixels). */
  wear: { marks: [[-4, -13, 2, 1], [2, -9, 2, 1]], tape: [0, -14, 3, 1] },
} as const;

/** The baked puppet of a cat: frames `cat-<id>-<dir>-<anim>-<frame>`. */
export function isoCatPuppet(id: string): IsoPuppet {
  return { identity: `cat-${id}`, frames: CAT_PUPPET_FRAMES };
}

/** The animation a cat pose shows: hurt, walking or idle. */
export function isoCatAnim(pose: CatPose): IsoAnim {
  return pose.hurt ? "hurt" : pose.moving ? "walk" : "idle";
}

/** Renderer acting on a cat frame: a warm-white flash right after a hit, and a squash easing back. */
export interface IsoCatAct {
  readonly flash?: boolean;
  /** 0 (none) to 1 (full squash) right after a hit. */
  readonly squash?: number;
}

/**
 * Draw the chosen cat's baked frame at its foot (x, y) in the native scene
 * (the caller's context carries the camera transform, without the upright
 * half-size scale): contact shadow, the frame, then clothing wear.
 */
export function drawIsoCat(ctx: Ctx, puppet: IsoPuppet, pose: CatPose, dir: IsoDir, act: IsoCatAct = {}): void {
  const reduced = reducedPaperMotion(), anim = isoCatAnim(pose);
  const id = puppetSprite(puppet, dir, anim, puppetFrame(puppet, anim, pose.time, reduced));
  const squash = act.squash ?? 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (pose.decoy) ctx.globalAlpha *= 0.35;
  drawPuppetShadow(ctx, pose.x, pose.y, ISO_CAT.shadow);
  drawPuppet(ctx, id, pose.x, pose.y, {
    ...(act.flash && !reduced ? { look: "flash" } : {}),
    ...(squash > 0 ? { sx: 1 + (PUPPET.squash.x - 1) * squash, sy: 1 + (PUPPET.squash.y - 1) * squash } : {}),
  });
  if (pose.wear && !pose.decoy) {
    const p = toFoot(pose);
    ctx.fillStyle = rampColour("ink", 0);
    const marks = ISO_CAT.wear.marks.slice(0, Math.min(2, pose.wear.marks));
    for (const [mx, my, w, h] of marks) ctx.fillRect(p.x + mx, p.y + my, w, h);
    if (pose.wear.tape > 0) {
      const [tx, ty, w, h] = ISO_CAT.wear.tape;
      ctx.globalAlpha *= Math.min(1, pose.wear.tape);
      ctx.fillStyle = rampColour("wax", 4);
      ctx.fillRect(p.x + tx, p.y + ty, w, h);
    }
  }
  ctx.restore();
}

/** Snapped projected foot of a world point, in the scene's native pixels. */
function toFoot(p: { x: number; y: number }): { x: number; y: number } {
  const s = toScreen(p.x, p.y);
  return { x: snap(s.x), y: snap(s.y) };
}
