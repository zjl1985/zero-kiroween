/** Card art for watercolour-brush. */
import type { WeaponArt } from "../../render/art-registry.js";
import { paperEmblem } from "../../render/paper-kit.js";
import type { Point } from "../../render/paper-material.js";

/** A ragged pigment bloom: a few lobes cut from one sheet (points, so the shadow keeps its direction). */
function bloom(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, k = i % 2 ? 0.72 : 1 - (i % 4 === 0 ? 0.08 : 0);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.86]);
  }
  return pts;
}

export const WATERCOLOUR_BRUSH_ART: WeaponArt = {
  id: "watercolour-brush",
  /** A cut pigment bloom behind a wooden brush whose wet tip carries the card's ink. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      { shape: bloom(13, 21, 9.5), color: "#7fb3c8", rim: "#d8eef4", lift: 0.5 },
      {
        shape: [[21, 3], [24.5, 5.2], [15.4, 18.6], [12.4, 16.6]],
        color: "#b8895a",
        rim: "#f0d3a8",
        lift: 1.1,
        fold: { from: [22.7, 4], to: [13.9, 17.6], depth: 0.14, side: 1 },
      },
      {
        shape: [[12, 15.6], [15.8, 18.4], [13.4, 23.6], [7, 28.6], [8.4, 21.8]],
        color: ink,
        lift: 1.3,
        fold: { from: [13.9, 17], to: [7.6, 27.6], depth: 0.16, side: 1 },
      },
    ]);
  },
};
