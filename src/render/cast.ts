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

/** Pixel-only guest studies. No runtime assist is implied by these drawings. */
export function drawGuest(
  ctx: CanvasRenderingContext2D,
  pose: GuestPose,
): void {
  ctx.save();
  ctx.translate(Math.round(pose.x), Math.round(pose.y));
  ctx.scale(pose.facing, 1);
  if (pose.id === "kiro") pixelKiro(ctx, pose.scale, pose.time);
  else if (pose.id === "tibo") pixelTibo(ctx, pose.scale);
  else if (pose.id === "poteto") pixelPoteto(ctx, pose.scale);
  else pixelMusk(ctx, pose.scale);
  ctx.restore();
}
function pixelKiro(
  ctx: CanvasRenderingContext2D,
  s: number,
  time: number,
): void {
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
