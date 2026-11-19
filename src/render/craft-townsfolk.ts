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
import { flatShadow, paperEmblem } from "./paper-kit.js";
import type { Ctx } from "./paper-material.js";
import { inkDot } from "./townsfolk-kit.js";
import { sketchedSprite } from "./sprite-sketch.js";

const PAD = 4;
/** The cached sprite of one townsfolk pose (pure in its key). */
function figureSprite(art: TownsfolkArt, facing: 1 | -1, frame: 0 | 1): CanvasSprite {
  const b = art.bounds, w = b.r - b.l + PAD * 2, h = b.b - b.t + PAD * 2;
  return cachedSprite(`townsfolk:${art.id}:${facing}:${frame}`, w, h, 2, (c) => {
    c.translate(PAD - b.l, PAD - b.t);
    art.paint(c, facing, frame);
  }, { x: (PAD - b.l) / w, y: (PAD - b.t) / h });
}
const TAG = { w: 24, h: 15 } as const;
/** A cream paper speech tag with three ink dots, tail at its bottom-left. */
function tagSprite(): CanvasSprite {
  return cachedSprite("townsfolk:tag", TAG.w + 8, TAG.h + 10, 2, (c) => {
    c.translate(4, 4);
    paperEmblem(c, [{
      color: "#efe3c8",
      shape: [[0, 0], [TAG.w, 0], [TAG.w, TAG.h], [9, TAG.h], [4, TAG.h + 5], [5, TAG.h], [0, TAG.h]],
    }]);
    for (const x of [6.5, 12, 17.5]) inkDot(c, 1, x, TAG.h / 2, 1.4, "#4a3328");
  }, { x: 8 / (TAG.w + 8), y: 1 });
}

/** One townsfolk at its pose: shadow on the ground, figure lifted by `bob`. */
export function drawTownsfolk(ctx: Ctx, art: TownsfolkArt, x: number, y: number, pose: Pick<TownsfolkPose, "facing" | "frame">, bob = 0, pencil = 0): void {
  flatShadow(ctx, x, y + 1, art.foot, art.foot * 0.32, 0.9);
  let sprite = figureSprite(art, pose.facing, pose.frame);
  if (pencil > 0) sprite = sketchedSprite(sprite, pencil);
  sprite.draw(ctx, { x, y: y + bob });
}
/** The speech tag above a townsfolk's head. */
export function drawTownsfolkTag(ctx: Ctx, art: TownsfolkArt, x: number, y: number, bob = 0): void {
  tagSprite().draw(ctx, { x: x + 4, y: y + art.bounds.t - 2 + bob });
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
    const bob = reduced ? 0 : pose.moving ? -Math.abs(Math.sin(time * 9)) * 1.4 : Math.sin(time * 1.6 + npc.seed) * 0.5,
      pencil = sketch?.(pose.x, pose.y) ?? 0;
    add(pose.y, () => {
      drawTownsfolk(ctx, art, pose.x, pose.y, pose, bob, pencil);
      if (npc.id === talking) drawTownsfolkTag(ctx, art, pose.x, pose.y, reduced ? 0 : Math.sin(time * 2.4) * 0.8);
    });
  }
}
