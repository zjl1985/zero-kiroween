import {
  piece,
  path,
  oval,
  stroke,
  line,
  glow,
  shadow,
  type Ctx,
} from "./paper-material.js";
export function drawCraftBlob(
  ctx: Ctx,
  x: number,
  y: number,
  time: number,
  id = 0,
  hp = 3,
  slowed = false,
  spawnTime = 0,
): void {
  if (spawnTime > 0) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    stroke(ctx, oval(x, y, 7 + (0.65 - spawnTime) * 15, 3), "#9d7ca9", 1);
    ctx.restore();
    return;
  }
  shadow(ctx, x, y, 14, 4);
  const cy = y - 9 + Math.sin(time * 3 + id) * 1;
  for (let i = 0; i < 2; i++) {
    const dx = i ? 6 : -6,
      p = new Path2D(
        `M ${x + dx} ${cy - 4} Q ${x + dx - 7} ${cy - 15} ${x + dx + 1} ${cy - 21} Q ${x + dx + 7} ${cy - 29} ${x + dx + 3} ${cy - 33} Q ${x + dx + 14} ${cy - 22} ${x + dx + 6} ${cy - 13} Q ${x + dx + 1} ${cy - 8} ${x + dx + 7} ${cy - 3} Z`,
      );
    ctx.save();
    ctx.globalAlpha = 0.45;
    piece(ctx, p, "#9271a7", {
      shadow: 0,
      texture: 0.8,
      edge: "#b798c4",
      thickness: 0.5,
    });
    ctx.restore();
  }
  const p = new Path2D(
    `M ${x - 16} ${cy + 9} Q ${x - 11} ${cy + 4} ${x - 12} ${cy - 1} Q ${x - 9} ${cy - 15} ${x + 1} ${cy - 13} Q ${x + 13} ${cy - 14} ${x + 13} ${cy + 3} L ${x + 18} ${cy + 10} Q ${x + 11} ${cy + 7} ${x + 6} ${cy + 9} Q ${x - 4} ${cy + 6} ${x - 16} ${cy + 9} Z`,
  );
  piece(ctx, p, "#3b2d49", {
    shadow: 2,
    edge: "#795879",
    texture: 0.8,
    thickness: 1,
  });
  for (const dx of [-5, 5]) {
    glow(ctx, x + dx, cy - 1, 5, "#e6ab63", 0.2);
    piece(ctx, oval(x + dx, cy - 1, 1.6, 2), "#f0c16d", {
      shadow: 0,
      texture: 0.3,
      edge: "#d3944e",
      thickness: 0.3,
    });
  }
  if (slowed)
    stroke(
      ctx,
      new Path2D(`M ${x - 7} ${y + 3} Q ${x} ${y + 6} ${x + 7} ${y + 3}`),
      "#b5c9d6",
      1,
    );
  if (hp < 3) {
    line(ctx, x - 10, y + 7, x + 10, y + 7, "#433b4a", 1.5);
    line(ctx, x - 10, y + 7, x - 10 + (hp / 3) * 20, y + 7, "#b69ac4", 1.5);
  }
}
export function drawCraftShot(
  ctx: Ctx,
  x: number,
  y: number,
  vx: number,
  vy: number,
  empowered = false,
  echo = false,
): void {
  const d = Math.hypot(vx, vy) || 1,
    nx = vx / d,
    ny = vy / d,
    warm = echo ? "#a9d4e4" : "#ffce7d",
    tail = echo ? "#6f9fb8" : "#d49452",
    core = echo ? "#e4f4f6" : "#ffe3a2";
  glow(ctx, x, y, empowered ? 13 : 9, warm, empowered ? 0.3 : 0.22);
  line(
    ctx,
    x - nx * 19,
    y - ny * 19,
    x,
    y,
    tail,
    empowered ? 1.5 : 1,
    0.7,
  );
  line(ctx, x - nx * 10, y - ny * 10, x, y, core, empowered ? 1.5 : 1.1);
  ctx.fillStyle = echo ? "#f2fbfb" : "#fff1c6";
  ctx.fill(oval(x, y, 1.8, 1.8));
}
/** A paper-moon crescent with cut edge, thickness and contact shadow. */
export function crescent(cx: number, cy: number, r: number, rot: number): Path2D {
  const pts: [number, number][] = [],
    c = Math.cos(rot),
    s = Math.sin(rot),
    put = (x: number, y: number) =>
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  for (let a = -2.3; a <= 2.3; a += 0.23) put(Math.cos(a) * r, Math.sin(a) * r);
  for (let b = 1.97; b >= -1.97; b -= 0.25)
    put(-0.35 * r + Math.cos(b) * 0.81 * r, Math.sin(b) * 0.81 * r);
  return path(pts);
}
export function drawInkShard(
  ctx: Ctx,
  x: number,
  y: number,
  time: number,
  id: number,
  value = 1,
): void {
  const r = 4.6 + Math.min(3, value - 1) * 0.9,
    lift = 8 + Math.sin(time * 4 + id * 1.7) * 1.6,
    rot = -0.5 + Math.sin(time * 1.6 + id) * 0.35;
  shadow(ctx, x, y, r * 0.9, r * 0.32);
  glow(ctx, x, y - lift, r * 3.2, "#f3cf82", 0.28);
  piece(ctx, crescent(x, y - lift, r, rot), "#ecc879", {
    shadow: 1.2,
    edge: "#fff0c2",
    texture: 0.5,
    thickness: 0.6,
  });
  // An ink speck caught in the paper moon.
  ctx.fillStyle = "#3b2d49";
  ctx.fill(oval(x + Math.cos(rot) * r * 0.55, y - lift + Math.sin(rot) * r * 0.55, 0.9, 0.9));
}
