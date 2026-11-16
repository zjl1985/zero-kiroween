import {
  MASCOT_VIEWBOX_HEIGHT,
  MASCOT_VIEWBOX_WIDTH,
  officialRects,
  type MascotRect,
} from "../cats/official.js";
import { NICOLE } from "../cats/nicole.js";
import type { CatId } from "../cats/types.js";
import { ZERO } from "../cats/zero.js";

/** Uniform scale of the official 386×288 Meow Wall head in the 640×400 view. */
export const HEAD_SCALE = 0.118;

export interface CatPose {
  id: CatId;
  x: number;
  y: number;
  facing: 1 | -1;
  moving: boolean;
  dashing: boolean;
  hurt: boolean;
  decoy?: boolean;
  time: number;
  /** Override the default official-head scale (title uses a larger one). */
  scale?: number;
}

const RECT_CACHE = new Map<CatId, readonly MascotRect[]>();

export function officialCatRects(id: CatId): readonly MascotRect[] {
  let hit = RECT_CACHE.get(id);
  if (!hit) {
    hit = officialRects(id);
    RECT_CACHE.set(id, hit);
  }
  return hit;
}

export function bobOffset(pose: CatPose): number {
  if (pose.dashing) return 0;
  const amp = pose.moving ? 1.2 : 0.3;
  const speed = pose.moving ? 9 : 2.6;
  return Math.sin(pose.time * speed) * amp;
}

/** Draw the official Meow Wall head, anchored at the bottom-center of the pose. */
export function drawOfficialHead(
  ctx: CanvasRenderingContext2D,
  pose: CatPose,
  options: { smooth?: boolean; scale?: number; clipBottom?: number } = {},
): void {
  const scale = options.scale ?? pose.scale ?? HEAD_SCALE;
  const bob = options.smooth ? bobOffset(pose) : Math.round(bobOffset(pose));
  const width = MASCOT_VIEWBOX_WIDTH * scale;
  const height = MASCOT_VIEWBOX_HEIGHT * scale;
  const originX = pose.x - width / 2;
  const originY = pose.y - height + bob;
  const alpha = pose.decoy ? 0.45 : pose.hurt ? 0.7 : 1;
  const clipBottom = options.clipBottom;

  ctx.save();
  ctx.imageSmoothingEnabled = Boolean(options.smooth);
  ctx.globalAlpha = alpha;
  if (pose.facing === -1) {
    ctx.translate(pose.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-pose.x, 0);
  }
  if (clipBottom != null) {
    ctx.beginPath();
    ctx.rect(originX - 2, originY - 2, width + 4, height * clipBottom + 2);
    ctx.clip();
  }

  for (const rect of officialCatRects(pose.id)) {
    const x = originX + rect.x * scale;
    const y = originY + rect.y * scale;
    const w = rect.w * scale;
    const h = rect.h * scale;
    ctx.fillStyle = rect.fill;
    if (options.smooth) {
      ctx.fillRect(x, y, w, h);
    } else {
      const x0 = Math.round(x);
      const y0 = Math.round(y);
      const x1 = Math.round(x + w);
      const y1 = Math.round(y + h);
      ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    }
  }

  ctx.restore();
}

/**
 * Official Meow Wall bust sits as the chibi torso; short legs + cape + lantern complete the standing figure.
 * pose.y is feet / ground contact.
 */
