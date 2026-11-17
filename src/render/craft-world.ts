/**
 * The explorable papercraft town: per-chunk ground caches, roads, the map
 * hedge, landmark art and the y-sorted decor sprites. Everything is drawn by
 * code; offscreen canvases only cache what was drawn procedurally. Nothing
 * here touches the sim RNG or writes to SimState.
 */
import {
  CHUNK,
  FLAT_DECOR,
  LANDMARK,
  WORLD,
  chunkContent,
  chunkOf,
  isStartChunk,
  landmarks,
  roads,
  type ChunkContent,
  type Decor,
  type DecorKind,
  type Landmark,
  type Road,
} from "../game/world-gen.js";
import type { SimState } from "../game/types.js";
import { bossEnemy } from "../game/sim.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import type { Camera, ViewRect } from "./camera.js";
import { viewRect } from "./camera.js";
import { popupStep, popupTarget } from "./timeline.js";
import {
  bush,
  candles,
  cottage,
  drawLamp,
  fence,
  flower,
  grassTuft,
  groundTile,
  horizonHills,
  leaf,
  pumpkin,
  startYard,
  stone,
  tree,
  type GroundLamp,
} from "./craft-scene.js";
import {
  box,
  glow,
  grain,
  hash,
  line,
  mix,
  oval,
  path,
  piece,
  shadow,
  stitch,
  stroke,
  surface,
  type Ctx,
  type Point,
} from "./paper-material.js";

