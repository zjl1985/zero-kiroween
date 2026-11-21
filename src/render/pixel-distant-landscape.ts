/** Distant farm country, authored on the world pixel lattice. This is scenic
 * land only: all drawing ends above y=206, outside the playable map. */
import type { Ctx } from "./paper-material.js";

const PERIOD = 1920;
const C = {
  far: "#465468", farLight: "#526073", ridge: "#364d5a",
  field: "#415a5a", fieldLight: "#59665a", fieldShade: "#344d50",
  earth: "#5e6251", earthLight: "#74745a", hedge: "#283f46",
  lake: "#465e70", lakeShade: "#3b5365", reflection: "#71818a",
  tree: "#31474d", treeLight: "#4e5d52", gold: "#777453",
  roof: "#37434e", wall: "#7b8075", wallShade: "#59665f",
  window: "#bdad76", near: "#2d4947", nearLight: "#3a5550",
} as const;

// Long, unequal swells establish a continuous horizon across chunk edges.
function ridgeY(x: number): number {
  return Math.round(112 + Math.sin(x / 181) * 13 + Math.sin(x / 397 + 1.4) * 14);
}
function fieldY(x: number): number {
  return Math.round(151 + Math.sin(x / 223 + 0.4) * 9 + Math.sin(x / 89) * 3);
}

