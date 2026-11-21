import { RIVER } from '../defs/landmarks/stone-bridge/def.js';
import type { LandmarkPlace } from '../defs/types.js';
import type { Ctx } from './paper-material.js';

/** Dry-bank decoration. Every pixel stays outside the authoritative river. */
export function drawBridgeBanks(ctx: Ctx, l: LandmarkPlace): void {
  const span = l.span ?? RIVER.halfLength, left = Math.ceil(l.x - span), right = Math.floor(l.x + span);
  ctx.save();
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  for (const side of [-1, 1]) {
    // Sparse short vegetation and soil planes replace the old checker bands.
    for (let row = 5; row < 35; row++) {
      const edge = Math.floor((row - 5) / 6), y = l.y + side * (RIVER.halfWidth + row);
      r(left + edge, y, Math.max(1, right - left - edge * 2), 1, row < 12 ? '#637867' : '#6b7d63');
    }
    for (let x = left + 10; x < right - 14; x += 29) {
      const cell = Math.floor(x / 29), bankY = l.y + side * (RIVER.halfWidth + 8);
      // Flat shoreline stones: no tall wall suggesting extra collision.
      r(x, bankY, 14, 3, '#86957c'); r(x + 2, bankY - 1, 9, 1, '#a6ad8b');
      if (Math.abs(x - l.x) > RIVER.deckHalf + 6) {
        const py = l.y + side * (RIVER.halfWidth + 22 + Math.abs(cell % 3));
        r(x + 7, py, 8, 2, '#536e55'); r(x + 8, py - 3, 2, 4, '#8b9b6b');
        r(x + 12, py - 5, 2, 6, '#a1aa79'); r(x + 15, py - 2, 2, 3, '#788e60');
      }
    }
    // Flush approach stones lie entirely on dry ground beyond the deck ends.
    for (let row = 0; row < 2; row++) for (let col = -3; col <= 3; col++) {
      const x = l.x + col * 19 - 8, y = l.y + side * (RIVER.halfWidth + 20 + row * 10);
      r(x, y - 3, 17, 7, (col + row + 6) % 3 ? '#939b82' : '#a5a58b');
      r(x + 1, y - 3, 14, 1, '#b7b496'); r(x + 1, y + 3, 15, 1, '#6a7b68');
    }
  }
  ctx.restore();
}