// ---------------------------------------------------------------- landmark sprites
function clockTower(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 2, 2, 46, 11);
  // Stone plinth, then a tall shaft with a folded side face.
  piece(ctx, path([[-38, 4], [-36, -46], [36, -48], [38, 4]]), "#8d8190", {
    shadow: 3,
    edge: "#bba7ad",
    texture: 0.95,
    thickness: 1.2,
  });
  for (let r = 0; r < 4; r++)
    line(ctx, -35, -8 - r * 10, 35, -9 - r * 10, "#6e6273", 0.6, 0.7);
  piece(ctx, path([[-27, -46], [-25, -176], [25, -178], [27, -46]]), "#cdbb9c", {
    shadow: 3,
    edge: "#ecd6b0",
    texture: 0.9,
    thickness: 1.2,
  });
  piece(ctx, path([[27, -46], [25, -178], [34, -172], [35, -52]]), "#9d8a72", {
    shadow: 1,
    edge: "#bba487",
    texture: 0.85,
    thickness: 0.8,
  });
  for (let i = 0; i < 18; i++)
    piece(ctx, box(-22 + hash(i * 7) * 38, -170 + hash(i * 13) * 118, 4 + hash(i) * 4, 2.2, i), "#b8a586", {
      shadow: 0,
      texture: 0.7,
      thickness: 0.18,
    });
  // Pointed roof of overlapping paper shingles.
  const roof = path([[-36, -172], [0, -236], [38, -172]]);
  piece(ctx, roof, "#4a3449", { shadow: 3.5, edge: "#b48b59", texture: 0.8, thickness: 1.6 });
  ctx.save();
  ctx.clip(roof);
  for (let row = 0; row < 9; row++)
    for (let xx = -40 - (row % 2) * 4; xx < 40; xx += 9)
      piece(ctx, box(xx, -178 - row * 7, 10, 6, row * 9 + xx), ["#57404e", "#644553", "#4c3749"][(row + Math.abs(xx)) % 3]!, {
        shadow: 0.9,
        texture: 0.8,
        edge: "#98765e",
        thickness: 0.45,
      });
  ctx.restore();
  stroke(ctx, new Path2D("M -38 -171 L 0 -237 L 40 -171"), "#c29a61", 0.9);
  line(ctx, 0, -236, 0, -250, "#78543b", 1.6);
  piece(ctx, oval(0, -252, 3, 3, 4), "#e3b866", { shadow: 0.6, texture: 0.4, thickness: 0.4 });
  // Clock face stopped just before midnight.
  glow(ctx, 0, -134, 34, "#f6d38e", 0.25);
  piece(ctx, oval(0, -134, 19, 19, 7, 0.02), "#f2e1b8", { shadow: 2, edge: "#fff4d4", texture: 0.5, thickness: 1.2 });
  stitch(ctx, oval(0, -134, 15.5, 15.5, 8, 0.02), "#a88a60", 0.8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    line(ctx, Math.cos(a) * 13, -134 + Math.sin(a) * 13, Math.cos(a) * 15, -134 + Math.sin(a) * 15, "#5b4535", 1);
  }
  line(ctx, 0, -134, -1.5, -147, "#3a2b2e", 1.8);
  line(ctx, 0, -134, -4, -142, "#3a2b2e", 2.2);
  // A warm arched window and door.
  const win = new Path2D("M -7 -86 L -7 -100 Q 0 -110 7 -100 L 7 -86 Z");
  glow(ctx, 0, -94, 22, "#ffc065", 0.35);
  piece(ctx, win, "#efb35a", { shadow: 1, edge: "#634431", thickness: 1.6, texture: 0.4 });
  line(ctx, 0, -104, 0, -86, "#805337", 1.2);
  const door = new Path2D("M -11 4 L -11 -24 Q 0 -36 11 -24 L 11 4 Z");
  piece(ctx, door, "#624731", { shadow: 2, edge: "#b68e56", texture: 0.9, thickness: 1.3 });
  for (let i = 0; i < 4; i++) line(ctx, -8 + i * 5, -22, -8 + i * 5, 3, "#a07a47", 0.6);
  ctx.restore();
}
function chapel(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 70, 13);
  // Nave: a cream gable with a turned side wall.
  piece(ctx, path([[-58, -54], [-14, -58], [-14, 4], [-58, 1]]), "#b6a58a", {
    shadow: 3,
    edge: "#e0c6a0",
    texture: 0.9,
    thickness: 1.1,
  });
  piece(ctx, path([[-15, -58], [22, -104], [60, -58], [60, 4], [-15, 4]]), "#d8c5a4", {
    shadow: 2.7,
    edge: "#f0d7af",
    texture: 0.9,
    thickness: 1.1,
  });
  const roof = path([[-66, -54], [-26, -106], [24, -108], [-15, -56]]);
  piece(ctx, roof, "#3f3047", { shadow: 3.5, edge: "#a7865c", texture: 0.8, thickness: 1.5 });
  stroke(ctx, new Path2D("M -66 -54 L -15 -56 L 22 -108 L 64 -57"), "#c29a61", 0.9);
  // Belfry with a needle spire.
  piece(ctx, box(-50, -150, 22, 52), "#c4b293", { shadow: 2, edge: "#e5cda6", texture: 0.9 });
  piece(ctx, path([[-54, -148], [-39, -186], [-24, -148]]), "#4a3449", {
    shadow: 2,
    edge: "#b48b59",
    texture: 0.8,
    thickness: 1.2,
  });
  glow(ctx, -39, -128, 16, "#ffc065", 0.3);
  piece(ctx, new Path2D("M -44 -118 L -44 -130 Q -39 -137 -34 -130 L -34 -118 Z"), "#e8ac58", {
    shadow: 0.8,
    edge: "#634431",
    thickness: 1.3,
    texture: 0.4,
  });
  line(ctx, -39, -186, -39, -198, "#78543b", 1.3);
  line(ctx, -43, -194, -35, -194, "#78543b", 1.3);
  // Rose window and arched door glow warm against the cold yard.
  glow(ctx, 22, -72, 26, "#ffc065", 0.32);
  piece(ctx, oval(22, -72, 10, 10, 3, 0.02), "#efb35a", { shadow: 1, edge: "#634431", thickness: 1.6, texture: 0.4 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    line(ctx, 22 - Math.cos(a) * 9, -72 - Math.sin(a) * 9, 22 + Math.cos(a) * 9, -72 + Math.sin(a) * 9, "#805337", 0.9);
  }
  const door = new Path2D("M 11 4 L 11 -28 Q 22 -42 33 -28 L 33 4 Z");
  piece(ctx, door, "#5a3f2e", { shadow: 2, edge: "#b68e56", texture: 0.9, thickness: 1.3 });
  for (const wx of [-48, -30]) {
    glow(ctx, wx + 5, -30, 14, "#ffc065", 0.25);
    piece(ctx, new Path2D(`M ${wx} -20 L ${wx} -36 Q ${wx + 5} -43 ${wx + 10} -36 L ${wx + 10} -20 Z`), "#e2a655", {
      shadow: 0.8,
      edge: "#634431",
      thickness: 1.2,
      texture: 0.4,
    });
  }
  for (let i = 0; i < 12; i++)
    leaf(ctx, -60 + i * 10, 6, 7 + hash(i) * 4, 3, (hash(i * 3) - 0.5) * 1.6, ["#766645", "#916a45", "#8a6846"][i % 3]!, i);
  ctx.restore();
}
function tomb(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 1, 13, 4);
  const cross = seed % 3 === 0;
  const p = cross
    ? path([[-3, 2], [-3, -20], [-10, -20], [-10, -26], [-3, -26], [-3, -34], [3, -34], [3, -26], [10, -26], [10, -20], [3, -20], [3, 2]])
    : new Path2D("M -11 2 L -11 -18 Q -11 -32 0 -33 Q 11 -32 11 -18 L 12 2 Z");
  piece(ctx, p, seed % 2 ? "#817486" : "#8b8079", { shadow: 2.4, edge: "#b39a9a", texture: 0.95, thickness: 1 });
  if (!cross) {
    stroke(ctx, new Path2D("M -7 -2 L -7 -18 Q -7 -27 0 -28 Q 7 -27 7 -18 L 7 -2"), "#b199a1", 0.6);
    line(ctx, -5, -15, 5, -15, "#5e4c60", 0.6);
    line(ctx, -4, -11, 4, -11, "#5e4c60", 0.5);
  }
  for (let i = 0; i < 4; i++) leaf(ctx, -9 + i * 6, 3, 7, 2.6, (i - 1.5) * 0.5, ["#68714f", "#7c6a45"][i % 2]!, i);
  ctx.restore();
}
function stall(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 3, 44, 9);
  for (const px of [-36, 36]) {
    piece(ctx, box(px - 2.5, -80, 5, 82), "#6b4d34", { shadow: 1.6, edge: "#b2884f", texture: 0.8, thickness: 0.7 });
  }
  piece(ctx, path([[-40, -30], [40, -30], [42, 2], [-42, 2]]), "#8a6448", {
    shadow: 2.4,
    edge: "#c49a62",
    texture: 0.9,
    thickness: 1,
  });
  for (let i = 0; i < 5; i++) line(ctx, -38 + i * 19, -27, -38 + i * 19, 0, "#6c4c37", 0.6);
  piece(ctx, box(-44, -34, 88, 6), "#b28a5c", { shadow: 1.2, edge: "#e2bd84", texture: 0.85, thickness: 0.7 });
  // Striped awning, each stripe its own paper strip.
  const colors = seed % 2 ? ["#a8574a", "#e2c79a"] : ["#4f6a7a", "#e2c79a"];
  for (let i = 0; i < 8; i++) {
    const x0 = -46 + i * 11.5;
    piece(ctx, path([[x0, -88], [x0 + 11.5, -88], [x0 + 12.5, -70], [x0 + 6, -66], [x0 - 0.5, -70]]), colors[i % 2]!, {
      shadow: 1.3,
      edge: mix(colors[i % 2]!, "#fff0d0", 0.35),
      texture: 0.8,
      thickness: 0.6,
    });
  }
  // Goods: a little pumpkin, a jar lantern, folded paper bats.
  pumpkin(ctx, -22, -34, 0.5, seed * 4 + 1);
  glow(ctx, 6, -42, 16, "#ffc15b", 0.3);
  piece(ctx, box(1, -48, 10, 13), "#e9b561", { shadow: 0.8, edge: "#664a35", texture: 0.4, thickness: 0.9 });
  piece(ctx, path([[18, -40], [24, -45], [27, -40], [30, -45], [36, -40], [27, -37]]), "#2a2034", {
    shadow: 0.6,
    texture: 0.5,
    thickness: 0.4,
  });
  ctx.restore();
}
function stringLights(ctx: Ctx, x: number, y: number, s: number, _seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const pts: Point[] = [[-154, -8], [-95, 8], [-36, -40], [0, -24], [36, -40], [95, 8], [154, -8]];
  const cord = new Path2D();
  cord.moveTo(...pts[0]!);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!,
      b = pts[i + 1]!;
    cord.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  cord.lineTo(...pts[pts.length - 1]!);
  stroke(ctx, cord, "#3c2c2a", 1.4);
  stroke(ctx, cord, "#ba965f", 0.6);
  for (let i = 0; i < 16; i++) {
    const t = (i + 0.5) / 16,
      seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))),
      k = t * (pts.length - 1) - seg,
      a = pts[seg]!,
      b = pts[seg + 1]!,
      lx = a[0] + (b[0] - a[0]) * k,
      ly = a[1] + (b[1] - a[1]) * k + 4;
    const c = ["#f2b35a", "#e98a4f", "#f5d27a", "#d9725a"][i % 4]!;
    glow(ctx, lx, ly + 4, 14, "#ffc15b", 0.28);
    piece(ctx, oval(lx, ly + 4, 3.6, 4.6, i, 0.06), c, { shadow: 1, edge: "#fff0c4", texture: 0.45, thickness: 0.5 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- decor sprite cache
interface Bounds {
  l: number;
  r: number;
  t: number;
  b: number;
}
const BOUNDS: Record<Exclude<DecorKind, "flowers" | "tuft" | "leaves" | "lamp">, Bounds> = {
  tree: { l: -82, r: 82, t: -158, b: 16 },
  cottage: { l: -120, r: 100, t: -144, b: 16 },
  bush: { l: -52, r: 52, t: -34, b: 10 },
  fence: { l: -46, r: 46, t: -42, b: 10 },
  stone: { l: -16, r: 16, t: -16, b: 8 },
  candles: { l: -22, r: 22, t: -36, b: 8 },
  pumpkin: { l: -22, r: 26, t: -32, b: 8 },
  "clock-tower": { l: -52, r: 52, t: -258, b: 14 },
  chapel: { l: -82, r: 72, t: -202, b: 14 },
  tomb: { l: -16, r: 16, t: -38, b: 8 },
  stall: { l: -50, r: 50, t: -96, b: 10 },
  lights: { l: -168, r: 168, t: -56, b: 24 },
};
type Painter = (ctx: Ctx, x: number, y: number, s: number, seed: number) => void;
const PAINT: Record<keyof typeof BOUNDS, Painter> = {
  tree,
  cottage,
  bush,
  fence: (c, x, y, s) => fence(c, x, y, s),
  stone,
  candles: (c, x, y, s) => candles(c, x, y, s),
  pumpkin,
  "clock-tower": clockTower,
  chapel,
  tomb,
  stall,
  lights: stringLights,
};
/** Variants per kind keep the cache small; pumpkins keep their carved bit (seed % 4). */
const VARIANTS: Partial<Record<DecorKind, number>> = { pumpkin: 8, tree: 6, cottage: 4, bush: 6, tomb: 6, stall: 2, stone: 4 };
const spriteCache = new Map<string, HTMLCanvasElement>();
const PAD = 8;
function decorBounds(d: Decor): Bounds | null {
  if (d.kind === "lamp") return { l: -18, r: 18, t: -75 * d.s, b: 8 };
  const b = (BOUNDS as Record<string, Bounds | undefined>)[d.kind];
  return b ? { l: b.l * d.s, r: b.r * d.s, t: b.t * d.s, b: b.b * d.s } : null;
}
function drawDecor(ctx: Ctx, d: Decor, time: number): void {
  if (d.kind === "lamp") {
    drawLamp(ctx, { x: d.x, y: d.y, s: Math.round(d.s * 20) / 20 }, time);
    return;
  }
  const b = (BOUNDS as Record<string, Bounds | undefined>)[d.kind];
  if (!b) return;
  const s = Math.round(d.s * 20) / 20,
    v = Math.abs(d.seed) % (VARIANTS[d.kind] ?? 1),
    key = `${d.kind}-${s}-${v}`;
  let c = spriteCache.get(key);
  const w = (b.r - b.l) * s + PAD * 2,
    h = (b.b - b.t) * s + PAD * 2;
  if (!c) {
    if (spriteCache.size > 220) spriteCache.clear();
    c = surface(Math.ceil(w * 2), Math.ceil(h * 2));
    const g = c.getContext("2d")!;
    g.scale(2, 2);
    PAINT[d.kind as keyof typeof BOUNDS](g, -b.l * s + PAD, -b.t * s + PAD, s, v);
    spriteCache.set(key, c);
  }
  ctx.drawImage(c, d.x + b.l * s - PAD, d.y + b.t * s - PAD, Math.ceil(w * 2) / 2, Math.ceil(h * 2) / 2);
}

// ---------------------------------------------------------------- flat art baked in chunks
function flatDecor(ctx: Ctx, d: Decor): void {
  const { x, y, s, seed } = d;
  if (d.kind === "flowers") {
    for (let i = 0; i < 4; i++) flower(ctx, x + (i - 1.5) * 6 * s, y + Math.sin(i + seed) * 4, 0.6 * s, seed + i);
    grassTuft(ctx, x - 9 * s, y + 3, 0.7 * s, seed);
  } else if (d.kind === "tuft") {
    grassTuft(ctx, x, y, 0.8 * s, seed);
    grassTuft(ctx, x + 7 * s, y + 2, 0.6 * s, seed + 5);
  } else if (d.kind === "leaves") {
    for (let i = 0; i < 8; i++)
      leaf(
        ctx,
        x + (hash(seed + i) - 0.5) * 34 * s,
        y + hash(seed + i * 7) * 10,
        6 + hash(seed + i * 3) * 3,
        3,
        hash(seed + i * 11) * 6,
        ["#b97a3e", "#9f5740", "#b68b48"][i % 3]!,
        i,
      );
  }
}
function roadPath(points: readonly { x: number; y: number }[], off = 0): Path2D {
  // Offset polyline (for the stitched edges), then smoothed through midpoints.
  const pts = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!,
      b = points[Math.min(points.length - 1, i + 1)]!,
      len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x + (-(b.y - a.y) / len) * off, y: p.y + ((b.x - a.x) / len) * off };
  });
  const p = new Path2D();
  p.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!,
      b = pts[i + 1]!;
    p.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  p.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
  return p;
}
function roadHits(r: Road, x0: number, y0: number, x1: number, y1: number): boolean {
  const pad = r.width + 30;
  return r.points.some((p, i) => {
    const q = r.points[Math.min(i + 1, r.points.length - 1)]!;
    return Math.max(p.x, q.x) + pad >= x0 && Math.min(p.x, q.x) - pad <= x1 && Math.max(p.y, q.y) + pad >= y0 && Math.min(p.y, q.y) - pad <= y1;
  });
}
/** A cut-paper road strip: contact shadow, dark cut edge, light top edge, pebbles and stitching. */
function drawRoad(ctx: Ctx, r: Road, ri: number): void {
  const p = roadPath(r.points),
    w = r.width * 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(-0.9, 2.6);
  stroke(ctx, p, "rgba(15,10,25,.42)", w + 4);
  ctx.restore();
  stroke(ctx, p, "#5f5243", w + 2.2);
  stroke(ctx, p, "#bfb399", w);
  ctx.save();
  ctx.translate(-0.35, -0.6);
  stroke(ctx, p, "#e4cfaa", 1.1, 0.5);
  ctx.restore();
  ctx.restore();
  // Pebbles, placed by world position so every chunk agrees.
  for (let i = 0; i < r.points.length - 1; i++) {
    const a = r.points[i]!,
      b = r.points[i + 1]!,
      len = Math.hypot(b.x - a.x, b.y - a.y),
      nx = -(b.y - a.y) / (len || 1),
      ny = (b.x - a.x) / (len || 1);
    for (let k = 0; k < len; k += 7) {
      const seed = ri * 100003 + i * 7919 + k,
        t = k / len,
        across = (hash(seed) - 0.5) * r.width * 1.3,
        x = a.x + (b.x - a.x) * t + nx * across,
        y = a.y + (b.y - a.y) * t + ny * across,
        d = new Path2D();
      d.ellipse(x, y, 1 + hash(seed + 8) * 2, 0.3 + hash(seed + 1) * 0.6, hash(seed + 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = seed % 3 ? "rgba(95,77,64,.14)" : "rgba(245,224,186,.3)";
      ctx.fill(d);
    }
  }
  for (const side of [-1, 1]) stitch(ctx, roadPath(r.points, side * (r.width - 3.5)), "#826c55", 0.9);
}
/** The map edge: a paper hedge on the west, east and south. */
function drawHedge(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const step = 24,
    colors = ["#3f4a3a", "#4a5440", "#35402f", "#45503d"];
  const clump = (x: number, y: number, i: number) => {
    const p = oval(x, y, 30 + hash(i) * 8, 21 + hash(i + 5) * 6, i, 0.14);
    piece(ctx, p, colors[Math.abs(i) % 4]!, { shadow: 2.6, edge: "#7d8a5c", texture: 0.85, thickness: 1 });
    stitch(ctx, oval(x, y, 26 + hash(i) * 8, 17 + hash(i + 5) * 6, i, 0.13), "#9aa36a", 0.55);
    for (let j = 0; j < 3; j++)
      leaf(ctx, x + (hash(i * 3 + j) - 0.5) * 30, y + 8, 8 + hash(i + j) * 4, 3, (hash(i * 5 + j) - 0.5) * 2, ["#5e6a45", "#8a6846", "#6d7a4c"][j]!, j);
  };
  if (x0 < WORLD.minX + 80)
    for (let y = Math.max(190, Math.floor(y0 / step) * step - step); y < y1 + step; y += step)
      clump(WORLD.minX + 12 + hash(y) * 8, y, Math.floor(y / step) * 3 + 1);
  if (x1 > WORLD.maxX - 80)
    for (let y = Math.max(190, Math.floor(y0 / step) * step - step); y < y1 + step; y += step)
      clump(WORLD.maxX - 12 - hash(y + 1) * 8, y, Math.floor(y / step) * 3 + 2);
  if (y1 > WORLD.maxY - 80)
    for (let x = Math.floor(x0 / step) * step - step; x < x1 + step; x += step)
      clump(x, WORLD.maxY - 10 - hash(x) * 8, Math.floor(x / step) * 3);
}
/** Ground-level landmark art baked into the chunk caches. */
function landmarkGround(ctx: Ctx, l: Landmark): void {
  const { x, y, seed } = l;
  if (l.kind === "clock-tower" || l.kind === "lantern-market") {
    const rx = l.kind === "clock-tower" ? 130 : 190,
      ry = l.kind === "clock-tower" ? 78 : 98,
      cy = l.kind === "clock-tower" ? y + 12 : y - 4,
      plaza = oval(x, cy, rx, ry, seed, 0.06);
    piece(ctx, plaza, "#8b8174", { shadow: 1.6, edge: "#b9ab92", texture: 0.85, thickness: 1.4 });
    ctx.save();
    ctx.clip(plaza);
    // Cobbles are batched per tone: one fill and one cut-edge stroke each.
    const tones = [new Path2D(), new Path2D(), new Path2D()],
      cols = Math.ceil((rx * 2) / 15) + 1,
      rows = Math.ceil((ry * 2) / 10) + 1;
    for (let row = 0; row < rows; row++)
      for (let k = 0; k < cols; k++)
        tones[(row + k) % 3]!.addPath(box(x - rx + k * 15 + (row % 2) * 7, cy - ry + row * 10, 13, 8, row * 31 + k));
    tones.forEach((p, i) => {
      ctx.fillStyle = ["#958a7b", "#80776b", "#9d917f"][i]!;
      ctx.fill(p);
      stroke(ctx, p, "#5d554c", 0.7, 0.8);
    });
    ctx.translate(-0.3, -0.5);
    stroke(ctx, tones[2]!, "#c4b59c", 0.5, 0.6);
    ctx.restore();
    grain(ctx, plaza, 0.4);
    stitch(ctx, oval(x, cy, rx - 5, ry - 4, seed, 0.06), "#cdbb98", 0.7);
    if (l.kind === "lantern-market")
      for (const [dx, dy, c] of [
        [-70, 40, "#7c3f43"],
        [64, 34, "#3f5466"],
      ] as const) {
        const rug = box(x + dx - 26, y + dy - 12, 52, 24, dx);
        piece(ctx, rug, c, { shadow: 1, edge: mix(c, "#f2d6a6", 0.4), texture: 0.8, thickness: 0.6 });
        stitch(ctx, box(x + dx - 22, y + dy - 9, 44, 18, dx + 1), "#e2c79a", 0.8);
      }
  } else if (l.kind === "pumpkin-field") {
    const soil = oval(x, y + 6, 175, 104, seed, 0.1);
    piece(ctx, soil, "#5a4434", { shadow: 1.8, edge: "#8c6a4c", texture: 0.9, thickness: 1.2 });
    ctx.save();
    ctx.clip(soil);
    for (let i = -6; i <= 6; i++) {
      const fy = y + 6 + i * 15,
        furrow = new Path2D();
      furrow.moveTo(x - 190, fy);
      furrow.quadraticCurveTo(x, fy + 8 + Math.sin(i) * 4, x + 190, fy - 2);
      stroke(ctx, furrow, "#3e2e25", 2.2, 0.55);
      ctx.save();
      ctx.translate(0, -1.4);
      stroke(ctx, furrow, "#86664a", 0.8, 0.5);
      ctx.restore();
    }
    ctx.restore();
    // Curling vines link the pumpkins.
    for (let i = 0; i < 9; i++) {
      const vx = x + (hash(seed + i) - 0.5) * 280,
        vy = y + (hash(seed + i * 5) - 0.5) * 150,
        v = new Path2D();
      v.moveTo(vx, vy);
      v.bezierCurveTo(vx + 14, vy - 10, vx + 24, vy + 8, vx + 36, vy - 2);
      stroke(ctx, v, "#6f7a46", 1.1, 0.85);
      leaf(ctx, vx + 18, vy, 9, 4, 1.2, "#7a8a4c", i);
    }
    stitch(ctx, oval(x, y + 6, 168, 98, seed, 0.1), "#b08a5c", 0.6);
  } else if (l.kind === "stone-bridge") {
    const r = LANDMARK.river,
      span = l.span ?? r.halfLength,
      top: Point[] = [],
      bottom: Point[] = [];
    for (let dx = -span; dx <= span; dx += 16) {
      const taper = Math.min(1, (span - Math.abs(dx)) / 60 + 0.25);
      top.push([x + dx, y - r.halfWidth * taper + Math.sin((x + dx) * 0.03) * 3]);
      bottom.push([x + dx, y + r.halfWidth * taper + Math.sin((x + dx) * 0.027 + 1) * 3]);
    }
    const water = path([...top, ...bottom.reverse()], true);
    piece(ctx, water, "#2c4560", { shadow: 2.2, edge: "#7d9bb0", texture: 0.75, thickness: 1.8 });
    ctx.save();
    ctx.clip(water);
    for (let i = 0; i < 26; i++) {
      const rx = x - span + hash(seed + i) * span * 2,
        ry = y + (hash(seed + i * 3) - 0.5) * r.halfWidth * 1.3,
        ripple = new Path2D();
      ripple.moveTo(rx, ry);
      ripple.quadraticCurveTo(rx + 8, ry - 2, rx + 18, ry);
      stroke(ctx, ripple, "#8fb0c4", 0.8, 0.6);
    }
    ctx.restore();
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) grassTuft(ctx, x + side * (span - 10 - i * 14), y + (i % 2 ? -1 : 1) * 18, 1, seed + i);
    // Stone deck with plank seams, low parapets and posts.
    const halfH = r.halfWidth + 16,
      deck = box(x - r.deckHalf, y - halfH, r.deckHalf * 2, halfH * 2, seed);
    shadow(ctx, x, y + halfH - 2, r.deckHalf + 6, 8);
    piece(ctx, deck, "#9a8b7e", { shadow: 2.6, edge: "#c2ae91", texture: 0.9, thickness: 1.6 });
    for (let i = 1; i < 7; i++) line(ctx, x - r.deckHalf + 3, y - halfH + i * (halfH / 3.5), x + r.deckHalf - 3, y - halfH + i * (halfH / 3.5), "#7c6f66", 0.7, 0.8);
    for (const side of [-1, 1]) {
      const rail = box(x + side * r.deckHalf - 4, y - halfH - 4, 8, halfH * 2 + 6, seed + side);
      piece(ctx, rail, "#8a7c76", { shadow: 1.8, edge: "#c2ae91", texture: 0.9, thickness: 1 });
      for (const py of [-halfH - 2, 0, halfH - 2])
        piece(ctx, box(x + side * r.deckHalf - 6, y + py - 4, 12, 9, py + side), "#776a66", {
          shadow: 1.4,
          edge: "#ad9a8a",
          texture: 0.85,
          thickness: 0.8,
        });
    }
  } else if (l.kind === "graveyard") {
    const yard = oval(x, y, 200, 124, seed, 0.08);
    piece(ctx, yard, "#454a40", { shadow: 1.2, edge: "#5f6653", texture: 0.85, thickness: 1 });
    // A low wrought fence rings the yard, open toward the south.
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      if (Math.sin(a) > 0.92) continue;
      const fx = x + Math.cos(a) * 196,
        fy = y + Math.sin(a) * 120;
      line(ctx, fx, fy, fx, fy - 11, "#2a2230", 1.4);
      piece(ctx, path([[fx - 1.8, fy - 11], [fx, fy - 15], [fx + 1.8, fy - 11]]), "#3a2f3f", { shadow: 0.3, texture: 0.4, thickness: 0.3 });
    }
    stroke(ctx, oval(x, y - 6, 196, 120, seed, 0.0), "#2a2230", 1, 0.7);
  } else if (l.kind === "moon-hill") {
    for (const [rx, ry, dy, c] of [
      [180, 98, 10, "#4f5747"],
      [128, 70, -2, "#5d6553"],
      [76, 42, -10, "#6a7360"],
    ] as const) {
      const p = oval(x, y + dy, rx, ry, seed + rx, 0.1);
      piece(ctx, p, c, { shadow: 3, edge: "#8c9672", texture: 0.85, thickness: 1.4 });
      stitch(ctx, oval(x, y + dy, rx - 5, ry - 4, seed + rx, 0.1), "#a3ab7c", 0.5);
    }
    glow(ctx, x, y - 10, 90, "#bcd8f2", 0.12, 0.55);
  }
}
function landmarkReach(l: Landmark): number {
  return l.kind === "stone-bridge" ? Math.max(l.radius, (l.span ?? 0) + 30) : l.radius + 40;
}

