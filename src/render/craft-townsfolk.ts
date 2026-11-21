/**
 * Draws the neutral townsfolk: cached paper figures per (kind, facing, step
 * frame), a live flat contact shadow and a small idle bob, plus a paper
 * speech tag over the one talking to the cat. Read-only: positions come from
 * the pure src/game/townsfolk.ts helpers at `sim.elapsed`, so the drawn
 * figure and the HUD tip agree; nothing here touches SimState or the sim RNG.
 */
import { cachedSprite, type CanvasSprite } from "../engine/sprite.js";
import type { SimState } from "../game/types.js";
import { nearestTownsfolk, townsfolkNear, townsfolkPose, type TownsfolkPose } from "../game/townsfolk.js";
import { TOWNSFOLK_ART, type TownsfolkArt } from "./art-registry.js";
import { viewRect, type Camera } from "./camera.js";
import type { Ctx } from "./paper-material.js";
import { sketchedSprite } from "./sprite-sketch.js";

const PAD = 4;
/** The cached sprite of one townsfolk pose (pure in its key). */
function figureSprite(art: TownsfolkArt, facing: 1 | -1, frame: 0 | 1): CanvasSprite {
  const b = art.bounds, w = b.r - b.l + PAD * 2, h = b.b - b.t + PAD * 2;
  return cachedSprite(`townsfolk:${art.id}:${facing}:${frame}`, w, h, 1, (c) => {
    c.translate(PAD - b.l, PAD - b.t);
    art.paint(c, facing, frame);
  }, { x: (PAD - b.l) / w, y: (PAD - b.t) / h });
}
const TAG = { w: 24, h: 15 } as const;
/** Native 1x speech bubble with square dots and a stepped tail. */
function tagSprite(): CanvasSprite {
  return cachedSprite("pixel-townsfolk:tag", TAG.w + 8, TAG.h + 10, 1, (c) => {
    c.fillStyle = "#192333";
    c.fillRect(3, 4, TAG.w + 2, TAG.h); c.fillRect(4, 3, TAG.w, TAG.h + 2);
    c.fillRect(7, TAG.h + 3, 6, 6); c.fillRect(7, TAG.h + 7, 3, 3);
    c.fillStyle = "#efe3c8"; c.fillRect(5, 5, TAG.w - 2, TAG.h - 2);
    c.fillRect(8, TAG.h + 2, 3, 5);
    c.fillStyle = "#354458";
    for (const x of [9, 16, 23]) c.fillRect(x, 10, 2, 3);
  }, { x: 8 / (TAG.w + 8), y: 1 });
}

/** One townsfolk at its pose: shadow on the ground, figure lifted by `bob`. */
export function drawTownsfolk(ctx: Ctx, art: TownsfolkArt, x: number, y: number, pose: Pick<TownsfolkPose, "facing" | "frame">, bob = 0, pencil = 0): void {
  ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = "#172631";
  ctx.fillRect(Math.round(x - art.foot), Math.round(y), art.foot * 2, 3);
  ctx.fillRect(Math.round(x - art.foot + 3), Math.round(y - 1), art.foot * 2 - 6, 5);
  ctx.restore();
  let sprite = figureSprite(art, pose.facing, pose.frame);
  if (pencil > 0) sprite = sketchedSprite(sprite, pencil);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  sprite.draw(ctx, { x: Math.round(x), y: Math.round(y + bob) });
  ctx.restore();
}
/** The speech tag above a townsfolk's head. */
export function drawTownsfolkTag(ctx: Ctx, art: TownsfolkArt, x: number, y: number, bob = 0): void {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  tagSprite().draw(ctx, { x: Math.round(x + 4), y: Math.round(y + art.bounds.t - 2 + bob) });
  ctx.restore();
}

/**
 * Adds the townsfolk inside the view to the y-sorted world sprites. `sketch`
 * gives the pencil amount at a base point when the page has washed cells.
 */
export function townsfolkSprites(
  ctx: Ctx, sim: SimState, cam: Camera, time: number,
  add: (y: number, draw: () => void) => void,
  sketch?: (x: number, y: number) => number, reduced = false,
): void {
  const view = viewRect(cam), t = sim.elapsed,
    talking = nearestTownsfolk(sim.seed, sim.player.x, sim.player.y, t)?.npc.id;
  for (const npc of townsfolkNear(sim.seed, cam.x, cam.y, Math.hypot(view.x1 - cam.x, view.y1 - cam.y) + 60)) {
    const art = TOWNSFOLK_ART.find(npc.kind);
    if (!art) continue;
    const pose = townsfolkPose(npc, t), b = art.bounds;
    if (pose.x + b.r < view.x0 || pose.x + b.l > view.x1 || pose.y + b.b < view.y0 || pose.y + b.t - 24 > view.y1) continue;
    // Render-only motion: a step hop while walking, a slow breath while resting.
    const bob = reduced ? 0 : pose.moving ? -Math.round(Math.abs(Math.sin(time * 9))) : 0,
      pencil = sketch?.(pose.x, pose.y) ?? 0;
    add(pose.y, () => {
      drawTownsfolk(ctx, art, pose.x, pose.y, pose, bob, pencil);
      if (npc.id === talking) drawTownsfolkTag(ctx, art, pose.x, pose.y, reduced ? 0 : Math.sin(time * 2.4) * 0.8);
    });
  }
}
