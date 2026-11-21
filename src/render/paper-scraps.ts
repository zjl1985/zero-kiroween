/**
 * Shared painters for torn and burnt paper: scraps lying on the ground, torn
 * edges, curled flaps and ash. Drawn flat by the paper ruleset (hard shadow
 * down-right, lit rim toward the moon, no blur or gradients) and sized to
 * read at gameplay zoom: a few large pieces rather than many specks. Pure
 * Canvas code; seeds come from world-gen or render hashes, never the sim RNG.
 */
import { hash, mix, type Ctx, type Point } from "./paper-material.js";
import { crease, flatCut, flatShadow, tornEdge } from "./paper-kit.js";

/** Moved to the paper kit; re-exported so older imports keep working. */
export { tornEdge };

/** The lighter back of a sheet, seen where a torn piece curls over. */
export const backSide = (color: string): string => mix(color, "#f6e8c8", 0.55);

/**
 * Large paper scraps lying around (x, y): torn quadrilaterals with one corner
 * curled up to show the pale back. `count` is the old speck budget; about one
 * large scrap is laid for every 2.5 specks it used to cost.
 */
export function scrapPieces(
  ctx: Ctx,
  x: number,
  y: number,
  spread: number,
  colors: readonly string[],
  seed: number,
  count: number,
): void {
  const n = Math.max(2, Math.min(5, Math.round(count / 2.5)));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1),
      px = x + (t - 0.5) * spread * 1.6 + (hash(seed + i * 7) - 0.5) * spread * 0.3,
      py = y + (hash(seed + i * 11) - 0.5) * spread * 0.22,
      w = 6 + hash(seed + i * 5) * 5,
      a = (hash(seed + i * 3) - 0.5) * 1.2,
      c = colors[i % colors.length]!,
      ca = Math.cos(a),
      sa = Math.sin(a),
      at = (u: number, v: number): Point => [px + (u * ca - v * sa), py + (u * sa + v * ca) * 0.5];
    const body: Point[] = [at(-w, -w * 0.5), at(w * 0.15, -w * 0.72), at(w * 0.95, -w * 0.25), at(w * 0.7, w * 0.55), at(-w * 0.55, w * 0.6)];
    // A torn edge exposes the pale pulp between the printed face and reverse.
    const tear = tornEdge(body[0]![0], body[0]![1], body[1]![0], body[1]![1], 5, 0.7, seed + i);
    flatCut(ctx, [...tear, ...body.slice(2)], { color: c, thickness: 0.7, lift: 0.5, rim: 0.55, texture: 0.18 });
    const fibers = new Path2D();
    tear.forEach(([px, py], j) => j ? fibers.lineTo(px, py) : fibers.moveTo(px, py));
    ctx.save();
    ctx.strokeStyle = "#f4e9d5";
    ctx.lineWidth = 0.8;
    ctx.stroke(fibers);
    ctx.restore();
    // One corner curls up and over: the pale back of the paper with its own small shadow.
    const tip = body[2]!, k = 0.42;
    const curl: Point[] = [
      [tip[0] + (body[1]![0] - tip[0]) * k, tip[1] + (body[1]![1] - tip[1]) * k],
      [tip[0] - w * 0.45, tip[1] - w * 0.55],
      [tip[0] + (body[3]![0] - tip[0]) * k, tip[1] + (body[3]![1] - tip[1]) * k],
    ];
    flatCut(ctx, curl, { color: backSide(c), thickness: 0.5, lift: 0.7, rim: 0.4, texture: 0.3 });
    crease(ctx, curl[0]![0], curl[0]![1], curl[2]![0], curl[2]![1], 0.5);
  }
}

/** A burnt outline: jagged charred points around an oval. */
function burntOutline(x: number, y: number, rx: number, ry: number, seed: number, n = 16): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      r = (i % 2 ? 0.8 : 1) * (0.85 + hash(seed + i * 3) * 0.25);
    pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
  }
  return pts;
}

/**
 * Burnt paper on the ground: a charred sheet with a jagged burnt rim, a pale
 * ash outline just inside it, curled charred flakes standing up along the
 * edge and a few dying ember specks.
 */
