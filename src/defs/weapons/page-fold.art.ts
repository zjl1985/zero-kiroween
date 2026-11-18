/**
 * Card art for page-fold, the page flap turning over its crease, and the
 * pleated paper wall the crease stands up into. The flap is one finite
 * cached sheet per side (face, back) drawn through a live affine transform,
 * so it never enters a new texture key; walls are live vertices. Flat paper
 * only: one moon light from the top-right, hard shadows down-right, no
 * gradients or blur.
 */
import type { FoldFlap, PaperWall, SimState } from "../../game/types.js";
import type { WeaponArt } from "../../render/art-registry.js";
import { combatPart, paperFleck } from "../../render/craft-combat.js";
import { crease, paperEmblem, PAPER_LIGHT, PAPER_SHADOW } from "../../render/paper-kit.js";
import { grain, hash, line, mix, type Ctx, type Point } from "../../render/paper-material.js";
import { foldTurn, PAPER_VERB_LOOK, wallStand } from "../../render/timeline.js";
import { PAGE_FOLD } from "./page-fold.js";

/** The flap sheet, with a muted violet face and a lighter ruled back. */
const FLAP = {
  face: "#a390b2",
  back: "#c7bacd",
  rule: "#8a839d",
  under: "#120d1c",
  /** Cached sheet size in drawing units (stretched onto the flap). */
  w: 96,
  h: 48,
} as const;
/** Pleated wall: panels per wall, pleat depth, lit and shaded card. */
const WALL = { panels: 7, pleat: 3.2, lit: "#ecdcb4", shade: "#b49a70", top: "#fff1cf", edge: "#5b4630" } as const;

/** One side of the flap sheet, painted once: flat card, fibre, a torn far edge, ruled lines on the back. */
function flapSheet(back: boolean) {
  return combatPart(`page-flap:${back ? "back" : "face"}`, FLAP.w, FLAP.h, (c) => {
    // combatPart centres the origin; the sheet spans x -w/2..w/2 (along the crease), y -h/2..h/2 (crease at -h/2).
    const { w, h } = FLAP,
      x0 = -w / 2,
      y0 = -h / 2,
      edge: Point[] = [[x0, y0], [x0 + w, y0]];
    // The far edge is the page's deckled edge: small seeded teeth, fixed per side.
    for (let i = 12; i >= 0; i--) edge.push([x0 + (w * i) / 12, y0 + h - 1.6 - hash(i * 7.3 + (back ? 3 : 1)) * 2.2]);
    const p = new Path2D();
    edge.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    c.fillStyle = back ? FLAP.back : FLAP.face;
    c.fill(p);
    grain(c, p, back ? 0.4 : 0.55);
    c.save();
    c.clip(p);
    if (back)
      for (let y = y0 + 9; y < y0 + h - 4; y += 8) line(c, x0, y, x0 + w, y, FLAP.rule, 0.5, 0.45);
    // Darker fold band near the crease: the paper bends there.
    c.globalAlpha = 0.18;
    c.fillStyle = mix(back ? FLAP.back : FLAP.face, "#1c142b", 0.5);
    c.fillRect(x0, y0, w, 3.2);
    c.restore();
  });
}

/** The parallelogram A, B, B + off, A + off (A, B on the crease). */
function quad(a: Point, b: Point, ox: number, oy: number): Path2D {
  const p = new Path2D();
  p.moveTo(a[0], a[1]);
  p.lineTo(b[0], b[1]);
  p.lineTo(b[0] + ox, b[1] + oy);
  p.lineTo(a[0] + ox, a[1] + oy);
  p.closePath();
  return p;
}

/**
 * One fold: the flap lifts off the folded side, turns over the crease (rising
 * up the screen with fake perspective, showing its face, then its back) and
 * lands flat on Nicole's side, then the crease fades. The uncovered page
 * under the flap darkens while the flap is up.
 */
