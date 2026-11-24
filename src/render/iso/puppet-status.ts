import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
import { Painter, createFrame, toCss } from "../pixelfx/index.js";
import type { IsoFxFrame } from "./fx-frame.js";
import { paintStatus } from "./fx-paint.js";
import { snap, toScreen } from "./projection.js";

/** Native-pixel box of a puppet around its foot (half width, rows above the foot). */
export interface PuppetBox {
  readonly halfWidth: number;
  readonly top: number;
}

export interface PuppetStatusActor {
  readonly x: number;
  readonly y: number;
  readonly burnTime?: number;
  readonly wetTime?: number;
}

/** Wet marks take precedence over burning. The live scene shares its light
 * buffer, while standalone painters can render the same pixels directly. */
export function drawPuppetStatus(ctx: Ctx, actor: PuppetStatusActor, time: number, box: PuppetBox, fx?: IsoFxFrame): void {
  if (!(actor.wetTime && actor.wetTime > 0) && !(actor.burnTime && actor.burnTime > 0)) return;
  if (fx) {
    fx.actorStatus(ctx, actor, box);
    return;
  }
  const w = Math.ceil(box.halfWidth) + 3, h = Math.ceil(box.top) + 6;
  const f = createFrame(w * 2 + 1, h + 6, -w, -h);
  paintStatus(new Painter(f), { ...box, ...actor }, time, reducedPaperMotion());
  const s = toScreen(actor.x, actor.y);
  for (let i = 0; i < f.color.length; i++) {
    const c = f.color[i]!;
    if (!c) continue;
    ctx.fillStyle = toCss(c);
    ctx.fillRect(snap(s.x) + i % f.w - w, snap(s.y) + Math.floor(i / f.w) - h, 1, 1);
  }
}