export function drawMascot(
  ctx: CanvasRenderingContext2D,
  pose: CatPose,
  options: { smooth?: boolean; crisp?: boolean; scale?: number } = {},
): void {
  const scale = options.scale ?? pose.scale ?? HEAD_SCALE;
  const k = scale / 0.118;
  const headH = MASCOT_VIEWBOX_HEIGHT * scale;
  const legH = 11 * k;
  const legW = 9 * k;
  const def = pose.id === "nicole" ? NICOLE : ZERO;
  const crisp = Boolean(options.crisp);
  const alpha = pose.decoy ? 0.45 : pose.hurt ? 0.7 : 1;
  const bob = options.smooth ? bobOffset(pose) : Math.round(bobOffset(pose));
  const facing = pose.facing;
  const feetY = pose.y;
  // Bust bottom sits just above the short legs.
  const bustBottom = feetY - legH * 0.92 + bob;
  const capeY = bustBottom - headH * 0.22;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ground shadow
  ctx.fillStyle = crisp ? "rgba(8,6,12,0.42)" : "rgba(12,8,18,0.32)";
  if (crisp) {
    ctx.fillRect(
      Math.round(pose.x - legW * 1.2),
      Math.round(feetY - 1),
      Math.round(legW * 2.4),
      Math.max(3, Math.round(3.5 * k)),
    );
  } else {
    ctx.beginPath();
    ctx.ellipse(pose.x, feetY + 1, legW * 1.35, 3 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  if (facing === -1) {
    ctx.translate(pose.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-pose.x, 0);
  }

  // cape behind the bust
  const capeColor = pose.id === "nicole" ? "#4A3568" : "#1A1420";
  const capeTrim = pose.id === "nicole" ? "#C9A84A" : "#D4B45A";
  const capeInner = pose.id === "nicole" ? "#8A4A6A" : "#2A2428";
  drawCape(ctx, pose.x, capeY, legW * 1.15, headH * 0.55, capeColor, capeInner, capeTrim, crisp, k);

  // short legs
  const legFill = pose.id === "nicole" ? def.bodyFill : "#121014";
  ctx.fillStyle = legFill;
  if (crisp) {
    ctx.fillRect(Math.round(pose.x - legW * 0.7), Math.round(bustBottom - 1), Math.round(legW * 0.5), Math.round(legH));
    ctx.fillRect(Math.round(pose.x + legW * 0.15), Math.round(bustBottom - 1), Math.round(legW * 0.5), Math.round(legH));
  } else {
    roundedFill(ctx, pose.x - legW * 0.7, bustBottom - 1, legW * 0.52, legH, 2.2 * k);
    roundedFill(ctx, pose.x + legW * 0.15, bustBottom - 1, legW * 0.52, legH, 2.2 * k);
  }

  // feet
  ctx.fillStyle = pose.id === "nicole" ? "#D8B898" : "#0E0C10";
  if (crisp) {
    ctx.fillRect(Math.round(pose.x - legW * 0.78), Math.round(feetY - 2.4 * k), Math.round(legW * 0.58), Math.round(2.6 * k));
    ctx.fillRect(Math.round(pose.x + legW * 0.12), Math.round(feetY - 2.4 * k), Math.round(legW * 0.58), Math.round(2.6 * k));
  } else {
    ctx.beginPath();
    ctx.ellipse(pose.x - legW * 0.42, feetY - 0.8, legW * 0.34, 2 * k, 0, 0, Math.PI * 2);
    ctx.ellipse(pose.x + legW * 0.42, feetY - 0.8, legW * 0.34, 2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // clasp
  if (pose.id === "nicole") {
    ctx.fillStyle = "#E8C96A";
    ctx.beginPath();
    ctx.arc(pose.x, bustBottom - headH * 0.08, 1.5 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // tail
  ctx.strokeStyle = pose.id === "zero" ? "#F0C341" : def.palette.headDark;
  ctx.lineWidth = Math.max(1.5, 2.2 * k);
  ctx.lineCap = "round";
  ctx.beginPath();
  const tx = pose.x - legW * 0.95;
  const ty = bustBottom + legH * 0.15;
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(tx - 7 * k, ty - 3 * k, tx - 4 * k, ty - 11 * k);
  ctx.stroke();

  // handheld lantern
  const lx = pose.x + legW * 1.15;
  const ly = bustBottom + legH * 0.15;
  drawHandLantern(ctx, lx, ly, k, pose.time, crisp);

  ctx.restore(); // facing

  // official bust as torso/head — clip a little bottom fluff so legs read clearly
  drawOfficialHead(
    ctx,
    { ...pose, y: bustBottom },
    { smooth: options.smooth, scale, clipBottom: 0.92 },
  );

  // lantern glow in world space
  const glowX = pose.x + facing * legW * 1.15;
  const glowY = bustBottom + legH * 0.15 - 8 * k;
  softGlow(ctx, glowX, glowY, 15 * k, "rgba(255,210,120,0.24)", crisp);

  ctx.restore();
}

function drawCape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyW: number,
  bodyH: number,
  fill: string,
  inner: string,
  trim: string,
  crisp: boolean,
  k: number,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.15, y - bodyH * 0.15);
  ctx.quadraticCurveTo(x - bodyW * 1.55, y + bodyH * 0.25, x - bodyW * 1.2, y + bodyH * 0.95);
  ctx.quadraticCurveTo(x - bodyW * 0.15, y + bodyH * 0.55, x + bodyW * 0.25, y + bodyH * 0.35);
  ctx.quadraticCurveTo(x + bodyW * 0.65, y + bodyH * 0.15, x + bodyW * 0.4, y - bodyH * 0.05);
  ctx.closePath();
  ctx.fill();
  if (!crisp) {
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([2.2, 2.4]);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.02, y);
  ctx.quadraticCurveTo(x - bodyW * 0.95, y + bodyH * 0.3, x - bodyW * 0.55, y + bodyH * 0.65);
  ctx.quadraticCurveTo(x - bodyW * 0.05, y + bodyH * 0.3, x + bodyW * 0.12, y + bodyH * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(1, 1.25 * k);
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.1, y - bodyH * 0.1);
  ctx.lineTo(x - bodyW * 1.1, y + bodyH * 0.85);
  ctx.stroke();
}

function drawHandLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  time: number,
  crisp: boolean,
): void {
  const flick = 0.82 + 0.18 * Math.sin(time * 7 + x * 0.1);
  ctx.strokeStyle = "#3A2C20";
  ctx.lineWidth = Math.max(1, 1.35 * k);
  ctx.beginPath();
  ctx.moveTo(x, y + 2 * k);
  ctx.lineTo(x, y - 9 * k);
  ctx.stroke();
  const w = 7 * k;
  const h = 8 * k;
  const top = y - 17 * k;
  softGlow(ctx, x, top + h * 0.5, 13 * k, `rgba(255,210,120,${0.3 * flick})`, crisp);
  ctx.fillStyle = mixHex("#E8B45A", "#FFF1C0", flick * 0.35);
  if (crisp) {
    ctx.fillRect(Math.round(x - w / 2), Math.round(top), Math.round(w), Math.round(h));
    ctx.strokeStyle = "#1A1420";
    ctx.strokeRect(Math.round(x - w / 2), Math.round(top), Math.round(w), Math.round(h));
  } else {
    roundedFill(ctx, x - w / 2, top, w, h, 1.5 * k);
    ctx.strokeStyle = "#2A2420";
    ctx.lineWidth = 0.9;
    roundedStroke(ctx, x - w / 2, top, w, h, 1.5 * k);
  }
  ctx.fillStyle = `rgba(255,245,200,${0.55 * flick})`;
  ctx.fillRect(x - w * 0.25, top + h * 0.25, w * 0.5, h * 0.45);
  ctx.fillStyle = "#3A2C20";
  ctx.fillRect(x - w * 0.55, top - 2 * k, w * 1.1, 2.1 * k);
}

function softGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  crisp: boolean,
): void {
  if (crisp) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), Math.round(r * 0.55), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundedFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function roundedStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  roundedPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function roundedPath(
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

export function fillHex(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const m = (i: number) => Math.round(pa[i]! * (1 - t) + pb[i]! * t);
  return `rgb(${m(0)}, ${m(1)}, ${m(2)})`;
}

function parse(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return [
    Number.parseInt(n.slice(0, 2), 16),
    Number.parseInt(n.slice(2, 4), 16),
    Number.parseInt(n.slice(4, 6), 16),
  ];
}
