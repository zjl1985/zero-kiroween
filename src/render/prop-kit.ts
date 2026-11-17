/**
 * Shared phases for prop art: a prop paints its intact look once, and the
 * damaged and scraps looks are derived from it. Damaged clips the intact
 * art below a torn line (the top is ripped away) and leaves fibre and
 * scraps; scraps are torn stubs on the ground, or ash when burnt. Pure Canvas
 * code with render hashes only, so the results can be cached per variant.
 */
import type { ArtBounds, PropArt } from "./art-registry.js";
import { paperCut, tornEdge } from "./paper-kit.js";
import { hash, mix, shadow, type Ctx, type Point } from "./paper-material.js";
import { ashPatch, scrapPieces, tornStub } from "./paper-scraps.js";

export interface PhasedLook {
  readonly bounds: ArtBounds;
  /** The intact prop at s = 1 with its base at (0, 0). */
  intact(ctx: Ctx, v: number): void;
  /** Paper colour of the stubs left standing. */
  readonly stub: string;
  /** Stubs left standing: x offsets and heights at s = 1. */
  readonly stubs: readonly (readonly [number, number])[];
  /** Colours of the scraps on the ground. */
  readonly scraps: readonly string[];
  /** Half width / depth of the scrap and ash patch. */
  readonly spread: readonly [number, number];
  /** Fraction of the height kept when damaged (default 0.5..0.68 by variant). */
  readonly keep?: number;
}

/** A torn line across the art box at height `y`, right to left, slanted by the variant. */
function tearLine(b: ArtBounds, y: number, v: number): Point[] {
  const slant = (hash(v * 13 + 5) - 0.5) * 14;
  return tornEdge(b.r + 6, y + slant, b.l - 6, y - slant, 9, 3.2, v * 7 + 3);
}

/** A PropArt.paint built from one intact painter (see PhasedLook). */
export function phasedPaint(look: PhasedLook): PropArt["paint"] {
  const b = look.bounds,
    [sx, sy] = look.spread;
  return (ctx, x, y, s, v, phase, burnt) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (phase === "intact") look.intact(ctx, v);
    else if (phase === "damaged") {
      const keep = look.keep ?? 0.5 + hash(v * 3 + 1) * 0.18,
        line = tearLine(b, b.t * keep, v),
        clip = new Path2D();
      clip.moveTo(b.l - 8, b.b + 8);
      clip.lineTo(b.r + 8, b.b + 8);
      for (const [px, py] of line) clip.lineTo(px, py);
      clip.closePath();
      ctx.save();
      ctx.clip(clip);
      look.intact(ctx, v);
      ctx.restore();
      // Pale fibre where the paper ripped.
      ctx.save();
      ctx.clip(clip);
      ctx.strokeStyle = mix(look.stub, "#f3e2b8", 0.6);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      line.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + 0.8) : ctx.moveTo(px, py + 0.8)));
      ctx.stroke();
      ctx.restore();
      scrapPieces(ctx, (hash(v) - 0.5) * sx * 0.6, 4, sx * 0.7, look.scraps, v * 19 + 4, 6);
    } else if (burnt) ashPatch(ctx, 0, 2, sx, sy, v + 11);
    else {
      shadow(ctx, 0, 3, sx * 0.9, sy * 0.7);
      look.stubs.forEach(([dx, h], i) => tornStub(ctx, dx, 2, Math.max(4, h * 0.45), h * (0.7 + hash(v + i) * 0.5), look.stub, v * 5 + i));
      scrapPieces(ctx, 0, 5, sx, look.scraps, v * 23 + 7, 11);
    }
    ctx.restore();
  };
}

/** A straight paper strip (posts, poles, stems) from (x, y0) up to y1, `w` wide. */
export function post(ctx: Ctx, x: number, y0: number, y1: number, w: number, color: string, seed = 1): void {
  paperCut(ctx, [[x - w / 2, y0], [x - w * 0.42, y1], [x + w * 0.42, y1 - 0.6], [x + w / 2, y0]], {
    color,
    shadow: 1.4,
    thickness: 0.7,
    texture: 0.8,
    wear: 0.2,
    seed,
  });
}
