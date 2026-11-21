import { POND } from '../defs/landmarks/wishing-well/def.js';
import type { Ctx } from './paper-material.js';

/** Damp footing stays north of the pond; never repaints the water boundary. */
export function drawWellFooting(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const r = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  for (let row = -17; row <= 17; row++) {
    const reach = Math.floor(67 * Math.sqrt(Math.max(0, 1 - (row / 17) ** 2)));
    if (reach) r(-reach, row - 39, reach * 2 + 1, 1, '#586e68');
  }
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI / 7, px = Math.round(Math.cos(a) * 64), py = -39 + Math.round(Math.sin(a) * 16);
    r(px - 6, py - 2, 12, 4, '#7e8c7e');
    r(px - 4, py - 3, 8, 1, '#a0a38a');
    r(px - 5, py + 2, 10, 1, '#526a63');
  }
  r(-27, -40, 9, 1, '#73887a'); r(29, -34, 13, 1, '#6e8477');
  ctx.restore();
}

/** Floating ornaments use the existing pond's definition, never new water. */
export function drawWellPondDetails(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const py = y + POND.dy;
  const r = (px: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + px), Math.round(py + dy), w, h);
  };
  // Each clipped lily has a visible notch and a short, low-contrast vein.
  for (const [lx, ly, size] of [[-76, -8, 7], [-18, 25, 6], [68, 2, 7], [31, -25, 6]] as const) {
    for (let row = -3; row <= 3; row++) {
      const reach = Math.floor(size * Math.sqrt(Math.max(0, 1 - (row / 4) ** 2)));
      const cut = row >= 0 ? Math.min(reach, row + 1) : 0;
      r(lx - reach, ly + row, reach * 2 - cut, 1, row < 0 ? '#77936a' : '#526e56');
    }
    r(lx - 2, ly - 1, 5, 1, '#a3aa79');
  }
  for (const [bx, by, scale] of [[-50, 6, 1], [40, 18, .8], [6, -20, .7]] as const) {
    const width = Math.round(11 * scale), height = Math.round(11 * scale);
    // Ripple, folded triangular center and hollow cream-colored hull.
    r(bx - width - 3, by + 4, width * 2 + 6, 1, '#6d939b');
    r(bx - width - 1, by + 5, width * 2 + 2, 1, '#486d7d');
    for (let row = 0; row < height; row++) {
      const reach = Math.max(1, Math.floor(row * .6));
      r(bx - reach, by - height + row, reach, 1, '#c9bb96');
      r(bx, by - height + row, reach + 1, 1, '#e1d4ad');
    }
    r(bx - width, by - 1, width * 2 + 1, 1, '#f0dfb5');
    r(bx - width + 2, by, width * 2 - 3, 1, '#8f947b');
    for (let row = 1; row <= 4; row++) {
      const reach = width - row;
      r(bx - reach, by + row, reach * 2 + 1, 1, row < 3 ? '#d0c49f' : '#a9ac8b');
    }
  }
  ctx.restore();
}
