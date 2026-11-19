import type { CanvasSurface } from "../engine/surface.js";
import {
  piece,
  path,
  oval,
  box,
  grain,
  stitch,
  stroke,
  line,
  glow,
  shadow,
  noise,
  mix,
  hash,
  surface,
  withFlatShadows,
  type Ctx,
  type Point,
} from "./paper-material.js";
import { PAPER_VALUE } from "./paper-rules.js";
import { gradeCanvas, gradeColour } from "./paper-value.js";
import { ROAD_STOCK } from "./road-art.js";
import { clipOutsideLawn, yardDistance } from "./start-lawn.js";
import {
  LAMPS,
  YARD_PROPS,
  type SceneProp,
  pathCenter as oldPathCenter,
} from "./scene.js";
export { LAMPS, YARD_PROPS };
import { STATS } from "../game/types.js";
import { foldLine, paperCut } from "./paper-kit.js";
import { paperFlower, paperSprig } from "./scenery-details.js";
import { variant } from "./variants.js";
const W = 960,
  H = 540,
  /** Height of the screen-space sky sheet. */
  SKY_H = 250;
function pathCenter(y: number): number {
  return (
    oldPathCenter(y) + (y < 348 ? 17 * Math.max(0, 1 - (y - 222) / 126) : 0)
  );
}
let background: CanvasSurface | undefined,
  foreground: CanvasSurface | undefined;
const propCache = new Map<string, CanvasSurface>();

/** The screen-space sky sheet: pigment wash, stars, clouds, moon and two bats. */
function skySheet(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, 210);
  g.addColorStop(0, "#24203c");
  g.addColorStop(0.55, "#39304f");
  g.addColorStop(1, "#68506c");
  const p = box(0, 0, W, SKY_H);
  ctx.fillStyle = g;
  ctx.fill(p);
  grain(ctx, p, 0.85);
  // Blotches are pigment variations in the same sheet, not glowing decorative circles.
  const wash = surface(480, 110),
    wc = wash.getContext("2d")!,
    im = wc.createImageData(480, 110);
  for (let y = 0; y < 110; y++)
    for (let x = 0; x < 480; x++) {
      const n = noise(x, y, 36, 52) * 0.6 + noise(x, y, 9, 243) * 0.4;
      const i = (y * 480 + x) * 4;
      im.data[i] = 108;
      im.data[i + 1] = 91;
      im.data[i + 2] = 140;
      im.data[i + 3] = Math.max(0, n - 0.33) * 100;
    }
  wc.putImageData(im, 0, 0);
  ctx.drawImage(wash, 0, 0, W, 220);
  for (let i = 0; i < 65; i++) {
    const x = 20 + hash(i * 47) * 920,
      y = 17 + hash(i * 73) * 117;
    if (i % 8 === 0) star(ctx, x, y, 2.4, "#e8c78b");
    else {
      ctx.fillStyle = i % 3 ? "#bca4a9" : "#e2c097";
      ctx.fill(oval(x, y, 0.6, 0.7, i));
    }
  }
  cloud(ctx, 263, 71, 1.0, 11);
  cloud(ctx, 589, 62, 0.76, 21);
  cloud(ctx, 880, 95, 0.85, 33);
  ctx.save();
  ctx.translate(770, 61);
  glow(ctx, 0, 0, 66, "#dfb374", 0.23);
  const crescent = new Path2D(
    "M 13 -28 C -8 -35 -33 -18 -32 4 C -32 28 -3 42 22 22 C 2 27 -18 16 -18 -4 C -17 -17 -4 -26 13 -28 Z",
  );
  piece(ctx, crescent, "#edd198", {
    shadow: 2.3,
    texture: 0.65,
    edge: "#fff0c4",
  });
  stitch(ctx, oval(0, 2, 43, 43, 12, 0.018), "#b99565", 0.65);
  stitch(ctx, oval(0, 2, 48, 48, 13, 0.012), "#b99565", 0.35);
  ctx.restore();
  for (const [x, y, s] of [
    [348, 49, 1],
    [600, 109, 0.75],
  ]) {
    const p = new Path2D(
      `M ${x - 13 * s} ${y + 3 * s} Q ${x - 8 * s} ${y - 9 * s} ${x - 3 * s} ${y - 1 * s} L ${x - s} ${y - 5 * s} L ${x + s} ${y - 1 * s} Q ${x + 8 * s} ${y - 9 * s} ${x + 13 * s} ${y + 3 * s} Q ${x + 6 * s} ${y - 1 * s} ${x + 2 * s} ${y + 5 * s} L ${x - 2 * s} ${y + 5 * s} Q ${x - 6 * s} ${y - 1 * s} ${x - 13 * s} ${y + 3 * s} Z`,
    );
    piece(ctx, p, "#241c34", { shadow: 0.7, texture: 0.6, thickness: 0.4 });
  }
}
/**
 * The paper hills along the north edge of the world, in world coordinates.
 * The ridge is a continuous function of x, so chunks drawn separately meet
 * without seams; each ridge casts its own thin edge.
 */
export function horizonHills(ctx: Ctx, x0: number, x1: number): void {
  const start = Math.floor(x0 / 22) * 22 - 22,
    end = Math.ceil(x1 / 22) * 22 + 22;
  for (let layer = 0; layer < 3; layer++) {
    const pts: Point[] = [[start, 250]];
    for (let x = start; x <= end; x += 22)
      pts.push([
        x,
        137 +
          layer * 20 +
          Math.sin(x * 0.013 + layer * 2) * 15 +
          Math.sin(x * 0.038 + layer) * 7,
      ]);
    pts.push([end, 250]);
    piece(ctx, path(pts), ["#51415e", "#39354f", "#2e3241"][layer]!, {
      shadow: 2,
      texture: 0.65,
      thickness: 0.8,
    });
    for (
      let i = Math.floor((x0 - 90) / 98);
      i <= Math.ceil((x1 + 20) / 98);
      i++
    )
      pine(
        ctx,
        55 + i * 98 + hash(i * 17 + layer) * 21,
        172 + layer * 17,
        0.45 + hash(i * 5) * 0.35,
        layer === 2 ? "#29313b" : "#3b3650",
      );
  }
}
function star(ctx: Ctx, x: number, y: number, r: number, c: string): void {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      rr = i % 2 ? r * 0.42 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  piece(ctx, path(pts), c, { shadow: 0.6, texture: 0.35, thickness: 0.3 });
}
function cloud(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = 0.7;
  const p = new Path2D(
    "M -54 11 C -41 6 -38 -2 -26 -1 C -27 -20 -1 -26 6 -10 C 18 -16 32 -7 29 2 C 42 -3 53 9 47 15 C 15 20 -21 17 -54 11 Z",
  );
  piece(ctx, p, "#7a6885", {
    shadow: 2,
    texture: 0.8,
    edge: "#a48b94",
    stitch: true,
  });
  const inner = new Path2D("M -28 7 Q -8 -2 7 6 Q 21 1 34 11");
  stroke(ctx, inner, "#9a8196", 0.6, 0.5);
  void seed;
  ctx.restore();
}
export function pine(ctx: Ctx, x: number, y: number, s: number, c: string): void {
  const pts: Point[] = [
    [x - 2 * s, y],
    [x - 2 * s, y - 18 * s],
    [x - 13 * s, y - 18 * s],
    [x - 6 * s, y - 29 * s],
    [x - 11 * s, y - 29 * s],
    [x - 4 * s, y - 39 * s],
    [x - 7 * s, y - 39 * s],
    [x, y - 53 * s],
    [x + 7 * s, y - 39 * s],
    [x + 4 * s, y - 39 * s],
    [x + 11 * s, y - 29 * s],
    [x + 6 * s, y - 29 * s],
    [x + 13 * s, y - 18 * s],
    [x + 2 * s, y - 18 * s],
    [x + 2 * s, y],
  ];
  piece(ctx, path(pts), c, { shadow: 1, texture: 0.6, thickness: 0.4 });
}
export interface GroundLamp {
  x: number;
  y: number;
  s?: number;
}
/** The ground sheet silhouette of a tile (the wavy horizon edge in the top row). */
export function groundOutline(x0: number, y0: number, w: number, h: number, top: boolean): Path2D {
  const p = new Path2D();
  if (!top) {
    p.rect(x0 - 12, y0 - 12, w + 24, h + 24);
    return p;
  }
  p.moveTo(x0 - 12, 250);
  for (let x = Math.floor(x0 / 12) * 12 - 12; x <= x0 + w + 12; x += 12)
    p.lineTo(x, 190 + Math.sin(x * 0.015) * 8 + Math.sin(x * 0.043) * 2);
  p.lineTo(x0 + w + 12, y0 + h + 12);
  p.lineTo(x0 - 12, y0 + h + 12);
  p.closePath();
  return p;
}

