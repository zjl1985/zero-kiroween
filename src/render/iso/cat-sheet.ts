/**
 * The chosen cat uses frames extracted from the approved model sheet
 * (scripts/iso-art/reference_cats.py -> gen/cats-pixels.ts). Front and rear
 * three-quarter poses provide the four facings. Each has two idle frames,
 * six step frames and a hurt frame. A worn costume supplies a separate
 * foot-aligned layer (scripts/iso-art/costumes.py).
 */
import type { IsoPuppet } from "../art-registry.js";
import type { CatPose } from "../layout.js";
import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
import { CAT_PUPPET_FRAMES } from "./gen/cats-pixels.js";
import { rampColour } from "./palette.js";
import { snap, toScreen } from "./projection.js";
import { PUPPET, drawPuppet, drawPuppetShadow, puppetFrame, puppetLayer, puppetSprite, type PuppetDraw } from "./puppet.js";
import { drawReferenceCat, REFERENCE_CAT_HEIGHT } from "./reference-cat-art.js";
import type { IsoAnim, IsoDir } from "./sprite-sheet.js";

export const ISO_CAT = {
  /** Native-pixel box every baked frame stays inside, costumed ones included, around its foot: half width, rows above the foot, rows under it. */
  box: { halfWidth: 18, top: 35, bottom: 8 },
  /** Rows from the foot to the ear tips of a standing cat in its front view (outline included). */
  stand: REFERENCE_CAT_HEIGHT,
  /** Hard contact shadow, in native pixels, offset to the screen lower-left (spec section 5). */
  shadow: { rx: 7, ry: 2, dx: -1, dy: 1 },
  /** Paper wear marks on the torso, relative to the foot (native pixels). */
  wear: { marks: [[-4, -9, 2, 1], [2, -6, 2, 1]], tape: [0, -10, 3, 1] },
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
  const reduced = reducedPaperMotion(), anim = isoCatAnim(pose), frame = puppetFrame(puppet, anim, pose.time, reduced);
  const id = puppetSprite(puppet, dir, anim, frame), layer = pose.costume ? puppetLayer(puppet, pose.costume, dir, anim, frame) : undefined;
  const squash = act.squash ?? 0;
  const draw: PuppetDraw = {
    ...(act.flash && !reduced ? { look: "flash" } : {}),
    ...(squash > 0 ? { sx: 1 + (PUPPET.squash.x - 1) * squash, sy: 1 + (PUPPET.squash.y - 1) * squash } : {}),
  };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (pose.decoy) ctx.globalAlpha *= 0.35;
  drawPuppetShadow(ctx, pose.x, pose.y, ISO_CAT.shadow);
  const foot = toFoot(pose);
  if (!drawReferenceCat(ctx, puppet.identity, dir, anim, frame, foot.x, foot.y, draw)) {
    drawPuppet(ctx, id, pose.x, pose.y, draw);
  }
  // The costume layer flashes, squashes and fades with the cat under it.
  if (layer) drawPuppet(ctx, layer, pose.x, pose.y, draw);
  if (pose.wear && !pose.decoy) {
    ctx.fillStyle = rampColour("ink", 0);
    const marks = ISO_CAT.wear.marks.slice(0, Math.min(2, pose.wear.marks));
    for (const [mx, my, w, h] of marks) ctx.fillRect(foot.x + mx, foot.y + my, w, h);
    if (pose.wear.tape > 0) {
      const [tx, ty, w, h] = ISO_CAT.wear.tape;
      ctx.globalAlpha *= Math.min(1, pose.wear.tape);
      ctx.fillStyle = rampColour("wax", 4);
      ctx.fillRect(foot.x + tx, foot.y + ty, w, h);
    }
  }
  ctx.restore();
}

/** Snapped projected foot of a world point, in the scene's native pixels. */
function toFoot(p: { x: number; y: number }): { x: number; y: number } {
  const s = toScreen(p.x, p.y);
  return { x: snap(s.x), y: snap(s.y) };
}