export function drawDistantLandscape(ctx: Ctx, x0: number, x1: number): void {
  if (!Number.isFinite(x0) || !Number.isFinite(x1) || x1 <= x0) return;
  const left = Math.ceil(x0), right = Math.floor(x1);
  // Clip rectangles individually so neither a canvas path nor a live scene
  // compositing operation is needed. All edges are whole native pixels.
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    const l = Math.max(left, Math.round(x)), r = Math.min(right, Math.round(x + w)),
      t = Math.max(80, Math.round(y)), b = Math.min(206, Math.round(y + h));
    if (r <= l || b <= t) return;
    ctx.fillStyle = color; ctx.fillRect(l, t, r - l, b - t);
  };
  const tree = (x: number, foot: number, height: number, warm = false) => {
    const top = foot - height, width = Math.max(3, Math.round(height * 0.33));
    rect(x, top + 4, 1, height - 3, C.tree);
    // Tall, narrow distant poplars; staggered shoulders, never a pine fence.
    rect(x - 1, top, 3, 2, C.tree);
    rect(x - 2, top + 2, 5, 3, C.tree);
    rect(x - width / 2, top + 5, width + 1, Math.max(2, height - 9), C.tree);
    rect(x - width / 2 + 1, top + 5, 2, Math.max(2, height - 11), warm ? C.gold : C.treeLight);
    rect(x - 2, foot - 6, 5, 3, C.tree);
  };
  const orchard = (x: number, foot: number, size: number, warm = false) => {
    const top = foot - size - 3, half = Math.floor(size / 2);
    rect(x, top + half, 1, size + 3 - half, C.tree);
    rect(x - half + 2, top, size - 3, 2, C.treeLight);
    rect(x - half, top + 2, size + 1, Math.max(2, size - 4), C.tree);
    rect(x - half + 1, top + 2, size - 2, 2, warm ? C.gold : C.treeLight);
    rect(x - half + 1, top + size - 2, size - 1, 2, C.tree);
    if (warm) rect(x - half + 2, top + 4, 2, 2, C.earthLight);
  };
  const house = (x: number, y: number, width: number, height: number, lit: boolean) => {
    const roofH = Math.max(4, Math.floor(height / 2));
    rect(x, y - height, width, height, C.wallShade);
    rect(x, y - height, Math.floor(width * 0.65), height - 1, C.wall);
    for (let row = 0; row < roofH; row++) {
      const inset = Math.max(0, roofH - row - 1);
      rect(x - 2 + inset, y - height - roofH + row, width + 4 - inset * 2, 1, C.roof);
    }
    rect(x + width - 5, y - height - roofH - 2, 2, 5, C.roof);
    rect(x - 1, y - height, width + 2, 1, C.tree);
    rect(x + 3, y - 5, 2, 3, lit ? C.window : C.tree);
    rect(x + width - 5, y - 6, 2, 2, lit ? C.window : C.tree);
    rect(x + Math.floor(width / 2), y - 4, 2, 4, C.roof);
    rect(x - 2, y, width + 5, 2, C.fieldShade);
  };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // Atmosphere separates the distant ridge from nearer crop terraces.
  for (let x = Math.floor(left / 4) * 4; x < right; x += 4) {
    const far = ridgeY(x), middle = fieldY(x);
    const back = Math.round(far - 12 + Math.sin(x / 73) * 4);
    rect(x, back, 4, 206 - back, "#3d4b63");
    rect(x, far, 4, 206 - far, C.far);
    if (Math.sin(x / 181) < -0.35) rect(x, far, 4, 2, C.farLight);
    rect(x, middle - 12, 4, 218 - middle, C.ridge);
    rect(x, middle, 4, 206 - middle, C.field);
    rect(x, middle + 8, 4, 8, C.fieldLight);
    rect(x, middle + 16, 4, 2, C.hedge);
    rect(x, middle + 18, 4, 16, C.earth);
    rect(x, middle + 31, 4, 2, C.earthLight);
  }
  for (let tile = Math.floor((left - 320) / PERIOD); tile <= Math.floor((right + 320) / PERIOD); tile++) {
    const base = tile * PERIOD;
    // Small angled fields sit on the far shore, including the visible gap
    // between the opening buildings. Their shapes follow terraces, not bands.
    for (const [x, y, w, depth, lean, color] of [
      [407, 132, 37, 7, -1, C.fieldLight], [445, 128, 33, 8, 1, C.earth],
      [483, 134, 42, 10, -1, C.field], [527, 129, 28, 12, 1, C.fieldLight],
      [562, 132, 38, 11, -1, C.earth], [603, 136, 32, 10, 1, C.fieldLight],
      [971, 136, 65, 12, 1, C.earth], [1310, 141, 53, 11, -1, C.fieldLight],
    ] as const) {
      for (let row = 0; row < depth; row++) {
        const inset = Math.floor(row / 3), px = base + x + inset * lean;
        rect(px, y + row, w - inset, 1, row === depth - 1 ? C.fieldShade : color);
      }
      // One diagonal boundary and a short crop furrow define perspective.
      for (let row = 2; row < depth - 1; row += 3)
        rect(base + x + 3 + Math.floor(row / 3) * lean, y + row, w - 11, 1, C.fieldShade);
    }
    // Dark hedge fragments separate the village land from the back waterline.
    for (const [x, y, w] of [[447, 146, 33], [491, 147, 19], [552, 145, 25], [592, 147, 36]]) {
      rect(base + x, y, w, 2, C.hedge);
      rect(base + x + 3, y - 1, w - 8, 1, C.treeLight);
    }
    // A broad, uninterrupted basin. Row groups gently change the banks,
    // giving the lake an asymmetric shoreline rather than a small water strip.
    // The centre remains quiet; only three narrow reflection groups interrupt it.
    for (let row = 0; row < 40; row++) {
      const band = Math.floor(row / 3),
        reach = Math.sqrt(Math.max(0, 1 - ((row - 19) / 26) ** 2)),
        centre = 579 + Math.round(Math.sin(band * 0.18) * 7),
        leftBank = centre - Math.round(240 * reach) + Math.round(Math.sin(band * 0.61) * 4),
        rightBank = centre + Math.round(232 * reach) + Math.round(Math.sin(band * 0.44 + 1) * 5);
      rect(base + leftBank - 3, 150 + row, rightBank - leftBank + 7, 1, C.fieldShade);
      rect(base + leftBank, 150 + row, rightBank - leftBank, 1,
        row < 5 || row > 35 ? C.lakeShade : C.lake);
      // One shadowed edge gives thickness to the near shore, never a bright
      // gameplay water outline or a repeated wave pattern across the surface.
      if (row > 26) rect(base + leftBank, 150 + row, 3, 1, C.lakeShade);
    }
    // Broken, restrained moon reflections, with substantial open water around
    // each group. Their positions are fixed in world space across chunk bakes.
    for (const [x, y, w] of [
      [654, 166, 19], [646, 170, 34], [659, 173, 14],
      [548, 177, 44], [559, 181, 25], [572, 184, 12],
      [480, 170, 35], [484, 174, 26], [491, 178, 13],
    ]) rect(base + x, y, w, 1, C.reflection);
    rect(base + 430, 180, 27, 1, C.lakeShade);
    rect(base + 714, 182, 32, 1, C.lakeShade);

    // Unequal settlements and tree pockets leave breathing room for fields.
    house(base + 250, 145, 22, 11, true);
    house(base + 280, 148, 16, 8, false);
    // These two hamlets remain visible in the phone's central opening.
    house(base + 454, 142, 14, 7, true);
    house(base + 478, 145, 12, 6, false);
    house(base + 588, 141, 18, 9, true);
    house(base + 612, 145, 11, 6, false);
    for (const [x, y, w] of [[450, 145, 21], [476, 147, 24], [585, 144, 25]])
      rect(base + x, y, w, 1, C.earthLight);
    for (const [x, foot, size, warm] of [
      [430, 134, 9, 0], [440, 136, 11, 1], [447, 137, 8, 0],
      [499, 137, 9, 1], [508, 139, 12, 0],
      [559, 133, 10, 0], [569, 135, 12, 1], [577, 137, 8, 0],
      [637, 145, 11, 0], [646, 146, 9, 1],
    ]) orchard(base + x, foot, size, !!warm);
    house(base + 681, 143, 20, 10, true);
    house(base + 709, 145, 14, 8, false);
    house(base + 1136, 145, 18, 9, true);
    house(base + 1182, 148, 28, 13, false);
    for (const [dx, foot, h, warm] of [
      [111, 153, 18, 0], [121, 155, 23, 1], [133, 156, 17, 0],
      [323, 148, 14, 0], [332, 149, 20, 0],
      [517, 144, 13, 0], [526, 145, 18, 1], [540, 145, 15, 0],
      [879, 162, 23, 0], [890, 162, 29, 1], [904, 164, 21, 0], [918, 165, 17, 0],
      [1259, 154, 21, 0], [1271, 155, 16, 1],
      [1518, 155, 27, 0], [1530, 155, 31, 0], [1543, 157, 22, 1],
      [1775, 148, 14, 0], [1784, 148, 19, 0],
    ]) tree(base + dx, foot, h, !!warm);
    // A footpath and three perspective field seams guide the eye toward the
    // tiny settlement, rather than filling the ground with random speckles.
    for (let row = 0; row < 35; row++) {
      const y = 149 + row, x = base + 277 - Math.floor(row * 0.75);
      rect(x, y, 2 + Math.floor(row / 10), 1, C.fieldShade);
    }
    for (const [start, span] of [[22, 130], [1370, 102], [1640, 78]]) {
      for (let row = 0; row < 3; row++) rect(base + start + row * 7, 178 + row * 5, span - row * 14, 1, C.fieldShade);
    }
  }
  // A low, irregular foreground bank closes the miniature landscape before
  // the playable ground. It never draws below the dedicated scenic strip.
  for (let x = Math.floor(left / 4) * 4; x < right; x += 4) {
    const y = Math.round(195 + Math.sin(x / 107) * 3 + Math.sin(x / 41) * 2);
    rect(x, y, 4, 206 - y, C.near);
    if (Math.sin(x / 107) < 0) rect(x, y, 4, 1, C.nearLight);
  }
  // Foreground shore plants occupy only a few selected clumps; their feet
  // meet the bank and their stems stop short of the calm reflection groups.
  for (let tile = Math.floor((left - 320) / PERIOD); tile <= Math.floor((right + 320) / PERIOD); tile++) {
    const base = tile * PERIOD;
    for (const [x, y, height] of [[461, 194, 5], [465, 194, 3], [468, 194, 6],
      [608, 195, 4], [611, 195, 6], [616, 195, 3], [736, 194, 4]]) {
      rect(base + x, y - height, 1, height, C.treeLight);
      rect(base + x - 1, y - height, 2, 2, C.gold);
      rect(base + x - 2, y, 5, 1, C.near);
    }
    rect(base + 447, 191, 23, 1, C.nearLight);
    rect(base + 591, 190, 32, 1, C.nearLight);
  }
  ctx.restore();
}
