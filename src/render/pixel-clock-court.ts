import type { Ctx } from './paper-material.js';

/** Baked, flush civic paving. Authoritative roads still draw over the court. */
export function drawClockCourt(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const rect = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  const extent = (row: number) => {
    const d = Math.abs(row - 10);
    return d <= 36 ? 139 : 139 - (d - 36) * 1.35;
  };
  // One-pixel diagonal corners, without an elevated platform sidewall.
  for (let row = -66; row <= 86; row++) {
    const reach = Math.floor(extent(row));
    rect(-reach, row, reach * 2 + 1, 1, '#858c7b');
    if (row > -64 && row < 84) rect(-reach + 2, row, reach * 2 - 3, 1, '#737e72');
  }
  // Large irregularly jointed flagstones keep the plaza calm in play view.
  for (let row = -3; row <= 4; row++) {
    const py = row * 17 + 8, reach = extent(py) - 8;
    for (let col = -6; col <= 6; col++) {
      const px = col * 23 + (row % 2 ? 10 : 0);
      if (Math.abs(px) + 19 > reach || Math.abs(px) < 57 && Math.abs(py - 12) < 30) continue;
      rect(px, py, 18, 1, '#8d9481');
      if ((row + col + 21) % 3 !== 0) rect(px + 18, py + 1, 1, 9, '#667567');
      if ((row * 3 + col + 24) % 4 === 0) rect(px + 2, py + 3, 11, 1, '#798674');
    }
  }
  // Dark mortar ring fitted around the tower's actual shallow footing.
  for (let row = -22; row <= 22; row++) {
    const outer = Math.floor(58 * Math.sqrt(Math.max(0, 1 - (row / 22) ** 2)));
    const inner = Math.abs(row) > 19 ? 0 : Math.floor(53 * Math.sqrt(Math.max(0, 1 - (row / 19) ** 2)));
    if (outer > inner) {
      rect(-outer, row + 5, outer - inner, 1, '#a1a18a');
      rect(inner, row + 5, outer - inner + 1, 1, '#a1a18a');
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    rect(Math.cos(a) * 55 - 1, 5 + Math.sin(a) * 20 - 1, 2, 2, '#656f63');
  }
  // Door approach is a flat stone band, never a new traversable deck.
  for (let i = 0; i < 5; i++) {
    rect(-12 + (i % 2), 13 + i * 10, 24, 7, i % 2 ? '#9a9e87' : '#a7a78f');
    rect(-11 + (i % 2), 19 + i * 10, 22, 1, '#6c7869');
  }
  ctx.restore();
}
