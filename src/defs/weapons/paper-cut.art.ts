/**
 * Card art for paper-cut, the live slit it leaves in the page, the white
 * hole a closed loop leaves, and the cut-out piece lifting off and turning
 * over. Flat paper only: hard shadows down-right, lit cut walls toward the
 * moon, no gradients or blur.
 */
import type { CutOut, SimState } from "../../game/types.js";
import type { WeaponArt } from "../../render/art-registry.js";
import { paperFleck } from "../../render/craft-combat.js";
import { crease, flatCut, paperEmblem, PAPER_LIGHT, PAPER_SHADOW } from "../../render/paper-kit.js";
import { hash, line, mix, type Ctx, type Point } from "../../render/paper-material.js";
import { PAPER_CUT } from "./paper-cut.js";

/** Slit look: under-sheet seen through the gap, the lit cut wall, the lifted lip. */
const SLIT = {
  gap: "#140d1c",
  wall: "#fff1cf",
  lip: "#e9dab8",
  width: 2.3,
  /** The open line's newest part is wider and brighter than its healing tail. */
  tail: 0.35,
  /** Continuous bands the slit is drawn in, tail to head. */
  bands: 4,
} as const;
/** The cut piece: the sheet's warm face, and its paler back once it turns over. */
const PIECE = { face: "#cdb68a", back: "#f0e4c8", rise: 26, drift: 9, turn: 0.42 } as const;

function polyline(pts: readonly Point[]): Path2D {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  return p;
}
function closed(pts: readonly Point[]): Path2D {
  const p = polyline(pts);
  p.closePath();
  return p;
}
const shift = (pts: readonly Point[], dx: number, dy: number): Point[] => pts.map(([x, y]) => [x + dx, y + dy] as Point);

/**
 * The open slit: drawn in short runs so the tail heals thinner and fainter.
 * Each run is the dark gap, the lit wall on the moon-facing side of the gap
 * and a lifted paper lip on the other, plus a few torn fibres.
 */
function drawSlit(ctx: Ctx, state: SimState): void {
  const src = state.cut.points;
  if (!src.length) return;
  const p = state.player,
    pts: Point[] = src.map((q) => [q.x, q.y] as Point);
  const head = pts[pts.length - 1]!;
  if (Math.hypot(p.x - head[0], p.y - head[1]) > 0.5) pts.push([p.x, p.y]);
  if (pts.length < 2) return;
  const n = pts.length,
    { dirX, dirY } = PAPER_LIGHT;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A few continuous bands from the healing tail to the fresh head: one stroke
  // per band and layer, so round caps never bead where short runs overlap.
  const bands = Math.min(SLIT.bands, n - 1);
  for (let b = 0; b < bands; b++) {
    const i0 = Math.floor((b * (n - 1)) / bands),
      i1 = Math.floor(((b + 1) * (n - 1)) / bands),
      run = pts.slice(i0, i1 + 1),
      k = SLIT.tail + (1 - SLIT.tail) * ((b + 1) / bands),
      w = SLIT.width * k;
    ctx.globalAlpha = 0.85 * k + 0.1;
    ctx.strokeStyle = SLIT.gap;
    ctx.lineWidth = w;
    ctx.stroke(polyline(run));
    // The wall on the bottom-left side of the gap faces the moon.
    ctx.globalAlpha = 0.75 * k;
    ctx.strokeStyle = SLIT.wall;
    ctx.lineWidth = 0.75;
    ctx.stroke(polyline(shift(run, -dirX * w * 0.55, -dirY * w * 0.55)));
    // The other edge lifts a hair off the page.
    ctx.globalAlpha = 0.55 * k;
    ctx.strokeStyle = SLIT.lip;
    ctx.lineWidth = 1.1;
    ctx.stroke(polyline(shift(run, dirX * w * 0.7, dirY * w * 0.7)));
  }
  for (let i = 1; i < n; i++) {
    const k = SLIT.tail + (1 - SLIT.tail) * (i / (n - 1));
    // A torn fibre or two where the blade dragged.
    // Keyed by the sample itself, so fibres stay put while the tail heals.
    const q = src[Math.min(i, src.length - 1)]!,
      seed = q.t * 7.3 + q.x * 0.131 + q.y * 0.071;
    if (hash(seed) < 0.3) {
      const [ax, ay] = pts[i - 1]!,
        [bx, by] = pts[i]!,
        len = Math.hypot(bx - ax, by - ay) || 1,
        nx = -(by - ay) / len,
        ny = (bx - ax) / len,
        mx = (ax + bx) / 2,
        my = (ay + by) / 2,
        side = hash(seed * 3.1) < 0.5 ? 1 : -1;
      line(ctx, mx, my, mx + nx * side * 2.6 + (bx - ax) / len, my + ny * side * 2.6 + (by - ay) / len, SLIT.lip, 0.5, 0.6 * k);
    }
  }
  ctx.restore();
  drawGuide(ctx, state, pts);
  drawBlade(ctx, pts);
}

