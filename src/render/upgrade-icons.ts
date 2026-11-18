import { box, mix, type Point } from "./paper-material.js";
import { flatLayer, paperEmblem, placePoints, stitchAlong } from "./paper-kit.js";
import { upgradeDef, type UpgradeId } from "../game/upgrades.js";
import { CAT_ART, upgradeIcon } from "./art-registry.js";

/** Tag paper and ink of the shared pool; a cat's own pool uses its art colours. */
const ANY_POOL = { paper: "#3a4a52", ink: "#e6d3a6" } as const;
function poolColors(pool: string): { paper: string; ink: string } {
  if (pool === "any" || !CAT_ART.has(pool)) return ANY_POOL;
  const c = CAT_ART.get(pool).colors;
  return { paper: c.cardPaper, ink: c.cardInk };
}

/** A generic emblem cat head with ears (not a character face), clockwise on screen, around (0, 0). */
export const CAT_HEAD: readonly Point[] = [
  [-6.5, 0], [-6.2, -4], [-5.2, -9.6], [-1.8, -5.6], [1.8, -5.6], [5.2, -9.6], [6.2, -4], [6.5, 0], [5, 4.6], [0, 6.2], [-5, 4.6],
];
/** A paper heart cut, centred on (x, y) with half-height r; the outline runs clockwise. */
export function heartPath(x: number, y: number, r: number, p = new Path2D()): Path2D {
  p.moveTo(x, y - r * 0.45);
  p.bezierCurveTo(x + r * 0.75, y - r * 1.35, x + r * 1.65, y - r * 0.35, x, y + r);
  p.bezierCurveTo(x - r * 1.65, y - r * 0.35, x - r * 0.75, y - r * 1.35, x, y - r * 0.45);
  p.closePath();
  return p;
}
/** A meowline shard: a bent paper bolt of half-length `len` at angle `a`. */
export function boltPoints(x: number, y: number, a: number, len: number): Point[] {
  return placePoints(
    [[-1, 0.22], [-0.42, -0.18], [-0.08, -0.05], [0.3, -0.34], [1, -0.1], [0.42, 0.2], [0.06, 0.08], [-0.24, 0.38]],
    x,
    y,
    a,
    len,
  );
}

/** Show the actual charm at a readable size, held by cut corners on a flat paper mount. */
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
  // Back to front: (evolution gold backing), the mount, then the corner tabs that hold the charm.
  if (evolution) flatLayer(ctx, { shape: [[8, 12], [86, 9], [89, 86], [15, 91], [6, 78]], color: "#b38752", lift: 2, rim: "#f4d496" });
  flatLayer(ctx, { shape: mount, color: pool.paper, lift: 2.2, rim: mix(pool.paper, "#f2dcb0", 0.5), thickness: 2 });
  stitchAlong(ctx, def?.slot === "passive"
    ? [[20, 15], [75, 13], [84, 26], [80, 72], [69, 83], [26, 81], [12, 70], [13, 26]]
    : [[11, 22], [77, 12], [85, 22], [83, 73], [74, 82], [16, 84], [10, 75]], mix(pool.paper, pool.ink, 0.45), 0.55, 0);
  flatLayer(ctx, {
    shape: (p) => {
      p.moveTo(6, 19); p.lineTo(25, 16); p.lineTo(11, 37); p.closePath();
      p.moveTo(87, 75); p.lineTo(75, 86); p.lineTo(60, 87); p.lineTo(85, 67); p.closePath();
    },
    color: "#caab80",
    lift: 1.2,
    rim: "#f3dcae",
  });
  ctx.save();
  ctx.translate(14, 13);
  ctx.scale(2.1, 2.1);
  upgradeIcon(id)?.(ctx, evolution ? "#f0d69a" : pool.ink);
  ctx.restore();
}
/** Draws a HUD slot emblem by code: a flat cut paper tag plus the upgrade glyph. */
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
    const paper = evolution ? "#2c2a3e" : pool.paper;
    paperEmblem(ctx, [{ shape: box(1.5, 1.5, 28, 27.5, id.length), color: paper, lift: 0.8, rim: evolution ? "#f0d69a" : undefined }]);
    stitchAlong(ctx, box(3.5, 3.5, 24, 23.5, 2), pool.ink, 0.5);
  }
  upgradeIcon(id)?.(ctx, evolution ? "#f0d69a" : pool.ink);
}
