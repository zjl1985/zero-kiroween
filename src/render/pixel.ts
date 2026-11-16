import { drawMascot, fillHex, type CatPose } from "./layout.js";

export function drawPixelCat(ctx: CanvasRenderingContext2D, pose: CatPose): void {
  drawMascot(ctx, pose, { smooth: false, crisp: true });
}

export function drawPixelBlob(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const s = 2;
  const bob = Math.round(Math.sin(time * 2.2));
  const ox = Math.round(x - 8 * s);
  const oy = Math.round(y - 7 * s + bob);
  const cells = [
    "..............",
    "....KKKKKK....",
    "...KPPPPPPK...",
    "..KPPHHHPPPK..",
    "..KPHKHHKPPK..",
    "..KPPHHHPPPK..",
    "...KPPPPPPK...",
    "....KK.KKK....",
    "..............",
  ];
  for (let row = 0; row < cells.length; row += 1) {
    const line = cells[row]!;
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col]!;
      if (ch === ".") continue;
      ctx.fillStyle = ch === "K" ? "#3A2048" : ch === "H" ? "#A070C8" : "#6A3A88";
      ctx.fillRect(ox + col * s, oy + row * s, s, s);
    }
  }
  ctx.fillStyle = "#F4E8C0";
  ctx.fillRect(ox + 6 * s, oy + 4 * s, s, s);
  ctx.fillRect(ox + 10 * s, oy + 4 * s, s, s);
  ctx.fillStyle = "#E8C0F0";
  ctx.fillRect(ox + 13 * s, oy + 1 * s, s, s);
  ctx.fillRect(ox + 1 * s, oy + 6 * s, s, s);
  ctx.restore();
}

export function drawPixelShot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const len = 10;
  const d = Math.hypot(vx, vy) || 1;
  const nx = vx / d;
  const ny = vy / d;
  ctx.strokeStyle = "#2A1C28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.round(x - nx * len), Math.round(y - ny * len));
  ctx.lineTo(Math.round(x + nx * 2), Math.round(y + ny * 2));
  ctx.stroke();
  ctx.restore();
}

export function drawPixelStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  ink: number,
  blank: boolean,
  thickness: number,
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (blank) {
    ctx.strokeStyle = fillHex("#FBF7F0", 0.95);
    ctx.lineWidth = thickness * 2;
    ctx.lineJoin = "miter";
    path(ctx, points, true);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.strokeStyle = fillHex("#6A5A4A", 0.25 + ink * 0.55);
  ctx.lineWidth = 3;
  ctx.setLineDash([3, 3]);
  path(ctx, points, true);
  ctx.stroke();
  ctx.restore();
}

function path(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], snap: boolean): void {
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = snap ? Math.round(p.x) : p.x;
    const y = snap ? Math.round(p.y) : p.y;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

export function drawPixelBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#E6D9C4";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.globalCompositeOperation = "multiply";
  const tile = 128;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) ctx.drawImage(grain, x, y, tile, tile);
  }
  ctx.restore();
  ctx.strokeStyle = "#2A1C28";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = "#C9B8A0";
  for (let y = 28; y < height - 24; y += 28) {
    ctx.fillRect(14, y, 6, 6);
  }
}