function drawFlap(ctx: Ctx, f: FoldFlap, age: number): void {
  const life = PAGE_FOLD.flapLife,
    turn = foldTurn(age),
    theta = Math.PI * turn,
    fade = age < life * 0.6 ? 1 : Math.max(0, (life - age) / (life * 0.4)),
    tx = -f.ny,
    ty = f.nx,
    a: Point = [f.x - tx * f.half, f.y - ty * f.half],
    b: Point = [f.x + tx * f.half, f.y + ty * f.half],
    lift = Math.sin(theta) * f.band * PAPER_VERB_LOOK.foldLift,
    ox = f.nx * f.band * Math.cos(theta),
    oy = f.ny * f.band * Math.cos(theta) - lift;
  ctx.save();
  // Uncovered page: the dark sheet under the flap shows while it is lifted.
  ctx.globalAlpha = 0.28 * Math.sin(theta) * fade;
  ctx.fillStyle = FLAP.under;
  ctx.fill(quad(a, b, f.nx * f.band, f.ny * f.band));
  // Cast shadow of the raised flap on the ground (hard, longer the higher it rises).
  const k = 1 + (lift / Math.max(1, f.band)) * 6;
  ctx.globalAlpha = PAPER_SHADOW.alpha * 0.7 * fade;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(quad(
    [a[0] + PAPER_SHADOW.dx * k, a[1] + PAPER_SHADOW.dy * k],
    [b[0] + PAPER_SHADOW.dx * k, b[1] + PAPER_SHADOW.dy * k],
    f.nx * f.band * Math.cos(theta) + PAPER_SHADOW.dx * k * 2,
    f.ny * f.band * Math.cos(theta) + PAPER_SHADOW.dy * k * 2,
  ));
  // The sheet itself through a live affine transform (the cached piece never changes key).
  const back = turn > 0.5,
    sheet = flapSheet(back),
    ux = (b[0] - a[0]) / FLAP.w,
    uy = (b[1] - a[1]) / FLAP.w;
  // Moonlight on the turning sheet: brightest when it faces the top-right.
  const facing = Math.abs(Math.cos(theta)) * 0.55 + 0.45;
  ctx.globalAlpha = 0.74 * fade;
  ctx.save();
  ctx.transform(ux, uy, ox / FLAP.h, oy / FLAP.h, (a[0] + b[0]) / 2 + ox / 2, (a[1] + b[1]) / 2 + oy / 2);
  sheet.draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  // Shade the sheet as it turns edge-on; flat, never a gradient.
  ctx.globalAlpha = (1 - facing) * 0.55 * fade;
  ctx.fillStyle = "#1c142b";
  ctx.fill(quad(a, b, ox, oy));
  // The lit cut edge on the far side of the flap and the dark lip on the crease.
  const far: Point = [a[0] + ox, a[1] + oy],
    farB: Point = [b[0] + ox, b[1] + oy],
    litFar = ox * PAPER_LIGHT.dirX + oy * PAPER_LIGHT.dirY > 0;
  line(ctx, far[0], far[1], farB[0], farB[1], litFar ? PAPER_LIGHT.rim : "#3a2c22", 1.1, 0.8 * fade);
  ctx.restore();
  crease(ctx, a[0], a[1], b[0], b[1], 0.9 * fade);
}

/**
 * A pleated paper screen standing on the crease: accordion panels alternate
 * lit and shaded faces, a lit top edge, crease lines at each pleat and a hard
 * cast shadow on the ground. It rises with a small overshoot and folds down
 * flat when its life runs out.
 */