// ---------------------------------------------------------------- chunk caches
interface CachedChunk {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
}
const chunkCache = new Map<string, CachedChunk>();
/** Canvases kept alive; each is 960 x 1080 device pixels (about 4 MB). */
const MAX_CHUNK_CANVASES = 14;
/** World margin around the view whose missing chunks are built ahead, one per frame. */
const PREFETCH = 320;
function cacheKey(seed: number, cx: number, cy: number): string {
  return isStartChunk(cx, cy) ? `start:${cx}` : `${seed}:${cx},${cy}`;
}
function contentAround(seed: number, cx: number, cy: number): ChunkContent[] {
  const out: ChunkContent[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(chunkContent(seed, cx + dx, cy + dy));
  return out;
}
function buildChunk(seed: number, cx: number, cy: number): HTMLCanvasElement {
  const c = chunkContent(seed, cx, cy),
    canvas = surface(CHUNK.width * 2, CHUNK.height * 2),
    ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.translate(-c.x, -c.y);
  if (c.start) {
    ctx.drawImage(startYard(), 0, 0, 960, 540);
    return canvas;
  }
  const x0 = c.x,
    y0 = c.y,
    x1 = c.x + c.w,
    y1 = c.y + c.h,
    around = contentAround(seed, cx, cy),
    lamps: GroundLamp[] = [];
  for (const n of around)
    for (const d of n.decor)
      if (d.kind === "lamp" && d.x > x0 - 90 && d.x < x1 + 90 && d.y > y0 - 60 && d.y < y1 + 60) lamps.push(d);
  if (cy === 0) horizonHills(ctx, x0, x1);
  groundTile(ctx, x0, y0, c.w, c.h, lamps, cy === 0);
  for (const l of landmarks(seed)) {
    const reach = landmarkReach(l);
    if (l.x + reach >= x0 && l.x - reach <= x1 && l.y + reach >= y0 && l.y - reach <= y1) landmarkGround(ctx, l);
  }
  const rs = roads(seed);
  // Branches first; the spine is laid over their joints.
  for (let i = rs.length - 1; i >= 0; i--) if (roadHits(rs[i]!, x0, y0, x1, y1)) drawRoad(ctx, rs[i]!, i);
  for (const n of around)
    for (const d of n.decor)
      if (FLAT_DECOR.has(d.kind) && d.x > x0 - 50 && d.x < x1 + 50 && d.y > y0 - 30 && d.y < y1 + 30) flatDecor(ctx, d);
  for (const l of lamps) glow(ctx, l.x, l.y, 55, "#eab563", 0.13, 0.55);
  drawHedge(ctx, x0, y0, x1, y1);
  return canvas;
}
function chunkCanvas(seed: number, cx: number, cy: number): HTMLCanvasElement {
  const key = cacheKey(seed, cx, cy);
  let entry = chunkCache.get(key);
  if (!entry) {
    entry = { canvas: buildChunk(seed, cx, cy), cx, cy };
    chunkCache.set(key, entry);
  } else {
    // Map order doubles as recency for eviction.
    chunkCache.delete(key);
    chunkCache.set(key, entry);
  }
  return entry.canvas;
}
function chunkRange(r: ViewRect) {
  const a = chunkOf(r.x0, r.y0),
    b = chunkOf(r.x1 - 0.001, r.y1 - 0.001);
  return { a, b };
}
/**
 * Draws the cached ground of every chunk the view touches (world space),
 * builds at most one chunk ahead of the camera per frame, and evicts the
 * least recently drawn caches beyond the budget.
 */
export function drawChunks(ctx: Ctx, seed: number, cam: Camera): void {
  const view = viewRect(cam),
    { a, b } = chunkRange(view),
    visible = new Set<string>();
  let built = false;
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) {
      const key = cacheKey(seed, cx, cy);
      visible.add(key);
      if (!chunkCache.has(key)) built = true;
      ctx.drawImage(chunkCanvas(seed, cx, cy), cx * CHUNK.width, cy * CHUNK.height, CHUNK.width, CHUNK.height);
    }
  if (!built) {
    const ahead = chunkRange(viewRect(cam, PREFETCH));
    let best: { cx: number; cy: number; d: number } | null = null;
    for (let cy = ahead.a.cy; cy <= ahead.b.cy; cy++)
      for (let cx = ahead.a.cx; cx <= ahead.b.cx; cx++) {
        if (chunkCache.has(cacheKey(seed, cx, cy))) continue;
        const d = Math.hypot((cx + 0.5) * CHUNK.width - cam.x, (cy + 0.5) * CHUNK.height - cam.y);
        if (!best || d < best.d) best = { cx, cy, d };
      }
    if (best) {
      const key = cacheKey(seed, best.cx, best.cy);
      chunkCache.set(key, { canvas: buildChunk(seed, best.cx, best.cy), cx: best.cx, cy: best.cy });
    }
  }
  for (const key of chunkCache.keys()) {
    if (chunkCache.size <= MAX_CHUNK_CANVASES) break;
    if (!visible.has(key)) chunkCache.delete(key);
  }
}
/** How many chunk canvases are cached (for the budget test and debugging). */
export function cachedChunkCount(): number {
  return chunkCache.size;
}

