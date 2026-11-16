import { jitter } from "./hash.js";
import { drawMascot, fillHex, type CatPose } from "./layout.js";

const PAPER = "#F6F0E4";
const CHARCOAL = "#2A2420";

export function drawPaperCat(ctx: CanvasRenderingContext2D, pose: CatPose): void {
  drawMascot(ctx, pose, { smooth: false, crisp: false });
}

export function drawPaperBlob(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, id: number): void {
  ctx.save();
  const bob = Math.sin(time * 2.2 + id) * 1.5;
  const cy = y + bob;
  // soft purple glow
  const glow = ctx.createRadialGradient(x, cy, 0, x, cy, 18);
  glow.addColorStop(0, "rgba(160,100,210,0.35)");
  glow.addColorStop(1, "rgba(160,100,210,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  // sparkly ink body
  ctx.fillStyle = fillHex("#6A3A88", 0.92);
  ctx.strokeStyle = "#3A2048";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const j = jitter(id + 4, i, 2.2);
    const r = 8 + j.x + Math.sin(time * 1.5 + i) * 0.5;
    const px = x + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r * 0.85;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // highlight + eyes
  ctx.fillStyle = fillHex("#C9A0E0", 0.35);
  ctx.beginPath();
  ctx.ellipse(x - 2, cy - 3, 3.5, 2.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fillHex("#F4E8C0", 0.95);
  ctx.beginPath();
  ctx.arc(x - 2.8, cy - 1, 1.35, 0, Math.PI * 2);
  ctx.arc(x + 3.0, cy - 0.5, 1.35, 0, Math.PI * 2);
  ctx.fill();
  // sparkles
  ctx.fillStyle = fillHex("#E8C0F0", 0.8);
  ctx.fillRect(x + 7, cy - 7, 1.6, 1.6);
  ctx.fillRect(x - 9, cy + 2, 1.4, 1.4);
  ctx.fillRect(x + 2, cy + 8, 1.2, 1.2);
  ctx.restore();
}

export function drawPaperShot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
): void {
  const d = Math.hypot(vx, vy) || 1;
  const nx = vx / d;
  const ny = vy / d;
  ctx.save();
  ctx.strokeStyle = CHARCOAL;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - nx * 11, y - ny * 11);
  ctx.lineTo(x + nx * 2, y + ny * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPaperStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  ink: number,
  blank: boolean,
  thickness: number,
): void {
  if (points.length < 2) return;
  ctx.save();
  if (blank) {
    ctx.strokeStyle = fillHex("#FFFbf5", 0.95);
    ctx.lineWidth = thickness * 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i]!.x, points[i]!.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.strokeStyle = fillHex("#5A5048", 0.16 + ink * 0.32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const passes = 2;
  for (let p = 0; p < passes; p += 1) {
    ctx.lineWidth = 1.0 + p * 0.25;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const j = jitter(33 + p, i, 1.1);
      const x = pt.x + j.x;
      const y = pt.y + j.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grain: CanvasImageSource,
): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.globalCompositeOperation = "multiply";
  const tile = 256;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) ctx.drawImage(grain, x, y, tile, tile);
  }
  ctx.restore();

  ctx.strokeStyle = fillHex("#2A2420", 0.18);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 16, width - 36, height - 32);

  ctx.fillStyle = fillHex("#2A2420", 0.12);
  for (let i = 0; i < 6; i += 1) {
    const y = 48 + i * ((height - 90) / 5);
    ctx.beginPath();
    ctx.arc(28, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
