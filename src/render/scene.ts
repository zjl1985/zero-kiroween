import { YARD_TOP } from "../game/types.js";
import { jitter, visHash } from "./hash.js";
import { fillHex, mixHex } from "./layout.js";

export const HORIZON = 148;
export const PAGE_MARGIN = 12;

export interface SceneProp {
  kind:
    | "pumpkin"
    | "pumpkin-sketch"
    | "lantern"
    | "candle"
    | "bush"
    | "tree"
    | "fence"
    | "leaf-pile"
    | "ink-bottle"
    | "pencil"
    | "eraser"
    | "stone"
    | "box"
    | "ghost"
    | "tomb"
    | "stump";
  x: number;
  y: number;
  s: number;
  id: number;
  lit?: boolean;
}

/** Far scenery behind the walkable yard. */
export const FAR_PROPS: readonly SceneProp[] = [
  { kind: "tree", x: 72, y: 168, s: 1.35, id: 1 },
  { kind: "tree", x: 200, y: 160, s: 0.85, id: 2 },
  { kind: "tree", x: 545, y: 158, s: 1.15, id: 3 },
  { kind: "tree", x: 600, y: 170, s: 0.95, id: 4 },
  { kind: "bush", x: 130, y: 172, s: 0.9, id: 5 },
  { kind: "bush", x: 490, y: 174, s: 0.85, id: 6 },
  { kind: "lantern", x: 230, y: 176, s: 0.78, id: 7, lit: true },
  { kind: "lantern", x: 420, y: 174, s: 0.78, id: 8, lit: true },
  { kind: "fence", x: 100, y: 182, s: 1, id: 9 },
  { kind: "fence", x: 148, y: 180, s: 1, id: 10 },
  { kind: "fence", x: 460, y: 182, s: 1, id: 11 },
  { kind: "fence", x: 508, y: 180, s: 1, id: 12 },
  { kind: "pumpkin", x: 248, y: 180, s: 0.45, id: 13, lit: true },
  { kind: "stump", x: 390, y: 178, s: 0.7, id: 14 },
];

export const YARD_PROPS: readonly SceneProp[] = [
  // left cottage cluster
  { kind: "fence", x: 42, y: 240, s: 0.95, id: 20 },
  { kind: "fence", x: 78, y: 248, s: 0.9, id: 21 },
  { kind: "pumpkin", x: 96, y: 230, s: 1.05, id: 22, lit: true },
  { kind: "pumpkin", x: 122, y: 240, s: 0.7, id: 23, lit: true },
  { kind: "pumpkin", x: 148, y: 228, s: 0.55, id: 24, lit: false },
  { kind: "candle", x: 60, y: 236, s: 0.95, id: 25, lit: true },
  { kind: "candle", x: 78, y: 252, s: 0.75, id: 26, lit: true },
  { kind: "bush", x: 168, y: 236, s: 0.75, id: 27 },
  { kind: "lantern", x: 190, y: 220, s: 0.9, id: 28, lit: true },
  { kind: "ghost", x: 210, y: 250, s: 0.85, id: 29 },
  { kind: "tomb", x: 48, y: 300, s: 0.9, id: 30 },
  { kind: "candle", x: 64, y: 308, s: 0.7, id: 31, lit: true },
  { kind: "leaf-pile", x: 88, y: 300, s: 1.0, id: 32 },
  { kind: "pumpkin", x: 52, y: 340, s: 0.95, id: 33, lit: true },
  { kind: "pumpkin", x: 82, y: 350, s: 0.55, id: 34, lit: true },
  { kind: "ghost", x: 120, y: 340, s: 0.7, id: 35 },
  // path stones / mid
  { kind: "stone", x: 280, y: 310, s: 0.55, id: 36 },
  { kind: "stone", x: 360, y: 300, s: 0.5, id: 37 },
  { kind: "lantern", x: 300, y: 220, s: 0.8, id: 38, lit: true },
  { kind: "lantern", x: 360, y: 250, s: 0.75, id: 39, lit: true },
  { kind: "candle", x: 250, y: 300, s: 0.7, id: 40, lit: true },
  { kind: "candle", x: 390, y: 312, s: 0.7, id: 41, lit: true },
  { kind: "ghost", x: 330, y: 330, s: 0.65, id: 42 },
  { kind: "bush", x: 240, y: 218, s: 0.55, id: 43 },
  { kind: "bush", x: 420, y: 222, s: 0.55, id: 44 },
  { kind: "pumpkin", x: 270, y: 210, s: 0.42, id: 45, lit: true },
  { kind: "pumpkin-sketch", x: 400, y: 230, s: 0.5, id: 46 },
  // right cluster
  { kind: "lantern", x: 470, y: 230, s: 0.85, id: 47, lit: true },
  { kind: "lantern", x: 540, y: 250, s: 0.8, id: 48, lit: true },
  { kind: "pumpkin", x: 500, y: 236, s: 0.85, id: 49, lit: true },
  { kind: "pumpkin", x: 530, y: 248, s: 0.6, id: 50, lit: true },
  { kind: "fence", x: 580, y: 230, s: 0.85, id: 51 },
  { kind: "bush", x: 560, y: 270, s: 0.7, id: 52 },
  { kind: "leaf-pile", x: 480, y: 300, s: 0.85, id: 53 },
  { kind: "candle", x: 500, y: 320, s: 0.75, id: 54, lit: true },
  { kind: "ghost", x: 450, y: 280, s: 0.7, id: 55 },
  { kind: "pumpkin", x: 590, y: 310, s: 1.15, id: 56, lit: true },
  { kind: "pumpkin", x: 610, y: 290, s: 0.55, id: 57, lit: false },
  { kind: "stump", x: 440, y: 260, s: 0.75, id: 58 },
  { kind: "tomb", x: 420, y: 340, s: 0.7, id: 59 },
  { kind: "ink-bottle", x: 160, y: 360, s: 0.7, id: 60 },
  { kind: "leaf-pile", x: 600, y: 360, s: 0.9, id: 61 },
  { kind: "bush", x: 200, y: 360, s: 0.8, id: 62 },
  { kind: "bush", x: 380, y: 360, s: 0.75, id: 63 },
  { kind: "lantern", x: 620, y: 240, s: 0.7, id: 64, lit: true },
  { kind: "candle", x: 580, y: 340, s: 0.65, id: 65, lit: true },
  { kind: "ghost", x: 560, y: 300, s: 0.55, id: 66 },
  { kind: "stone", x: 200, y: 280, s: 0.5, id: 67 },
  { kind: "stone", x: 480, y: 280, s: 0.5, id: 68 },
];

export interface SceneView {
  time: number;
}

