import { fillHex, type CatPose } from "./layout.js";

export type GuestId = "kiro" | "tibo" | "poteto" | "musk";

export interface GuestPose {
  id: GuestId;
  x: number;
  y: number;
  facing: 1 | -1;
  time: number;
  scale: number;
  label: string;
}

/** Title cast placed to match the painting: Kiro mid-left, Tibo bottom-left, poteto mid-right, Musk lower-right. */
export const TITLE_CAST: readonly Omit<GuestPose, "time">[] = [
  { id: "kiro", x: 118, y: 248, facing: 1, scale: 1.05, label: "Kiro" },
  { id: "tibo", x: 72, y: 328, facing: 1, scale: 1.0, label: "Tibo" },
  { id: "poteto", x: 518, y: 268, facing: -1, scale: 1.05, label: "poteto" },
  { id: "musk", x: 560, y: 348, facing: -1, scale: 1.0, label: "马斯克" },
];

export const PLAY_CAST: readonly Omit<GuestPose, "time">[] = [
  { id: "kiro", x: 96, y: 236, facing: 1, scale: 0.95, label: "Kiro" },
  { id: "tibo", x: 58, y: 324, facing: 1, scale: 0.95, label: "Tibo" },
  { id: "poteto", x: 546, y: 252, facing: -1, scale: 0.95, label: "poteto" },
  { id: "musk", x: 590, y: 340, facing: -1, scale: 0.95, label: "马斯克" },
];

export function drawGuest(
  ctx: CanvasRenderingContext2D,
  style: "paper" | "pixel",
  pose: GuestPose,
): void {
  if (style === "paper") drawPaperGuest(ctx, pose);
  else drawPixelGuest(ctx, pose);
}

function drawPaperGuest(ctx: CanvasRenderingContext2D, pose: GuestPose): void {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  if (pose.facing === -1) ctx.scale(-1, 1);
  const s = pose.scale;
  const bob = Math.sin(pose.time * 2.2) * 0.7;
  ctx.translate(0, bob);
  shadow(ctx, 12 * s, 3.6 * s);
  if (pose.id === "kiro") paperKiro(ctx, s, pose.time);
  else if (pose.id === "tibo") paperTibo(ctx, s);
  else if (pose.id === "poteto") paperPoteto(ctx, s);
  else paperMusk(ctx, s, pose.time);
  ctx.restore();
}

function drawPixelGuest(ctx: CanvasRenderingContext2D, pose: GuestPose): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(pose.x), Math.round(pose.y));
  if (pose.facing === -1) ctx.scale(-1, 1);
  const s = pose.scale;
  const bob = Math.round(Math.sin(pose.time * 2.2));
  ctx.translate(0, bob);
  ctx.fillStyle = "rgba(8,6,12,0.4)";
  ctx.fillRect(Math.round(-10 * s), 0, Math.round(20 * s), 3);
  if (pose.id === "kiro") pixelKiro(ctx, s, pose.time);
  else if (pose.id === "tibo") pixelTibo(ctx, s);
  else if (pose.id === "poteto") pixelPoteto(ctx, s);
  else pixelMusk(ctx, s);
  ctx.restore();
}

