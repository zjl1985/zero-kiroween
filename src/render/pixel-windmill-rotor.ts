/** Four flax-covered timber sails, rasterised directly onto an integer grid.
 * The supplied angle is authoritative; there are no time keys or canvas bakes. */
import type { Ctx } from "./paper-material.js";

const TIMBER = "#55483f", TIMBER_DARK = "#30343c", TIMBER_EDGE = "#85705a";
const FLAX = "#b8ae8d", FLAX_LIGHT = "#c9bd99", FLAX_SHADE = "#8d8e79";
const HUB = "#8e7b60", HUB_LIGHT = "#b19b75", IRON = "#424b55";

export function drawPixelWindmillRotor(ctx: Ctx, x: number, y: number, s: number, v: number, angle: number): void {
  if (![x, y, s, v, angle].every(Number.isFinite) || s <= 0) return;
  const turn = angle + 0.35 + v * 0.5, cs = Math.cos(turn), sn = Math.sin(turn),
    cx = x - 4 * s, cy = y - 118 * s;
  // Classify a native destination pixel by inverse rotation. This fills a
  // continuous silhouette at diagonal headings without forward-stamp holes.
  const material = (px: number, py: number): string | undefined => {
    const ax = Math.abs(px), ay = Math.abs(py);
    // A stepped circular backplate and a smaller octagonal wood cap. The cap
    // lighting stays fixed while its four underlying spars rotate together.
    if (ax <= 7 && ay <= 7 && ax + ay <= 10) {
      if (ax > 5 || ay > 5 || ax + ay > 8) return TIMBER_DARK;
      if (ax <= 1 && ay <= 1) return py < 0 ? HUB_LIGHT : IRON;
      if (py >= 4 || px >= 5) return TIMBER;
      if (py <= -4 || px <= -4 && py <= 0) return HUB_LIGHT;
      return HUB;
    }
    const u = px * cs + py * sn, w0 = -px * sn + py * cs;
    let r: number, w: number;
    if (Math.abs(u) >= Math.abs(w0)) {
      r = Math.abs(u); w = u >= 0 ? w0 : -w0;
    } else {
      r = Math.abs(w0); w = w0 >= 0 ? -u : u;
    }
    // Slim main spar carries every sail continuously into the hub.
    if (r >= 4 && r <= 79 && w >= -1.5 && w <= 1.5)
      return w < -0.5 ? TIMBER_EDGE : w > 0.5 ? TIMBER_DARK : TIMBER;
    if (r < 25 || r > 78) return undefined;
    const outer = r < 28 ? 8 + (r - 25) : r > 75 ? 11 - (r - 75) * 0.5 : 11;
    if (w < 1.5 || w > outer + 1) return undefined;
    // Flax is hung on ONE side of the spar. The outer rail and transverse
    // battens frame separate panels, with actual open slits between them.
    if (w >= outer) return TIMBER_DARK;
    if (r < 26.5 || r > 76.5) return TIMBER;
    const bay = (r - 27) % 10;
    if (bay >= 0 && bay < 1.5) return w < 9 ? TIMBER : TIMBER_EDGE;
    if (bay >= 2 && bay < 3.5 && w > 3 && w < outer - 1) return undefined;
    if (w < 3 || w > outer - 1.5) return FLAX_SHADE;
    return bay > 7 || w < 4.5 ? FLAX_LIGHT : FLAX;
  };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // Adjacent equal-colour pixels become one integer horizontal run. The
  // fixed 163-square model grid bounds work independently of elapsed time,
  // viewport, or display scale; no bitmap or ever-growing rotation cache.
  for (let py = -81; py <= 81; py++) {
    const top = Math.round(cy + py * s), bottom = Math.round(cy + (py + 1) * s);
    if (bottom <= top) continue;
    let start = -81, color: string | undefined;
    for (let px = -81; px <= 82; px++) {
      const next = px <= 81 ? material(px, py) : undefined;
      if (next === color) continue;
      if (color) {
        const left = Math.round(cx + start * s), right = Math.round(cx + px * s);
        if (right > left) {
          ctx.fillStyle = color; ctx.fillRect(left, top, right - left, bottom - top);
        }
      }
      start = px; color = next;
    }
  }
  ctx.restore();
}
