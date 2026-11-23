/**
 * Burn and wet marks over a native puppet (the iso counterpart of
 * paper-status-art.ts `drawActorPaperStatus`), in native pixels around its
 * projected foot: small stepped flames on the body while it carries fire,
 * soaked patches and a falling drip while it is wet. A wet actor does not
 * burn. Presentation only: reads the actor's status timers, changes nothing.
 */
import type { Ctx } from "../paper-material.js";
import { reducedPaperMotion } from "../paper-motion.js";
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

/** Fire and water steps of the marks (cool night scene, so both run warm against it only at the core). */
const BURN = { a: "#a83a1e", b: "#ef7f24", c: "#f9bf3c", d: "#fff0a8" } as const;
const WET = { a: "#3f6472", b: "#64828a", c: "#aec1b6" } as const;

/** Three flame poses (letters index BURN), top row first: a dark base, an orange body, a yellow core, a pale tip. */
const FLAMES: readonly (readonly string[])[] = [
  ["..d", ".c.", "abc", "aba"],
  ["d..", ".cb", "abc", ".ba"],
  [".d.", "cb.", "abc", "aba"],
];

/** One flame pose with the centre of its bottom row on (x, y). */
function flame(ctx: Ctx, x: number, y: number, pose: readonly string[]): void {
  for (let r = 0; r < pose.length; r++)
    for (let c = 0; c < pose[r]!.length; c++) {
      const k = pose[r]![c]!;
      if (k === ".") continue;
      ctx.fillStyle = k === "a" ? BURN.a : k === "b" ? BURN.b : k === "c" ? BURN.c : BURN.d;
      ctx.fillRect(x + c - 1, y - (pose.length - 1) + r, 1, 1);
    }
}

/** Draws the actor's burn or wet marks; nothing when it neither burns nor is wet. */
export function drawPuppetStatus(ctx: Ctx, actor: PuppetStatusActor, time: number, box: PuppetBox): void {
  const wet = (actor.wetTime ?? 0) > 0, burning = !wet && (actor.burnTime ?? 0) > 0;
  if (!wet && !burning) return;
  const p = toScreen(actor.x, actor.y), fx = snap(p.x), fy = snap(p.y), hw = box.halfWidth, top = box.top;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, (wet ? actor.wetTime ?? 0 : actor.burnTime ?? 0) * 2);
  if (burning) {
    const step = reducedPaperMotion() ? 0 : Math.floor(time * 10);
    flame(ctx, fx - Math.round(hw * 0.7), fy - Math.round(top * 0.28), FLAMES[step % 3]!);
    flame(ctx, fx + Math.round(hw * 0.6), fy - Math.round(top * 0.5), FLAMES[(step + 1) % 3]!);
    flame(ctx, fx + Math.round(hw * 0.15), fy - top - 1, FLAMES[(step + 2) % 3]!);
  } else {
    // Soaked cloth: teal patches with a pale wrinkle on the lower body, and a drip running off it.
    ctx.fillStyle = WET.b;
    ctx.fillRect(fx - Math.round(hw * 0.8), fy - Math.round(top * 0.3), 3, 2);
    ctx.fillRect(fx + Math.round(hw * 0.2), fy - Math.round(top * 0.55), 2, 1);
    ctx.fillStyle = WET.a;
    ctx.fillRect(fx - Math.round(hw * 0.8) + 1, fy - Math.round(top * 0.3) + 1, 2, 1);
    ctx.fillStyle = WET.c;
    ctx.fillRect(fx - Math.round(hw * 0.8), fy - Math.round(top * 0.3), 1, 1);
    const fall = reducedPaperMotion() ? 0.4 : (time * 1.3) % 1;
    ctx.fillRect(fx + Math.round(hw * 0.2) + 1, fy - Math.round(top * 0.3) + Math.round(fall * 5), 1, fall > 0.85 ? 0 : 1);
  }
  ctx.restore();
}