export function drawPaperScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
  view: SceneView,
): void {
  // cream page base
  ctx.fillStyle = "#EDE4D2";
  ctx.fillRect(0, 0, width, height);
  softPageShadow(ctx, width, height);

  ctx.save();
  clipTornPage(ctx, width, height);
  // sky night wash
  drawPaperSky(ctx, width, height, view.time);
  drawHills(ctx, width, false);
  drawPaperGround(ctx, width, height, grain);
  drawPaperPath(ctx);
  drawBunting(ctx, 430, 150, 540, 158, false);
  drawPaperCottage(ctx, 150, HORIZON + 14, view.time);
  drawPaperShed(ctx, 475, HORIZON + 18, view.time);
  for (const prop of FAR_PROPS) drawPaperProp(ctx, prop, view.time);
  // soft ambient ground glows from cottage windows
  warmPool(ctx, 150, HORIZON + 40, 50, 0.18);
  warmPool(ctx, 475, HORIZON + 42, 36, 0.14);
  ctx.restore();

  // grain over the clipped world
  ctx.save();
  clipTornPage(ctx, width, height);
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = "multiply";
  for (let y = 0; y < height; y += 256) {
    for (let x = 0; x < width; x += 256) ctx.drawImage(grain, x, y, 256, 256);
  }
  ctx.restore();
}

export function drawPixelScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
  view: SceneView,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#1A1524";
  ctx.fillRect(0, 0, width, height);
  drawPixelSky(ctx, width, height, view.time);
  drawHills(ctx, width, true);
  drawPixelGround(ctx, width, height, grain);
  drawPixelPath(ctx);
  drawBunting(ctx, 430, 150, 540, 158, true);
  drawPixelCottage(ctx, 144, HORIZON + 12, view.time);
  drawPixelShed(ctx, 468, HORIZON + 16, view.time);
  for (const prop of FAR_PROPS) drawPixelProp(ctx, prop, view.time);
}