/** Cool lilac page-repairer with cape + lantern. Original guest, not an official logo. */
function paperKiro(ctx: CanvasRenderingContext2D, s: number, time: number): void {
  // cape
  ctx.fillStyle = "#6A4A88";
  ctx.beginPath();
  ctx.moveTo(-2 * s, -18 * s);
  ctx.quadraticCurveTo(-16 * s, -6 * s, -12 * s, 2 * s);
  ctx.quadraticCurveTo(-2 * s, -2 * s, 6 * s, -8 * s);
  ctx.closePath();
  ctx.fill();
  // body
  standBody(ctx, 0, -2 * s, 8 * s, 10 * s, "#C9B8D4", "#3A3048");
  // head
  ear(ctx, -7 * s, -28 * s, 5 * s, "#C9B8D4", "#8A6AA0");
  ear(ctx, 4 * s, -28 * s, 5 * s, "#C9B8D4", "#8A6AA0");
  head(ctx, 0, -22 * s, 10 * s, 8.5 * s, "#C9B8D4", "#3A3048");
  // purple spots
  ctx.fillStyle = "#8A6AA0";
  ctx.beginPath();
  ctx.ellipse(-4 * s, -26 * s, 2.2 * s, 1.6 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(3 * s, -24 * s, 1.8 * s, 1.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 0, -23 * s, 3.2 * s, "#2A2030");
  // paper scrap
  ctx.fillStyle = "#7A4A8A";
  ctx.save();
  ctx.translate(8 * s, -30 * s);
  ctx.rotate(0.35);
  ctx.fillRect(-3 * s, 0, 6 * s, 5 * s);
  ctx.restore();
  // lantern
  handLantern(ctx, 11 * s, -8 * s, s, time);
}

function paperTibo(ctx: CanvasRenderingContext2D, s: number): void {
  // sitting loaf among pumpkins
  loaf(ctx, 0, 0, 11 * s, 8 * s, "#2A2624", "#120E0C");
  // pumpkin-hat tufts
  ctx.fillStyle = "#2A2624";
  tuft(ctx, -3 * s, -20 * s, 3 * s);
  tuft(ctx, 2 * s, -21 * s, 3.2 * s);
  ctx.fillStyle = "#C45A28";
  ctx.beginPath();
  ctx.moveTo(-1 * s, -22 * s);
  ctx.lineTo(1 * s, -26 * s);
  ctx.lineTo(3 * s, -21 * s);
  ctx.closePath();
  ctx.fill();
  ear(ctx, -7 * s, -16 * s, 4.6 * s, "#2A2624", "#4A3A38");
  ear(ctx, 4 * s, -16 * s, 4.6 * s, "#2A2624", "#4A3A38");
  head(ctx, 0, -12 * s, 9.5 * s, 8 * s, "#3A3532", "#120E0C");
  ctx.strokeStyle = "#120E0C";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-5 * s, -15.5 * s);
  ctx.lineTo(-1.2 * s, -14.8 * s);
  ctx.moveTo(1.2 * s, -14.8 * s);
  ctx.lineTo(5 * s, -15.5 * s);
  ctx.stroke();
  eyes(ctx, 0, -13 * s, 2.8 * s, "#120E0C");
}

