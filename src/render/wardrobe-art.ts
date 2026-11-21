import type { CatId } from "../cats/types.js";
import { catArt, costumeArtOf } from "./art-registry.js";

/** Ticket portrait box (canvas units), shared with the cat tickets and the HUD badge. */
export const TICKET_PORTRAIT = { w: 64, h: 52 } as const;

/** Head-only portrait of the cat, wearing the costume's makeup when one is given. */
export function paintCatPortrait(canvas: HTMLCanvasElement, id: CatId, costume?: string | null): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TICKET_PORTRAIT.w, TICKET_PORTRAIT.h);
  ctx.imageSmoothingEnabled = false;
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

/** A native-grid locked inventory slot; no paper-cover texture. */
export function paintLockedCover(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TICKET_PORTRAIT.w, TICKET_PORTRAIT.h);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#19333f"; ctx.fillRect(6, 5, 52, 44);
  ctx.fillStyle = "#496873"; ctx.fillRect(8, 7, 48, 2);
  ctx.fillStyle = "#6b8986"; ctx.fillRect(23, 14, 18, 4);
  ctx.fillRect(19, 18, 4, 12); ctx.fillRect(41, 18, 4, 12);
  ctx.fillStyle = "#91a89a"; ctx.fillRect(17, 28, 30, 16);
  ctx.fillStyle = "#c3cfaf"; ctx.fillRect(19, 28, 26, 3);
  ctx.fillStyle = "#29434d"; ctx.fillRect(29, 32, 6, 6); ctx.fillRect(31, 36, 2, 5);
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