export function drawPaperProp(ctx: CanvasRenderingContext2D, prop: SceneProp, time: number): void {
  switch (prop.kind) {
    case "pumpkin":
    case "pumpkin-sketch":
      paperPumpkin(ctx, prop.x, prop.y, prop.s, prop.kind === "pumpkin-sketch", Boolean(prop.lit), prop.id, time);
      break;
    case "lantern":
      paperLantern(ctx, prop.x, prop.y, prop.s, prop.id, time);
      break;
    case "candle":
      paperCandle(ctx, prop.x, prop.y, prop.s, prop.id, time);
      break;
    case "bush":
      paperBush(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "tree":
      paperTree(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "fence":
      paperFence(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "leaf-pile":
      paperLeaves(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "ink-bottle":
      paperBottle(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "pencil":
      paperPencil(ctx, prop.x, prop.y, prop.s);
      break;
    case "eraser":
      paperEraser(ctx, prop.x, prop.y, prop.s);
      break;
    case "stone":
      paperStone(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "box":
      paperBox(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "ghost":
      paperGhost(ctx, prop.x, prop.y, prop.s, prop.id, time);
      break;
    case "tomb":
      paperTomb(ctx, prop.x, prop.y, prop.s, prop.id);
      break;
    case "stump":
      paperStump(ctx, prop.x, prop.y, prop.s, prop.id, time);
      break;
    default:
      break;
  }
}

export function drawPixelProp(ctx: CanvasRenderingContext2D, prop: SceneProp, time: number): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  switch (prop.kind) {
    case "pumpkin":
    case "pumpkin-sketch":
      pixelPumpkin(ctx, prop.x, prop.y, prop.s, Boolean(prop.lit), prop.kind === "pumpkin-sketch");
      break;
    case "lantern":
      pixelLantern(ctx, prop.x, prop.y, prop.s, time);
      break;
    case "candle":
      pixelCandle(ctx, prop.x, prop.y, prop.s, time);
      break;
    case "bush":
      pixelBush(ctx, prop.x, prop.y, prop.s);
      break;
    case "tree":
      pixelTree(ctx, prop.x, prop.y, prop.s);
      break;
    case "fence":
      pixelFence(ctx, prop.x, prop.y, prop.s);
      break;
    case "leaf-pile":
      pixelLeaves(ctx, prop.x, prop.y, prop.s);
      break;
    case "ink-bottle":
      pixelBottle(ctx, prop.x, prop.y, prop.s);
      break;
    case "stone":
      pixelStone(ctx, prop.x, prop.y, prop.s);
      break;
    case "ghost":
      pixelGhost(ctx, prop.x, prop.y, prop.s);
      break;
    case "tomb":
      pixelTomb(ctx, prop.x, prop.y, prop.s);
      break;
    case "stump":
      pixelStump(ctx, prop.x, prop.y, prop.s, time);
      break;
    case "box":
      pixelBox(ctx, prop.x, prop.y, prop.s);
      break;
    default:
      // keep unused kinds quiet in pixel
      break;
  }
  ctx.restore();
}

export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  style: "paper" | "pixel",
  width: number,
  height: number,
  time: number,
): void {
  if (style === "paper") {
    paperMoon(ctx, 520, 52, time);
    paperStars(ctx, width);
    paperClouds(ctx, width);
    paperBats(ctx, time);
    paperFireflies(ctx, time);
    paperInkWisps(ctx, time);
    paperStamp(ctx, 300, 360);
    drawForegroundFoliage(ctx, width, height, false);
  } else {
    pixelMoon(ctx, 516, 48, time);
    pixelStars(ctx, width);
    pixelBats(ctx, time);
    pixelFireflies(ctx, time);
    drawForegroundFoliage(ctx, width, height, true);
  }
}

export function drawPageChrome(
  ctx: CanvasRenderingContext2D,
  style: "paper" | "pixel",
  width: number,
  height: number,
): void {
  if (style === "paper") {
    // torn cream rim already from clip; draw stitch + deckle outline
    ctx.save();
    ctx.strokeStyle = fillHex("#2A2420", 0.22);
    ctx.lineWidth = 1.2;
    tornRectPath(ctx, PAGE_MARGIN - 2, 10, width - PAGE_MARGIN * 2 + 4, height - 20);
    ctx.stroke();
    // white stitch marks along border
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    tornRectPath(ctx, PAGE_MARGIN + 3, 15, width - PAGE_MARGIN * 2 - 6, height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = "#1A1420";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.strokeStyle = "#C9B8A0";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);
  }
}


function softPageShadow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(40,30,20,0.18)";
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height - 4, width * 0.46, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function clipTornPage(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  tornRectPath(ctx, PAGE_MARGIN, 12, width - PAGE_MARGIN * 2, height - 24);
  ctx.clip();
}

function tornRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.beginPath();
  const step = 10;
  // top
  ctx.moveTo(x, y);
  for (let i = 0; i <= w; i += step) {
    const j = jitter(11, i, 2.2);
    ctx.lineTo(x + i, y + j.y);
  }
  // right
  for (let i = 0; i <= h; i += step) {
    const j = jitter(22, i, 2.2);
    ctx.lineTo(x + w + j.x, y + i);
  }
  // bottom
  for (let i = w; i >= 0; i -= step) {
    const j = jitter(33, i, 2.4);
    ctx.lineTo(x + i, y + h + j.y);
  }
  // left
  for (let i = h; i >= 0; i -= step) {
    const j = jitter(44, i, 2.2);
    ctx.lineTo(x + j.x, y + i);
  }
  ctx.closePath();
}

function drawPaperSky(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  void height;
  const g = ctx.createLinearGradient(0, 8, 0, HORIZON + 24);
  g.addColorStop(0, "#1A1430");
  g.addColorStop(0.35, "#2A2450");
  g.addColorStop(0.7, "#3A2F58");
  g.addColorStop(1, "#4A3A52");
  ctx.fillStyle = g;
  ctx.fillRect(PAGE_MARGIN, 10, width - PAGE_MARGIN * 2, HORIZON + 18);
  // soft haze near horizon
  const haze = ctx.createLinearGradient(0, HORIZON - 30, 0, HORIZON + 18);
  haze.addColorStop(0, "rgba(90,70,100,0)");
  haze.addColorStop(1, "rgba(70,55,80,0.35)");
  ctx.fillStyle = haze;
  ctx.fillRect(PAGE_MARGIN, HORIZON - 30, width - PAGE_MARGIN * 2, 48);
  void time;
}

function drawPixelSky(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  void height;
  const bands = ["#18122A", "#221A3A", "#2C2248", "#382C50", "#403448"];
  const h = (HORIZON + 10) / bands.length;
  for (let i = 0; i < bands.length; i += 1) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(8, 8 + Math.floor(i * h), width - 16, Math.ceil(h) + 1);
  }
  void time;
}

function drawHills(ctx: CanvasRenderingContext2D, width: number, pixel: boolean): void {
  const layers = [
    { y: HORIZON - 8, color: pixel ? "#2A2440" : "#2E2848", amp: 10, seed: 50 },
    { y: HORIZON + 2, color: pixel ? "#342C4A" : "#3A3358", amp: 7, seed: 60 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(PAGE_MARGIN, HORIZON + 20);
    ctx.lineTo(PAGE_MARGIN, layer.y);
    for (let x = PAGE_MARGIN; x <= width - PAGE_MARGIN; x += pixel ? 8 : 6) {
      const n = visHash(layer.seed + x * 3);
      const y = layer.y - Math.sin(x * 0.02 + layer.seed) * layer.amp - n * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width - PAGE_MARGIN, HORIZON + 20);
    ctx.closePath();
    ctx.fill();
    if (!pixel) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      for (let x = PAGE_MARGIN; x <= width - PAGE_MARGIN; x += 8) {
        const n = visHash(layer.seed + x * 3);
        const y = layer.y - Math.sin(x * 0.02 + layer.seed) * layer.amp - n * 6;
        if (x === PAGE_MARGIN) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawPaperGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
): void {
  const g = ctx.createLinearGradient(0, HORIZON, 0, height);
  g.addColorStop(0, "#4A5A38");
  g.addColorStop(0.35, "#3F5234");
  g.addColorStop(0.7, "#36482E");
  g.addColorStop(1, "#2C3A26");
  ctx.fillStyle = g;
  ctx.fillRect(PAGE_MARGIN, HORIZON, width - PAGE_MARGIN * 2, height - HORIZON - 12);

  // soft darker patches
  for (let i = 0; i < 18; i += 1) {
    const p = jitter(90, i, 1);
    const x = 40 + visHash(100 + i) * (width - 80);
    const y = HORIZON + 20 + visHash(200 + i) * (height - HORIZON - 60);
    ctx.fillStyle = fillHex("#243020", 0.12 + visHash(300 + i) * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, 28 + p.x * 10, 10 + p.y * 4, p.x, 0, Math.PI * 2);
    ctx.fill();
  }

  // grass tufts + tiny flowers + autumn leaves
  for (let i = 0; i < 90; i += 1) {
    const x = 24 + visHash(400 + i) * (width - 48);
    const y = HORIZON + 12 + visHash(500 + i) * (height - HORIZON - 40);
    if (y > height - 28) continue;
    const kind = visHash(600 + i);
    if (kind < 0.45) {
      // tuft
      ctx.strokeStyle = fillHex("#A8C070", 0.35 + kind * 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 2, y - 5, x - 1, y - 9);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 2, y - 6, x + 2, y - 10);
      ctx.stroke();
    } else if (kind < 0.7) {
      // leaf
      const cols = ["#C45A28", "#D48A30", "#A83840", "#E0B050"];
      ctx.fillStyle = cols[Math.floor(visHash(700 + i) * cols.length)]!;
      ctx.beginPath();
      ctx.ellipse(x, y, 3.2, 1.6, visHash(710 + i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind < 0.88) {
      // tiny flower
      ctx.fillStyle = "#F4E8C0";
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = fillHex("#1A2418", 0.25);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // light grain multiply already applied outside; keep a soft local wash
  void grain;
}

function drawPixelGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
): void {
  // banded olive night grass
  const bands = ["#455638", "#3A4A30", "#344428", "#2E3C26"];
  const bandH = Math.ceil((height - HORIZON - 8) / bands.length);
  for (let i = 0; i < bands.length; i += 1) {
    ctx.fillStyle = bands[i]!;
    ctx.fillRect(8, HORIZON + i * bandH, width - 16, bandH + 1);
  }
  for (let y = HORIZON + 2; y < height - 10; y += 4) {
    for (let x = 12; x < width - 12; x += 4) {
      const n = visHash(x * 13 + y * 17);
      if (n > 0.62) {
        ctx.fillStyle = n > 0.92 ? "#C45A28" : n > 0.84 ? "#D48A30" : n > 0.76 ? "#2A3824" : "#4A5A38";
        ctx.fillRect(x, y, n > 0.9 ? 3 : 2, 2);
      } else if (n < 0.08) {
        ctx.fillStyle = "#F4E8C0";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.globalCompositeOperation = "multiply";
  for (let y = HORIZON; y < height; y += 128) {
    for (let x = 0; x < width; x += 128) ctx.drawImage(grain, x, y, 128, 128);
  }
  ctx.restore();
}

function drawPaperPath(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // soft edge shadow
  ctx.strokeStyle = fillHex("#1A2014", 0.22);
  ctx.lineWidth = 30;
  pathCurve(ctx);
  ctx.stroke();
  // cream path
  ctx.strokeStyle = "#D8C8A8";
  ctx.lineWidth = 24;
  pathCurve(ctx);
  ctx.stroke();
  // lighter center
  ctx.strokeStyle = fillHex("#EFE2C8", 0.75);
  ctx.lineWidth = 12;
  pathCurve(ctx);
  ctx.stroke();
  // dashed edge stitch
  ctx.strokeStyle = fillHex("#8A7A58", 0.35);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 22;
  // approximate dashed borders by thin offsets — draw speckles instead
  ctx.setLineDash([]);
  for (let t = 0; t <= 1; t += 0.04) {
    const p = pathPoint(t);
    const n = pathNormal(t);
    ctx.fillStyle = fillHex("#B8A888", 0.45);
    ctx.beginPath();
    ctx.arc(p.x + n.x * 11, p.y + n.y * 11, 1.1, 0, Math.PI * 2);
    ctx.arc(p.x - n.x * 11, p.y - n.y * 11, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // stepping stones
  for (const t of [0.18, 0.34, 0.5, 0.66, 0.8]) {
    const p = pathPoint(t);
    ctx.fillStyle = fillHex("#C9B898", 0.85);
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 1, 7, 3.5, t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPixelPath(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = "#C8B890";
  ctx.lineWidth = 18;
  ctx.lineCap = "square";
  pathCurve(ctx);
  ctx.stroke();
  ctx.strokeStyle = "#E0D0B0";
  ctx.lineWidth = 8;
  pathCurve(ctx);
  ctx.stroke();
  ctx.restore();
}

function pathCurve(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(320, 392);
  ctx.bezierCurveTo(305, 340, 345, 295, 320, 248);
  ctx.bezierCurveTo(295, 210, 250, 195, 195, 178);
}

function pathPoint(t: number): { x: number; y: number } {
  // approximate cubic bezier sampling for the path
  const p0 = { x: 320, y: 392 };
  const p1 = { x: 305, y: 340 };
  const p2 = { x: 345, y: 295 };
  const p3 = { x: 320, y: 248 };
  const p4 = { x: 295, y: 210 };
  const p5 = { x: 250, y: 195 };
  const p6 = { x: 195, y: 178 };
  if (t <= 0.5) {
    const u = t / 0.5;
    return cubic(p0, p1, p2, p3, u);
  }
  const u = (t - 0.5) / 0.5;
  return cubic(p3, p4, p5, p6, u);
}

function pathNormal(t: number): { x: number; y: number } {
  const a = pathPoint(Math.max(0, t - 0.02));
  const b = pathPoint(Math.min(1, t + 0.02));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

function cubic(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}


function drawPaperCottage(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  shadow(ctx, x, y + 8, 52, 12, 0.28);
  // walls
  ctx.fillStyle = "#E8DCC8";
  rounded(ctx, x - 42, y - 38, 84, 48, 3);
  ctx.fill();
  // stone mottling
  for (let i = 0; i < 14; i += 1) {
    const j = jitter(120, i, 30);
    ctx.fillStyle = fillHex("#C8B8A0", 0.35);
    ctx.fillRect(x - 35 + Math.abs(j.x), y - 30 + Math.abs(j.y) * 0.6, 6, 4);
  }
  // roof
  ctx.fillStyle = "#6A4A38";
  ctx.beginPath();
  ctx.moveTo(x - 52, y - 34);
  ctx.lineTo(x, y - 68);
  ctx.lineTo(x + 52, y - 34);
  ctx.closePath();
  ctx.fill();
  // roof shingles suggestion
  ctx.strokeStyle = fillHex("#3A2818", 0.35);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 42 + i * 4, y - 38 - i * 7);
    ctx.lineTo(x + 42 - i * 4, y - 38 - i * 7);
    ctx.stroke();
  }
  // chimney + smoke
  ctx.fillStyle = "#8A6A58";
  ctx.fillRect(x + 18, y - 72, 12, 22);
  ctx.fillStyle = "#5A4034";
  ctx.fillRect(x + 16, y - 76, 16, 5);
  paperSmoke(ctx, x + 24, y - 78, time);
  // ivy
  ctx.strokeStyle = "#3A5A30";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 40, y - 10);
  ctx.quadraticCurveTo(x - 48, y - 30, x - 28, y - 42);
  ctx.stroke();
  ctx.fillStyle = "#4A6A38";
  for (let i = 0; i < 6; i += 1) {
    const j = jitter(130, i, 8);
    ctx.beginPath();
    ctx.ellipse(x - 36 + j.x, y - 20 + j.y, 3, 2, j.x, 0, Math.PI * 2);
    ctx.fill();
  }
  // glowing windows
  glowWindow(ctx, x - 24, y - 24, 14, 14, time);
  glowWindow(ctx, x + 8, y - 24, 14, 14, time);
  // door
  ctx.fillStyle = "#5A4030";
  rounded(ctx, x - 8, y - 8, 16, 18, 2);
  ctx.fill();
  ctx.fillStyle = "#E8C96A";
  ctx.beginPath();
  ctx.arc(x + 4, y + 2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  // porch lantern
  paperLantern(ctx, x + 28, y + 6, 0.55, 200, time);
  // pumpkins by door
  paperPumpkin(ctx, x - 30, y + 8, 0.45, false, true, 201, time);
  paperPumpkin(ctx, x - 18, y + 10, 0.32, false, true, 202, time);
  // stitch on roof edge
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 34);
  ctx.lineTo(x, y - 66);
  ctx.lineTo(x + 50, y - 34);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaperShed(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  shadow(ctx, x, y + 6, 34, 8, 0.24);
  ctx.fillStyle = "#E2D6C2";
  rounded(ctx, x - 28, y - 26, 56, 34, 2);
  ctx.fill();
  ctx.fillStyle = "#5A3A48";
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 24);
  ctx.lineTo(x, y - 48);
  ctx.lineTo(x + 34, y - 24);
  ctx.closePath();
  ctx.fill();
  glowWindow(ctx, x - 14, y - 16, 10, 10, time);
  glowWindow(ctx, x + 4, y - 16, 10, 10, time);
  ctx.fillStyle = "#4A3428";
  ctx.fillRect(x - 5, y - 4, 10, 12);
  paperLantern(ctx, x + 22, y + 2, 0.5, 210, time);
}

function drawPixelCottage(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  ctx.fillStyle = "rgba(8,6,12,0.35)";
  ctx.fillRect(ix - 44, iy + 4, 88, 8);
  ctx.fillStyle = "#E0D4C0";
  ctx.fillRect(ix - 40, iy - 36, 80, 44);
  // stone mottling
  ctx.fillStyle = "#C8B8A0";
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(ix - 34 + (i % 4) * 18, iy - 28 + Math.floor(i / 4) * 14, 6, 4);
  }
  ctx.fillStyle = "#6A4A38";
  ctx.beginPath();
  ctx.moveTo(ix - 48, iy - 34);
  ctx.lineTo(ix, iy - 64);
  ctx.lineTo(ix + 48, iy - 34);
  ctx.fill();
  ctx.fillStyle = "#4A3024";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(ix - 36 + i * 4, iy - 40 - i * 5, 72 - i * 8, 2);
  }
  ctx.fillStyle = "#8A6A58";
  ctx.fillRect(ix + 16, iy - 68, 12, 20);
  ctx.fillStyle = "#5A4034";
  ctx.fillRect(ix + 14, iy - 72, 16, 4);
  pxGlowWindow(ctx, ix - 22, iy - 22, 12, 12);
  pxGlowWindow(ctx, ix + 8, iy - 22, 12, 12);
  ctx.fillStyle = "#5A4030";
  ctx.fillRect(ix - 7, iy - 6, 14, 14);
  ctx.fillStyle = "#E8C96A";
  ctx.fillRect(ix + 3, iy + 1, 2, 2);
  // ivy pixels
  ctx.fillStyle = "#3A5A30";
  ctx.fillRect(ix - 40, iy - 20, 4, 16);
  ctx.fillRect(ix - 38, iy - 28, 6, 4);
  pixelLantern(ctx, ix + 28, iy + 4, 0.55, time);
  pixelPumpkin(ctx, ix - 30, iy + 6, 0.45, true, false);
  void time;
}

function drawPixelShed(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.fillStyle = "#D8CCB8";
  ctx.fillRect(x - 26, y - 24, 52, 30);
  ctx.fillStyle = "#5A3A48";
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 22);
  ctx.lineTo(x, y - 44);
  ctx.lineTo(x + 32, y - 22);
  ctx.fill();
  pxGlowWindow(ctx, x - 12, y - 14, 8, 8);
  pxGlowWindow(ctx, x + 4, y - 14, 8, 8);
  void time;
}

function drawBunting(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pixel: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = pixel ? "#C9A84A" : fillHex("#E8C96A", 0.85);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 10, x1, y1);
  ctx.stroke();
  const cols = ["#E07A30", "#E8C050", "#C45A40", "#F0A040"];
  for (let i = 0; i < 7; i += 1) {
    const t = (i + 0.5) / 7;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 8;
    ctx.fillStyle = cols[i % cols.length]!;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paperTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 22 * s, 7 * s, 0.25);
  // trunk
  ctx.fillStyle = "#4A3428";
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y);
  ctx.lineTo(x - 2 * s, y - 28 * s);
  ctx.lineTo(x + 3 * s, y - 28 * s);
  ctx.lineTo(x + 5 * s, y);
  ctx.closePath();
  ctx.fill();
  // canopy clumps
  const colors = id % 2 === 0
    ? ["#C45A28", "#A83828", "#D48A30", "#8A3028"]
    : ["#A83840", "#C45A28", "#6A2840", "#D07040"];
  for (let i = 0; i < 7; i += 1) {
    const j = jitter(id, i, 14 * s);
    const r = (10 + (i % 3) * 3) * s;
    const cx = x + j.x * 0.9;
    const cy = y - 34 * s + j.y * 0.5;
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
    g.addColorStop(0, mixHex(colors[i % colors.length]!, "#F0C080", 0.25));
    g.addColorStop(1, colors[(i + 1) % colors.length]!);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r * 0.9, j.x * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // stitch edge
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.ellipse(x, y - 36 * s, 22 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function pixelTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(3 * s));
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = "rgba(8,6,12,0.35)";
  ctx.fillRect(rx - u * 4, ry, u * 8, u);
  ctx.fillStyle = "#4A3428";
  ctx.fillRect(rx - u, ry - u * 9, u * 2, u * 9);
  ctx.fillStyle = "#5A4030";
  ctx.fillRect(rx - u * 0.5, ry - u * 11, u, u * 3);
  // layered autumn canopy
  const blobs: Array<[number, number, number, number, string]> = [
    [-5, -18, 10, 8, "#A83828"],
    [-3, -20, 8, 6, "#C45A28"],
    [-4, -15, 9, 7, "#8A3028"],
    [0, -17, 7, 6, "#D48A30"],
    [-2, -13, 6, 5, "#E07040"],
  ];
  for (const [dx, dy, w, h, col] of blobs) {
    ctx.fillStyle = col;
    ctx.fillRect(rx + dx * u, ry + dy * u, w * u, h * u);
  }
  // highlight leaf pixels
  ctx.fillStyle = "#F0B050";
  ctx.fillRect(rx - u * 2, ry - u * 16, u * 2, u);
  ctx.fillRect(rx + u, ry - u * 14, u, u);
}

function paperBush(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 14 * s, 4 * s, 0.2);
  const cols = ["#3A4A2C", "#4A3A48", "#5A3040", "#3A3A28"];
  for (let i = 0; i < 5; i += 1) {
    const j = jitter(id, i, 8 * s);
    ctx.fillStyle = cols[(id + i) % cols.length]!;
    ctx.beginPath();
    ctx.ellipse(x + j.x, y - 6 * s + j.y * 0.3, (8 + i) * s * 0.55, (5 + i * 0.4) * s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pixelBush(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(3 * s));
  ctx.fillStyle = "#3A4A2C";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 3), u * 6, u * 3);
  ctx.fillStyle = "#5A3040";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 4), u * 4, u * 2);
}


function paperPumpkin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  sketch: boolean,
  lit: boolean,
  id: number,
  time: number,
): void {
  const flick = 0.75 + 0.25 * Math.sin(time * 5 + id);
  shadow(ctx, x, y, 10 * s, 3.5 * s, 0.22);
  if (lit) warmPool(ctx, x, y - 2 * s, 22 * s, 0.22 * flick);
  const body = sketch ? fillHex("#C9A070", 0.55) : "#E07A28";
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!sketch) {
    ctx.fillStyle = "#C45A18";
    ctx.beginPath();
    ctx.ellipse(x - 5 * s, y - 7 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * s, y - 7 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F0A040";
    ctx.beginPath();
    ctx.ellipse(x, y - 7 * s, 4.5 * s, 7.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // stem
  ctx.fillStyle = "#3A5A28";
  ctx.fillRect(x - 1.2 * s, y - 16 * s, 2.4 * s, 4 * s);
  if (lit && !sketch) {
    // carved face glow
    ctx.fillStyle = `rgba(255,230,140,${0.85 * flick})`;
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 9 * s);
    ctx.lineTo(x - 1.5 * s, y - 6.5 * s);
    ctx.lineTo(x - 4.5 * s, y - 6.5 * s);
    ctx.closePath();
    ctx.moveTo(x + 4 * s, y - 9 * s);
    ctx.lineTo(x + 1.5 * s, y - 6.5 * s);
    ctx.lineTo(x + 4.5 * s, y - 6.5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 4.5 * s);
    ctx.lineTo(x + 4 * s, y - 4.5 * s);
    ctx.lineTo(x + 2 * s, y - 2.2 * s);
    ctx.lineTo(x - 2 * s, y - 2.2 * s);
    ctx.closePath();
    ctx.fill();
    // inner halo
    ctx.fillStyle = `rgba(255,240,180,${0.25 * flick})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 7 * s, 14 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (sketch) {
    ctx.strokeStyle = fillHex("#2A2420", 0.45);
    ctx.stroke();
  }
  ctx.strokeStyle = fillHex("#2A2420", 0.35);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function pixelPumpkin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  lit: boolean,
  sketch: boolean,
): void {
  const u = Math.max(2, Math.round(3 * s));
  ctx.fillStyle = sketch ? "#C9A070" : "#E07A28";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 4), u * 6, u * 4);
  ctx.fillStyle = "#3A5A28";
  ctx.fillRect(Math.round(x - u * 0.5), Math.round(y - u * 5), u, u);
  if (lit) {
    ctx.fillStyle = "#FFF1A0";
    ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 3), u, u);
    ctx.fillRect(Math.round(x + u), Math.round(y - u * 3), u, u);
    ctx.fillRect(Math.round(x - u), Math.round(y - u * 1.5), u * 2, u);
    ctx.fillStyle = "rgba(255,210,120,0.35)";
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y - u * 2), u * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paperLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  id: number,
  time: number,
): void {
  const flick = 0.8 + 0.2 * Math.sin(time * 6 + id);
  shadow(ctx, x, y, 5 * s, 2.5 * s, 0.2);
  warmPool(ctx, x, y - 18 * s, 28 * s, 0.2 * flick);
  // post
  ctx.strokeStyle = "#3A2C20";
  ctx.lineWidth = 1.6 * Math.max(0.8, s);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 22 * s);
  ctx.stroke();
  // lantern
  ctx.fillStyle = mixHex("#E7B45A", "#FFF1C0", flick * 0.35);
  rounded(ctx, x - 7 * s, y - 34 * s, 14 * s, 14 * s, 2);
  ctx.fill();
  ctx.strokeStyle = "#2A2420";
  ctx.lineWidth = 1;
  rounded(ctx, x - 7 * s, y - 34 * s, 14 * s, 14 * s, 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,245,200,${0.55 * flick})`;
  ctx.fillRect(x - 3.5 * s, y - 30 * s, 7 * s, 7 * s);
  // lid + base
  ctx.fillStyle = "#3A2C20";
  ctx.fillRect(x - 8 * s, y - 36 * s, 16 * s, 2.5 * s);
  ctx.fillRect(x - 6 * s, y - 21 * s, 12 * s, 2 * s);
  // halo
  ctx.fillStyle = fillHex("#FFF1C0", 0.22 * flick);
  ctx.beginPath();
  ctx.ellipse(x, y - 27 * s, 16 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function pixelLantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number): void {
  const u = Math.max(2, Math.round(3 * s));
  const flick = 0.8 + 0.2 * Math.sin(time * 6);
  ctx.strokeStyle = "#3A2C20";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y - u * 7));
  ctx.stroke();
  ctx.fillStyle = "#E7B45A";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 11), u * 4, u * 4);
  ctx.fillStyle = `rgba(255,245,200,${0.6 * flick})`;
  ctx.fillRect(Math.round(x - u), Math.round(y - u * 10), u * 2, u * 2);
  ctx.fillStyle = `rgba(255,210,120,${0.28 * flick})`;
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y - u * 9), u * 5, 0, Math.PI * 2);
  ctx.fill();
}

function paperCandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  id: number,
  time: number,
): void {
  const flick = 0.75 + 0.25 * Math.sin(time * 9 + id);
  shadow(ctx, x, y, 3.5 * s, 1.8 * s, 0.18);
  warmPool(ctx, x, y - 10 * s, 14 * s, 0.16 * flick);
  ctx.fillStyle = "#EDE4D2";
  rounded(ctx, x - 2.2 * s, y - 10 * s, 4.4 * s, 10 * s, 1);
  ctx.fill();
  ctx.strokeStyle = "#2A2420";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = mixHex("#F6D56A", "#FFF5C0", flick);
  ctx.beginPath();
  ctx.ellipse(x, y - 13 * s, 1.6 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fillHex("#FFF1C0", 0.35 * flick);
  ctx.beginPath();
  ctx.ellipse(x, y - 12 * s, 6 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function pixelCandle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#EDE4D2";
  ctx.fillRect(Math.round(x - u * 0.5), Math.round(y - u * 3), u, u * 3);
  ctx.fillStyle = "#F6D56A";
  ctx.fillRect(Math.round(x - 1), Math.round(y - u * 4 - Math.sin(time * 9)), 2, u);
}

function paperFence(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 16 * s, 3 * s, 0.16);
  ctx.strokeStyle = "#4A3428";
  ctx.fillStyle = "#5A4030";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i += 1) {
    const px = x - 14 * s + i * 9 * s + jitter(id, i, 1).x;
    rounded(ctx, px, y - 16 * s, 3.2 * s, 16 * s, 1);
    ctx.fill();
  }
  ctx.fillRect(x - 16 * s, y - 12 * s, 34 * s, 2.2 * s);
  ctx.fillRect(x - 16 * s, y - 6 * s, 34 * s, 2.2 * s);
}

function pixelFence(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#5A4030";
  for (let i = 0; i < 4; i += 1) ctx.fillRect(Math.round(x - u * 4 + i * u * 2.5), Math.round(y - u * 5), u, u * 5);
  ctx.fillRect(Math.round(x - u * 4), Math.round(y - u * 4), u * 10, u);
  ctx.fillRect(Math.round(x - u * 4), Math.round(y - u * 2), u * 10, u);
}

function paperLeaves(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 14 * s, 4 * s, 0.18);
  const cols = ["#C45A28", "#D48A30", "#A83840", "#E0B050", "#8A3028"];
  for (let i = 0; i < 10; i += 1) {
    const j = jitter(id, i, 12 * s);
    ctx.fillStyle = cols[i % cols.length]!;
    ctx.beginPath();
    ctx.ellipse(x + j.x, y - 3 * s + j.y * 0.35, 4 * s, 2 * s, j.x, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pixelLeaves(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#C45A28";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 2), u * 6, u * 2);
  ctx.fillStyle = "#D48A30";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 3), u * 3, u);
}

function paperBottle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  void id;
  shadow(ctx, x, y, 5 * s, 2 * s, 0.18);
  ctx.fillStyle = "#3A2A48";
  rounded(ctx, x - 5 * s, y - 14 * s, 10 * s, 14 * s, 2);
  ctx.fill();
  ctx.fillStyle = "#7A4A8A";
  ctx.fillRect(x - 3 * s, y - 18 * s, 6 * s, 5 * s);
  ctx.fillStyle = fillHex("#C9A0D8", 0.35);
  ctx.fillRect(x - 2 * s, y - 12 * s, 3 * s, 6 * s);
}

