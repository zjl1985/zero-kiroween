import { cachedSprite } from "../engine/sprite.js";
import { EFFECT_LIFE, type Impact, type PaperStatus } from "../game/types.js";
import { foldLine } from "./paper-kit.js";
import { glow, line, path, piece, stroke, type Ctx } from "./paper-material.js";

/** A fixed cut, animated by transforms only; shared by carried and grid fire. */
export function drawPaperFlame(ctx: Ctx, x: number, y: number, size: number, phase: number, variant = 0): void {
  const v = Math.abs(variant) % 2;
  const sprite = cachedSprite(`status:flame:${v}`, 24, 34, 2, (c) => {
    c.translate(12, 30);
    piece(c, path([[-6, 0], [-7, -7], [-3, -15], [-2, -10], [1, -25], [4, -16], [3, -11], [6, -15], [7, -5], [5, 0]]), "#cf6037", { shadow: 0.5, edge: "#f7b96a", thickness: 0.9, texture: 0.3 });
    piece(c, path([[-4, -1], [-3, -8], [0, -17], [1, -9], [4, -5], [3, 0]]), v ? "#f4c868" : "#efb655", { shadow: 0.3, edge: "#ffe8ac", thickness: 0.5, texture: 0.2 });
    foldLine(c, 0, -2, 0, -13, 0.45);
  }, { x: 0.5, y: 30 / 34 });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((phase - 0.5) * 0.13);
  ctx.scale(1, 0.85 + phase * 0.3);
  sprite.draw(ctx, { x: 0, y: 0, scale: size / 25 });
  ctx.restore();
}

type Mote = "drop" | "steam" | "leaf" | "ink" | "reward" | "char";
function mote(kind: Mote) {
  return cachedSprite(`status:${kind}`, 26, 28, 2, (ctx) => {
    ctx.translate(13, 14);
    if (kind === "steam") {
      const curl = new Path2D("M -6 8 Q 3 6 -1 0 Q -6 -7 2 -10 L 5 -7 Q 0 -5 3 0 Q 8 8 -4 10 Z");
      piece(ctx, curl, "#d6ded6", { shadow: 0, edge: "#f2eee0", texture: 0.22, thickness: 0.45 });
      return;
    }
    if (kind === "char") {
      piece(ctx, path([[-7, 7], [-8, -4], [-5, -2], [-6, -8], [-2, -5], [0, 0], [6, 5], [2, 8], [-1, 5], [-3, 9]]), "#33262b", { shadow: 0, edge: "#805741", texture: 0.4, thickness: 0.7 });
      line(ctx, -5, -1, -3, 5, "#cb7846", 0.65, 0.8);
      return;
    }
    if (kind === "leaf") {
      piece(ctx, path([[-7, 6], [-6, -2], [-2, -8], [6, -10], [7, -2], [2, 5]]), "#9db484", { shadow: 0.6, edge: "#dbe2b6", texture: 0.4, thickness: 0.7 });
      foldLine(ctx, -5, 5, 5, -8, 0.6);
      return;
    }
    if (kind === "reward") {
      piece(ctx, path([[0, -10], [3, -3], [10, 0], [3, 3], [0, 10], [-3, 3], [-10, 0], [-3, -3]]), "#e5c37d", { shadow: 0.8, edge: "#fff0bd", texture: 0.4, thickness: 0.7 });
      foldLine(ctx, 0, -8, 0, 8, 0.5);
      return;
    }
    piece(ctx, new Path2D("M 0 -9 Q 2 -4 5 1 Q 8 8 0 9 Q -8 8 -5 1 Z"), kind === "ink" ? "#51405f" : "#83b8c5", { shadow: 0.5, edge: kind === "ink" ? "#a99ab7" : "#d7eee3", texture: 0.25, thickness: 0.6 });
    line(ctx, -2, 1, -3, 4, kind === "ink" ? "#b1a1c0" : "#eff5de", 0.9);
  }, { x: 0.5, y: 0.5 });
}