/** A faint pencil guide toward the earlier stretch the cat can close the loop on. */
function drawGuide(ctx: Ctx, state: SimState, pts: readonly Point[]): void {
  const n = pts.length,
    reach = state.cut.close * 2.4;
  if (n < 6 || reach <= 0) return;
  const [hx, hy] = pts[n - 1]!;
  let best = -1,
    bestD = reach;
  for (let i = 0; i <= n - 6; i++) {
    const d = Math.hypot(pts[i]![0] - hx, pts[i]![1] - hy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return;
  const [tx, ty] = pts[best]!,
    k = 1 - bestD / reach;
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.45 * k;
  ctx.setLineDash([2.5, 3.5]);
  ctx.strokeStyle = "#3a3046";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(tx, ty, 4 + k * 2, (4 + k * 2) * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Two paper blade tips opening at the head of the line. */
function drawBlade(ctx: Ctx, pts: readonly Point[]): void {
  const n = pts.length,
    [hx, hy] = pts[n - 1]!,
    [px, py] = pts[n - 2]!,
    a = Math.atan2(hy - py, hx - px);
  const tip = (side: number): Point[] => {
    const b = a + side * 0.32,
      c = Math.cos(b),
      s = Math.sin(b);
    return [
      [hx + c * 7, hy + s * 7],
      [hx - s * 1.2 * side, hy + c * 1.2 * side],
      [hx + s * 1.2 * side, hy - c * 1.2 * side],
    ];
  };
  for (const side of [-1, 1])
    flatCut(ctx, tip(side), { color: "#d7dbe2", thickness: 0.45, lift: 0.4, rim: 0.4, texture: 0.15 });
}

/** The hole a cut-out leaves: the dark under-sheet, the lit far wall, the shaded overhang. */
function drawHole(ctx: Ctx, out: CutOut, u: number): void {
  const pts = out.points.map((q) => [q.x, q.y] as Point),
    hole = closed(pts),
    { dirX, dirY } = PAPER_LIGHT,
    close = u < 0.72 ? 1 : Math.max(0, (1 - u) / 0.28);
  ctx.save();
  ctx.globalAlpha = 0.68 * close;
  ctx.fillStyle = SLIT.gap;
  ctx.fill(hole);
  ctx.clip(hole);
  ctx.globalAlpha = 0.7 * close;
  ctx.strokeStyle = SLIT.wall;
  ctx.lineWidth = 2.2;
  ctx.stroke(closed(shift(pts, dirX * 1.6, dirY * 1.6)));
  ctx.globalAlpha = 0.5 * close;
  ctx.strokeStyle = "#07040b";
  ctx.lineWidth = 3;
  ctx.stroke(closed(shift(pts, -dirX * 2, -dirY * 2)));
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.55 * close;
  ctx.strokeStyle = SLIT.lip;
  ctx.lineWidth = 0.8;
  ctx.stroke(hole);
  ctx.restore();
}

/**
 * The cut piece lifts out of its hole, drifts and turns over to show its pale
 * back. Vertices are moved (never the context), so the light and the cast
 * shadow keep their directions; the turn is a squash across a hinge line.
 */
function drawPiece(ctx: Ctx, out: CutOut, u: number): void {
  const pts = out.points;
  if (pts.length < 3) return;
  let cx = 0,
    cy = 0;
  for (const q of pts) {
    cx += q.x;
    cy += q.y;
  }
  cx /= pts.length;
  cy /= pts.length;
  const lift = 1 - (1 - Math.min(1, u * 1.6)) ** 2,
    rise = lift * PIECE.rise,
    flip = Math.cos(Math.min(1, u * 1.25) * Math.PI),
    turn = (hash(out.id * 5.3) < 0.5 ? -1 : 1) * PIECE.turn * u,
    c = Math.cos(turn),
    s = Math.sin(turn),
    shrink = 1 - 0.18 * u,
    fade = u < 0.7 ? 1 : Math.max(0, (1 - u) / 0.3);
  const moved = (dy: number): Point[] =>
    pts.map((q) => {
      const x = (q.x - cx) * shrink,
        y = (q.y - cy) * shrink * Math.max(0.08, Math.abs(flip));
      return [cx + x * c - y * s + u * PIECE.drift, cy + x * s + y * c - dy] as Point;
    });
  ctx.save();
  // The ground shadow stays on the page and grows softer-edged by spreading, never by blur.
  ctx.globalAlpha = PAPER_SHADOW.alpha * 0.8 * fade * (1 - u * 0.6);
  ctx.fillStyle = PAPER_SHADOW.color;
  ctx.fill(closed(moved(0).map(([x, y]) => [x + PAPER_SHADOW.dx * (1 + rise * 0.15), y + PAPER_SHADOW.dy * (1 + rise * 0.1)] as Point)));
  ctx.globalAlpha = fade;
  const shape = moved(rise),
    back = flip < 0;
  flatCut(ctx, shape, {
    color: back ? PIECE.back : PIECE.face,
    thickness: 0.8,
    lift: 0,
    rim: 0.9,
    texture: back ? 0.55 : 0.7,
  });
  if (back) {
    // The back still carries the faint crease of the turn.
    const a = shape[0]!,
      b = shape[Math.floor(shape.length / 2)]!;
    ctx.save();
    ctx.clip(closed(shape));
    crease(ctx, a[0], a[1], b[0], b[1], 0.45);
    ctx.restore();
  } else {
    ctx.globalAlpha = fade * 0.35;
    ctx.fillStyle = mix(PIECE.face, "#1c142b", 0.3);
    ctx.fill(closed(shape));
  }
  ctx.restore();
}

function eachOut(state: SimState, draw: (out: CutOut, u: number) => void): void {
  for (const out of state.cut.outs) {
    const u = (state.elapsed - out.at) / PAPER_CUT.outLife;
    if (u >= 0 && u < 1) draw(out, u);
  }
}

export const PAPER_CUT_ART: WeaponArt = {
  id: "paper-cut",
  ground(ctx, state) {
    eachOut(state, (out, u) => drawHole(ctx, out, u));
    eachOut(state, (out, u) => drawPiece(ctx, out, u));
    drawSlit(ctx, state);
  },
  effects: {
    // Snipped flecks spring off the rim of the cut-out.
    "paper-cut"(ctx, e, { t, fade, ease }) {
      const r = e.radius ?? 40,
        seed = e.seed ?? 1;
      ctx.globalAlpha = fade;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + hash(seed + i) * 0.6,
          d = r * (0.85 + ease * 0.35),
          x = e.x + Math.cos(a) * d,
          y = e.y + Math.sin(a) * d * 0.62 - ease * 14 + t * t * 16;
        paperFleck(ctx, x, y, 2.6 + hash(seed * 3 + i) * 1.6, i % 3 ? PIECE.back : PIECE.face, a + t * 5);
      }
    },
  },
  /** A sheet with a loop cut out of it, the loose piece lifting off, and a pair of paper blades. */
  icon(ctx, ink) {
    const loop: Point[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      loop.push([12.5 + Math.cos(a) * 6.4 * (i % 3 ? 1 : 0.86), 17.5 + Math.sin(a) * 5.6]);
    }
    paperEmblem(ctx, [
      {
        shape: (p) => {
          p.moveTo(3, 8);
          p.lineTo(25, 5.4);
          p.lineTo(27.4, 27);
          p.lineTo(4.6, 28.6);
          p.closePath();
          // The hole the loop left (opposite winding).
          p.moveTo(loop[0]![0], loop[0]![1]);
          for (let i = loop.length - 1; i > 0; i--) p.lineTo(loop[i]![0], loop[i]![1]);
          p.closePath();
        },
        color: "#e3d1a8",
        rim: "#fff4d8",
        lift: 0.6,
      },
      {
        shape: loop.map(([x, y]) => [x + 3.2, y - 4.4] as Point),
        color: "#f3e8cc",
        lift: 1.4,
        fold: { from: [11, 9.5], to: [20.5, 17], depth: 0.12, side: 1 },
      },
      {
        shape: (p) => {
          // Two crossed blades.
          p.moveTo(30, 3);
          p.lineTo(31.2, 4.6);
          p.lineTo(20, 14.4);
          p.lineTo(18.6, 13.2);
          p.closePath();
          p.moveTo(31.4, 12.4);
          p.lineTo(30.4, 14.2);
          p.lineTo(18.8, 9.8);
          p.lineTo(19.6, 8.2);
          p.closePath();
        },
        color: ink,
        lift: 1.1,
      },
    ]);
  },
};