/**
 * The look of a tile whose detailed paper is still being baked: the pressed
 * pulp and (outside the lawn) the district stock, both in the graded ground
 * value of a baked tile, plus a world-anchored fibre, so the tile never shows
 * as a flat block with a straight edge against its baked neighbours. `stock`
 * is the district sheet colour, `opacity` its strength at the tile.
 */
export function groundUnderlay(
  ctx: Ctx, x: number, y: number, w: number, h: number, top: boolean, stock?: string, opacity = 1,
): void {
  const p = groundOutline(x, y, w, h, top);
  ctx.save();
  ctx.fillStyle = underlayTone(PULP_MEAN);
  ctx.fill(p);
  ctx.clip(p);
  if (stock) {
    ctx.save();
    clipOutsideLawn(ctx, { x0: x, y0: y, x1: x + w, y1: y + h });
    ctx.globalAlpha *= 0.9 * opacity;
    ctx.fillStyle = underlayTone(stock);
    ctx.fill(p);
    ctx.restore();
  }
  const fibre = [new Path2D(), new Path2D()], cell = UNDERLAY_FIBRE;
  for (let gy = Math.floor(y / cell); gy * cell < y + h; gy++)
    for (let gx = Math.floor(x / cell); gx * cell < x + w; gx++) {
      const sd = gx * 92821 + gy * 68917 + 5,
        px = (gx + hash(sd)) * cell, py = (gy + hash(sd + 1)) * cell, len = 3 + hash(sd + 2) * 8;
      const f = fibre[hash(sd + 3) > 0.55 ? 1 : 0]!;
      f.moveTo(px, py);
      f.lineTo(px + len, py + (hash(sd + 4) - 0.5) * 2.4);
    }
  ctx.lineCap = "round";
  ctx.lineWidth = 0.6;
  ctx.globalAlpha *= 0.4;
  ctx.strokeStyle = underlayTone("#272a21");
  ctx.stroke(fibre[0]!);
  ctx.globalAlpha *= 0.7;
  ctx.strokeStyle = underlayTone("#868a6c");
  ctx.stroke(fibre[1]!);
  ctx.restore();
}
/** Mean colour of the pressed pulp that groundTilePasses bakes (before the sheets and the grade). */
const PULP_MEAN = "#3f4236";
/** Fibre grid of the bake placeholder, in world units. */
const UNDERLAY_FIBRE = 26;
const underlayTones = new Map<string, string>();
function underlayTone(hex: string): string {
  let tone = underlayTones.get(hex);
  if (!tone) underlayTones.set(hex, (tone = gradeColour(hex, PAPER_VALUE.ground)));
  return tone;
}

/**
 * Moss-green ground paper for the world rectangle (x0, y0, w, h), in world
 * coordinates. Noise and hatching are functions of world position, so tiles
 * drawn separately meet without seams. In the top row (`top`) the sheet has
 * the wavy horizon edge at y ~190; lamps warm the paper around them.
 */
export function groundTile(
  ctx: Ctx,
  x0: number,
  y0: number,
  w: number,
  h: number,
  lamps: readonly GroundLamp[],
  top: boolean,
  yard = false,
): void {
  for (const _ of groundTilePasses(ctx, x0, y0, w, h, lamps, top, yard)) { /* finish the whole tile */ }
}

