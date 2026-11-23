import type { Ctx } from "./paper-material.js";

// Paired contours deform the ink itself. Both end on the same ground row;
// there is no translated/hopping copy and no detached droplet confetti.
const CONTOURS = [
  [[-4,2],[-7,5],[-8,7],[-9,8],[-10,9],[-10,10],[-11,10],[-11,11],
    [-12,11],[-12,11],[-12,12],[-12,12],[-12,12],[-12,12],[-13,12],[-13,12],
    [-14,12],[-14,13],[-15,14],[-15,14],[-14,14],[-13,13],[-11,11],[-8,8]],
  [[-2,4],[-4,7],[-6,8],[-7,9],[-8,10],[-9,11],[-10,11],[-10,12],
    [-11,12],[-11,12],[-11,12],[-12,12],[-12,12],[-12,12],[-13,12],[-13,12],
    [-14,13],[-15,14],[-15,15],[-14,15],[-13,14],[-12,12],[-10,10],[-8,8]],
] as const;
/** Painted, fading and colourless ink (wash 0 / 0.5 / 1); the iso sheet reuses them. */
export const INK_BLOB_PALETTES = [
  { edge: "#292337", body: "#4d3c68", shade: "#382d4c", plane: "#6d5684", eye: "#d8b474", mouth: "#ab91b3" },
  { edge: "#34373c", body: "#77737d", shade: "#565760", plane: "#96919b", eye: "#c4b79c", mouth: "#b2aaad" },
  { edge: "#41474a", body: "#aaa99c", shade: "#7d8480", plane: "#c5c1ae", eye: "#d5cdb4", mouth: "#646e6d" },
] as const;

/** Native ink drop, drawn into the caller's enemy cache at its grounded origin. */
export function drawPixelInkBlob(ctx: Ctx, frame: number, attack: boolean, wash: number): void {
  const phase = frame % 2 === 0 ? 0 : 1, rows = CONTOURS[phase];
  const p = INK_BLOB_PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0];
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  };
  ctx.save();
  rows.forEach(([left, right], row) => {
    const y = row - 23;
    r(left, y, right - left + 1, 1, p.edge);
    if (row > 0 && row < 23) r(left + 1, y, right - left - 1, 1, row > 17 ? p.shade : p.body);
    // A connected broad upper-right plane bends down the shoulder. It is
    // deliberately muted, not a white specular stroke on a plastic sphere.
    if (row >= 2 && row <= 11) {
      const start = Math.max(left + 2, (row < 6 ? -1 : 2) + phase);
      const end = right - (row < 8 ? 2 : 3);
      if (end >= start) r(start, y, end - start + 1, 1, p.plane);
    }
  });
  // Overlapping flow tongues remain joined to the mass and grounded at y=0.
  r(-13 + phase, -5, 6, 2, p.body); r(-11 + phase, -3, 5, 2, p.body);
  r(7, -5, 6, 2, p.body); r(8, -3, 4, 1, p.body);
  r(-3, -4, 6, 2, p.body); r(-2, -2, 5, 2, p.body);
  r(-10 + phase, -5, 3, 1, p.plane);

  // The original amber eyes are shaped, recessed into the face and kept
  // readable in all three material states. Attack narrows the eyelids only.
  const ex = phase;
  r(-7 + ex, -13, 5, 6, p.shade); r(3 + ex, -13, 5, 6, p.shade);
  r(-6 + ex, -12, 3, 4, p.eye); r(4 + ex, -12, 3, 4, p.eye);
  r(-5 + ex, -13, 2, 1, p.eye); r(4 + ex, -13, 2, 1, p.eye);
  r(-4 + ex, -11, 1, 3, p.edge); r(5 + ex, -11, 1, 3, p.edge);
  if (attack) {
    r(-7 + ex, -13, 2, 2, p.body); r(-5 + ex, -12, 3, 1, p.body);
    r(6 + ex, -13, 2, 2, p.body); r(3 + ex, -12, 3, 1, p.body);
  }
  r(-3 + ex, -6, 2, 1, p.mouth); r(-1 + ex, -5, 2, 1, p.mouth);
  r(1 + ex, -6, 2, 1, p.mouth);
  ctx.restore();
}
