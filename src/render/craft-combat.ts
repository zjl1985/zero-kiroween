import {
  piece,
  path,
  oval,
  stroke,
  line,
  glow,
  hash,
  type Ctx,
  type Point,
} from "./paper-material.js";
import { cachedSprite } from "../engine/sprite.js";
import { crease, flatLayer, foldLine } from "./paper-kit.js";
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
/** The soaked paper sheet of an ink blob, its feathered bleed, the stain and its wet core (finite variants). */
function inkBlobSheet(v: number) {
  return enemyPart(`ink-soak:${v}`, 56, 52, (c) => {
    // Paper slumped under the ink: a torn foot spreads on the ground.
    const sheet: Point[] = [];
    for (let i = 0; i < 18; i++) {
      const a = Math.PI + (i / 17) * Math.PI,
        rr = 15.5 + (hash(v * 31 + i) - 0.5) * 2.4;
      sheet.push([Math.cos(a) * rr * 1.08, -2 + Math.sin(a) * rr * (0.92 + v * 0.04)]);
    }
    for (let i = 0; i <= 8; i++) sheet.push([17.5 - i * 4.4, 9 + (i % 2 ? 2.4 : -0.2) + (hash(v * 7 + i) - 0.5) * 1.6]);
    flatLayer(c, { shape: path(sheet), color: "#d9ccb2", rim: "#fff3dc", texture: 0.55, lift: 1.1, thickness: 1.1 });
    const cut = path(sheet);
    c.save();
    c.clip(cut);
    // Capillary bleed: a translucent fringe of fine ink spikes soaking outward.
    const bleed: Point[] = [], stain: Point[] = [];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2,
        wob = 1 + Math.sin(a * 3 + v * 2) * 0.08 + (hash(v * 97 + i) - 0.5) * 0.1,
        spike = i % 2 ? 1 + hash(v * 13 + i) * 0.22 : 0.94;
      bleed.push([Math.cos(a) * 15.6 * wob * spike, -3 + Math.sin(a) * 14.4 * wob * spike]);
      stain.push([Math.cos(a) * 13.4 * wob, -3.6 + Math.sin(a) * 12.2 * wob]);
    }
    c.globalAlpha = 0.55;
    c.fillStyle = "#5a4c78";
    c.fill(path(bleed));
    c.globalAlpha = 1;
    c.fillStyle = "#2b2442";
    c.fill(path(stain, true));
    // The wettest ink pools low and toward the shadow side.
    c.fillStyle = "#17121f";
    c.fill(oval(-2.4, 0.5, 8.6, 7.4, v + 3, 0.22));
    // Drips running down the sheet and off its foot.
    for (const [dx, len] of [[-9 + v, 9], [4 - v, 7], [11, 5]] as const) {
      c.fill(new Path2D(`M ${dx - 1.4} 2 L ${dx - 1} ${2 + len} Q ${dx} ${4 + len} ${dx + 1} ${2 + len} L ${dx + 1.4} 2 Z`));
    }
    // Damp paper sheen: the moon catches the swollen top-right of the soaked sheet.
    c.globalAlpha = 0.5;
    c.strokeStyle = "#8f80b3";
    c.lineWidth = 1.1;
    c.stroke(new Path2D("M 2 -14 Q 9 -13 12 -6"));
    c.globalAlpha = 1;
    c.restore();
    // One crease where the wet sheet buckled, lit from the moon.
    crease(c, -11, 6, -3, -11, 0.5);
    for (const dx of [-5, 5]) flatLayer(c, { shape: oval(dx, -3.5, 1.9, 2.3), color: "#f0c16d", rim: "#ffe1a0", lift: 0.3, texture: 0.1 });
    stroke(c, new Path2D(v === 2 ? "M -3 2 Q 0 -1 3 2" : "M -3.5 1 L -1.5 2.6 L 0 1.2 L 1.5 2.6 L 3.5 1"), "#d6c8e6", 0.7, 0.85);
  });
}
/** A separate ink splash on the ground beside the blob (finite variants). */
function inkSpot(v: number) {
  return enemyPart(`ink-spot:${v}`, 22, 14, (c) => {
    flatLayer(c, { shape: oval(0, 0, 5 + v, 2.6, v + 41, 0.4), color: "#241d36", rim: "#5d4f80", lift: 0, texture: 0.3 });
  });
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
  enemyShadow(ctx, x + 1, y, 15, 4.2);
  const v = Math.abs(id) % 3, beat = Math.sin(time * 3 + id),
    cy = y - 9 + beat * 0.8;
  inkSpot(v).draw(ctx, { x: x + (v - 1) * 9 + 11, y: y + 2 });
  // The soaked sheet sags and swells; feet stay on the ground.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + beat * 0.035, 1 - beat * 0.045);
  ctx.translate(-x, -y);
  inkBlobSheet(v).draw(ctx, { x, y: cy });
  ctx.restore();
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
