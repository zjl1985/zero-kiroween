import type { Ctx } from './paper-material.js';

/** Flush timber market surface, baked beneath the unchanged road geometry. */
export function drawMarketGround(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const rect = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  // Long planks with staggered ends read as timber, not a tiny checker grid.
  rect(-181, -84, 362, 162, '#6f6d59');
  for (let row = 0; row < 13; row++) {
    const py = -81 + row * 12;
    rect(-178, py, 356, 11, ['#8b8065', '#82795f', '#8c8268'][row % 3]!);
    rect(-178, py + 10, 356, 1, '#9b8f71');
    for (let col = -2; col <= 2; col++) {
      const px = col * 71 + (row % 2 ? 29 : 0);
      if (px < -174 || px > 173) continue;
      rect(px, py + 1, 1, 9, '#6e705b');
      rect(px + 3, py + 3, 1, 1, '#5f6757');
      if ((row + col + 10) % 3 === 0) rect(px + 12, py + 5, 22, 1, '#95886b');
    }
  }
  rect(-181, -84, 362, 3, '#9b8f70');
  rect(-181, 75, 362, 3, '#7a765d');
  rect(-181, -81, 3, 156, '#77745c'); rect(178, -81, 3, 156, '#a09373');
  // Broad woven mats frame existing goods and leave the central route clear.
  for (const [px, py, base, edge] of [[-71, 40, '#77605b', '#b19a78'], [68, 35, '#61777a', '#9da995']] as const) {
    rect(px - 31, py - 15, 62, 30, edge);
    rect(px - 29, py - 13, 58, 26, base);
    for (const dy of [-9, 8]) rect(px - 26, py + dy, 52, 2, edge);
    for (const dx of [-22, -10, 2, 14]) {
      rect(px + dx, py - 1, 5, 1, edge); rect(px + dx + 2, py - 3, 1, 5, edge);
    }
    for (let i = 0; i < 10; i++) {
      rect(px - 28 + i * 6, py - 17, 2, 2, edge);
      rect(px - 28 + i * 6, py + 15, 2, 2, edge);
    }
  }
  ctx.restore();
}
