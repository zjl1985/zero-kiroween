/** Worn rubber in a rolled card sleeve. Integer geometry is authored at the
 * grounded origin; a real combat pose is supplied by the owning enemy art. */
import type { Ctx } from './paper-material.js';
export type PixelEraserPose = 'idle' | 'sweep' | 'charge' | 'summon';

const PALETTES = [
  { ink: '#292b39', rubber: '#c78996', rubberLight: '#edb9ba', rubberTop: '#f3cec5', rubberShade: '#a06580', rubberEdge: '#754b68',
    sleeve: '#526f90', sleeveLight: '#829bb0', sleeveShade: '#354b6a', paper: '#dfd2b0', back: '#b5a285', eye: '#e6ba6f', sole: '#253747' },
  { ink: '#353940', rubber: '#b69c9f', rubberLight: '#d9c2bd', rubberTop: '#e6d4c7', rubberShade: '#897983', rubberEdge: '#625863',
    sleeve: '#657c8e', sleeveLight: '#9ba9b2', sleeveShade: '#455c71', paper: '#dcd2bb', back: '#aaa18e', eye: '#d8be88', sole: '#354650' },
  { ink: '#41494b', rubber: '#b6b2a5', rubberLight: '#d8d1ba', rubberTop: '#e7ddc4', rubberShade: '#8b938b', rubberEdge: '#626e6d',
    sleeve: '#7c8c8d', sleeveLight: '#aab6af', sleeveShade: '#536d74', paper: '#e0d9bd', back: '#aaa791', eye: '#d4c8a0', sole: '#405b60' },
] as const;

