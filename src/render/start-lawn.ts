import { SCREEN } from "../game/world-gen.js";
import type { ViewRect } from "./camera.js";
import { flatCut } from "./paper-kit.js";
import { hash, oval, path, type Ctx, type Point } from "./paper-material.js";

const { width, height } = SCREEN;
const spread = 104;
/** Hand-cut extensions of the starter lawn, crossing its west, south and east tile edges. */
const lawnEdge: readonly Point[] = [
  [-61, -24], [-77, 246], [-58, 314], [-74, 391], [-54, 469], [-63, height - 12],
  [-27, height + 36], [58, height + 54], [145, height + 42], [218, height + 73],
  [296, height + 85], [367, height + 61], [430, height + 70], [514, height + 92],
  [591, height + 72], [667, height + 83], [740, height + 52], [818, height + 62],
  [901, height + 48], [width + 31, height + 39], [width + 68, height + 6],
  [width + 51, 480], [width + 75, 407], [width + 49, 335], [width + 66, 255],
  [width + 53, -24],
];

/** Distance to the authored yard footprint, for feathering colour and detail beyond it. */
export function yardDistance(x: number, y: number): number {
  return Math.hypot(Math.max(0, -x, x - width), Math.max(0, -y, y - height));
}

function reachesLawn({ x0, x1, y0 }: ViewRect, pad = 0): boolean {
  return x0 < width + spread + pad && x1 > -spread - pad && y0 < height + spread + pad;
}

/** District sheets wrap around the same lawn in paint and graphite. */
export function clipOutsideLawn(ctx: Ctx, tile: ViewRect): void {
  if (!reachesLawn(tile)) return;
  const outside = new Path2D();
  const left = Math.min(tile.x0, -spread) - 1, top = Math.min(tile.y0, -spread) - 1;
  outside.rect(left, top, Math.max(tile.x1, width + spread) - left + 1, Math.max(tile.y1, height + spread) - top + 1);
  outside.addPath(path(lawnEdge, true));
  ctx.clip(outside, "evenodd");
}

/** Small overlaps interrupt the paper edge where the lawn gives way to district stock. */
export function drawLawnVerge(ctx: Ctx, tile: ViewRect, seed: number): void {
  const pad = 42;
  if (!reachesLawn(tile, pad)) return;
  const colors = ["#505941", "#596046", "#484f3c"];
  for (let i = 1; i < lawnEdge.length - 2; i++) {
    const [ax, ay] = lawnEdge[i]!, [bx, by] = lawnEdge[i + 1]!;
    const salt = seed * 17 + i * 6971;
    if (hash(salt) < 0.22) continue;
    const t = 0.28 + hash(salt + 1) * 0.44;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (x + pad < tile.x0 || x - pad > tile.x1 || y + pad < tile.y0 || y - pad > tile.y1) continue;
    for (let j = 0; j < 3; j++) {
      const sd = salt + j * 379;
      const px = x + (hash(sd + 2) - 0.5) * 28, py = y + (hash(sd + 3) - 0.5) * 16;
      const shape = oval(px, py, 7 + hash(sd + 4) * 11, 3 + hash(sd + 5) * 6, sd, 0.22);
      flatCut(ctx, shape, { color: colors[j]!, thickness: 0.35, lift: 0.18, rim: 0.34, texture: 0.55 });
    }
  }
}
