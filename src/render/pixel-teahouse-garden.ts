import { TEA } from '../defs/landmark-activities.js';
import type { Ctx } from './paper-material.js';

/** Quiet, flush tea garden. Baked below actors; no new collision geometry. */
export function drawTeahouseGarden(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  const rect = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  };
  const oval = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    for (let row = -Math.floor(ry); row <= Math.floor(ry); row++) {
      const reach = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (row / ry) ** 2)));
      if (reach) rect(cx - reach, cy + row, reach * 2 + 1, 1, color);
    }
  };
  oval(0, 16, 174, 96, '#69715e');
  oval(0, 15, 169, 91, '#92927b');
  oval(0, 15, 165, 88, '#858774');
  // Widely spaced rake marks curve around the planting islands, never a grid.
  for (let row = -3; row <= 4; row++) for (let col = -24; col <= 24; col++) {
    const px = col * 6, py = row * 17 + 19 + Math.round(Math.sin(col * .18) * 5);
    if ((px / 157) ** 2 + ((py - 15) / 81) ** 2 > 1 || Math.abs(px) < 24) continue;
    rect(px, py, 6, 1, '#96967e');
  }
  for (const [px, py, rx, ry] of [[-131, -28, 32, 24], [137, -20, 24, 20]] as const) {
    oval(px, py, rx, ry, '#68735b');
    oval(px - 1, py - 2, rx - 4, ry - 4, '#748064');
    for (let i = 0; i < 5; i++) {
      const a = i * 1.4, sx = px + Math.cos(a) * (rx - 4), sy = py + Math.sin(a) * (ry - 3);
      oval(sx, sy, 4, 2, i % 2 ? '#a0a087' : '#7d8672');
    }
  }
  // Low flat pavers start at the real building's doorway, not its roof center.
  for (let i = 0; i < 8; i++) {
    const px = -17 + Math.round(Math.sin(i * .6) * 5), py = -17 + i * 13;
    rect(px, py, 29, 9, i % 2 ? '#a8a48b' : '#b6af93');
    rect(px + 1, py + 8, 27, 1, '#737c68');
    rect(px + 3, py, 22, 1, '#c0b79a');
  }
  // Woven seating mat under the actual table, with restrained broad bands.
  rect(65, 52, 78, 43, '#6a6857');
  rect(67, 53, 74, 40, '#927f61');
  for (let i = 0; i < 5; i++) rect(69, 57 + i * 7, 70, 1, '#a08d6c');
  rect(70, 55, 3, 36, '#655f54'); rect(135, 55, 3, 36, '#655f54');
  // Preserve an obvious visual invitation at the existing rest interaction.
  const { x: tx, y: ty } = TEA.point;
  oval(tx, ty, 24, 12, '#756e59'); oval(tx, ty - 1, 21, 10, '#a89a77');
  rect(tx - 6, ty - 5, 11, 7, '#d0bf92');
  rect(tx - 4, ty + 2, 7, 1, '#d0bf92');
  rect(tx - 4, ty - 5, 7, 2, '#7e755e');
  rect(tx + 5, ty - 4, 4, 1, '#d0bf92');
  rect(tx + 8, ty - 3, 1, 4, '#d0bf92');
  rect(tx + 5, ty, 4, 1, '#d0bf92');
  ctx.restore();
}
