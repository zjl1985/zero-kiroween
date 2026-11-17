/**
 * Shared painters for torn and burnt paper: scraps lying on the ground, torn
 * edges and ash. Pure Canvas code; seeds come from world-gen or render
 * hashes, never the sim RNG.
 */
import { hash, mix, oval, path, piece, shadow, stroke, type Ctx, type Point } from "./paper-material.js";

/** A jagged torn edge between two points (fresh tears show pale fibre). */
export function tornEdge(ax: number, ay: number, bx: number, by: number, teeth: number, depth: number, seed: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth,
      nx = -(by - ay),
      ny = bx - ax,
      len = Math.hypot(nx, ny) || 1,
      d = (i % 2 ? 1 : -0.4) * depth * (0.5 + hash(seed + i * 13));
    out.push([ax + (bx - ax) * t + (nx / len) * d, ay + (by - ay) * t + (ny / len) * d]);
  }
  return out;
}
/** Small paper pieces lying flat around (x, y), each with a cut edge and a thin shadow. */
export function scrapPieces(
  ctx: Ctx,
  x: number,
  y: number,
  spread: number,
  colors: readonly string[],
  seed: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const px = x + (hash(seed + i * 7) - 0.5) * spread * 2,
      py = y + (hash(seed + i * 11) - 0.5) * spread * 0.5,
      w = 3 + hash(seed + i * 5) * 4,
      a = hash(seed + i * 3) * Math.PI,
      c = colors[i % colors.length]!,
      pts: Point[] = [];
    for (let k = 0; k < 5; k++) {
      const ang = a + (k / 5) * Math.PI * 2,
        r = w * (0.55 + hash(seed + i * 17 + k) * 0.6);
      pts.push([px + Math.cos(ang) * r, py + Math.sin(ang) * r * 0.45]);
    }
    piece(ctx, path(pts), c, { shadow: 0.6, thickness: 0.45, texture: 0.5, edge: mix(c, "#f1dcb0", 0.45) });
  }
}
/** A charred patch of ash with curled dark edges. */
export function ashPatch(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number): void {
  shadow(ctx, x, y, rx * 0.9, ry * 0.7);
  piece(ctx, oval(x, y, rx, ry, seed, 0.35), "#3b3534", {
    shadow: 0.4,
    edge: "#6d5d52",
    texture: 0.7,
    thickness: 0.6,
  });
  piece(ctx, oval(x + rx * 0.1, y - ry * 0.05, rx * 0.62, ry * 0.58, seed + 3, 0.4), "#59504b", {
    shadow: 0,
    edge: "#8a7a6c",
    texture: 0.6,
    thickness: 0.4,
  });
  // Curled charred flakes along the rim.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hash(seed + i) * 0.6,
      fx = x + Math.cos(a) * rx * 0.85,
      fy = y + Math.sin(a) * ry * 0.85,
      curl = new Path2D();
    curl.moveTo(fx - 3, fy);
    curl.quadraticCurveTo(fx, fy - 4, fx + 3, fy - 1);
    stroke(ctx, curl, "#1f1a1d", 1.1, 0.8);
  }
}
/** A short torn stub of a paper piece standing on the ground. */
export function tornStub(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number): void {
  const top = tornEdge(x + w / 2, y - h, x - w / 2, y - h, 4, 2.2, seed);
  piece(ctx, path([[x - w / 2, y + 1], [x + w / 2, y + 1], ...top]), color, {
    shadow: 1.2,
    edge: mix(color, "#f0d9a8", 0.55),
    texture: 0.7,
    thickness: 0.7,
  });
}