export function ashPatch(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number): void {
  flatShadow(ctx, x, y + 1, rx * 0.95, ry * 0.8, 0.8);
  const outline = burntOutline(x, y, rx, ry, seed);
  flatCut(ctx, outline, { color: "#2f2927", edge: "#6d635b", thickness: 0.8, lift: 0.4, rim: 0.7, texture: 0.6 });
  // The pale ash ring where the burn front stopped.
  const ring = new Path2D();
  burntOutline(x, y, rx * 0.8, ry * 0.74, seed + 5).forEach(([px, py], i) => (i ? ring.lineTo(px, py) : ring.moveTo(px, py)));
  ring.closePath();
  ctx.save();
  ctx.globalAlpha *= 0.75;
  ctx.strokeStyle = "#9b928a";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 2.5]);
  ctx.stroke(ring);
  ctx.restore();
  flatCut(ctx, burntOutline(x + rx * 0.08, y - ry * 0.05, rx * 0.5, ry * 0.46, seed + 9, 12), { color: "#4c4440", thickness: 0.5, lift: 0, rim: 0.5, texture: 0.5 });
  // Curled charred flakes standing up on the rim, each with a lit edge.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + hash(seed + i) * 0.9,
      fx = x + Math.cos(a) * rx * 0.78,
      fy = y + Math.sin(a) * ry * 0.78,
      s = 3.2 + hash(seed + i * 7) * 2.2;
    const flake = new Path2D();
    flake.moveTo(fx - s, fy + 1);
    flake.quadraticCurveTo(fx - s * 0.6, fy - s * 1.4, fx + s * 0.4, fy - s * 1.1);
    flake.quadraticCurveTo(fx + s * 0.1, fy - s * 0.3, fx + s, fy + 1);
    flake.closePath();
    flatCut(ctx, flake, { color: "#1f1a1a", edge: "#7a6a5e", thickness: 0.5, lift: 0.6, rim: 0.45, texture: 0.3 });
  }
  ctx.save();
  ctx.fillStyle = "#e8833a";
  for (let i = 0; i < 3; i++) {
    const a = hash(seed + i * 19) * Math.PI * 2;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + Math.cos(a) * rx * 0.55 - 0.9, y + Math.sin(a) * ry * 0.5 - 0.9, 1.8, 1.8);
  }
  ctx.restore();
}

/** A short torn stub of a paper piece standing on the ground, with pale fibre along the tear. */
export function tornStub(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number, burnt = false): void {
  const top = tornEdge(x + w / 2, y - h, x - w / 2, y - h, 4, 2.6, seed),
    fill = burnt ? "#2b221e" : color;
  flatCut(ctx, [[x - w / 2, y + 1], [x + w / 2, y + 1], ...top], { color: fill, edge: burnt ? "#8a6a54" : mix(color, "#f0d9a8", 0.55), thickness: 0.9, lift: 0.9, texture: 0.6 });
  const tear = new Path2D();
  top.forEach(([px, py], i) => (i ? tear.lineTo(px, py + 0.6) : tear.moveTo(px, py + 0.6)));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = burnt ? "#e8833a" : backSide(color);
  ctx.globalAlpha *= burnt ? 0.7 : 0.9;
  ctx.lineWidth = 1.4;
  ctx.stroke(tear);
  ctx.restore();
}

/**
 * The torn-off top of a damaged prop, still hanging from part of the tear
 * and curled over the front: the pale back of the paper shows, with a crease
 * at the hinge and its own hard shadow. `line` runs along the tear.
 */
export function curledFlap(ctx: Ctx, line: readonly Point[], color: string, seed: number, depth: number): void {
  if (line.length < 4) return;
  const n = line.length,
    start = Math.floor(hash(seed) * (n * 0.4)),
    end = Math.min(n - 1, start + Math.max(2, Math.round(n * 0.45))),
    hinge = line.slice(start, end + 1),
    a = hinge[0]!,
    b = hinge[hinge.length - 1]!,
    lean = (hash(seed + 3) - 0.5) * depth * 0.5;
  const flap = new Path2D();
  hinge.forEach(([px, py], i) => (i ? flap.lineTo(px, py) : flap.moveTo(px, py)));
  flap.quadraticCurveTo(b[0] + lean * 0.3, b[1] + depth * 0.9, (a[0] + b[0]) / 2 + lean, (a[1] + b[1]) / 2 + depth);
  flap.quadraticCurveTo(a[0] - lean * 0.2, a[1] + depth * 0.7, a[0], a[1]);
  flap.closePath();
  flatCut(ctx, flap, { color: backSide(color), thickness: 0.8, lift: 0.9, rim: 0.6, texture: 0.45 });
  crease(ctx, a[0], a[1] + 0.5, b[0], b[1] + 0.5, 0.8);
  // Torn fibres on the flap's free edge.
  ctx.save();
  ctx.strokeStyle = mix(color, "#1c142b", 0.25);
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = 0.7;
  ctx.setLineDash([1.6, 1.8]);
  const edge = new Path2D();
  edge.moveTo(b[0], b[1]);
  edge.quadraticCurveTo(b[0] + lean * 0.3, b[1] + depth * 0.9, (a[0] + b[0]) / 2 + lean, (a[1] + b[1]) / 2 + depth);
  ctx.stroke(edge);
  ctx.restore();
}
