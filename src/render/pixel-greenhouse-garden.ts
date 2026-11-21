import type { Ctx } from './paper-material.js';

/** Baked potting garden, entirely flush with the existing terrain. */
export function drawGreenhouseGarden(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const rect = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  // Single-pixel contours avoid the old eight-pixel stair-step platform.
  for (let row = -86; row <= 93; row++) {
    const ry = row < 0 ? 86 : 93;
    const reach = Math.floor(173 * Math.sqrt(Math.max(0, 1 - (row / ry) ** 2)));
    if (reach) rect(-reach, row, reach * 2 + 1, 1, '#677461');
  }
  // An earthen apron connects the existing door, pots and workbench.
  for (let row = -18; row <= 86; row++) {
    const reach = row < 28 ? 18 : Math.min(135, 18 + (row - 28) * 3);
    rect(-8 - reach, row, reach * 2, 1, '#817d64');
  }
  for (let i = 0; i < 8; i++) {
    const px = -19 + (i % 2) * 2, py = -17 + i * 10;
    rect(px, py, 23, 7, i % 2 ? '#9b9c80' : '#a9a589');
    rect(px + 1, py + 6, 21, 1, '#6c7563');
    rect(px + 2, py, 17, 1, '#b1af90');
  }
  // Shallow nursery beds add garden scale without introducing solid props.
  for (const bx of [-97, 62]) {
    rect(bx, 7, 34, 27, '#596857');
    rect(bx + 1, 8, 32, 25, '#796d58');
    for (let r = 0; r < 3; r++) for (let col = 0; col < 4; col++) {
      const px = bx + 4 + col * 7, py = 11 + r * 8;
      rect(px - 1, py + 2, 5, 2, '#4d6250');
      rect(px - 1, py, 2, 2, '#87916a');
      rect(px + 2, py - 1, 2, 3, '#a1a375');
    }
  }
  // Quiet soil marks: no noisy full-surface grain or animated foliage.
  for (let i = 0; i < 22; i++) {
    const px = -136 + (i * 47) % 270, py = -68 + (i * 31) % 140;
    if (Math.abs(px) < 32 || (px / 154) ** 2 + (py / 75) ** 2 > 1) continue;
    rect(px, py, 4, 1, '#7f866b');
    rect(px + 3, py + 2, 2, 1, '#536954');
  }
  ctx.restore();
}