// ---------------------------------------------------------------- sprites
export interface WorldSprite {
  y: number;
  draw: () => void;
}
export interface VisibleLamp {
  x: number;
  y: number;
  s: number;
}
/** Pieces that fold up like a pop-up book page as the cat approaches. */
const POP_KINDS: ReadonlySet<DecorKind> = new Set<DecorKind>(["tree", "cottage", "clock-tower", "chapel", "stall"]);
/** Render-only fold per piece (never SimState); pieces out of view are forgotten. */
const folds = new Map<string, number>();
let foldTime: number | null = null;
export interface PopupView {
  /** The cat's position; without it everything stands. */
  cat: { x: number; y: number } | null;
  reduced: boolean;
}
/** Current fold (0..1) of a piece, eased toward its distance target. */
function foldOf(d: Decor, pop: PopupView, dt: number): number {
  if (!pop.cat) return 1;
  const key = `${d.kind}:${d.x},${d.y}`,
    target = popupTarget(Math.hypot(d.x - pop.cat.x, d.y - pop.cat.y)),
    // A piece entering the view starts where it should be.
    next = popupStep(folds.get(key) ?? target, target, dt, pop.reduced);
  folds.set(key, next);
  return next;
}
/** The hinge crease and darkening of a page that is not fully up. */
function drawFolded(ctx: Ctx, d: Decor, bd: Bounds, f: number, paint: () => void): void {
  if (f >= 0.995) {
    paint();
    return;
  }
  ctx.save();
  ctx.filter = `brightness(${(0.72 + 0.28 * f).toFixed(3)})`;
  ctx.translate(d.x, d.y);
  ctx.scale(1, f);
  ctx.translate(-d.x, -d.y);
  paint();
  ctx.restore();
  // Paper hinge: a dark crease with a pale lip along the base.
  const l = d.x + bd.l * 0.75,
    r = d.x + bd.r * 0.75;
  line(ctx, l, d.y + 2, r, d.y + 2, "#14101f", 2, 0.45 * (1 - f));
  line(ctx, l, d.y + 0.5, r, d.y + 0.5, "#e7cf9c", 0.8, 0.5 * (1 - f));
}
/**
 * Tall decor (trees, cottages, lamps, landmark buildings) inside the view,
 * as y-sorted sprites. Lamps are also returned for ground light and glow.
 * With `pop`, buildings and trees fold up near the cat (pop-up book).
 */