function pixelBottle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#3A2A48";
  ctx.fillRect(Math.round(x - u), Math.round(y - u * 4), u * 2, u * 4);
  ctx.fillStyle = "#7A4A8A";
  ctx.fillRect(Math.round(x - u * 0.5), Math.round(y - u * 5), u, u);
}

function paperPencil(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.fillStyle = "#D2B15A";
  ctx.fillRect(-12 * s, -1.5 * s, 22 * s, 3 * s);
  ctx.fillStyle = "#E8D8C0";
  ctx.beginPath();
  ctx.moveTo(10 * s, -1.5 * s);
  ctx.lineTo(16 * s, 0);
  ctx.lineTo(10 * s, 1.5 * s);
  ctx.fill();
  ctx.restore();
}

function paperEraser(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#E8A0B0";
  rounded(ctx, x - 8 * s, y - 4 * s, 16 * s, 6 * s, 1.5);
  ctx.fill();
  ctx.fillStyle = "#F4EDE0";
  ctx.fillRect(x - 8 * s, y - 4 * s, 5 * s, 6 * s);
}

function paperStone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 8 * s, 3 * s, 0.16);
  ctx.fillStyle = mixHex("#8A8478", "#6A6458", visHash(id));
  ctx.beginPath();
  ctx.ellipse(x, y - 3 * s, 9 * s, 4.5 * s, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function pixelStone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#8A8478";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u), u * 4, u * 2);
}

