/**
 * Baked voxel puppets (scripts/iso-art/puppet.py -> gen/*-pixels.ts).
 *
 * A puppet is a set of posed frames turned in four real directions (SE, SW,
 * NW, NE: turned, never mirrored, so asymmetric identity points stay on the
 * body's own side), baked offline and drawn 1:1 at the snapped projected foot
 * like every baked sprite (gen-sprites.ts). This module holds what every
 * puppet shares: frame stepping, the hit flash and squash acting, the contact
 * shadow and the walking dust. It names no cat, enemy or costume.
 *
 * Presentation only: reads no SimState and consumes no RNG.
 */
import type { IsoPuppet } from "../art-registry.js";
import { GEN_SHADOW, genImage, genSprite, type GenLook } from "./gen-sprites.js";
import { snap, toScreen } from "./projection.js";
import type { IsoAnim, IsoDir } from "./sprite-sheet.js";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const PUPPET = {
  /** Pose steps per second of each animation (idle is a slow breath, walk a 6-frame cycle). */
  fps: { idle: 2, walk: 12, hurt: 1 },
  /** How long a hit flash stays on the puppet (render seconds). */
  flash: 0.06,
  /** Hurt squash right after a hit: this much wider and shorter, easing back over `time` seconds. */
  squash: { x: 1.14, y: 0.84, time: 0.16 },
  /** Walking dust: puffs left behind a moving puppet. */
  dust: { perSecond: 7, alpha: 0.3, colour: "#b4a582" },
} as const;

/** The frame of `anim` at render time `time`; reduced motion always shows frame 0. */
export function puppetFrame(p: IsoPuppet, anim: IsoAnim, time: number, reduced: boolean): number {
  const n = p.frames[anim] ?? 1;
  if (reduced || !Number.isFinite(time)) return 0;
  const f = Math.floor(time * PUPPET.fps[anim]);
  return ((f % n) + n) % n;
}

/** Sprite id of one baked frame. */
export function puppetSprite(p: IsoPuppet, dir: IsoDir, anim: IsoAnim, frame: number): string {
  return `${p.identity}-${dir}-${anim}-${frame}`;
}

export interface PuppetDraw {
  /** Palette swap of the frame (a cached canvas per look). */
  readonly look?: GenLook;
  /** Squash factors about the foot (1, 1 is the baked frame). */
  readonly sx?: number;
  readonly sy?: number;
}

/**
 * Draws baked frame `id` with its foot on the snapped projected point of
 * world (x, y); `ctx` carries the camera transform. Returns false when the
 * frame does not exist or has no canvas (no DOM and no OffscreenCanvas).
 */
export function drawPuppet(ctx: Ctx, id: string, x: number, y: number, o: PuppetDraw = {}): boolean {
  const s = genSprite(id), img = genImage(id, o.look);
  if (!s || !img) return false;
  const p = toScreen(x, y), fx = snap(p.x), fy = snap(p.y), sx = o.sx ?? 1, sy = o.sy ?? 1;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (sx === 1 && sy === 1) ctx.drawImage(img, fx - s.ax, fy - s.ay);
  else ctx.drawImage(img, fx - s.ax * sx, fy - s.ay * sy, s.w * sx, s.h * sy);
  ctx.imageSmoothingEnabled = smooth;
  return true;
}

/** Hard contact shadow under a puppet at world (x, y): a stepped 2:1 ellipse in native pixels. */
export function drawPuppetShadow(ctx: Ctx, x: number, y: number, s: { readonly rx: number; readonly ry: number; readonly dx?: number; readonly dy?: number }): void {
  const p = toScreen(x, y), fx = snap(p.x) + (s.dx ?? 0), fy = snap(p.y) + (s.dy ?? 0);
  ctx.save();
  ctx.globalAlpha *= GEN_SHADOW.alpha;
  ctx.fillStyle = GEN_SHADOW.colour;
  for (let dy = -s.ry; dy <= s.ry; dy++) {
    const w = Math.floor(s.rx * Math.sqrt(1 - (dy / (s.ry + 1)) ** 2));
    ctx.fillRect(fx - w, fy + dy, w * 2 + 1, 1);
  }
  ctx.restore();
}

/**
 * Dust puffs left behind a puppet at world (x, y) moving with world velocity
 * (vx, vy): three fading pixel puffs trailing its screen direction. Nothing
 * stands still under reduced motion, so a still or reduced frame draws none.
 */
export function drawPuppetDust(ctx: Ctx, x: number, y: number, vx: number, vy: number, time: number, reduced: boolean): void {
  if (reduced) return;
  const v = toScreen(vx, vy), len = Math.hypot(v.x, v.y);
  if (!(len > 1e-6) || !Number.isFinite(time)) return;
  const p = toScreen(x, y), fx = snap(p.x), fy = snap(p.y), ux = v.x / len, uy = v.y / len;
  ctx.save();
  ctx.fillStyle = PUPPET.dust.colour;
  for (let i = 0; i < 3; i++) {
    const age = (time * PUPPET.dust.perSecond + i / 3) % 1, back = 4 + age * 8, side = (i - 1) * 2;
    ctx.globalAlpha *= (1 - age) * PUPPET.dust.alpha;
    const w = age < 0.5 ? 2 : 1;
    ctx.fillRect(Math.round(fx - ux * back - uy * side) - 1, Math.round(fy - uy * back + ux * side * 0.5) - 1, w, 1);
  }
  ctx.restore();
}
