import { drawMascot, type CatPose } from "./layout.js";
import { ellipse, line, rect, light, hash, type Ctx } from "./pixel-art.js";
export function drawPixelCat(ctx: Ctx, pose: CatPose): void {
  drawMascot(ctx, pose);
}
export function drawPixelBlob(
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
    const r = 5 + (0.65 - spawnTime) * 18;
    ellipse(ctx, x, y, r, 3, "#66517e");
    line(ctx, x - r, y, x + r, y, "#ad86ba");
    return;
  }
  x = Math.round(x);
  y = Math.round(y);
  ellipse(ctx, x, y + 1, 15, 4, "#142831");
  const bob = Math.round(Math.sin(time * 4 + id) * 1.5),
    cy = y - 7 + bob;
  // An ink creature has a grounded body, tapered points and animated wisps.
  light(ctx, x, cy, 24, "#9a6ad1", 0.08, 0.7);
  for (let i = 0; i < 3; i++) {
    const phase = (time * 12 + i * 7 + id * 3) % 24;
    const xx = x + Math.sin(phase * 0.15 + i) * 9,
      yy = cy - 6 - phase;
    ctx.save();
    ctx.globalAlpha = (1 - phase / 25) * 0.45;
    rect(ctx, xx, yy, 2 + (i % 2), 5, "#9271b4");
    rect(ctx, xx - 1, yy + 3, 2, 3, "#5b467c");
    ctx.restore();
  }
  ellipse(ctx, x, cy, 12, 10, "#242437");
  ellipse(ctx, x - 1, cy - 1, 10, 8, "#443555");
  ellipse(ctx, x + 3, cy - 5, 6, 4, "#654a79");
  rect(ctx, x - 14, cy + 5, 6, 3, "#332b44");
  rect(ctx, x + 9, cy + 5, 6, 3, "#332b44");
  line(ctx, x - 8, cy - 6, x - 3, cy - 10, "#8c6499");
  rect(ctx, x + 3, cy - 9, 4, 1, "#8f6b9e");
  rect(ctx, x - 6, cy - 2, 3, 4, "#f4bc59");
  rect(ctx, x + 4, cy - 2, 3, 4, "#f4bc59");
  rect(ctx, x - 5, cy - 2, 1, 2, "#fff0b0");
  rect(ctx, x + 5, cy - 2, 1, 2, "#fff0b0");
  if (slowed) {
    line(ctx, x - 7, y + 4, x + 7, y + 4, "#9ec7dc");
    rect(ctx, x - 8, y + 2, 2, 2, "#b6daec");
    rect(ctx, x + 7, y + 2, 2, 2, "#b6daec");
  }
  if (hp < 3) {
    rect(ctx, x - 10, y + 6, 20, 2, "#263039");
    rect(ctx, x - 10, y + 6, (20 * hp) / 3, 2, "#b98cc3");
  }
}
export function drawPixelShot(
  ctx: Ctx,
  x: number,
  y: number,
  vx: number,
  vy: number,
  empowered = false,
): void {
  const d = Math.hypot(vx, vy) || 1,
    nx = vx / d,
    ny = vy / d;
  light(ctx, x, y, empowered ? 20 : 12, "#ffc773", empowered ? 0.3 : 0.22, 1);
  if (empowered) {
    line(
      ctx,
      x - nx * 22 - ny * 2,
      y - ny * 22 + nx * 2,
      x - ny * 2,
      y + nx * 2,
      "#b59152",
    );
    line(
      ctx,
      x - nx * 14 + ny * 2,
      y - ny * 14 - nx * 2,
      x + ny * 2,
      y - nx * 2,
      "#eac889",
    );
  }
  line(ctx, x - nx * 15, y - ny * 15, x, y, "#b77744");
  line(ctx, x - nx * 8, y - ny * 8, x, y, "#edb76c", 2);
  rect(ctx, x - 1, y - 1, 3, 3, "#fff0bb");
}
export function drawPixelStroke(
  ctx: Ctx,
  points: { x: number; y: number }[],
  ink: number,
  blank: boolean,
  _thickness: number,
  time: number,
): void {
  // Rune markers are embedded in the lawn, instead of a conspicuous scribble over the scene.
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const glow = blank ? 0.12 : 0.1 + ink * 0.1;
    light(ctx, p.x, p.y, 14, blank ? "#9a81b6" : "#aec2a0", glow, 0.4);
    const c = blank ? "#746184" : ink > 0.5 ? "#91a78a" : "#607267";
    line(ctx, p.x - 4, p.y, p.x, p.y - 3, c);
    line(ctx, p.x, p.y - 3, p.x + 4, p.y, c);
    line(ctx, p.x + 4, p.y, p.x, p.y + 3, c);
    line(ctx, p.x, p.y + 3, p.x - 4, p.y, c);
    rect(ctx, p.x, p.y - 1, 1, 2, blank ? "#a48bc0" : "#bed0a1");
    if (blank) {
      const phase = (time + i) % 2;
      rect(ctx, p.x + Math.sin(i * 2) * 5, p.y - phase * 7, 1, 1, "#957bac");
    }
  }
}
export function drawImpact(
  ctx: Ctx,
  impact: { x: number; y: number; life: number; kind: "hit" | "defeat" },
): void {
  const duration = impact.kind === "hit" ? 0.16 : 0.32,
    progress = 1 - impact.life / duration;
  light(
    ctx,
    impact.x,
    impact.y,
    impact.kind === "hit" ? 18 : 26,
    "#ffc373",
    (1 - progress) * 0.35,
    1,
  );
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  const count = impact.kind === "hit" ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2,
      r = 4 + progress * (impact.kind === "hit" ? 18 : 29);
    const x = impact.x + Math.cos(a) * r,
      y = impact.y + Math.sin(a) * r * 0.7;
    const c = impact.kind === "hit" ? "#ffe4a0" : i % 2 ? "#c399cb" : "#eac491";
    line(ctx, x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, c);
    if (i % 3 === 0) rect(ctx, x, y, 2, 2, "#fff1c0");
  }
  if (progress < 0.4) {
    line(ctx, impact.x - 5, impact.y, impact.x + 5, impact.y, "#fff1c0");
    line(ctx, impact.x, impact.y - 6, impact.x, impact.y + 6, "#fff1c0");
  }
  ctx.restore();
}
export function drawFootDust(ctx: Ctx, pose: CatPose): void {
  if (!pose.moving && !pose.dashing) return;
  const phase = (pose.time * 5) % 1;
  for (let i = 0; i < 3; i++) {
    const x = pose.x - pose.facing * (7 + phase * 10 + i * 4),
      y = pose.y - i + hash(i) * 3;
    ctx.save();
    ctx.globalAlpha = (1 - phase) * 0.24;
    rect(ctx, x, y, 2 + (i % 2), 1, "#b4a582");
    ctx.restore();
  }
}
