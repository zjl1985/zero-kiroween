import type { EnemyArt } from "../../../render/art-registry.js";
import { enemyPart, enemyShadow, hpStrip, spawning, type Look } from "../../../render/craft-enemies.js";
import { flatLayer, foldLine, PAPER_SHADOW } from "../../../render/paper-kit.js";
import { path, type Ctx } from "../../../render/paper-material.js";
import type { EnemyState } from "../../../game/types.js";
import { kiroGhostMotion } from "./def.js";

const STOCK = "#fffaf3", VIOLET = "#9046ff", INK = "#17131d";
const HEM = 8;

/** Hand-cut interpretation: swept left wisp, round dome and two unequal curled tails. */
function ghostCut(): Path2D {
  const p = new Path2D();
  p.moveTo(-10, 11);
  p.bezierCurveTo(-14, 20, -5, 22, 1, 17);
  p.bezierCurveTo(3, 23, 10, 18, 13, 14);
  p.bezierCurveTo(18, 4, 16, -7, 15, -9);
  p.bezierCurveTo(11, -24, -9, -24, -12, -9);
  p.quadraticCurveTo(-13, -6, -13, -3);
  p.bezierCurveTo(-13, 1, -16, 7, -18, 12);
  p.quadraticCurveTo(-14, 13, -10, 11);
  p.closePath();
  return p;
}

/** Both slices share the same cut, so their hinge has no extra outlined cross-seam. */
function paintSheet(ctx: Ctx): void {
  const cut = ghostCut();
  // A violet backing sheet peeks out down-right, under the white stock: two flat layers, one shadow direction.
  ctx.save();
  ctx.translate(PAPER_SHADOW.dx * 0.8, PAPER_SHADOW.dy * 0.8);
  flatLayer(ctx, { shape: cut, color: VIOLET, rim: "#c9a7ff", thickness: 0.9, texture: 0.14, lift: 1.1 });
  ctx.restore();
  flatLayer(ctx, { shape: cut, color: STOCK, rim: "#ffffff", thickness: 0.7, texture: 0.14, lift: 0 });
  ctx.save();
  ctx.clip(cut);
  ctx.fillStyle = "#e8e1ee";
  ctx.fill(path([[-10, -8], [-9, 4], [-14, 10], [-12, -3]]));
  ctx.fillStyle = "#e7dff0";
  ctx.fill(path([[-10, 12], [-5, 16], [1, 17], [-5, 19], [-10, 17]]));
  foldLine(ctx, -10, -6, -9, 3, 0.16);
  foldLine(ctx, -8, 12, -3, 17, 0.22);
  foldLine(ctx, 5, 12, 8, 17, 0.18);
  ctx.restore();
}

// Paint shadows before slicing: clipping during shadow generation creates a
// false horizontal edge at the hinge. Both slices reuse this complete sheet.
function sheetPart() {
  return enemyPart("kiro-ghost:sheet", 56, 64, paintSheet);
}

function bodyPart() {
  return enemyPart("kiro-ghost:body", 56, 64, (ctx) => {
    ctx.save();
    const upper = new Path2D();
    upper.rect(-28, -32, 56, 32 + HEM + 0.4);
    ctx.clip(upper);
    sheetPart().draw(ctx, { x: 0, y: 0 });
    // The mascot's eyes are black paper ovals, not the shared white googly eyes.
    for (const x of [1.8, 8.6]) {
      const eye = new Path2D();
      eye.ellipse(x, -5.7, 1.6, 3.1, 0, 0, Math.PI * 2);
      flatLayer(ctx, { shape: eye, color: INK, rim: "#3a3045", thickness: 0.4, texture: 0.05, lift: 0.15 });
    }
    ctx.restore();
  });
}

function hemPart() {
  return enemyPart("kiro-ghost:hem", 56, 64, (ctx) => {
    ctx.save();
    const lower = new Path2D();
    lower.rect(-28, HEM, 56, 32 - HEM);
    ctx.clip(lower);
    sheetPart().draw(ctx, { x: 0, y: 0 });
    ctx.restore();
  });
}

function drawGhost(ctx: Ctx, e: EnemyState, time: number, look: Look): void {
  if (spawning(ctx, e, "#c9a7ff")) return;
  const { fold } = kiroGhostMotion(e.timer ?? e.phase ?? 0),
    phase = e.phase ?? 0,
    y = e.y - 22 - Math.sin(time * 2.3 + phase) * 1.5;
  enemyShadow(ctx, e.x, e.y, 12 - fold, 3.6);
  ctx.save();
  ctx.translate(e.x, y);
  ctx.scale(look.x < e.x ? -1 : 1, 1);
  ctx.rotate(Math.sin(time * 1.8 + phase) * 0.025);
  ctx.save();
  ctx.translate(0, HEM);
  ctx.scale(1, 1 - fold * 0.46);
  ctx.translate(0, -HEM);
  hemPart().draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  bodyPart().draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  hpStrip(ctx, e, e.y + 6, 18);
}

export const KIRO_GHOST_ART: EnemyArt = {
  id: "kiro-ghost",
  draw: drawGhost,
  cullMargin: 60,
  previewBounds: { l: -25, r: 25, t: -44, b: 8 },
  dissolve: { flakes: [STOCK, "#e7dff0", VIOLET, "#c9a7ff"], count: 10 },
};