function drawWall(ctx: Ctx, w: PaperWall): void {
  const stand = wallStand(w.life, w.maxLife);
  if (stand <= 0.01) return;
  const h = PAPER_VERB_LOOK.wallHeight * stand,
    dx = w.x2 - w.x1,
    dy = w.y2 - w.y1,
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len,
    base: Point[] = [];
  for (let i = 0; i <= WALL.panels; i++) {
    const t = i / WALL.panels,
      z = (i % 2 ? 1 : -1) * WALL.pleat;
    base.push([w.x1 + dx * t + nx * z, w.y1 + dy * t + ny * z * 0.6]);
  }
  ctx.save();
  // Ground shadow: the screen's footprint pushed down-right, as long as it stands.
  const sx = PAPER_SHADOW.dx * (2 + h * 0.18),
    sy = PAPER_SHADOW.dy * (2 + h * 0.12);
  const sh = new Path2D();
  base.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  for (let i = base.length - 1; i >= 0; i--) sh.lineTo(base[i]![0] + sx, base[i]![1] + sy);
  sh.closePath();
  ctx.globalAlpha = PAPER_SHADOW.alpha * 0.8;
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(sh);
  ctx.globalAlpha = 1;
  ctx.lineJoin = "round";
  for (let i = 0; i < WALL.panels; i++) {
    const [ax, ay] = base[i]!,
      [bx, by] = base[i + 1]!,
      p = new Path2D();
    p.moveTo(ax, ay);
    p.lineTo(bx, by);
    p.lineTo(bx, by - h);
    p.lineTo(ax, ay - h);
    p.closePath();
    // A panel faces the moon when its outward normal points up-right.
    const pnx = -(by - ay),
      pny = bx - ax,
      lit = pnx * PAPER_LIGHT.dirX + pny * PAPER_LIGHT.dirY < 0;
    ctx.fillStyle = lit ? WALL.lit : WALL.shade;
    ctx.fill(p);
    grain(ctx, p, 0.35);
    ctx.strokeStyle = mix(WALL.shade, WALL.edge, 0.6);
    ctx.lineWidth = 0.5;
    ctx.stroke(p);
  }
  // Pleat creases and the lit top cut edge.
  for (let i = 1; i < WALL.panels; i++) {
    const [x, y] = base[i]!;
    line(ctx, x, y, x, y - h, i % 2 ? PAPER_LIGHT.rim : WALL.edge, 0.6, 0.55);
  }
  const top = new Path2D();
  base.forEach(([x, y], i) => (i ? top.lineTo(x, y - h) : top.moveTo(x, y - h)));
  ctx.strokeStyle = WALL.top;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.85;
  ctx.stroke(top);
  ctx.restore();
}

export const PAGE_FOLD_ART: WeaponArt = {
  id: "page-fold",
  ground(ctx, state: SimState) {
    for (const f of state.fold.flaps) {
      const age = state.elapsed - f.at;
      if (age >= 0 && age < PAGE_FOLD.flapLife) drawFlap(ctx, f, age);
    }
  },
  sprites(ctx, state, _time, add) {
    for (const w of state.walls) add((w.y1 + w.y2) / 2, () => drawWall(ctx, w));
  },
  effects: {
    // Paper dust puffs out along the crease as the flap slaps down.
    "page-fold"(ctx, e, { t, fade, ease }) {
      const a = (e.angle ?? 0) + Math.PI / 2,
        r = e.radius ?? 80,
        seed = e.seed ?? 1;
      ctx.globalAlpha = fade * 0.9;
      for (let i = 0; i < 6; i++) {
        const s = (i / 5 - 0.5) * r * 1.6,
          out = (hash(seed + i) - 0.5) * 18 * ease,
          x = e.x + Math.cos(a) * s - Math.sin(a) * out,
          y = e.y + Math.sin(a) * s + Math.cos(a) * out - ease * 8 + t * t * 10;
        paperFleck(ctx, x, y, 2 + hash(seed * 5 + i) * 1.4, i % 2 ? FLAP.back : FLAP.face, a + t * 4);
      }
    },
  },
  /** A page with its corner folded over: the dark crease, the pale ruled back and an ink moon on the page. */
  icon(ctx, ink) {
    paperEmblem(ctx, [
      {
        shape: [[4, 5], [20, 4.2], [28, 12.6], [27.4, 28], [4.8, 28.6]],
        color: "#d8c49a",
        rim: "#fff4d8",
        lift: 0.6,
      },
      {
        shape: [[20, 4.2], [28, 12.6], [18.4, 14.2]],
        color: "#f1e6cb",
        lift: 1.3,
        fold: { from: [20, 4.2], to: [28, 12.6], depth: 0.16, side: -1 },
      },
      {
        shape: (p) => {
          p.moveTo(14.5, 15.5);
          p.bezierCurveTo(6, 15.5, 6, 26.5, 14.5, 26.5);
          p.quadraticCurveTo(9.5, 21, 14.5, 15.5);
          p.closePath();
        },
        color: ink,
        lift: 0.9,
      },
    ]);
  },
};