export function worldSprites(
  ctx: Ctx,
  seed: number,
  cam: Camera,
  time: number,
  fade?: (d: Decor) => boolean,
  pop?: PopupView,
): { sprites: WorldSprite[]; lamps: VisibleLamp[] } {
  const dt = foldTime === null ? 0 : Math.min(0.1, Math.max(0, time - foldTime));
  foldTime = time;
  if (folds.size > 800) folds.clear();
  const view = viewRect(cam),
    { a, b } = chunkRange(viewRect(cam, 480)),
    sprites: WorldSprite[] = [],
    lamps: VisibleLamp[] = [];
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++) {
      for (const d of chunkContent(seed, cx, cy).decor) {
        if (FLAT_DECOR.has(d.kind)) continue;
        const bd = decorBounds(d);
        if (!bd) continue;
        // Cull by the sprite's own bounds.
        if (d.x + bd.r < view.x0 || d.x + bd.l > view.x1 || d.y + bd.b < view.y0 || d.y + bd.t > view.y1) continue;
        if (d.kind === "lamp") lamps.push(d);
        const f = pop && POP_KINDS.has(d.kind) ? foldOf(d, pop, dt) : 1;
        sprites.push({
          y: d.y,
          draw: () =>
            drawFolded(ctx, d, bd, f, () => {
              if (fade?.(d)) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                drawDecor(ctx, d, time);
                ctx.restore();
              } else drawDecor(ctx, d, time);
            }),
        });
      }
    }
  return { sprites, lamps };
}

