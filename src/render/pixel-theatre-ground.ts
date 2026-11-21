import type { Ctx } from './paper-material.js';

/** Flush audience apron: a quiet aisle separates the existing bench rows. */
export function drawTheatreGround(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const r = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  // Fan-shaped timber court, its diagonal sides resolved at native pixels.
  for (let row = -75; row <= 93; row++) {
    const reach = Math.floor(118 + (row + 75) * .2);
    r(-reach, row, reach * 2 + 1, 1, '#7a705e');
    r(-reach + 2, row, reach * 2 - 3, 1, Math.floor((row + 75) / 13) % 2 ? '#8b7b65' : '#857760');
    if ((row + 75) % 13 === 12) r(-reach + 3, row, reach * 2 - 5, 1, '#a08b6e');
  }
  for (let row = 0; row < 13; row++) {
    const py = -74 + row * 13, reach = 114 + row * 2;
    for (let col = -2; col <= 2; col++) {
      const px = col * 57 + (row % 2 ? 22 : 0);
      if (Math.abs(px) > reach - 4) continue;
      r(px, py + 1, 1, 10, '#706b59');
      if ((col + row + 15) % 3 === 0) r(px + 4, py + 4, 1, 1, '#626451');
    }
  }
  // An understated woven aisle, without a false raised stage or new barrier.
  r(-14, -29, 28, 120, '#6b6263');
  r(-11, -29, 22, 120, '#797073');
  for (let i = 0; i < 19; i++) {
    r(-13, -25 + i * 6, 1, 2, '#ae997b');
    r(12, -25 + i * 6, 1, 2, '#ae997b');
  }
  // Quiet worn seating patches stay under the actual two rows of benches.
  for (const row of [0, 1]) for (const side of [-1, 1]) {
    const px = side * (52 + row * 10), py = 18 + row * 34;
    r(px - 25, py + 1, 50, 2, '#776f5c');
    r(px - 18, py + 5, 36, 1, '#9c896c');
  }
  // Two ticket stubs are flat litter, visually quieter than combat pickups.
  for (const [tx, ty] of [[-107, 48], [105, 72]]) {
    r(tx, ty, 10, 5, '#b9a385'); r(tx + 2, ty + 1, 5, 1, '#8b7c69');
    r(tx + 7, ty + 2, 1, 2, '#8b7c69');
  }
  ctx.restore();
}
