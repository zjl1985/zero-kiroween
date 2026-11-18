import {
  piece,
  path,
  oval,
  stroke,
  line,
  glow,

  type Ctx,
} from "./paper-material.js";
import { cachedSprite } from "../engine/sprite.js";
import { foldLine } from "./paper-kit.js";
import { enemyPart, enemyShadow } from "./craft-enemies.js";

/** Static weapon cuts: placement, rotation and flight never participate in the key. */
export function combatPart(key: string, w: number, h: number, paint: (ctx: Ctx) => void) {
  return cachedSprite(`combat-part:${key}`, w, h, 2, (ctx) => {
    ctx.translate(w / 2, h / 2);
    paint(ctx);
  }, { x: 0.5, y: 0.5 });
}
export function paperFleck(ctx: Ctx, x: number, y: number, size: number, color: string, angle = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  combatPart(`fleck:${color}`, 16, 16, (c) => {
    piece(c, path([[-4, -1.6], [0.8, -3.2], [4, 0.4], [-0.8, 2.8]]), color, { shadow: 0.4, texture: 0.3, thickness: 0.45 });
    foldLine(c, -3, -1, 2.7, 0.7, 0.4);
  }).draw(ctx, { x: 0, y: 0, scale: size / 4 });
  ctx.restore();
}
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
  enemyShadow(ctx, x, y, 14, 4);
  const cy = y - 9 + Math.sin(time * 3 + id), v = Math.abs(id) % 3;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.globalAlpha *= 0.42;
    ctx.translate(x + side * 6, cy - 13);
    ctx.rotate(side * 0.12 + Math.sin(time * 2 + id) * 0.08);
    enemyPart("ink-ribbon", 24, 42, (c) => {
      piece(c, new Path2D("M -3 12 Q -10 1 -2 -6 Q 4 -12 0 -18 Q 12 -10 5 -1 Q -1 4 4 12 Z"), "#806b96", { shadow: 0, edge: "#b29bc5", texture: 0.45, thickness: 0.6 });
      foldLine(c, 0, 7, 2, -6, 0.4);
    }).draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  }
  enemyPart(`ink-body:${v}`, 52, 44, (c) => {
    const cut = new Path2D([
      "M -16 9 L -12 2 Q -13 -8 -6 -12 L 1 -14 Q 12 -15 13 2 L 18 10 L 8 7 L 2 10 L -5 7 Z",
      "M -17 8 L -12 0 L -10 -9 L -3 -15 L 4 -12 Q 12 -10 13 2 L 17 9 L 7 6 L 0 11 L -6 7 Z",
      "M -16 10 L -13 1 Q -14 -6 -8 -9 L -2 -16 L 3 -12 L 10 -8 L 13 2 L 17 10 L 5 8 L 0 10 L -7 6 Z",
    ][v]!);
    piece(c, cut, "#3b2d49", { shadow: 1.5, edge: "#a38ab1", texture: 0.55, thickness: 1.1 });
    c.save(); c.clip(cut);
    c.fillStyle = "#745b81";
    c.fill(path([[-12, 3], [-6, -12], [1, -14], [1 + v, -3], [-5, 7]]));
    c.fillStyle = "#281e36";
    c.fill(path([[1, -14], [9, -8], [13, 2], [18, 10], [3, 5]]));
    foldLine(c, -6, -10, -2 + v, 3, 0.78);
    c.restore();
    for (const dx of [-5, 5]) {
      piece(c, oval(dx, -1, 1.6, 2), "#f0c16d", { shadow: 0, texture: 0.15, edge: "#ffe1a0", thickness: 0.4 });
    }
    if (v === 1) {
      line(c, -7, -5, -3, -3, "#d6b1bf", 0.65);
      line(c, 3, -3, 7, -5, "#d6b1bf", 0.65);
    }
    stroke(c, new Path2D(v === 2 ? "M -3 4 Q 0 1 3 4" : "M -3 3 Q 0 6 3 3"), "#b595ad", 0.65);
  }).draw(ctx, { x, y: cy });
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
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));
  combatPart(`meowline:${echo ? 1 : 0}:${empowered ? 1 : 0}`, 64, 28, (c) => {
    const color = echo ? "#a9d4e4" : "#efc37a", core = echo ? "#edf8f3" : "#fff0bd";
    glow(c, 0, 0, empowered ? 13 : 9, color, 0.2);
    c.save(); c.globalAlpha = 0.4;
    piece(c, path([[-26, -1.8], [-9, -3], [3, 0], [-11, 2]]), color, { shadow: 0, texture: 0.2, thickness: 0.4 });
    c.restore();
    piece(c, path([[-15, 0], [-5, -2.4], [4, 0], [-5, 2.4]]), color, { shadow: 0.5, edge: core, texture: 0.3, thickness: 0.65 });
    line(c, -10, -0.5, 2, 0, core, 0.8);
    if (empowered) {
      line(c, -19, -5, -6, -4, color, 0.8, 0.65);
      line(c, -23, 4, -10, 3, core, 0.65, 0.55);
    }
  }).draw(ctx, { x: 0, y: 0 });
  ctx.restore();
}
/** A brief clipped-paper impact, keeping the centre open enough to read the target. */
export function drawPaperImpact(ctx: Ctx, impact: { x: number; y: number; life: number; kind: "hit" | "defeat" }): void {
  const defeat = impact.kind === "defeat", t = Math.max(0, Math.min(1, 1 - impact.life / (defeat ? 0.32 : 0.16))),
    count = defeat ? 8 : 5, reach = defeat ? 26 : 16;
  ctx.save();
  ctx.globalAlpha *= 1 - t;
  glow(ctx, impact.x, impact.y, defeat ? 24 : 15, "#f0c47d", 0.2 * (1 - t));
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + 0.2, r = 4 + t * reach;
    paperFleck(ctx, impact.x + Math.cos(a) * r, impact.y + Math.sin(a) * r * 0.65,
      (defeat ? 2.9 : 2) * (1 - t * 0.5), i % 2 ? "#e1b477" : "#f6e3b6", a + t);
  }
  ctx.restore();
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
  enemyShadow(ctx, x, y, r * 0.9, r * 0.32);
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.rotate(rot);
  combatPart("pickup-moon", 40, 40, (c) => {
    glow(c, 0, 0, 16, "#f3cf82", 0.22);
    piece(c, crescent(0, 0, 5, 0), "#ecc879", { shadow: 1, edge: "#fff0c2", texture: 0.4, thickness: 0.6 });
    c.fillStyle = "#3b2d49";
    c.fill(oval(2.75, 0, 0.9, 0.9));
  }).draw(ctx, { x: 0, y: 0, scale: r / 5 });
  ctx.restore();
}
