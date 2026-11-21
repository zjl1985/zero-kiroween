import type { Ctx } from './paper-material.js';

/** Quiet moss-and-earth yard, baked flat under the unchanged tomb layout. */
export function drawGraveyardGround(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const r = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  const oval = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    for (let row = -Math.floor(ry); row <= Math.floor(ry); row++) {
      const reach = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (row / ry) ** 2)));
      if (reach) r(cx - reach, cy + row, reach * 2 + 1, 1, color);
    }
  };
  oval(0, 4, 184, 104, '#53665a');
  oval(-12, 12, 162, 88, '#5b6d5c');
  oval(-104, 12, 39, 43, '#536857');
  oval(105, 28, 43, 38, '#586957');
  // Dark earth near the old chapel's real footprint, with no raised turf slab.
  oval(0, -52, 73, 22, '#697363');
  for (let i = 0; i < 7; i++) {
    const px = -11 + (i % 2 ? 2 : 0), py = -43 + i * 8;
    r(px, py, 22, 6, i % 2 ? '#939984' : '#a2a48d');
    r(px + 1, py + 5, 20, 1, '#657961');
    r(px + 3, py, 16, 1, '#b1af94');
  }
  // Approach ends before the staggered graves; it does not suggest a route
  // through their unchanged collision walls.
  for (let i = 0; i < 26; i++) {
    const px = -150 + (i * 67) % 300, py = -68 + (i * 43) % 155;
    if ((px / 164) ** 2 + ((py - 4) / 88) ** 2 > .95 || Math.abs(px) < 25 && py < 20) continue;
    r(px, py, 8, 2, '#4c6354'); r(px + 2, py - 1, 5, 1, '#7e8a68');
    if (i % 3 === 0) { r(px + 7, py - 3, 2, 4, '#8b9270'); r(px + 10, py - 2, 1, 3, '#6e825f'); }
  }
  for (const [lx, ly] of [[-137, 54], [-91, 87], [92, -48], [143, 51], [41, 94]]) {
    r(lx, ly, 5, 2, '#8f8060'); r(lx + 1, ly - 1, 3, 1, '#a6956c');
    r(lx + 2, ly + 2, 1, 1, '#687455');
  }
  ctx.restore();
}
