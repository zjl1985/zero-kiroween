import { piece, path, oval, line, glow, stitch, box, type Ctx } from "./paper-material.js";
import { star } from "./combat-fx.js";
import { crescent } from "./craft-combat.js";
import { upgradeDef, type UpgradeId } from "../game/upgrades.js";

const POOL_PAPER = { any: "#3a4a52", zero: "#4a3a2c", nicole: "#3e3756" } as const;
const POOL_INK = { any: "#e6d3a6", zero: "#ecc47e", nicole: "#cdb8f2" } as const;

function heart(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  const p = new Path2D(
    `M ${x} ${y + r} C ${x - r * 1.6} ${y - r * 0.2} ${x - r * 0.8} ${y - r * 1.4} ${x} ${y - r * 0.5} C ${x + r * 0.8} ${y - r * 1.4} ${x + r * 1.6} ${y - r * 0.2} ${x} ${y + r} Z`,
  );
  piece(ctx, p, color, { shadow: 1, thickness: 0.6, texture: 0.4 });
}
function bolt(ctx: Ctx, x: number, y: number, a: number, len: number, c: string): void {
  const dx = Math.cos(a) * len,
    dy = Math.sin(a) * len;
  line(ctx, x - dx, y - dy, x + dx, y + dy, c, 2.2);
  line(ctx, x + dx * 0.4, y + dy * 0.4, x + dx, y + dy, "#fff1c6", 2.2);
}
function glyph(ctx: Ctx, id: UpgradeId, ink: string): void {
  switch (id) {
    case "vitality":
      heart(ctx, 16, 16, 7, "#e59a8a");
      line(ctx, 24, 6, 24, 12, ink, 1.6);
      line(ctx, 21, 9, 27, 9, ink, 1.6);
      break;
    case "snack":
      piece(ctx, box(10, 11, 12, 13, 3), "#efe6d2", { shadow: 1, thickness: 0.6 });
      piece(ctx, path([[10, 11], [13, 6], [19, 6], [22, 11]]), "#d8cdb5", { shadow: 0, thickness: 0.6 });
      heart(ctx, 16, 18, 3, "#e59a8a");
      break;
    case "swift":
      piece(ctx, oval(19, 17, 6, 5, 2), ink, { shadow: 1, thickness: 0.6 });
      for (const [x, y] of [[14, 10], [19, 9], [24, 11]] as const)
        piece(ctx, oval(x, y, 2, 2, x), ink, { shadow: 0.5, thickness: 0.4 });
      for (let i = 0; i < 3; i++) line(ctx, 3, 14 + i * 4, 10 - i, 14 + i * 4, "#9fb6b8", 1.4);
      break;
    case "magnet":
      piece(ctx, crescent(14, 16, 9, Math.PI), ink, { shadow: 1, thickness: 0.6 });
      for (const [x, y] of [[24, 10], [27, 17], [23, 23]] as const) star(ctx, x, y, 2.5, "#f3cf82");
      break;
    case "focus":
      piece(ctx, oval(16, 16, 10, 10, 4), "#2b3440", { shadow: 1, thickness: 0.6 });
      line(ctx, 16, 16, 16, 9, ink, 1.8);
      line(ctx, 16, 16, 21, 19, ink, 1.8);
      stitch(ctx, oval(16, 16, 8, 8, 5), ink, 0.9);
      break;
    case "scholar":
      piece(ctx, path([[5, 9], [16, 12], [27, 9], [27, 24], [16, 27], [5, 24]]), "#e9dfc8", { shadow: 1, thickness: 0.6 });
      line(ctx, 16, 12, 16, 27, "#9c8f77", 1);
      piece(ctx, crescent(22, 17, 3.5, -0.4), "#ecc879", { shadow: 0, thickness: 0.4 });
      break;
    case "bolt-power":
      bolt(ctx, 15, 17, -0.75, 9, ink);
      glow(ctx, 22, 10, 9, "#ffce7d", 0.6);
      star(ctx, 22, 10, 4, "#fff1c6");
      break;
    case "quick-draw":
      for (let i = 0; i < 3; i++) bolt(ctx, 12 + i * 5, 10 + i * 6, 0, 6, ink);
      break;
    case "split-bolt":
      for (const a of [-0.45, 0, 0.45]) bolt(ctx, 15 + Math.cos(a) * 4, 16 + Math.sin(a) * 4, a, 8, ink);
      break;
    case "pierce":
      for (const x of [12, 20]) piece(ctx, oval(x, 17, 3.5, 5, x), "#3b2d49", { shadow: 0.8, thickness: 0.5 });
      bolt(ctx, 16, 17, 0, 12, ink);
      break;
    case "long-shadow":
      piece(ctx, oval(12, 18, 6, 7, 3), "#6e8a98", { shadow: 0, thickness: 0.5 });
      piece(ctx, oval(20, 17, 6, 7, 4), ink, { shadow: 1.2, thickness: 0.6 });
      piece(ctx, path([[15, 11], [16, 6], [19, 10]]), ink, { shadow: 0, thickness: 0.5 });
      piece(ctx, path([[21, 10], [24, 6], [25, 11]]), ink, { shadow: 0, thickness: 0.5 });
      break;
    case "echo-legion":
      for (let i = 2; i >= 0; i--)
        piece(ctx, oval(10 + i * 6, 18 - i, 5.5, 6.5, i + 2), i ? (i === 1 ? "#8fb7c8" : "#6f8f9f") : ink, {
          shadow: i ? 0.4 : 1.2,
          thickness: 0.5,
        });
      bolt(ctx, 24, 9, -0.4, 4, "#a9d4e4");
      break;
    case "extra-star":
      star(ctx, 14, 18, 8, ink);
      star(ctx, 24, 9, 4.5, "#fff1ce");
      break;
    case "wide-orbit":
      stitch(ctx, oval(16, 17, 12, 7, 2), ink, 1);
      piece(ctx, oval(16, 17, 3.5, 3.5, 3), "#efe0b4", { shadow: 0.8, thickness: 0.5 });
      star(ctx, 27, 15, 3.5, ink);
      star(ctx, 5, 19, 3.5, ink);
      break;
    case "star-weight":
      star(ctx, 16, 15, 10, ink);
      piece(ctx, box(9, 24, 14, 3, 2), "#6b5a86", { shadow: 1, thickness: 0.5 });
      break;
    case "deep-fold":
      piece(ctx, path([[4, 22], [16, 8], [28, 22], [16, 27]]), "#5a4f7a", { shadow: 1.2, thickness: 0.6 });
      piece(ctx, path([[16, 8], [28, 22], [16, 27]]), "#7a6ca3", { shadow: 0, thickness: 0.5 });
      star(ctx, 15, 19, 3.5, ink);
      break;
    case "moon-shield":
      piece(ctx, path([[16, 4], [27, 9], [25, 20], [16, 28], [7, 20], [5, 9]]), "#64567a", { shadow: 1.2, thickness: 0.6, edge: ink });
      piece(ctx, path([[16, 8], [23, 11], [22, 19], [16, 24], [10, 19], [9, 11]]), "#7d6f9a", { shadow: 0, thickness: 0.4 });
      star(ctx, 16, 15, 4, ink);
      break;
    case "full-moon":
      glow(ctx, 16, 16, 16, "#f3dfa6", 0.6);
      piece(ctx, oval(16, 16, 9, 9, 7, 0.06), "#efe0b4", { shadow: 1.4, thickness: 0.6, edge: "#fff6d8" });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - 0.4;
        star(ctx, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 2.5, ink, a);
      }
      break;
  }
}
/** Draws a card emblem by code: a cut paper tag plus the upgrade glyph. */
export function paintUpgradeIcon(canvas: HTMLCanvasElement, id: UpgradeId, compact = false): void {
  const ctx = canvas.getContext("2d")!,
    def = upgradeDef(id),
    pool = def?.cat ?? "any",
    s = canvas.width / 32;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  if (!compact) {
    piece(ctx, box(1.5, 1.5, 29, 28.5, id.length), def?.evolution ? "#2c2a3e" : POOL_PAPER[pool], {
      shadow: 1,
      thickness: 0.6,
      texture: 0.5,
      edge: def?.evolution ? "#f0d69a" : undefined,
    });
    stitch(ctx, box(3.5, 3.5, 25, 24.5, 2), POOL_INK[pool], 0.5);
  }
  glyph(ctx, id, def?.evolution ? "#f0d69a" : POOL_INK[pool]);
}