function paperBox(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  void id;
  shadow(ctx, x, y, 10 * s, 3 * s, 0.18);
  ctx.fillStyle = "#C4A574";
  rounded(ctx, x - 12 * s, y - 12 * s, 24 * s, 12 * s, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#2A2420";
  ctx.stroke();
}

function pixelBox(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#C4A574";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 3), u * 6, u * 3);
}


function paperGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  id: number,
  time: number,
): void {
  const bob = Math.sin(time * 2.4 + id) * 2.5;
  ctx.save();
  ctx.translate(0, bob);
  ctx.fillStyle = fillHex("#120C14", 0.15);
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 8 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F4F0E8";
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y - 4 * s);
  ctx.quadraticCurveTo(x - 9 * s, y - 18 * s, x, y - 20 * s);
  ctx.quadraticCurveTo(x + 9 * s, y - 18 * s, x + 8 * s, y - 4 * s);
  ctx.quadraticCurveTo(x + 5 * s, y - 1 * s, x + 3 * s, y - 4 * s);
  ctx.quadraticCurveTo(x, y, x - 3 * s, y - 4 * s);
  ctx.quadraticCurveTo(x - 5 * s, y - 1 * s, x - 8 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  // purple trailing wisp
  ctx.fillStyle = fillHex("#8A6AAA", 0.45);
  ctx.beginPath();
  ctx.ellipse(x + 6 * s, y + 2 * s, 4 * s, 2 * s, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2A2030";
  ctx.beginPath();
  ctx.arc(x - 2.5 * s, y - 12 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.arc(x + 2.5 * s, y - 12 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pixelGhost(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#F4F0E8";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 5), u * 4, u * 5);
  ctx.fillStyle = "#2A2030";
  ctx.fillRect(Math.round(x - u), Math.round(y - u * 4), u, u);
  ctx.fillRect(Math.round(x + u * 0.5), Math.round(y - u * 4), u, u);
}

function paperTomb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number): void {
  shadow(ctx, x, y, 8 * s, 3 * s, 0.2);
  ctx.fillStyle = "#6A6870";
  rounded(ctx, x - 8 * s, y - 18 * s, 16 * s, 18 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = "#4A4850";
  // paw print
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 2.4 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-3.2, -13], [-0.5, -14.5], [2.5, -13.5]] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, 1 * s, 1.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  void id;
}

function pixelTomb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#6A6870";
  ctx.fillRect(Math.round(x - u * 2), Math.round(y - u * 5), u * 4, u * 5);
  ctx.fillStyle = "#4A4850";
  ctx.fillRect(Math.round(x - u), Math.round(y - u * 3), u * 2, u);
}

function paperStump(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  id: number,
  time: number,
): void {
  shadow(ctx, x, y, 10 * s, 3 * s, 0.2);
  ctx.fillStyle = "#6A4A30";
  rounded(ctx, x - 10 * s, y - 10 * s, 20 * s, 10 * s, 2);
  ctx.fill();
  ctx.fillStyle = "#C4A878";
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fillHex("#5A4030", 0.5);
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * s, 5 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  paperLantern(ctx, x + 2 * s, y - 8 * s, 0.55 * s, id + 50, time);
}

function pixelStump(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number): void {
  const u = Math.max(2, Math.round(2.5 * s));
  ctx.fillStyle = "#6A4A30";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 3), u * 6, u * 3);
  ctx.fillStyle = "#C4A878";
  ctx.fillRect(Math.round(x - u * 3), Math.round(y - u * 3), u * 6, u);
  pixelLantern(ctx, x, y - u * 2, 0.55 * s, time);
}