/** Read-only overlays after the real actor art; no status is attached to skill decoys. */
export function drawActorPaperStatus(
  ctx: Ctx, actor: PaperStatus & { x: number; y: number }, time: number,
  radius: number, height = radius * 2,
): void {
  const wet = (actor.wetTime ?? 0) > 0, burning = !wet && (actor.burnTime ?? 0) > 0;
  if (!wet && !burning) return;
  ctx.save();
  if (burning) {
    const strength = Math.min(1, (actor.burnTime ?? 0) * 3);
    ctx.globalAlpha *= strength;
    // Char clings to the side/hem, never masks identifying eyes or face marks.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(actor.x + side * radius * 0.65, actor.y - height * 0.25);
      ctx.scale(side, 1);
      mote("char").draw(ctx, { x: 0, y: 0, scale: Math.min(1.1, radius / 14) });
      ctx.restore();
      drawPaperFlame(ctx, actor.x + side * radius * 0.72, actor.y - 2, Math.min(23, height * 0.52), 0.5 + Math.sin(time * 10 + side) * 0.5, side < 0 ? 0 : 1);
    }
    glow(ctx, actor.x, actor.y - 6, radius * 1.8, "#e8954b", 0.13, 0.6);
  } else {
    ctx.globalAlpha *= Math.min(0.9, (actor.wetTime ?? 0) * 2);
    // Blue teardrops + interrupted ripple distinguish damp paper from carried fire.
    const ripple = new Path2D();
    ripple.ellipse(actor.x, actor.y + 1, radius + 4, 3.5, 0, 0.1, Math.PI * 0.9);
    ripple.ellipse(actor.x, actor.y + 1, radius + 4, 3.5, 0, Math.PI * 1.12, Math.PI * 1.88);
    stroke(ctx, ripple, "#a5ced0", 0.9, 0.8);
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.8 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - k * 0.65;
      mote("drop").draw(ctx, { x: actor.x + (i - 1) * radius * 0.72, y: actor.y - height * 0.65 + k * height * 0.55, scale: 0.25 + Math.min(0.15, radius / 100) });
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Regeneration stays an anticipation cue, not a prematurely intact/colliding prop. */
export function drawRegrowCue(ctx: Ctx, x: number, y: number, progress: number, scale: number): void {
  if (progress <= 0) return;
  ctx.save();
  ctx.globalAlpha *= 0.35 + Math.min(1, progress) * 0.5;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x + side * 3 * scale, y - 2 * scale);
    ctx.rotate(side * 0.65);
    mote("leaf").draw(ctx, { x: 0, y: 0, scale: (0.18 + progress * 0.25) * scale });
    ctx.restore();
  }
  ctx.restore();
}

export function drawPaperStatusEffect(ctx: Ctx, e: Impact): boolean {
  if (e.kind !== "steam" && e.kind !== "regrow" && e.kind !== "ink-wash" && e.kind !== "landmark-reward") return false;
  const t = Math.max(0, Math.min(1, 1 - e.life / EFFECT_LIFE[e.kind])),
    kind: Mote = e.kind === "steam" ? "steam" : e.kind === "regrow" ? "leaf" : e.kind === "ink-wash" ? "ink" : "reward",
    count = kind === "steam" ? 3 : kind === "reward" ? 6 : 5;
  ctx.save();
  ctx.globalAlpha *= (1 - t) * Math.min(1, t * 12 + 0.3);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count + (e.seed ?? 0),
      spread = kind === "steam" ? 7 + t * 9 : 6 + t * Math.min(35, e.radius ?? 26),
      x = e.x + Math.cos(a) * spread,
      y = e.y - 9 + Math.sin(a) * spread * 0.4 - t * (kind === "steam" ? 32 : 17);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(kind === "steam" ? Math.sin(a) * 0.15 : a + t * 1.4);
    mote(kind).draw(ctx, { x: 0, y: 0, scale: kind === "steam" ? 0.55 + t * 0.45 : 0.35 + (1 - t) * 0.25 });
    ctx.restore();
  }
  ctx.restore();
  return true;
}