// ---------------------------------------------------------------- navigation
export interface NavTarget {
  x: number;
  y: number;
  kind: "landmark" | "boss" | "chest";
  label: MessageKey;
}
/**
 * Off-screen targets worth an arrow: the nearest undiscovered landmark, the
 * Boss while it is alive and the nearest unopened chest.
 */
export function navTargets(sim: SimState): NavTarget[] {
  const out: NavTarget[] = [],
    p = sim.player;
  let best: Landmark | null = null,
    bestD = Infinity;
  for (const l of landmarks(sim.seed)) {
    if (sim.landmarksFound.includes(l.id)) continue;
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  if (best) out.push({ x: best.x, y: best.y, kind: "landmark", label: `landmark.${best.kind}` as MessageKey });
  const boss = bossEnemy(sim);
  if (boss) out.push({ x: boss.x, y: boss.y, kind: "boss", label: "nav.boss" });
  // The nearest unopened chest.
  let chest: { x: number; y: number } | null = null,
    chestD = Infinity;
  for (const c of sim.chests) {
    if (!c.alive) continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < chestD) {
      chestD = d;
      chest = c;
    }
  }
  if (chest) out.push({ x: chest.x, y: chest.y, kind: "chest", label: "nav.chest" });
  return out;
}
const NAV_INSET = { side: 44, top: 78, bottom: 70 } as const;
/** Paper arrow tabs on the screen edge, pointing at off-screen targets. Screen space. */
export function drawNavArrows(ctx: Ctx, sim: SimState, cam: Camera, locale: Locale, time: number): void {
  const W = 960,
    H = 540;
  for (const target of navTargets(sim)) {
    const sx = target.x - cam.x + W / 2,
      sy = target.y - cam.y + H / 2;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const cx = W / 2,
      cy = H / 2,
      dx = sx - cx,
      dy = sy - cy,
      hw = cx - NAV_INSET.side,
      top = cy - NAV_INSET.top,
      bottom = H - NAV_INSET.bottom - cy,
      k = Math.min(Math.abs(hw / (dx || 1e-6)), dy < 0 ? top / -dy : bottom / (dy || 1e-6)),
      ax = cx + dx * k,
      ay = cy + dy * k,
      ang = Math.atan2(dy, dx),
      boss = target.kind === "boss",
      chest = target.kind === "chest",
      bob = Math.sin(time * 3 + (boss ? 1 : 0)) * 1.5;
    ctx.save();
    ctx.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
    // The pointer: a folded paper triangle.
    ctx.save();
    ctx.rotate(ang);
    piece(ctx, path([[16, 0], [2, -8], [5, 0], [2, 8]]), boss ? "#b4564a" : chest ? "#a8643d" : "#e9c27a", {
      shadow: 1.6,
      edge: boss ? "#f0a090" : chest ? "#e5bd62" : "#fff0c4",
      texture: 0.6,
      thickness: 0.8,
    });
    ctx.restore();
    // The label tab sits on the inner side of the pointer.
    const label = t(locale, target.label);
    ctx.font = "700 10px Georgia, serif";
    const tw = ctx.measureText(label).width + 14,
      lx = -Math.cos(ang) * (tw / 2 + 10) - tw / 2,
      ly = -Math.sin(ang) * 16 - 8;
    const tab = box(lx, ly, tw, 16, label.length);
    piece(ctx, tab, boss ? "#5a2f37" : "#e8d5ad", { shadow: 1.8, edge: boss ? "#a65a4d" : "#fff1cf", texture: 0.7, thickness: 0.9 });
    stitch(ctx, box(lx + 2, ly + 2, tw - 4, 12, label.length + 1), boss ? "#d39a7c" : "#a88a60", 0.7);
    ctx.fillStyle = boss ? "#f6dcc2" : "#4a3328";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, lx + tw / 2, ly + 8.5);
    ctx.restore();
  }
}
