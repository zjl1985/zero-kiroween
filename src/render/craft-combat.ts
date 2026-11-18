import {
  piece,
  path,
  oval,
  stroke,
  line,
  glow,
  mix,
  type Ctx,
} from "./paper-material.js";
import { PAPER_VALUE } from "./paper-rules.js";
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
/**
 * A player shot cut: a dark paper outline, then one solid flat colour (no
 * glow, no translucency), so shots read against ground, decor and ink.
 */
export function shotCut(ctx: Ctx, p: Path2D, color: string): void {
  const o = PAPER_VALUE.shotOutline;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.globalAlpha *= o.alpha;
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.width * 1.6;
  ctx.stroke(p);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.fill(p);
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
/** One dark dyed cut, creased toward the moon and pooled along the foot. */
function inkBlobSheet(v: number) {
  return enemyPart(`ink-body:${v}`, 56, 52, (c) => {
    const crown = (v - 1) * 2, foot = 3 - v * 2;
    const cut = new Path2D();
    cut.moveTo(crown, -17);
    cut.bezierCurveTo(9 + crown, -17.8, 15, -9, 15.2, -2);
    cut.quadraticCurveTo(15.4, 2.8, 17.3, 6);
    cut.quadraticCurveTo(17.8, 9.7, 12, 9.2);
    cut.lineTo(8.4, 8.6);
    cut.quadraticCurveTo(foot + 4, 10, foot + 2, 11.4);
    cut.quadraticCurveTo(foot - 0.4, 12.4, foot - 2, 9.8);
    cut.lineTo(-7, 10.6);
    cut.quadraticCurveTo(-15.7, 11.1, -17, 6);
    cut.bezierCurveTo(-16.4, 1.7, -15.6, -13.8, crown, -17);
    cut.closePath();
    flatLayer(c, { shape: cut, color: ["#4b3b61", "#493956", "#514063"][v]!, rim: "#9b84b4", texture: 0.43, lift: 0.8, thickness: 1.3 });

    // Two broad facets share the dyed face. The darker one curves into the trailing drip.
    c.save();
    c.clip(cut);
    c.fillStyle = "#32263f";
    c.fill(path([[-14.5, 3], [-9.2, 0], [-3, 4.2], [5.1, 5.3], [12.6, 2.6],
      [15.1, 6.5], [8.4, 8.3], [foot + 2, 10.8], [-7, 9.6], [-13.6, 7.3]], true));
    c.fillStyle = "#625078";
    c.fill(path([[crown, -15.1], [7.8, -14.3], [12.8, -9.5], [13.7, -4.4], [8.2, -7], [5.2, -11.6]]));
    crease(c, crown + 1.2, -14.5, 11.4, -6.4, 0.34);
    line(c, foot - 1, 7.4, foot + 1.8, 8.1, "#88719a", 0.6, 0.56);
    c.restore();

    for (const dx of [-5, 5]) flatLayer(c, { shape: oval(dx, -3.5, 1.9, 2.3), color: "#f0c16d", rim: "#ffe1a0", lift: 0.3, texture: 0.1 });
    stroke(c, new Path2D(v === 2 ? "M -3 2 Q 0 -1 3 2" : "M -3.5 1 L -1.5 2.6 L 0 1.2 L 1.5 2.6 L 3.5 1"), "#d6c8e6", 0.7, 0.85);
  }, false); // The dyed cut has its own coloured rim.
}
/** A separate ink splash on the ground beside the blob (finite variants). */
function inkSpot(v: number) {
  return enemyPart(`ink-spot:${v}`, 22, 14, (c) => {
    flatLayer(c, { shape: oval(0, 0, 5 + v, 2.6, v + 41, 0.4), color: "#241d36", rim: "#5d4f80", lift: 0, texture: 0.3 });
  }, false);
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
    // One solid colour per shot on a dark paper outline, so it separates from any ground.
    const color = echo ? "#9fd3e6" : "#f2bf62", core = echo ? "#effbf6" : "#fff2c4";
    if (empowered) {
      shotCut(c, path([[-21, -5.6], [-7, -4.6], [-6, -3.2], [-20, -3.8]]), color);
      shotCut(c, path([[-24, 3.4], [-10, 2.6], [-9, 4.2], [-23, 5]]), color);
    }
    shotCut(c, path([[-24, -1.2], [-9, -2.2], [-9, 2.2], [-24, 1.2]]), mix(color, "#1c142b", 0.22));
    shotCut(c, path([[-15, 0], [-5, -2.8], [5, 0], [-5, 2.8]]), color);
    line(c, -10, -0.6, 2, -0.1, core, 0.9);
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