export function drawPixelEraserBoss(ctx: Ctx, frame: number, pose: PixelEraserPose, wash: number): void {
  const p = PALETTES[wash >= 1 ? 2 : wash > 0 ? 1 : 0], phase = Math.abs(Math.floor(frame)) % 2,
    charge = pose === 'charge', sweep = pose === 'sweep', summon = pose === 'summon',
    lean = charge ? 7 : sweep ? -2 : 0;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Compact scanline polygon, with no antialiased vector border or textures.
  const poly = (points: readonly (readonly [number, number])[], color: string) => {
    let top = Infinity, bottom = -Infinity;
    for (const point of points) { top = Math.min(top, point[1]); bottom = Math.max(bottom, point[1]); }
    for (let y = Math.ceil(top); y < bottom; y++) {
      let left = Infinity, right = -Infinity;
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5)) {
          const x = a[0] + (y + .5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
          left = Math.min(left, x); right = Math.max(right, x);
        }
      }
      if (right > left) r(Math.ceil(left), y, Math.max(1, Math.floor(right) - Math.ceil(left) + 1), 1, color);
    }
  };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // Both boots share the ground row, even while one knee bends. Only their
  // top shape and fore/aft width change between the two independent frames.
  for (const side of [-1, 1]) {
    const x = side < 0 ? -25 - (charge ? 3 : 0) : 7 + (charge ? 3 : 0),
      top = -22 + (side < 0 ? phase : -phase);
    poly([[x + 3, top], [x + 16, top], [x + 17, -7], [x + 21, -4], [x + 21, 0], [x, 0], [x, -8]], p.ink);
    poly([[x + 4, top + 2], [x + 14, top + 2], [x + 15, -6], [x + 19, -4], [x + 19, -3], [x + 2, -3], [x + 2, -8]], p.sleeveShade);
    r(x + 4, -8, 10, 2, p.sleeveLight); r(x + 2, -2, 18, 2, p.sole);
    r(x + 3, -1, 16, 1, p.ink);
  }
  // The charge loads onto the forward boot without moving the ground pivot.
  if (charge) ctx.translate(0, 7);
  // Thick bevels occupy real planes: a pale slanted top, warm front, violet
  // side, then a darker base disappearing inside the wrapper.
  poly([[-27 + lean, -80], [-19 + lean, -89], [22 + lean, -87], [30 + lean, -78], [28 + lean, -18], [-27 + lean, -18]], p.ink);
  poly([[-24 + lean, -79], [-18 + lean, -86], [20 + lean, -84], [25 + lean, -77], [23 + lean, -22], [-24 + lean, -22]], p.rubber);
  poly([[-24 + lean, -79], [-18 + lean, -86], [20 + lean, -84], [25 + lean, -77], [-15 + lean, -76]], p.rubberLight);
  poly([[-18 + lean, -85], [18 + lean, -83], [21 + lean, -80], [-16 + lean, -80]], p.rubberTop);
  poly([[20 + lean, -78], [27 + lean, -77], [25 + lean, -21], [17 + lean, -23]], p.rubberShade);
  r(-24 + lean, -77, 2, 15, p.rubberLight); r(25 + lean, -73, 2, 16, p.rubberEdge);
  // A few connected abrasions and notches, not noisy speckled pixels.
  r(-17 + lean, -82, 5, 1, p.rubberShade); r(-14 + lean, -81, 4, 1, p.rubberLight);
  r(9 + lean, -82, 4, 1, p.rubberLight); r(20 + lean, -77, 3, 2, p.rubberEdge);
  r(-23 + lean, -60, 3, 2, p.rubberEdge); r(-21 + lean, -59, 2, 1, p.rubberTop);
  // Set eyes under individually stepped brows. Gaze and lid shape respond to
  // the supplied action; blink frame never destroys the identifying pair.
  for (const side of [-1, 1]) {
    const ex = (side < 0 ? -15 : 5) + lean, ey = charge ? -69 : -70;
    r(ex - 1, ey - 3, 12, 2, p.rubberEdge);
    if (charge || sweep) r(ex + (side < 0 ? 6 : 0), ey - 2, 5, 1, p.ink);
    r(ex, ey, 10, 7, p.ink); r(ex + 1, ey + 1, 8, summon ? 5 : 4, p.eye);
    r(ex + (charge ? 6 : side < 0 ? 5 : 3), ey + 1, 2, 5, p.ink);
    r(ex + 2, ey + 1, 2, 1, p.paper);
    if (phase && !summon) r(ex, ey, 10, 1, p.rubberShade);
  }
  r(-6 + lean, -59, 12, 2, p.rubberEdge);
  r(-3 + lean, -57, 7, 1, p.rubberLight);
  // Rolled paper sleeve: unequal side/front planes, a visible cream inside,
  // offset overlap seam, thin turned lips and printed eraser insignia.
  poly([[-28 + lean, -55], [-22 + lean, -58], [27 + lean, -55], [29 + lean, -23], [21 + lean, -17], [-26 + lean, -20]], p.ink);
  poly([[-25 + lean, -54], [-21 + lean, -56], [24 + lean, -53], [25 + lean, -24], [19 + lean, -20], [-24 + lean, -22]], p.sleeve);
  poly([[17 + lean, -53], [25 + lean, -53], [26 + lean, -24], [19 + lean, -20]], p.sleeveShade);
  poly([[-25 + lean, -54], [-21 + lean, -56], [24 + lean, -53], [23 + lean, -51], [-22 + lean, -53]], p.paper);
  r(-24 + lean, -51, 2, 25, p.sleeveLight);
  r(16 + lean, -49, 1, 24, p.sleeveShade); r(17 + lean, -49, 1, 23, p.sleeveLight);
  for (let j = 0; j < 4; j++) r(19 + lean, -47 + j * 5, 2, 1, p.back);
  poly([[-24 + lean, -24], [17 + lean, -22], [23 + lean, -25], [20 + lean, -21], [-23 + lean, -23]], p.back);
  r(-18 + lean, -49, 24, 1, p.sleeveLight); r(-17 + lean, -27, 27, 1, p.sleeveShade);
  r(-7 + lean, -43, 12, 12, p.paper); r(-10 + lean, -40, 18, 6, p.paper);
  r(-5 + lean, -41, 3, 8, '#eee0bd'); r(1 + lean, -40, 3, 6, p.back);
  r(-16 + lean, -39, 3, 1, p.sleeveLight); r(11 + lean, -34, 3, 1, p.sleeveLight);
  // Bent forearms overlap the shoulder socket; every pose keeps its palms
  // visibly connected, including the extended sweep and raised summon hands.
  for (const side of [-1, 1]) {
    const shoulderX = side * 24 + lean, shoulderY = -48,
      handX = side < 0 ? (sweep ? -42 : summon ? -36 : charge ? -27 : -34) : (sweep ? 36 : summon ? 35 : charge ? 38 : 34),
      handY = summon ? -64 - phase : sweep ? (side < 0 ? -40 : -57) : charge ? -38 : -34 + (side < 0 ? phase : -phase),
      elbowX = side < 0 ? Math.min(shoulderX - 7, handX + 2) : Math.max(shoulderX + 7, handX - 2),
      elbowY = summon ? -52 : charge ? -39 : -42;
    poly([[shoulderX - 4, shoulderY - 3], [shoulderX + 4, shoulderY - 3], [elbowX + 5, elbowY], [handX + 5, handY + 3], [handX - 5, handY + 3], [elbowX - 5, elbowY + 2]], p.ink);
    poly([[shoulderX - 2, shoulderY - 1], [shoulderX + 2, shoulderY - 1], [elbowX + 3, elbowY], [handX + 3, handY + 2], [handX - 3, handY + 2], [elbowX - 3, elbowY + 1]], p.rubberShade);
    r(handX - 5, handY - 5, 10, 10, p.ink); r(handX - 4, handY - 4, 8, 8, p.rubber);
    r(handX - 3, handY - 4, 6, 2, p.rubberLight); r(handX + 3, handY - 2, 1, 5, p.rubberEdge);
    r(handX - 2, handY + 1, 4, 1, p.rubberShade); r(handX, handY + 1, 1, 2, p.rubberEdge);
  }
  ctx.restore();
}
