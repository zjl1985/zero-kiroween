import { piece, line, stitch, box, type Ctx } from "./paper-material.js";
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
  const dx = Math.cos(a) * len,
    dy = Math.sin(a) * len;
  line(ctx, x - dx, y - dy, x + dx, y + dy, c, 2.2);
  line(ctx, x + dx * 0.4, y + dy * 0.4, x + dx, y + dy, "#fff1c6", 2.2);
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