function paperPoteto(ctx: CanvasRenderingContext2D, s: number): void {
  // purple cushion
  ctx.fillStyle = fillHex("#120C14", 0.25);
  ctx.beginPath();
  ctx.ellipse(0, 3 * s, 16 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5A3A68";
  ctx.beginPath();
  ctx.ellipse(0, 1 * s, 15 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,230,200,0.25)";
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.ellipse(0, 1 * s, 13 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  loaf(ctx, 0, -2 * s, 11 * s, 8 * s, "#F0E2C8", "#3A3028");
  ear(ctx, -7 * s, -20 * s, 4.8 * s, "#F0E2C8", "#D98890");
  ear(ctx, 4 * s, -20 * s, 4.8 * s, "#F0E2C8", "#D98890");
  head(ctx, 0, -15 * s, 10 * s, 8.5 * s, "#F0E2C8", "#3A3028");
  // closed smile eyes
  ctx.strokeStyle = "#3A3028";
  ctx.lineWidth = 1.15 * s;
  ctx.beginPath();
  ctx.arc(-3.2 * s, -16 * s, 1.7 * s, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3.2 * s, -16 * s, 1.7 * s, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // gold glasses
  ctx.strokeStyle = "#C9A227";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-3.3 * s, -15.5 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.arc(3.3 * s, -15.5 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.moveTo(-0.1 * s, -15.5 * s);
  ctx.lineTo(0.1 * s, -15.5 * s);
  ctx.stroke();
}

function paperMusk(ctx: CanvasRenderingContext2D, s: number, time: number): void {
  ctx.fillStyle = fillHex("#120C14", 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 20 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // kraft box car
  ctx.fillStyle = "#C4A574";
  rounded(ctx, -16 * s, -14 * s, 26 * s, 14 * s, 2 * s);
  ctx.fill();
  ctx.strokeStyle = "#2A2420";
  ctx.lineWidth = 1;
  rounded(ctx, -16 * s, -14 * s, 26 * s, 14 * s, 2 * s);
  ctx.stroke();
  // paw print
  ctx.fillStyle = "#7A5A38";
  ctx.beginPath();
  ctx.ellipse(-2 * s, -7 * s, 3.2 * s, 2.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-5, -11], [-1, -12], [3, -11], [5.5, -9]] as const) {
    ctx.beginPath();
    ctx.ellipse(dx * s, dy * s, 1.2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // wheels
  ctx.fillStyle = "#5A4030";
  ctx.beginPath();
  ctx.arc(-9 * s, 1 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.arc(7 * s, 1 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();
  // tiny origami rocket
  ctx.fillStyle = "#F4EDE0";
  ctx.beginPath();
  ctx.moveTo(-16 * s, -22 * s);
  ctx.lineTo(-10 * s, -10 * s);
  ctx.lineTo(-22 * s, -10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const flame = 0.55 + 0.45 * Math.sin(time * 8);
  ctx.fillStyle = fillHex("#E87A3A", flame);
  ctx.beginPath();
  ctx.moveTo(-16 * s, -10 * s);
  ctx.lineTo(-18.5 * s, -3 * s);
  ctx.lineTo(-13.5 * s, -10 * s);
  ctx.fill();
  // tan cat
  head(ctx, 2 * s, -20 * s, 7.5 * s, 6.5 * s, "#D2B48C", "#3A3028");
  ear(ctx, -3 * s, -26 * s, 3.4 * s, "#D2B48C", "#C08078");
  ear(ctx, 5 * s, -26 * s, 3.4 * s, "#D2B48C", "#C08078");
  eyes(ctx, 2 * s, -20.5 * s, 2.4 * s, "#3A3028");
}

function pixelKiro(ctx: CanvasRenderingContext2D, s: number, time: number): void {
  const u = Math.max(2, Math.round(2.6 * s));
  ctx.fillStyle = "#6A4A88";
  ctx.fillRect(-u * 4, -u * 5, u * 3, u * 6);
  ctx.fillStyle = "#C9B8D4";
  ctx.fillRect(-u * 3, -u * 4, u * 6, u * 5);
  ctx.fillRect(-u * 3, -u * 8, u * 6, u * 4);
  ctx.fillStyle = "#8A6AA0";
  ctx.fillRect(-u * 3, -u * 10, u * 2, u * 2);
  ctx.fillRect(u, -u * 10, u * 2, u * 2);
  ctx.fillRect(-u * 2, -u * 9, u, u);
  ctx.fillStyle = "#2A2030";
  ctx.fillRect(-u * 2, -u * 7, u, u);
  ctx.fillRect(u, -u * 7, u, u);
  ctx.fillStyle = "#E8B45A";
  const jab = Math.round(Math.sin(time * 4));
  ctx.fillRect(u * 3 + jab, -u * 4, u * 3, u * 3);
}

function pixelTibo(ctx: CanvasRenderingContext2D, s: number): void {
  const u = Math.max(2, Math.round(2.6 * s));
  ctx.fillStyle = "#2A2624";
  ctx.fillRect(-u * 3, -u * 4, u * 6, u * 5);
  ctx.fillRect(-u * 3, -u * 7, u * 6, u * 3);
  ctx.fillRect(-u, -u * 10, u, u * 2);
  ctx.fillRect(u, -u * 11, u, u * 3);
  ctx.fillStyle = "#C45A28";
  ctx.fillRect(0, -u * 12, u, u * 2);
  ctx.fillStyle = "#120E0C";
  ctx.fillRect(-u * 3, -u * 7, u * 2, u);
  ctx.fillRect(u, -u * 7, u * 2, u);
  ctx.fillRect(-u * 2, -u * 5, u, u);
  ctx.fillRect(u, -u * 5, u, u);
}

function pixelPoteto(ctx: CanvasRenderingContext2D, s: number): void {
  const u = Math.max(2, Math.round(2.6 * s));
  ctx.fillStyle = "#5A3A68";
  ctx.fillRect(-u * 5, 0, u * 10, u * 2);
  ctx.fillStyle = "#F0E2C8";
  ctx.fillRect(-u * 3, -u * 4, u * 6, u * 5);
  ctx.fillRect(-u * 3, -u * 8, u * 6, u * 4);
  ctx.fillStyle = "#D98890";
  ctx.fillRect(-u * 3, -u * 10, u * 2, u * 2);
  ctx.fillRect(u, -u * 10, u * 2, u * 2);
  ctx.fillStyle = "#C9A227";
  ctx.fillRect(-u * 3, -u * 7, u * 2, u);
  ctx.fillRect(u, -u * 7, u * 2, u);
}

function pixelMusk(ctx: CanvasRenderingContext2D, s: number): void {
  const u = Math.max(2, Math.round(2.6 * s));
  ctx.fillStyle = "#C4A574";
  ctx.fillRect(-u * 5, -u * 4, u * 8, u * 4);
  ctx.fillStyle = "#7A5A38";
  ctx.fillRect(-u * 2, -u * 3, u * 3, u * 2);
  ctx.fillStyle = "#5A4030";
  ctx.fillRect(-u * 4, 0, u * 2, u);
  ctx.fillRect(u, 0, u * 2, u);
  ctx.fillStyle = "#F4EDE0";
  ctx.fillRect(-u * 6, -u * 7, u * 3, u * 3);
  ctx.fillStyle = "#D2B48C";
  ctx.fillRect(-u * 1, -u * 7, u * 4, u * 3);
}

function standBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  ink: string,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.35, w, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // legs
  rounded(ctx, x - w * 0.55, y - h * 0.1, w * 0.4, h * 0.55, 1.5);
  ctx.fill();
  rounded(ctx, x + w * 0.15, y - h * 0.1, w * 0.4, h * 0.55, 1.5);
  ctx.fill();
}

function loaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  ink: string,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.55, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function head(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  ink: string,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - gap * 0.55, y, Math.max(0.9, gap * 0.22), 0, Math.PI * 2);
  ctx.arc(x + gap * 0.55, y, Math.max(0.9, gap * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

function ear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  fill: string,
  inner: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x + s * 0.6, y - s * 0.2);
  ctx.lineTo(x + s * 1.3, y + s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2A2420";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.35, y + s * 0.7);
  ctx.lineTo(x + s * 0.6, y + s * 0.15);
  ctx.lineTo(x + s * 0.95, y + s * 0.7);
  ctx.fill();
}

function tuft(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x + s * 0.3, y);
  ctx.lineTo(x + s * 0.7, y + s);
  ctx.fill();
}

function handLantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, time: number): void {
  const flick = 0.8 + 0.2 * Math.sin(time * 7);
  const g = ctx.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 14 * s);
  g.addColorStop(0, `rgba(255,220,140,${0.35 * flick})`);
  g.addColorStop(1, "rgba(255,220,140,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 8 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3A2C20";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 10 * s);
  ctx.stroke();
  ctx.fillStyle = "#E8B45A";
  rounded(ctx, x - 4 * s, y - 18 * s, 8 * s, 8 * s, 1.5 * s);
  ctx.fill();
  ctx.fillStyle = `rgba(255,245,200,${0.55 * flick})`;
  ctx.fillRect(x - 2 * s, y - 15 * s, 4 * s, 4 * s);
}

function shadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = fillHex("#120C14", 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 2, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

export function withTime(cast: readonly Omit<GuestPose, "time">[], time: number): GuestPose[] {
  return cast.map((g) => ({ ...g, time }));
}

/** Used so TypeScript keeps CatPose imported in files that re-export poses. */
export type CastAnchor = Pick<CatPose, "x" | "y">;
