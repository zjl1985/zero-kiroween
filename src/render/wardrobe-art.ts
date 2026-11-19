import type { CatId } from "../cats/types.js";
import { catArt, costumeArtOf } from "./art-registry.js";
import { foldLine, paperCut } from "./paper-kit.js";
import type { Point } from "./paper-material.js";

/** Ticket portrait box (canvas units), shared with the cat tickets and the HUD badge. */
export const TICKET_PORTRAIT = { w: 64, h: 52 } as const;

/** Head-only portrait of the cat, wearing the costume's makeup when one is given. */
export function paintCatPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: string | null): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TICKET_PORTRAIT.w, TICKET_PORTRAIT.h);
  catArt(id).portrait(
    ctx,
    {
      id,
      x: 32,
      y: 48,
      facing: 1,
      moving: false,
      dashing: false,
      hurt: false,
      time: 0,
      ...(costume ? { costume } : {}),
    },
    0.15,
  );
}

const HEAD: Point[] = [
  [17, 46], [14, 31], [17, 14], [24, 24], [32, 21], [40, 24], [47, 14], [50, 31], [47, 46],
];
/** A locked wardrobe ticket: a folded kraft cover with a dark cat-head silhouette cut into it. */
export function paintLockedCover(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TICKET_PORTRAIT.w, TICKET_PORTRAIT.h);
  paperCut(ctx, [[6, 6], [58, 4], [59, 47], [5, 48]], { color: "#a9835e", thickness: 1, shadow: 1.2, texture: 0.6 });
  paperCut(ctx, HEAD, { color: "#3a3045", thickness: 0.8, shadow: 0.8, edge: "#6a5a70", texture: 0.4 });
  foldLine(ctx, 6, 27, 59, 25, 0.7);
}

/** The costume's small wardrobe glyph (32 x 32 box) scaled into the canvas. */
export function paintCostumeGlyph(canvas: HTMLCanvasElement, costume: string): void {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const art = costumeArtOf(costume);
  if (!art) return;
  ctx.scale(canvas.width / 32, canvas.height / 32);
  art.ticket(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
