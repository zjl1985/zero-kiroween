import { piece, line, stitch, box, type Ctx } from "./paper-material.js";
import { foldLine, paperCut } from "./paper-kit.js";
import { upgradeDef, type UpgradeId } from "../game/upgrades.js";
import { CAT_ART, upgradeIcon } from "./art-registry.js";

/** Tag paper and ink of the shared pool; a cat's own pool uses its art colours. */
const ANY_POOL = { paper: "#3a4a52", ink: "#e6d3a6" } as const;
function poolColors(pool: string): { paper: string; ink: string } {
  if (pool === "any" || !CAT_ART.has(pool)) return ANY_POOL;
  const c = CAT_ART.get(pool).colors;
  return { paper: c.cardPaper, ink: c.cardInk };
}

export function heart(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  const p = new Path2D(
    `M ${x} ${y + r} C ${x - r * 1.6} ${y - r * 0.2} ${x - r * 0.8} ${y - r * 1.4} ${x} ${y - r * 0.5} C ${x + r * 0.8} ${y - r * 1.4} ${x + r * 1.6} ${y - r * 0.2} ${x} ${y + r} Z`,
  );
  piece(ctx, p, color, { shadow: 1, thickness: 0.6, texture: 0.4 });
}
export function bolt(ctx: Ctx, x: number, y: number, a: number, len: number, c: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  paperCut(ctx, [[-len, 2], [-len * 0.46, -2], [len * 0.32, -2.6], [len, -0.8], [len * 0.54, 2], [-len * 0.17, 3.3]],
    { color: c, layers: 1, thickness: 0.65, shadow: 0.85, texture: 0.38, edge: "#fff1c6" });
  foldLine(ctx, -len * 0.46, -2, len * 0.54, 2, 0.4);
  ctx.restore();
}

/** Show the actual charm at a readable size, held by cut corners on an inked card. */
export function paintCardEmblem(canvas: HTMLCanvasElement, id: UpgradeId): void {
  const ctx = canvas.getContext("2d")!;
  const def = upgradeDef(id), pool = poolColors(def?.cat ?? "any");
  const evolution = def?.slot === "evolution", scale = canvas.width / 96;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const mount = def?.slot === "passive"
    ? new Path2D("M 17 12 L 77 10 L 88 25 L 83 74 L 71 87 L 24 85 L 8 72 L 9 24 Z")
    : new Path2D("M 7 19 L 79 8 L 89 20 L 87 75 L 76 86 L 13 88 L 6 77 Z");
  if (evolution) paperCut(ctx, [[8, 12], [86, 9], [89, 86], [15, 91], [6, 78]],
    { color: "#b38752", layers: 1, thickness: 1.25, shadow: 1.2, texture: 0.55, edge: "#f4d496" });
  paperCut(ctx, mount, { color: pool.paper, layers: 1, thickness: 1.6, shadow: 2, texture: 0.66, edge: "#cfb292" });
  paperCut(ctx, [[6, 19], [25, 16], [11, 37]], { color: "#caab80", thickness: 0.55, shadow: 0.9, texture: 0.43 });
  paperCut(ctx, [[87, 75], [75, 86], [60, 87], [85, 67]], { color: "#c6a980", thickness: 0.55, shadow: 0.9, texture: 0.43 });
  ctx.save();
  ctx.translate(14, 13);
  ctx.scale(2.1, 2.1);
  upgradeIcon(id)?.(ctx, evolution ? "#f0d69a" : pool.ink);
  ctx.restore();
}
/** Draws a card emblem by code: a cut paper tag plus the upgrade glyph. */
export function paintUpgradeIcon(canvas: HTMLCanvasElement, id: UpgradeId, compact = false): void {
  const ctx = canvas.getContext("2d")!,
    def = upgradeDef(id),
    pool = poolColors(def?.cat ?? "any"),
    evolution = def?.slot === "evolution",
    s = canvas.width / 32;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  if (!compact) {
    piece(ctx, box(1.5, 1.5, 29, 28.5, id.length), evolution ? "#2c2a3e" : pool.paper, {
      shadow: 1,
      thickness: 0.6,
      texture: 0.5,
      edge: evolution ? "#f0d69a" : undefined,
    });
    stitch(ctx, box(3.5, 3.5, 25, 24.5, 2), pool.ink, 0.5);
  }
  upgradeIcon(id)?.(ctx, evolution ? "#f0d69a" : pool.ink);
}