/** Batches of rows and hatching for the budgeted fallback when workers are unavailable. */
export function* groundTilePasses(
  ctx: Ctx,
  x0: number,
  y0: number,
  w: number,
  h: number,
  lamps: readonly GroundLamp[],
  top: boolean,
  yard = false,
): Generator<void> {
  const p = groundOutline(x0, y0, w, h, top);
  const gy0 = top ? 180 : y0;
  const receivesYardLight = x0 < 950 && x0 + w > 30 && gy0 < 610;
  piece(ctx, p, "#52574b", {
    shadow: top ? 2 : 0,
    texture: 0.7,
    edge: top ? "#68705b" : "#52574b",
  });
  const th = y0 + h - gy0,
    c = surface(w, th),
    cc = c.getContext("2d", { willReadFrequently: typeof document === "undefined" })!,
    im = cc.createImageData(w, th);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x0 + x,
        wy = y + gy0,
        n =
          noise(wx, wy, 85, 15) * 0.2 +
          noise(wx, wy, 22, 316) * 0.3 +
          noise(wx, wy, 3, 818) * 0.5;
      const fine = hash(wx * 17 + wy * 797);
      let r = 45 + n * 29 + fine * 7,
        g = 49 + n * 28 + fine * 6,
        b = 40 + n * 22 + fine * 5;
      if (receivesYardLight) {
        const light = Math.max(0, 1 - Math.hypot((wx - 490) / 460, (wy - 340) / 270));
        r += light * 5;
        g += light * 4;
      }
      for (const l of lamps) {
        const dx = (wx - l.x) / 78,
          dy = (wy - l.y) / 47;
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1) continue;
        const k = Math.max(0, 1 - Math.hypot(dx, dy)) ** 2;
        r += k * 48;
        g += k * 27;
        b += k * 4;
      }
      const i = (y * w + x) * 4;
      im.data[i] = r;
      im.data[i + 1] = g;
      im.data[i + 2] = b;
      im.data[i + 3] = 255;
    }
    if ((y & 7) === 7) yield;
  }
  cc.putImageData(im, 0, 0);
  ctx.save();
  ctx.clip(p);
  ctx.drawImage(c, x0, gy0);
  grain(ctx, p, 0.45);
  ctx.restore();
  // Quiet, short hatching follows patches of moss; it never becomes confetti.
  // Kept sparse: the district paper sheets laid over it carry the structure.
  // One possible mark per world cell (hashed from the cell, never the tile),
  // so the start yard and the tiles around it place identical marks along
  // their shared edges, and the density only feathers with the yard distance.
  const hatchingReach = 150, cell = MOSS_CELL,
    ys = Math.max(gy0, 205), ye = y0 + h;
  const moss = [new Path2D(), new Path2D()];
  let rows = 0;
  for (let gy = Math.floor((ys - 2) / cell); gy * cell < ye + 2; gy++) {
    if (++rows % 12 === 0) yield;
    for (let gx = Math.floor((x0 - 2) / cell); gx * cell < x0 + w + 2; gx++) {
      const sd = gx * 92821 + gy * 68917,
        x = (gx + hash(sd)) * cell,
        y = (gy + hash(sd + 1)) * cell;
      if (x < x0 - 2 || x > x0 + w + 2 || y < ys - 2 || y > ye + 2) continue;
      if (yard && y > 225 && Math.abs(x - pathCenter(y)) < 24) continue;
      const lawn = 1 - Math.min(1, yardDistance(x, y) / hatchingReach);
      if (hash(sd + 2) > 0.29 + 0.71 * lawn) continue;
      if (noise(x, y, 30, 65) < 0.43) continue;
      const m = moss[hash(sd + 3) > 0.85 ? 1 : 0]!;
      m.moveTo(x, y);
      m.lineTo(x + 1.2, y - 1.5);
    }
  }
  stroke(ctx, moss[0]!, "#6c7358", 0.35, 0.32);
  stroke(ctx, moss[1]!, "#92906a", 0.35, 0.32);
}
/** World cell of the moss hatching: one possible mark per cell (about the old 0.0208 marks per unit²). */
const MOSS_CELL = 7;
function road(ctx: Ctx): void {
  const left: Point[] = [],
    right: Point[] = [];
  for (let y = 222; y <= 550; y += 4) {
    const cx = pathCenter(y),
      w = 13 + (y - 222) * 0.044;
    left.push([cx - w + (hash(y) - 0.5), y]);
    right.push([cx + w + (hash(y + 11) - 0.5), y]);
  }
  const p = path([...left, ...right.reverse()]);
  piece(ctx, p, ROAD_STOCK.face, {
    shadow: 1.7,
    edge: ROAD_STOCK.rim,
    texture: 0.68,
    thickness: 1.2,
  });
  ctx.save();
  ctx.clip(p);
  for (let i = 0; i < 1100; i++) {
    const y = 225 + hash(i * 29) * 315,
      x = pathCenter(y) + (hash(i * 43) - 0.5) * (28 + (y - 220) * 0.085);
    const d = new Path2D();
    d.ellipse(
      x,
      y,
      1 + hash(i + 8) * 2,
      0.3 + hash(i) * 0.6,
      hash(i + 2) * 2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = i % 3 ? "rgba(95,77,64,.12)" : "rgba(245,224,186,.28)";
    ctx.fill(d);
  }
  ctx.restore();
  for (const y of [249, 285, 337, 413, 481]) {
    const x = pathCenter(y),
      p = oval(x + 2, y, 6 + (y - 220) / 90, 3, y, 0.09);
    piece(ctx, p, "#a89e88", { shadow: 0.5, texture: 0.75, thickness: 0.45 });
  }
}
export function leaf(
  ctx: Ctx,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
  color: string,
  seed: number,
  stitched = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const p = new Path2D(
    `M 0 0 C ${-width} ${-length * 0.3} ${-width * 0.8} ${-length * 0.72} 0 ${-length} C ${width * 0.9} ${-length * 0.7} ${width} ${-length * 0.2} 0 0 Z`,
  );
  piece(ctx, p, color, {
    shadow: length > 18 ? 1.7 : 0.55,
    edge: mix(color, "#e2b272", 0.5),
    texture: 0.65,
    thickness: length > 18 ? 0.7 : 0.35,
  });
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = "rgba(24,17,32,.13)";
  ctx.fill(
    path([
      [0, 0],
      [0, -length],
      [width * 2, -length / 2],
      [width, 0],
    ]),
  );
  ctx.restore();
  line(ctx, 0, -2, 0, -length + 2, mix(color, "#f3c17e", 0.5), 0.5, 0.8);
  if (length > 13)
    for (let j = 1; j < 4; j++) {
      const yy = (-length * j) / 4;
      line(
        ctx,
        0,
        yy,
        -width * 0.55,
        yy - 3,
        mix(color, "#e4b983", 0.3),
        0.35,
        0.65,
      );
      line(
        ctx,
        0,
        yy,
        width * 0.55,
        yy - 3,
        mix(color, "#e4b983", 0.3),
        0.35,
        0.65,
      );
    }
  if (stitched) stitch(ctx, p, "#d6aa70", 0.6);
  void seed;
  ctx.restore();
}
export function tree(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 40, 11);
  const trunk = new Path2D(
    "M -14 2 Q -5 -29 -9 -61 L -22 -91 L -15 -94 L -2 -66 L 2 -109 L 9 -111 L 7 -65 L 26 -91 L 31 -86 L 10 -47 Q 8 -20 18 3 L 6 -2 L 0 3 L -4 -2 Z",
  );
  piece(ctx, trunk, "#665044", { shadow: 2.6, edge: "#98774e", texture: 0.7 });
  const bark = new Path2D(
    "M -5 -3 Q 1 -31 -3 -54 M 5 -7 Q 2 -39 6 -61 M 0 -69 L 5 -97 M -6 -55 L -17 -84 M 9 -49 L 26 -83",
  );
  stroke(ctx, bark, "#a07850", 0.7, 0.75);
  const look = variant(seed, { palette: ["#b2724b", "#a76150", "#b58951"], flip: true, shift: 0.15 });
  // Rounded, upright and spreading crowns fit the same cached sprite envelope.
  const crowns = [
    [[-38, -84, 30, 31], [-18, -113, 32, 31], [15, -111, 32, 33], [40, -83, 28, 30], [-22, -66, 31, 26], [12, -72, 35, 31]],
    [[-32, -88, 28, 28], [-14, -120, 27, 26], [17, -112, 29, 30], [36, -80, 29, 26], [-20, -66, 27, 24], [11, -68, 31, 28]],
    [[-42, -80, 28, 28], [-25, -109, 29, 29], [10, -113, 32, 29], [41, -86, 29, 27], [-26, -62, 30, 24], [13, -66, 35, 27]],
  ];
  const clumps = crowns[Math.abs(seed) % crowns.length]!;
  ctx.save();
  ctx.scale(look.flip, 1);
  clumps.forEach(([cx, cy, rx, ry], i) => {
    const color = mix(look.color, i < 2 || i === 4 ? "#713e49" : "#d7a760", i < 2 || i === 4 ? 0.26 : 0.2);
    const p = oval(cx!, cy!, rx!, ry!, seed + i * 17, 0.19);
    paperCut(ctx, p, {
      color, shadow: 2.4, texture: 0.75, edge: "#bb8c5c", thickness: 0.9,
      fold: { from: [cx! - 5, cy! - ry! * 0.8], to: [cx! + 4, cy! + ry! * 0.9], depth: 0.12 },
    });
    ctx.save();
    ctx.clip(p);
    const foldLight = ctx.createLinearGradient(
      cx! - rx! * 0.8,
      cy! - ry!,
      cx! + rx! * 0.5,
      cy! + ry!,
    );
    foldLight.addColorStop(0, "rgba(249,201,136,.2)");
    foldLight.addColorStop(0.45, "rgba(245,194,128,.02)");
    foldLight.addColorStop(1, "rgba(44,19,41,.26)");
    ctx.fillStyle = foldLight;
    ctx.fill(p);
    ctx.restore();
    stitch(
      ctx,
      oval(cx!, cy!, rx! - 2.6, ry! - 2.5, seed + i * 17, 0.12),
      "#d9ab6c",
      0.75,
    );
    const branch = new Path2D();
    branch.moveTo(cx!, cy! + ry! * 0.8);
    branch.quadraticCurveTo(cx! - 3, cy!, cx! + 3, cy! - ry! * 0.7);
    branch.moveTo(cx! - 1, cy! + 7);
    branch.lineTo(cx! - rx! * 0.5, cy! - ry! * 0.3);
    branch.moveTo(cx!, cy! + 4);
    branch.lineTo(cx! + rx! * 0.5, cy! - ry! * 0.4);
    stroke(ctx, branch, "#a7794f", 1.4, 0.85);
    stroke(ctx, branch, "#d1a260", 0.45, 0.8);
    // Leaf fans grow from the branch forks; the rest of each crown stays quiet.
    ctx.save();
    ctx.clip(p);
    for (const [j, [dx, dy]] of [[-0.4, -0.02], [0.37, -0.16]].entries()) {
      const xx = cx! + dx! * rx!, yy = cy! + dy! * ry!;
      for (let k = 0; k < 3; k++)
        leaf(ctx, xx, yy, 10 + k * 2, 4.5, (k - 1) * 0.62 + (j ? 0.5 : -0.5), mix(color, "#e1b777", 0.12 + k * 0.09), seed + i * 7 + j);
    }
    ctx.restore();
  });
  ctx.restore();
  paperCut(ctx, [[-14, 2], [-8, -5], [0, -2], [10, -4], [19, 4], [8, 3], [0, 7]], {
    color: "#726045", shadow: 0.7, thickness: 0.7, texture: 0.65,
  });
  foldLine(ctx, -8, 0, 5, 3, 0.55);
  paperSprig(ctx, -20, 5, 0.55, seed, "#7e8051");
  for (let i = 0; i < 6; i++)
    leaf(ctx, 18 + (i % 3) * 6, 4 + Math.floor(i / 3) * 4, 7, 3, -1.2 + (i % 3) * 0.7, ["#b57944", "#a0583b", "#c28c49"][i % 3]!, seed + i);
  ctx.restore();
}
function windowArt(ctx: Ctx, x: number, y: number, w: number, h: number, style = 0, shutters = false): void {
  const arch = (pad: number) => style % 2
    ? path([[x - pad, y + h + pad], [x - pad, y + 1 - pad], [x + w + pad, y + 1 - pad], [x + w + pad, y + h + pad]])
    : new Path2D(`M ${x - pad} ${y + h + pad} L ${x - pad} ${y + 7} Q ${x + w / 2} ${y - 7 - pad * 2} ${x + w + pad} ${y + 7} L ${x + w + pad} ${y + h + pad} Z`);
  const p = arch(0);
  // Window light stays flat and modest (a pale sill wash, no gradient halo).
  ctx.save();
  ctx.fillStyle = "#ffc065";
  ctx.globalAlpha *= 0.09;
  ctx.fill(oval(x + w / 2, y + h * 0.6, w * 0.95, h * 0.75, 3, 0.05));
  ctx.restore();
  paperCut(ctx, arch(3), { color: "#948069", shadow: 0.6, thickness: 0.8, texture: 0.65, edge: "#e0c7a0" });
  paperCut(ctx, arch(1.7), { color: "#493f3c", shadow: 0, thickness: 0.7, texture: 0.5 });
  piece(ctx, p, "#edbb64", {
    shadow: 1.1,
    edge: "#634431",
    thickness: 2,
    texture: 0.4,
  });
  ctx.save();
  ctx.clip(p);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#ffe4a1");
  g.addColorStop(0.6, "#efb35a");
  g.addColorStop(1, "#bd6e32");
  ctx.fillStyle = g;
  ctx.fill(p);
  grain(ctx, p, 0.32);
  ctx.restore();
  // A dark inner jamb and pale opposite lip make the light sit behind the wall.
  line(ctx, x + 1, y + 7, x + 1, y + h - 1, "#785138", 1.7);
  line(ctx, x + w - 1, y + 7, x + w - 1, y + h - 1, "#ffe2a0", 0.65);
  if (shutters) {
    for (const side of [-1, 1]) {
      const sx = side < 0 ? x - 9 : x + w + 3;
      paperCut(ctx, [[sx, y + 5], [sx + 5, y + 3], [sx + 5, y + h - 1], [sx, y + h - 3]], {
        color: style > 1 ? "#667566" : "#8b6754", shadow: 0.7, thickness: 0.6, texture: 0.65, edge: "#b3a184",
      });
      for (let row = 0; row < 4; row++) line(ctx, sx + 1, y + 9 + row * 4, sx + 4, y + 8 + row * 4, "#c0ae89", 0.6, 0.65);
      foldLine(ctx, sx + 2.5, y + 5, sx + 2.5, y + h - 3, 0.35);
    }
  }
  line(ctx, x + w / 2, y + 2, x + w / 2, y + h, "#805337", 1.6);
  line(ctx, x + 1, y + h * 0.58, x + w - 1, y + h * 0.58, "#8f5b35", 1.4);
  piece(ctx, box(x - 3, y + h, w + 6, 3), "#baa07e", {
    shadow: 1,
    texture: 0.7,
    edge: "#e2c095",
    thickness: 0.7,
  });
}
export function cottage(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const look = variant(seed, { palette: ["#dcc9a9", "#cabb9c", "#d6bf9f"], shift: 0.12 });
  const style = Math.abs(seed) % 4, ridgeY = style % 2 ? -128 : -133;
  shadow(ctx, -9, 3, 96, 7);
  // A turned side wall and a cream front gable give the cottage a folded-paper volume.
  piece(
    ctx,
    path([
      [-96, -57],
      [-23, -62],
      [-23, 3],
      [-96, -1],
    ]),
    mix(look.color, "#6e7060", 0.32),
    { shadow: 3.2, edge: "#e0c6a0", texture: 0.9, thickness: 1.1 },
  );
  piece(
    ctx,
    path([
      [-24, -61],
      [23, ridgeY + 10],
      [83, -62],
      [83, 4],
      [-24, 4],
    ]),
    look.color,
    { shadow: 2.7, edge: "#f0d7af", texture: 0.9, thickness: 1.1 },
  );
  piece(
    ctx,
    path([
      [83, -62],
      [91, -68],
      [91, -2],
      [83, 4],
    ]),
    "#aa9478",
    { shadow: 1.3, texture: 0.9, edge: "#c2a887", thickness: 0.8 },
  );
  ctx.save();
  ctx.clip(
    path([
      [-24, -61],
      [23, ridgeY + 10],
      [83, -62],
      [83, 4],
      [-24, 4],
    ]),
  );
  const wallLight = ctx.createLinearGradient(-24, -70, 83, 5);
  wallLight.addColorStop(0, "rgba(255,224,175,.13)");
  wallLight.addColorStop(1, "rgba(88,52,43,.12)");
  ctx.fillStyle = wallLight;
  ctx.fillRect(-24, -123, 108, 127);
  ctx.restore();
  // Exposed corner masonry and grouped repairs replace uniform wall speckles.
  for (let row = 0; row < 5; row++) {
    for (const xx of [-94, -23, 74])
      paperCut(ctx, box(xx, -42 + row * 9, row % 2 ? 7 : 10, 5, seed + row), {
        color: xx < -24 ? "#a69377" : "#c0aa88", shadow: 0.25, thickness: 0.4, texture: 0.65,
      });
  }
  for (let i = 0; i < 5; i++)
    paperCut(ctx, box(-60 + (i % 3) * 9, -10 - Math.floor(i / 3) * 5, 8, 3.5, i), {
      color: "#9d8a70", shadow: 0.2, thickness: 0.3, texture: 0.6,
    });
  piece(
    ctx,
    path([
      [-97, -4],
      [83, -1],
      [83, 9],
      [-97, 5],
    ]),
    "#847b69",
    { shadow: 1.5, edge: "#bbab8d", texture: 0.85, thickness: 0.8 },
  );
  for (let i = 0; i < 15; i++)
    line(ctx, -94 + i * 12, 1, -94 + i * 12, 6, "#625a50", 0.6, 0.65);
  // The broad roof is a receding plane; the front gable remains visible below the ridge.
  const roof = path([
    [-111, -58],
    [-40, ridgeY + 3],
    [24, ridgeY],
    [-24, -57],
  ]);
  paperCut(ctx, roof, {
    color: style > 1 ? "#445253" : "#4a3449", layers: 1, shadow: 2.5,
    edge: "#b48b59", texture: 0.75, thickness: 1.4,
  });
  ctx.save();
  ctx.clip(roof);
  for (let row = 0; row < 8; row++) {
    const yy = -124 + row * 9;
    for (let col = 0; col < 11; col++) {
      const xx = -120 + col * 15 - (row % 2) * 7;
      const p = new Path2D(
        `M ${xx} ${yy - 8} L ${xx + 16} ${yy - 8} L ${xx + 14} ${yy + 1} Q ${xx + 7} ${yy + 4} ${xx} ${yy + 1} Z`,
      );
      const palette = style > 1 ? ["#536467", "#5c6b68", "#4c5b60"] : ["#644553", "#714d59", "#57404e"];
      piece(ctx, p, palette[(row + Math.floor(col / 3) + style) % 3]!, {
        shadow: 0.8, texture: 0.65, edge: "#a08b70", thickness: 0.65,
      });
    }
  }
  const shade = ctx.createLinearGradient(-102, -75, 15, -121);
  shade.addColorStop(0, "rgba(17,15,29,.16)");
  shade.addColorStop(1, "rgba(228,170,108,.09)");
  ctx.fillStyle = shade;
  ctx.fill(roof);
  ctx.restore();
  paperCut(ctx, [[24, ridgeY], [32, ridgeY + 6], [92, -59], [84, -56], [25, ridgeY + 12], [-19, -54], [-27, -58]], {
    color: "#997550", shadow: 1.1, thickness: 0.8, texture: 0.65, edge: "#d7b482",
  });
  const eaves = new Path2D(`M -112 -57 L -24 -56 L 24 ${ridgeY - 1} L 90 -58`);
  stroke(ctx, eaves, "#48332e", 3.8);
  stroke(ctx, eaves, "#c29a61", 1.0);
  const ridge = new Path2D(`M -40 ${ridgeY + 2} L 24 ${ridgeY - 1}`);
  stroke(ctx, ridge, "#74513b", 3);
  stroke(ctx, ridge, "#d0a767", 0.7);
  stitch(
    ctx,
    new Path2D(`M -107 -60 L -27 -59 L 23 ${ridgeY + 5} L 85 -60`),
    "#d1ad77",
    0.7,
  );
  // Chimney with a folded side, irregular brick seams, and a heavy cap.
  piece(ctx, box(-68, -132, 17, 40), "#c1aa89", {
    shadow: 2,
    edge: "#e5cda6",
    texture: 0.9,
  });
  piece(
    ctx,
    path([
      [-51, -132],
      [-46, -135],
      [-46, -95],
      [-51, -92],
    ]),
    "#927b62",
    { shadow: 0.5, texture: 0.8, thickness: 0.5 },
  );
  for (let row = 0; row < 7; row++) {
    line(ctx, -67, -127 + row * 5, -52, -127 + row * 5, "#93785b", 0.65);
    line(
      ctx,
      -62 + (row % 2) * 5,
      -126 + row * 5,
      -62 + (row % 2) * 5,
      -123 + row * 5,
      "#a58a68",
      0.5,
    );
  }
  piece(ctx, box(-71, -137, 26, 5), "#6f4d3d", {
    shadow: 1.8,
    edge: "#ba9160",
    texture: 0.85,
  });
  // Two silhouettes add a dormer; the other two keep the uninterrupted tiled plane.
  if (style % 2 === 0) {
    paperCut(ctx, [[-63, -79], [-63, -96], [-52, -106], [-41, -94], [-41, -78]], {
      color: mix(look.color, "#8d7d69", 0.25), shadow: 1.2, thickness: 0.9, texture: 0.65,
    });
    paperCut(ctx, [[-68, -94], [-53, -110], [-36, -94], [-41, -91], [-53, -102], [-64, -91]], {
      color: style > 1 ? "#526466" : "#72515b", layers: 1, shadow: 1, thickness: 0.7, texture: 0.65,
    });
    windowArt(ctx, -57, -94, 10, 12, style);
  }
  windowArt(ctx, -83, -44, 17, 27, style, true);
  windowArt(ctx, -52, -43, 17, 26, style);
  windowArt(ctx, -10, -43, 19, 27, style, style % 2 === 1);
  windowArt(ctx, 57, -43, 17, 27, style, true);
  windowArt(ctx, 19, -82, 12, 18, style);
  paperCut(ctx, [[18, 4], [18, -33], [24, -42], [35, -46], [47, -41], [51, -33], [51, 4]], {
    color: "#a18a6d", shadow: 0.8, thickness: 1, texture: 0.65, edge: "#e0c49b",
  });
  paperCut(ctx, new Path2D("M 22 4 L 22 -34 Q 35 -49 48 -34 L 48 4 Z"), {
    color: "#453b33", shadow: 0, thickness: 0.7, texture: 0.45,
  });
  const door = new Path2D("M 24 4 L 24 -34 Q 35 -47 46 -34 L 46 4 Z");
  piece(ctx, door, "#624731", {
    shadow: 2,
    edge: "#b68e56",
    texture: 0.9,
    thickness: 1.4,
  });
  for (let i = 0; i < 4; i++)
    line(ctx, 27 + i * 4.6, -31, 27 + i * 4.6, 3, "#a07a47", 0.6);
  ctx.fillStyle = "#d5b269";
  ctx.fill(oval(41, -13, 1.1, 1.1));
  // Build the stoop back to front, staying above the sprite's +16 bottom bound.
  for (let i = 0; i < 3; i++)
    paperCut(ctx, [[23 - i * 3, 3 + i * 3], [47 + i * 3, 3 + i * 3], [50 + i * 3, 6 + i * 3], [20 - i * 3, 6 + i * 3]], {
      color: i % 2 ? "#a4967c" : "#b0a084", layers: 1, shadow: 0.6, edge: "#dac49c", texture: 0.65, thickness: 0.6,
    });
  for (const yy of [-24, -6]) {
    line(ctx, 25, yy, 31, yy, "#473c32", 1.8);
    line(ctx, 26, yy - 0.5, 29, yy - 0.5, "#b2a17c", 0.5);
  }
  line(ctx, -24, -56, -24, 2, "#ac9471", 1.3);
  line(ctx, 82, -57, 82, 3, "#927451", 1.3);
  for (const bx of [-86, style % 2 ? 54 : -12]) {
    paperCut(ctx, [[bx - 1, -14], [bx + 23, -14], [bx + 26, -11], [bx + 23, -6], [bx + 2, -6]], {
      color: "#876044", layers: 1, shadow: 0.7, thickness: 0.7, texture: 0.65, edge: "#bf955d",
    });
    paperCut(ctx, oval(bx + 12, -13, 11, 2, seed), { color: "#4e5140", shadow: 0, thickness: 0.4, texture: 0.5 });
    foldLine(ctx, bx + 2, -10, bx + 23, -10, 0.45);
    for (let i = 0; i < 4; i++) flower(ctx, bx + 3 + i * 5, -13, 0.43, seed + i);
  }
  const ivy = new Path2D("M -22 -8 Q -31 -39 -16 -69 Q 2 -83 15 -116");
  stroke(ctx, ivy, "#785c3d", 1.1);
  for (let i = 0; i < 25; i++)
    leaf(
      ctx,
      -24 + i * 1.65,
      -27 - i * 3.4,
      5.5 + (i % 3),
      2.6,
      i % 2 ? -1 : 0.8,
      ["#b97a3d", "#956a39", "#c89349"][i % 3]!,
      seed + i,
    );
  lantern(ctx, 77, -19, 0.58, false);
  for (let i = 0; i < 5; i++)
    piece(
      ctx,
      oval(-97 + (i % 2) * 9, -2 - Math.floor(i / 2) * 5, 7, 3, i, 0.12),
      "#9e7a4c",
      { shadow: 1, edge: "#c5a172", texture: 0.85, thickness: 0.5 },
    );
  ctx.restore();
}
export function lantern(ctx: Ctx, x: number, y: number, s: number, post = true): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 2, 11, 3);
  if (post) {
    piece(
      ctx,
      path([
        [-3, 1],
        [-3, -39],
        [2, -43],
        [4, 1],
      ]),
      "#705038",
      { shadow: 1.7, edge: "#a9804b", texture: 0.8 },
    );
    piece(ctx, box(-6, 0, 12, 3), "#66513e", { shadow: 0.8, edge: "#a58658" });
  }
  const top = post ? -53 : -24;
  const handle = new Path2D(
    `M -4 ${top - 1} C -6 ${top - 14} 7 ${top - 13} 5 ${top - 1}`,
  );
  stroke(ctx, handle, "#b28d54", 1.1);
  // A dim flat halo: plain lamps stay below the interactive lanterns and pumpkins.
  ctx.save();
  ctx.fillStyle = "#ffc15b";
  ctx.globalAlpha *= 0.07;
  ctx.fill(oval(0, top + 13, 22, 20, 5, 0.05));
  ctx.globalAlpha *= 1.4;
  ctx.fill(oval(0, top + 13, 13, 13, 6, 0.05));
  ctx.restore();
  piece(
    ctx,
    path([
      [-10, top + 3],
      [0, top - 4],
      [11, top + 3],
    ]),
    "#816044",
    { shadow: 1.3, edge: "#d5ad6c", texture: 0.8 },
  );
  piece(
    ctx,
    path([
      [-9, top + 4],
      [9, top + 4],
      [7, top + 24],
      [-7, top + 24],
    ]),
    "#e2a956",
    { shadow: 1.7, edge: "#664a35", texture: 0.45, thickness: 1.1 },
  );
  ctx.fillStyle = "#e9b663";
  ctx.fill(
    path([
      [-6, top + 6],
      [6, top + 6],
      [5, top + 21],
      [-5, top + 21],
    ]),
  );
  ctx.fillStyle = "#f6d68c";
  ctx.fill(
    path([
      [-3, top + 8],
      [3, top + 8],
      [2.5, top + 19],
      [-2.5, top + 19],
    ]),
  );
  for (const dx of [-8, 0, 8])
    line(ctx, dx, top + 4, dx * 0.75, top + 24, "#755136", 1.1);
  line(ctx, -7, top + 24, 7, top + 24, "#9e7745", 2);
  line(ctx, -5, top + 25, 5, top + 25, "#d7b175", 0.65);
  ctx.restore();
}
export function bush(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  shadow(ctx, x, y + 2, 29 * s, 6 * s);
  for (let i = 0; i < 4; i++) {
    const xx = x + (i - 1.5) * 13 * s,
      yy = y - 8 * s - Math.sin(i) * 7 * s,
      p = oval(xx, yy, 15 * s, 13 * s, seed + i, 0.13);
    piece(ctx, p, ["#556044", "#6c7150", "#737850", "#5a6548"][i]!, {
      shadow: 1.7,
      edge: "#a49e63",
      texture: 0.8,
      thickness: 0.8,
    });
    stitch(
      ctx,
      oval(xx, yy, 13.6 * s, 11.7 * s, seed + i, 0.12),
      "#b4a76a",
      0.6,
    );
    for (let j = 0; j < 4; j++)
      leaf(
        ctx,
        xx + (hash(j + seed) - 0.5) * 17 * s,
        yy + 5 * s,
        5 * s,
        2 * s,
        j,
        "#737c51",
        j,
      );
  }
  if (seed % 3 === 0)
    for (let i = 0; i < 4; i++)
      flower(
        ctx,
        x + (i - 1.5) * 8 * s,
        y - 13 * s + (i % 2) * 4,
        0.45 * s,
        seed + i,
      );
}
export function flower(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  paperFlower(ctx, x, y, s, seed);
}
export function pumpkin(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 17, 5);
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 5,
      p = oval(dx, -11, 7.5, 11 - Math.abs(i - 2) * 0.7, seed + i, 0.07);
    piece(ctx, p, ["#a4542b", "#c47735", "#e5a34c", "#d1903e", "#ae632d"][i]!, {
      shadow: i === 0 ? 1.7 : 0.5,
      edge: "#e9b86a",
      texture: 0.8,
      thickness: 0.75,
    });
  }
  piece(
    ctx,
    path([
      [-2, -20],
      [-2, -27],
      [3, -28],
      [2, -21],
    ]),
    "#68603e",
    { shadow: 0.6, edge: "#a38c50", texture: 0.8, thickness: 0.6 },
  );
  if (seed % 4 !== 0) {
    // Decor pumpkins keep an unlit carved face; only interactive pumpkins glow.
    for (const p of [
      path([
        [-11, -12],
        [-6, -16],
        [-3, -10],
      ]),
      path([
        [3, -10],
        [6, -16],
        [11, -12],
      ]),
      path([
        [-10, -6],
        [-6, -5],
        [-4, -7],
        [-2, -5],
        [2, -5],
        [4, -7],
        [6, -5],
        [10, -6],
        [6, -1],
        [-6, -1],
      ]),
    ]) {
      piece(ctx, p, "#5a3220", {
        shadow: 0,
        edge: "#c9864a",
        texture: 0.35,
        thickness: 0.65,
      });
    }
  }
  leaf(ctx, 12, 1, 9, 4, 1.0, "#b38c46", seed);
  ctx.restore();
}
export function fence(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 3, 44, 7);
  for (const yy of [-19, -8])
    piece(
      ctx,
      path([
        [-39, yy + 1],
        [40, yy - 2],
        [40, yy + 2],
        [-39, yy + 5],
      ]),
      "#624b35",
      { shadow: 1.3, edge: "#947747", texture: 0.8, thickness: 0.7 },
    );
  for (let i = 0; i < 4; i++) {
    const xx = -34 + i * 24;
    piece(
      ctx,
      path([
        [xx - 3, 2],
        [xx - 3, -28],
        [xx - 6, -29],
        [xx, -36],
        [xx + 6, -29],
        [xx + 3, -28],
        [xx + 3, 2],
      ]),
      "#6b4d34",
      { shadow: 2, edge: "#b2884f", texture: 0.8, thickness: 0.8 },
    );
    line(ctx, xx - 1, -25, xx - 1, 0, "#ac8251", 0.65);
    for (const yy of [-17, -7]) {
      ctx.fillStyle = "#c2a270";
      ctx.fill(oval(xx + 1, yy, 0.65, 0.65));
    }
  }
  ctx.restore();
}
export function stone(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  shadow(ctx, x, y + 2, 12 * s, 4 * s);
  const p = path(
    [
      [x - 12 * s, y - 3 * s],
      [x - 7 * s, y - 10 * s],
      [x + 4 * s, y - 12 * s],
      [x + 12 * s, y - 5 * s],
      [x + 10 * s, y + 1 * s],
      [x - 6 * s, y + 3 * s],
    ],
    true,
  );
  piece(ctx, p, "#9a8b7e", {
    shadow: 1.8,
    edge: "#c2ae91",
    texture: 0.85,
    thickness: 0.8,
  });
  stroke(
    ctx,
    path(
      [
        [x - 7 * s, y - 8 * s],
        [x + 3 * s, y - 10 * s],
        [x + 8 * s, y - 5 * s],
      ],
      true,
    ),
    "#d3bca0",
    0.6,
    0.6,
  );
  void seed;
}
export function candles(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 2, 17, 5);
  piece(ctx, box(-16, -4, 32, 8), "#6a4c3b", {
    shadow: 1.5,
    edge: "#95704d",
    texture: 0.8,
  });
  piece(ctx, oval(0, -4, 16, 4, 9, 0.07), "#b4986b", {
    shadow: 0,
    texture: 0.8,
    edge: "#dac297",
    thickness: 0.7,
  });
  stitch(ctx, oval(0, -4, 10, 2.6), "#8e714e", 0.5);
  for (const [dx, h] of [
    [-8, 14],
    [0, 20],
    [8, 12],
  ]) {
    piece(ctx, box(dx! - 2, -h!, 4, h! - 4), "#e6d0a4", {
      shadow: 1,
      edge: "#fff0c8",
      texture: 0.7,
      thickness: 0.55,
    });
    line(ctx, dx! + 1, -h! + 3, dx! + 1, -h! + 6, "#f7e7c1", 1.2);
    const p = new Path2D(
      `M ${dx! - 2} ${-h! - 1} Q ${dx! - 4} ${-h! - 5} ${dx!} ${-h! - 10} Q ${dx! + 5} ${-h! - 4} ${dx! + 2} ${-h! - 1} Z`,
    );
    piece(ctx, p, "#e7bd78", {
      shadow: 0,
      texture: 0.25,
      edge: "#f6d39a",
      thickness: 0.3,
    });
  }
  ctx.restore();
}
export function grassTuft(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  seed: number,
): void {
  for (let i = 0; i < 6; i++) {
    const h = (5 + hash(seed + i * 11) * 8) * s,
      d = (i - 2.5) * 2.2 * s,
      p = new Path2D();
    p.moveTo(x, y);
    p.quadraticCurveTo(x + d * 0.4, y - h * 0.5, x + d, y - h);
    stroke(ctx, p, i % 3 ? "#929768" : "#676f4f", 0.7 * s, 0.7);
  }
}
function garden(ctx: Ctx): void {
  for (const [x, y, s] of [
    [54, 252, 1.05],
    [147, 250, 0.8],
    [307, 236, 0.8],
    [548, 230, 0.7],
    [770, 256, 0.9],
    [916, 264, 1.1],
  ])
    bush(ctx, x!, y!, s!, Math.floor(x!));
  for (const [x, y] of [
    [64, 280],
    [311, 267],
    [687, 273],
    [875, 290],
    [274, 350],
    [746, 397],
    [292, 480],
    [46, 369],
  ]) {
    for (let i = 0; i < 4; i++)
      flower(ctx, x! + (i - 1.5) * 6, y! + Math.sin(i) * 4, 0.6, i);
    grassTuft(ctx, x! - 8, y! + 3, 0.7, x!);
  }
  for (const [x, y] of [
    [320, 259],
    [677, 267],
    [850, 280],
    [70, 345],
    [295, 430],
    [840, 420],
    [285, 490],
  ])
    for (let i = 0; i < 8; i++)
      leaf(
        ctx,
        x! + (hash(i + x!) - 0.5) * 32,
        y! + hash(i + y!) * 10,
        6 + hash(i) * 3,
        3,
        hash(i * 11) * 6,
        ["#b97a3e", "#9f5740", "#b68b48"][i % 3]!,
        i,
      );
}
function gardenDetails(ctx: Ctx): void {
  // A tiny memorial garden tucked into the left edge, with layered stone and moss.
  shadow(ctx, 39, 475, 21, 6);
  const tomb = new Path2D(
    "M 23 475 L 23 446 Q 22 429 38 426 Q 54 428 55 445 L 57 475 Z",
  );
  piece(ctx, tomb, "#817486", {
    shadow: 3,
    edge: "#b39a9a",
    texture: 0.95,
    thickness: 1.2,
  });
  const inset = new Path2D(
    "M 29 467 L 29 447 Q 29 435 39 433 Q 49 435 49 447 L 50 467",
  );
  stroke(ctx, inset, "#b199a1", 0.7);
  stitch(ctx, inset, "#bfa48f", 0.45);
  ctx.fillStyle = "#55435e";
  ctx.fill(oval(39, 445, 3, 5));
  line(ctx, 33, 459, 45, 459, "#a58b8f", 0.6);
  line(ctx, 35, 462, 43, 462, "#a58b8f", 0.5);
  for (let i = 0; i < 5; i++)
    leaf(
      ctx,
      24 + i * 8,
      478,
      12,
      4,
      (i - 2) * 0.4,
      ["#766645", "#916a45", "#8a6846"][i % 3]!,
      i,
    );
  bush(ctx, 185, 317, 0.7, 84);
  stone(ctx, 173, 325, 0.85, 81);
  for (let i = 0; i < 4; i++)
    flower(ctx, 190 + i * 6, 329 + (i % 2) * 3, 0.65, i);
  // A bent boundary stone and a fern nest on the opposite side of the path.
  piece(
    ctx,
    path(
      [
        [810, 504],
        [809, 473],
        [814, 462],
        [830, 460],
        [840, 474],
        [839, 503],
      ],
      true,
    ),
    "#827681",
    { shadow: 2.5, edge: "#ad9295", texture: 0.9, thickness: 0.9 },
  );
  for (const [x, y] of [
    [818, 475],
    [829, 474],
    [818, 486],
    [830, 485],
  ])
    piece(ctx, oval(x, y, 1.7, 3.2), "#504252", {
      shadow: 0,
      texture: 0.55,
      thickness: 0.35,
    });
  const crack = new Path2D("M 833 465 L 829 474 L 834 482");
  stroke(ctx, crack, "#5e4c60", 0.6, 0.8);
  for (let i = 0; i < 6; i++)
    leaf(
      ctx,
      802 + i * 8,
      509,
      17 + hash(i) * 10,
      6,
      (i - 3) * 0.4,
      ["#78604f", "#8d664e", "#6c5a54"][i % 3]!,
      i,
      true,
    );
  // Each patch has a clear centre: a rock, flower heads, then a few surrounding leaves.
  for (const [x, y] of [
    [259, 388],
    [690, 355],
    [210, 473],
    [718, 445],
  ]) {
    stone(ctx, x, y, 0.5, x);
    grassTuft(ctx, x - 9, y + 3, 0.85, x);
    for (let i = 0; i < 3; i++)
      flower(ctx, x + 7 + i * 5, y + 4 + (i % 2) * 2, 0.55, i + x);
    for (let i = 0; i < 5; i++)
      leaf(
        ctx,
        x + (hash(i + x) - 0.5) * 35,
        y + 5 + hash(i + y) * 8,
        6.5,
        2.5,
        hash(i * 13) * 6,
        ["#b47741", "#9e5f42", "#b58c4e"][i % 3]!,
        i,
      );
  }
  // A folded Halloween pennant hangs between the right tree and a garden post.
  const cord = new Path2D("M 879 201 Q 904 211 931 202");
  stroke(ctx, cord, "#bf985b", 0.75);
  piece(
    ctx,
    path([
      [913, 205],
      [929, 204],
      [929, 235],
      [921, 230],
      [914, 235],
    ]),
    "#c39555",
    { shadow: 1.8, edge: "#e0b779", texture: 0.85, thickness: 0.7 },
  );
  const face = new Path2D(
    "M 917 216 L 920 213 L 922 217 L 925 213 L 928 216 L 925 217 L 922 216 L 920 218 Z M 917 222 Q 922 228 927 222 Q 922 224 917 222 Z",
  );
  ctx.fillStyle = "#694135";
  ctx.fill(face);
  line(ctx, 933, 202, 933, 257, "#78543b", 2);
  line(ctx, 934, 202, 934, 256, "#b48c56", 0.6);
}
function bunting(ctx: Ctx): void {
  const p = new Path2D("M 542 207 Q 704 258 892 200");
  stroke(ctx, p, "#ba965f", 0.7);
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12,
      x = 542 + t * 350,
      y = 207 + (200 - 207) * t + Math.sin(t * Math.PI) * 25;
    piece(
      ctx,
      path([
        [x - 6, y],
        [x + 6, y],
        [x + 1, y + 15],
      ]),
      ["#bd7543", "#d0a357", "#a55b4d"][i % 3]!,
      { shadow: 1, texture: 0.75, edge: "#d5ad74", thickness: 0.6 },
    );
  }
}
function buildStartYard(): CanvasSurface {
  const c = surface(W * 2, H * 2),
    ctx = c.getContext("2d")!;
  ctx.scale(2, 2);
  horizonHills(ctx, 0, W);
  groundTile(ctx, 0, 0, W, H, LAMPS, true, true);
  road(ctx);
  tree(ctx, 82, 246, 1.12, 9);
  tree(ctx, 858, 246, 1.13, 6);
  tree(ctx, 477, 215, 0.65, 11);
  cottage(ctx, 238, 219, 1.14, 102);
  cottage(ctx, 729, 230, 0.77, 71);
  garden(ctx);
  gardenDetails(ctx);
  fence(ctx, 139, 260, 1.05);
  fence(ctx, 224, 255, 1.05);
  fence(ctx, 697, 265, 0.9);
  fence(ctx, 769, 265, 0.9);
  pumpkin(ctx, 448, 244, 0.85, 31);
  pumpkin(ctx, 322, 255, 0.48, 32);
  pumpkin(ctx, 846, 274, 0.68, 41);
  candles(ctx, 112, 261, 0.8);
  bunting(ctx);
  glow(ctx, 232, 229, 73, "#dfa358", 0.13, 0.5);
  glow(ctx, 730, 239, 52, "#e4ab60", 0.14, 0.5);
  for (const [x, y] of [
    [915, 370],
    [892, 380],
    [46, 398],
  ])
    stone(ctx, x, y, x > 900 ? 1.6 : 0.8, x);
  return c;
}
/** The start yard below the sky (hills, ground, road, cottages, garden), at 2x, world 0..960 x 0..540. */
export function startYard(): CanvasSurface {
  return (background ??= withFlatShadows(buildStartYard));
}
let skyCanvas: CanvasSurface | undefined;
/** Screen-space sky; the world's ground covers it once the camera leaves the north edge. */
export function drawSky(ctx: Ctx): void {
  if (!skyCanvas) {
    skyCanvas = surface(W * 2, SKY_H * 2);
    const sc = skyCanvas.getContext("2d")!;
    sc.scale(2, 2);
    skySheet(sc);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(skyCanvas, 0, 0, W, SKY_H);
}
export function drawProp(ctx: Ctx, p: SceneProp): void {
  const key = `${p.kind}-${p.s}-${p.seed}`;
  let c = propCache.get(key);
  if (!c) {
    c = surface(360, 360);
    const target = c.getContext("2d")!;
    target.scale(2, 2);
    const x = 90,
      y = 148;
    withFlatShadows(() => {
      if (p.kind === "tree") tree(target, x, y, p.s, p.seed);
      if (p.kind === "bush") bush(target, x, y, p.s, p.seed);
      if (p.kind === "pumpkin") pumpkin(target, x, y, p.s, p.seed);
      if (p.kind === "fence") fence(target, x, y, p.s);
      if (p.kind === "stone") stone(target, x, y, p.s, p.seed);
      if (p.kind === "candles") candles(target, x, y, p.s);
    });
    gradeCanvas(c, PAPER_VALUE.decor);
    propCache.set(key, c);
  }
  ctx.drawImage(c, p.x - 90, p.y - 148, 180, 180);
}
const lamps = new Map<number, CanvasSurface>();
export function drawLamp(
  ctx: Ctx,
  l: { x: number; y: number; s: number },
  _time: number,
): void {
  let c = lamps.get(l.s);
  if (!c) {
    c = surface(140, 190);
    const target = c.getContext("2d")!;
    target.scale(2, 2);
    withFlatShadows(() => lantern(target, 35, 85, l.s));
    gradeCanvas(c, PAPER_VALUE.decor);
    lamps.set(l.s, c);
  }
  ctx.drawImage(c, l.x - 35, l.y - 85, 70, 95);
}
export function drawGroundLight(
  ctx: Ctx,
  x: number,
  y: number,
  _time: number,
  s = 1,
): void {
  lampPool(ctx, x, y, s);
}
/** A plain light's pool on the ground: two flat warm ovals, no gradient, kept dim. */
export function lampPool(ctx: Ctx, x: number, y: number, s = 1): void {
  const { color, alpha, rx, ry } = PAPER_VALUE.lampPool;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.fill(oval(x + 3, y + 2, rx * s, ry * s, 31, 0.08));
  ctx.fill(oval(x + 2, y + 1, rx * 0.55 * s, ry * 0.55 * s, 37, 0.08));
  ctx.restore();
}
export function drawWind(_ctx: Ctx, _time: number): void {}
export function drawAtmosphere(
  ctx: Ctx,
  time: number,
  dawn = 0,
  lamps: readonly { x: number; y: number; s: number }[] = LAMPS,
): void {
  // Lamps dim as the sky brightens.
  const dim = 1 - dawn * 0.6;
  for (const l of lamps)
    glow(
      ctx,
      l.x,
      l.y - 38 * l.s,
      25 * l.s,
      "#f5bd5f",
      (0.07 + 0.01 * Math.sin(time * 5 + l.x)) * dim,
    );
  // A few suspended details complete the still composition; they never resemble enemies.
  for (let i = 0; i < 10; i++) {
    const x = 65 + hash(i * 71) * 830,
      y = 280 + hash(i * 91) * 220;
    glow(ctx, x, y, 5, "#f9c971", 0.16);
    ctx.fillStyle = "#e8c57e";
    ctx.fill(oval(x, y, 0.6, 0.7));
  }
  for (let i = 0; i < 5; i++) {
    const phase = (time * 5 + i * 9) % 44;
    ctx.save();
    ctx.globalAlpha = (1 - phase / 52) * 0.48;
    piece(
      ctx,
      oval(
        170 - phase * 0.17 + Math.sin(i) * 2,
        67 - phase,
        6 + phase * 0.12,
        4 + phase * 0.08,
        i,
        0.14,
      ),
      "#a393a1",
      { shadow: 0, texture: 0.7, thickness: 0.3 },
    );
    ctx.restore();
  }
}
function buildForeground(): CanvasSurface {
  const c = surface(W * 2, H * 2),
    ctx = c.getContext("2d")!;
  ctx.scale(2, 2);
  for (const [x, y, rx, ry] of [
    [25, 546, 84, 39],
    [118, 554, 91, 39],
    [223, 557, 78, 34],
    [319, 563, 68, 31],
    [689, 562, 70, 33],
    [787, 552, 83, 39],
    [885, 549, 92, 42],
    [961, 550, 81, 40],
  ]) {
    const p = oval(x, y, rx, ry, x, 0.12);
    piece(ctx, p, x % 2 ? "#59405d" : "#65445f", {
      shadow: 4,
      edge: "#a88176",
      texture: 1,
      thickness: 1.1,
    });
    stitch(ctx, oval(x, y, rx - 3, ry - 3, x, 0.11), "#cba17d", 0.7);
  }
  for (const side of [-1, 1]) {
    const bx = side === -1 ? 36 : 924;
    for (let i = 0; i < 5; i++) {
      const x = bx - side * i * 23,
        y = 550 + (i % 2) * 6,
        p = oval(x, y, 38 + hash(i) * 9, 27 + hash(i + 4) * 9, 20 + i, 0.13);
      piece(
        ctx,
        p,
        ["#4f3e61", "#624765", "#6c4b6c", "#59425e", "#6e506b"][i]!,
        { shadow: 3, edge: "#a47f77", texture: 0.9, thickness: 1.6 },
      );
      stitch(
        ctx,
        oval(x, y, 35 + hash(i) * 9, 24 + hash(i + 4) * 9, 20 + i, 0.13),
        "#c19a72",
        0.7,
      );
    }
    for (let i = 0; i < 13; i++) {
      const x = bx - side * hash(i * 7 + 5) * 101,
        y = 538 + hash(i + 1) * 10;
      leaf(
        ctx,
        x,
        y,
        23 + hash(i * 13) * 32,
        8 + hash(i * 21) * 7,
        (hash(i * 33) - 0.5) * 2.1,
        ["#5b4767", "#735471", "#4d405c", "#8c656f"][i % 4]!,
        i,
        true,
      );
    }
    for (let i = 0; i < 6; i++) {
      const x = bx - side * i * 17;
      line(ctx, x, 541, x + side * 9, 492 - (i % 2) * 12, "#79503b", 1.2);
      for (let j = 0; j < 4; j++)
        leaf(
          ctx,
          x + (j % 2 ? 5 : -5),
          502 + j * 7,
          12,
          4,
          j % 2 ? 0.9 : -0.9,
          ["#bd8149", "#c28c51", "#a76144"][j % 3]!,
          j,
        );
    }
  }
  // A branch at the top corner establishes the diorama's frontmost layer.
  const branch = new Path2D("M 2 88 Q 29 56 109 35");
  stroke(ctx, branch, "#71513d", 2.5);
  stroke(ctx, branch, "#b68a55", 0.6);
  for (let i = 0; i < 11; i++)
    leaf(
      ctx,
      10 + i * 8,
      77 - i * 3.7,
      13,
      4.5,
      i % 2 ? 1.1 : -1.6,
      ["#bb8646", "#be9251", "#a96b3b"][i % 3]!,
      i,
    );
  return c;
}
export function drawForeground(
  ctx: Ctx,
  viewer?: { x: number; y: number },
  withFrame = true,
): void {
  foreground ??= buildForeground();
  ctx.save();
  ctx.globalAlpha =
    viewer && viewer.y > 485 && (viewer.x < 390 || viewer.x > 620) ? 0.35 : 1;
  ctx.drawImage(foreground, 0, 0, W, H);
  ctx.restore();
  if (withFrame) drawFrame(ctx);
}
let frame: CanvasSurface | undefined;
/** The torn paper border; drawn outside the camera shake so edges never show. */
export function drawFrame(ctx: Ctx): void {
  if (!frame) {
    frame = surface(W * 2, H * 2);
    const c = frame.getContext("2d")!;
    c.scale(2, 2);
    const pts: Point[] = [];
    for (let x = 6; x <= 954; x += 6)
      pts.push([x, 7 + (hash(x * 3) - 0.5) * 4]);
    for (let y = 7; y <= 533; y += 6)
      pts.push([953 + (hash(y * 7) - 0.5) * 3, y]);
    for (let x = 954; x >= 6; x -= 6)
      pts.push([x, 532 + (hash(x * 11) - 0.5) * 4]);
    for (let y = 533; y >= 7; y -= 6)
      pts.push([7 + (hash(y * 13) - 0.5) * 3, y]);
    const inner = path(pts),
      outer = new Path2D();
    outer.rect(0, 0, W, H);
    outer.addPath(inner);
    c.fillStyle = "#ead2ae";
    c.fill(outer, "evenodd");
    c.save();
    c.clip(outer, "evenodd");
    grain(c, outer, 0.6);
    c.restore();
    stroke(c, inner, "#b08058", 1.5, 0.9);
    stroke(c, inner, "#f4dfbb", 0.6, 0.8);
    for (let i = 0; i < 260; i++) {
      const x = hash(i * 13) * 960,
        y = i % 2 ? 4 : 536;
      line(c, x, y, x + 3, y + (hash(i) - 0.5) * 2, "#f6e4c6", 0.6, 0.5);
    }
  }
  ctx.drawImage(frame, 0, 0, W, H);
}
/** 0 for most of the night, rising to 1 over the last STATS.dawnSeconds of the session. */
export function dawnAmount(progress: number, sessionSeconds: number = STATS.sessionSeconds): number {
  const span = Math.min(1, STATS.dawnSeconds / Math.max(1, sessionSeconds));
  return Math.max(0, Math.min(1, (progress - (1 - span)) / span));
}
const MOON = { x: 770, y: 61 };
/** Dawn: the moon sinks behind the hills, the horizon warms and the sky lifts. */
export function drawNightShift(ctx: Ctx, progress: number, sessionSeconds?: number): void {
  const t = dawnAmount(progress, sessionSeconds);
  if (!t) return;
  const ease = t * t * (3 - 2 * t);
  ctx.save();
  // Rub the high moon out of the sky, then hang it lower, behind the first ridge.
  const patch = ctx.createRadialGradient(MOON.x, MOON.y, 0, MOON.x, MOON.y, 70);
  patch.addColorStop(0, "#2b2542");
  patch.addColorStop(0.7, "#2b2542");
  patch.addColorStop(1, "#2b254200");
  ctx.globalAlpha = ease;
  ctx.fillStyle = patch;
  ctx.fillRect(MOON.x - 72, MOON.y - 72, 144, 144);
  ctx.globalAlpha = 1;
  const clip = new Path2D();
  clip.rect(0, 0, W, 128);
  ctx.save();
  ctx.clip(clip);
  ctx.translate(MOON.x + ease * 26, MOON.y + ease * 74);
  glow(ctx, 0, 0, 60, "#f2c48a", 0.2 + ease * 0.15);
  piece(
    ctx,
    new Path2D(
      "M 13 -28 C -8 -35 -33 -18 -32 4 C -32 28 -3 42 22 22 C 2 27 -18 16 -18 -4 C -17 -17 -4 -26 13 -28 Z",
    ),
    mix("#edd198", "#f6dcc0", ease),
    { shadow: 1.6, texture: 0.6, edge: "#fff0c4" },
  );
  ctx.restore();
  // A warm band rises from the horizon; the zenith turns a paler blue.
  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, "#5d6f9a");
  sky.addColorStop(0.45, "#c48d94");
  sky.addColorStop(0.8, "#f2b27e");
  sky.addColorStop(1, "#f6c992");
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = ease * 0.5;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 250);
  ctx.restore();
}
/** The ground catches a little of the dawn, without washing out the ink. World space. */
export function drawDawnWash(
  ctx: Ctx,
  progress: number,
  x: number,
  y: number,
  w: number,
  h: number,
  sessionSeconds?: number,
): void {
  const t = dawnAmount(progress, sessionSeconds);
  if (!t) return;
  const ease = t * t * (3 - 2 * t);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = ease * 0.12;
  ctx.fillStyle = "#e9b38a";
  ctx.fillRect(x, Math.max(y, 250), w, y + h - Math.max(y, 250));
  ctx.restore();
}