function paperMoon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pulse = 0.9 + 0.1 * Math.sin(time * 0.8);
  // concentric decorative rings
  for (let i = 3; i >= 1; i -= 1) {
    ctx.strokeStyle = fillHex("#E8C96A", 0.12 * pulse / i);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(x, y, 18 + i * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // glow
  const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
  g.addColorStop(0, `rgba(255,230,150,${0.35 * pulse})`);
  g.addColorStop(1, "rgba(255,230,150,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
  // crescent
  ctx.fillStyle = "#F4E28A";
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2A2450";
  ctx.beginPath();
  ctx.arc(x + 6, y - 2, 13, 0, Math.PI * 2);
  ctx.fill();
}

function pixelMoon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  void time;
  ctx.fillStyle = "rgba(255,230,150,0.2)";
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F4E28A";
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#221A3A";
  ctx.beginPath();
  ctx.arc(Math.round(x + 5), Math.round(y - 2), 11, 0, Math.PI * 2);
  ctx.fill();
  // ring pixels
  ctx.fillStyle = "rgba(232,201,106,0.35)";
  for (let a = 0; a < Math.PI * 2; a += 0.4) {
    ctx.fillRect(Math.round(x + Math.cos(a) * 22), Math.round(y + Math.sin(a) * 22), 2, 2);
  }
}

function paperStars(ctx: CanvasRenderingContext2D, width: number): void {
  for (let i = 0; i < 40; i += 1) {
    const x = PAGE_MARGIN + 8 + visHash(800 + i) * (width - PAGE_MARGIN * 2 - 16);
    const y = 18 + visHash(900 + i) * (HORIZON - 40);
    const a = 0.35 + visHash(910 + i) * 0.5;
    ctx.fillStyle = fillHex("#F4E8C0", a);
    const r = 0.7 + visHash(920 + i) * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pixelStars(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.fillStyle = "#F4E8C0";
  for (let i = 0; i < 28; i += 1) {
    const x = Math.round(12 + visHash(800 + i) * (width - 24));
    const y = Math.round(16 + visHash(900 + i) * (HORIZON - 40));
    ctx.fillRect(x, y, 2, 2);
  }
}

function paperClouds(ctx: CanvasRenderingContext2D, width: number): void {
  for (let i = 0; i < 5; i += 1) {
    const x = 40 + visHash(1000 + i) * (width - 80);
    const y = 28 + visHash(1010 + i) * 40;
    ctx.fillStyle = fillHex("#6A5A80", 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, 28 + i * 4, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 16, y + 2, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paperBats(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 4; i += 1) {
    const x = 80 + i * 110 + Math.sin(time * 0.6 + i) * 12;
    const y = 36 + (i % 3) * 16 + Math.cos(time * 0.9 + i) * 4;
    ctx.fillStyle = fillHex("#1A1420", 0.55);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 6, y - 4, x - 10, y + 1);
    ctx.quadraticCurveTo(x - 4, y + 1, x, y);
    ctx.quadraticCurveTo(x + 4, y + 1, x + 10, y + 1);
    ctx.quadraticCurveTo(x + 6, y - 4, x, y);
    ctx.fill();
  }
}

function pixelBats(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = "#1A1420";
  for (let i = 0; i < 3; i += 1) {
    const x = Math.round(90 + i * 120 + Math.sin(time * 0.6 + i) * 8);
    const y = Math.round(40 + i * 12);
    ctx.fillRect(x - 4, y, 8, 2);
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

function paperFireflies(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 18; i += 1) {
    const b = visHash(1100 + i);
    const x = 40 + b * 560 + Math.sin(time * (0.7 + b) + i) * 18;
    const y = YARD_TOP + 10 + visHash(1200 + i) * 180 + Math.cos(time * (0.5 + b) + i) * 10;
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 4 + i * 2));
    ctx.fillStyle = fillHex("#F4E28A", a);
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fillHex("#F4E28A", a * 0.25);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pixelFireflies(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 12; i += 1) {
    const b = visHash(1100 + i);
    const x = Math.round(40 + b * 560 + Math.sin(time * (0.7 + b) + i) * 18);
    const y = Math.round(YARD_TOP + 10 + visHash(1200 + i) * 180 + Math.cos(time * (0.5 + b) + i) * 10);
    ctx.fillStyle = "#F4E28A";
    ctx.fillRect(x, y, 2, 2);
  }
}

function paperInkWisps(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 5; i += 1) {
    const x = 160 + i * 80 + Math.sin(time * 0.8 + i) * 10;
    const y = 300 + Math.cos(time * 1.1 + i) * 12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
    g.addColorStop(0, "rgba(140,90,180,0.45)");
    g.addColorStop(1, "rgba(140,90,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6A3A88";
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F4E8C0";
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1, 1, 0, Math.PI * 2);
    ctx.arc(x + 1.8, y - 0.5, 1, 0, Math.PI * 2);
    ctx.fill();
    // sparkles
    ctx.fillStyle = fillHex("#E8C0F0", 0.7);
    ctx.fillRect(x + 6, y - 6, 1.5, 1.5);
    ctx.fillRect(x - 7, y + 3, 1.5, 1.5);
  }
}

function drawForegroundFoliage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixel: boolean,
): void {
  // bottom torn purple/burgundy paper layer
  const base = height - 18;
  if (pixel) {
    ctx.fillStyle = "#3A2448";
    ctx.fillRect(6, height - 22, width - 12, 14);
    ctx.fillStyle = "#5A3048";
    for (let x = 10; x < width - 10; x += 10) {
      ctx.fillRect(x, height - 28 - (x % 20 === 0 ? 4 : 0), 8, 10);
    }
    return;
  }
  ctx.fillStyle = "#3A2448";
  ctx.beginPath();
  ctx.moveTo(PAGE_MARGIN, height - 12);
  for (let x = PAGE_MARGIN; x <= width - PAGE_MARGIN; x += 12) {
    const j = jitter(77, x, 6);
    ctx.lineTo(x, base - 10 - Math.abs(j.y) - (x % 36 === 0 ? 8 : 0));
  }
  ctx.lineTo(width - PAGE_MARGIN, height - 12);
  ctx.closePath();
  ctx.fill();
  // second layer
  ctx.fillStyle = "#5A3048";
  ctx.beginPath();
  ctx.moveTo(PAGE_MARGIN, height - 12);
  for (let x = PAGE_MARGIN; x <= width - PAGE_MARGIN; x += 14) {
    const j = jitter(88, x, 5);
    ctx.lineTo(x, base - 4 - Math.abs(j.y));
  }
  ctx.lineTo(width - PAGE_MARGIN, height - 12);
  ctx.closePath();
  ctx.fill();
  // corner foliage left/right
  foliageCorner(ctx, 28, height - 40, 1);
  foliageCorner(ctx, width - 28, height - 44, -1);
  // stitch
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.setLineDash([2.5, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAGE_MARGIN + 6, height - 20);
  for (let x = PAGE_MARGIN + 6; x < width - PAGE_MARGIN - 6; x += 10) {
    const j = jitter(99, x, 2);
    ctx.lineTo(x, height - 18 + j.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // large foreground pumpkin bottom-right
  paperPumpkin(ctx, width - 70, height - 36, 1.25, false, true, 900, 0);
}

function foliageCorner(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number): void {
  ctx.fillStyle = "#4A2850";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + dir * i * 8, y - i * 4, 14 - i, 8, dir * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paperSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let i = 0; i < 3; i += 1) {
    const yy = y - i * 7 - (time * 8 + i * 3) % 10;
    ctx.fillStyle = fillHex("#D8D0E0", 0.18 - i * 0.04);
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(time + i) * 3, yy, 5 + i, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paperFold(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  void width;
  void height;
}


function paperStamp(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#7A4A8A";
  ctx.fillStyle = fillHex("#7A4A8A", 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 11, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7A4A8A";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-6, -5], [-2, -7], [3, -6.5], [6.5, -4]] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, 2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function warmPool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,200,110,${a})`);
  g.addColorStop(0.55, `rgba(255,170,80,${a * 0.35})`);
  g.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function glowWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
): void {
  const flick = 0.85 + 0.15 * Math.sin(time * 3 + x * 0.1);
  ctx.fillStyle = mixHex("#F3C36A", "#FFF1C0", flick * 0.3);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fillHex("#FFF1C0", 0.28 * flick);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w * 1.1, h * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3A2C20";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w / 2 + w / 2, y + h / 2);
  ctx.stroke();
}

function pxGlowWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#F3C36A";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,240,180,0.3)";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number): void {
  ctx.save();
  ctx.fillStyle = fillHex("#120C14", a);
  ctx.beginPath();
  ctx.ellipse(x, y + 1, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
