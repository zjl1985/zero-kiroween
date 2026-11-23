/** Native-grid HUD artwork. Every primitive lands on whole canvas units;
 * CSS keeps the resulting pixels crisp at display scale. No scene/sim writes. */
import type { Ctx } from "./paper-material.js";
import { arcHeight, chunkCoords, mapPoint, type ArcPoint } from "../ui/journal-geometry.js";
import { CHUNK, SCREEN, WORLD, type Landmark } from "../game/world-gen.js";
import { viewRect, type Camera } from "./camera.js";
import { LANDMARK_ART } from "./art-registry.js";

function begin(canvas: HTMLCanvasElement): { ctx: Ctx; w: number; h: number } {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  return { ctx, w: canvas.width / 2, h: canvas.height / 2 };
}
function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
function glyph(ctx: Ctx, rows: readonly string[], x: number, y: number, size: number, colors: Record<string, string>): void {
  for (let row = 0; row < rows.length; row++) for (let col = 0; col < rows[row]!.length; col++) {
    const color = colors[rows[row]![col]!];
    if (color) rect(ctx, x + col * size, y + row * size, size, size, color);
  }
}
function pixelLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, dotted = false): void {
  let x = Math.round(x0), y = Math.round(y0);
  const endX = Math.round(x1), endY = Math.round(y1), dx = Math.abs(endX - x), dy = -Math.abs(endY - y),
    sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let err = dx + dy, n = 0;
  for (;;) {
    if (!dotted || n++ % 4 < 2) rect(ctx, x, y, 1, 1, color);
    if (x === endX && y === endY) break;
    const e = err * 2;
    if (e >= dy) { err += dy; x += sx; }
    if (e <= dx) { err += dx; y += sy; }
  }
}
const MOON = ["..111..", ".11221.", "1122221", "1122221", "1112221", ".11111.", "..111.."];
const SUN = ["...1...", ".1...1.", "..222..", "1.232.1", "..222..", ".1...1.", "...1..."];

export function paintSkyArc(canvas: HTMLCanvasElement, arc: ArcPoint, dawnShare: number): void {
  const { ctx, w, h } = begin(canvas),
    at = (t: number) => [Math.round(12 + t * (w - 24)), Math.round(8 + arcHeight(t) * (h - 21))] as const;
  for (let i = 0; i <= 36; i++) {
    const t = i / 36, [x, y] = at(t);
    rect(ctx, x, y, 2, 1, t >= 1 - dawnShare ? "#e7ad64" : "#6c8d87");
  }
  const [mx, my] = at(arc.t);
  glyph(ctx, arc.dawn ? SUN : MOON, mx - 7, my - 7, 2,
    arc.dawn ? { "1": "#b47b49", "2": "#efb766", "3": "#ffe2a2" }
      : { "1": "#f1d69b", "2": "#a6bdaf" });
}

export interface LanternView { hp: number; maxHp: number; shield: number; critical: boolean; time: number; }
/** Kept as a layout contract; native pixel hearts replace the old lantern string. */
export function lanternWidth(maxHp: number, shield: number): number { return Math.max(3, maxHp + shield) * 22 + 14; }
const HEART = [".11.11.", "1221221", "1232221", "1222221", ".12221.", "..121..", "...1..."];
const SHIELD = ["1111111", "1222221", "1233321", "1233321", ".12321.", "..121..", "...1..."];
export function paintLanterns(canvas: HTMLCanvasElement, v: LanternView): void {
  const { ctx, w, h } = begin(canvas), n = v.maxHp + v.shield,
    start = Math.round((w - n * 22) / 2 + 4), y = Math.max(3, Math.round((h - 14) / 2));
  for (let i = 0; i < n; i++) {
    const live = i < v.hp, shield = i >= v.maxHp;
    const colors = shield ? { "1": "#3b697c", "2": "#7ebbd0", "3": "#c3e6df" }
      : live ? { "1": v.critical ? "#ffd9a0" : "#803f4b", "2": "#e58069", "3": "#ffc291" }
        : { "1": "#4a5969", "2": "#243849", "3": "#344c5c" };
    glyph(ctx, shield ? SHIELD : HEART, start + i * 22, y, 2, colors);
  }
}

/** Segmented cooldown cartridge; ready is visible even with reduced motion. */
export function paintWick(canvas: HTMLCanvasElement, charge: number, ready: boolean, _time: number): void {
  const { ctx, w, h } = begin(canvas), x = Math.round(w / 2 - 9), y = h - 36,
    count = Math.round(Math.max(0, Math.min(1, charge)) * 6);
  rect(ctx, x + 4, y - 4, 10, 4, "#7e9a8b");
  rect(ctx, x, y, 18, 31, "#0b1e2b");
  rect(ctx, x + 2, y + 2, 14, 27, "#436067");
  for (let i = 0; i < 6; i++) rect(ctx, x + 4, y + 25 - i * 4, 10, 3,
    i < count ? ready ? "#eed28a" : "#81b99e" : "#203b47");
  if (ready) {
    rect(ctx, x + 8, y - 14, 3, 8, "#ffe6a0");
    rect(ctx, x + 5, y - 11, 9, 2, "#eab762");
  }
  rect(ctx, x + 2, y + 33, 14, 2, "#10232d");
}

const landmarkInk = (kind: string) => LANDMARK_ART.find(kind)?.ink ?? "#e3bd70";
export interface MinimapView {
  player: { x: number; y: number }; camera?: Camera; accent: string;
  explored: ReadonlySet<number>; landmarks: readonly Landmark[]; found: readonly string[];
  chests: readonly { x: number; y: number; big: boolean }[];
  boss: { x: number; y: number } | null;
}
export function paintMinimap(canvas: HTMLCanvasElement, v: MinimapView): void {
  const { ctx, w, h } = begin(canvas), margin = 4, mw = w - margin * 2, mh = h - margin * 2,
    at = (x: number, y: number) => {
      const p = mapPoint(x, y, mw, mh); return [Math.round(p.x + margin), Math.round(p.y + margin)] as const;
    };
  rect(ctx, 0, 0, w, h, "#0b1d2b");
  rect(ctx, 1, 1, w - 2, h - 2, "#587a78");
  rect(ctx, 3, 3, w - 6, h - 6, "#142c3b");
  ctx.save(); ctx.beginPath(); ctx.rect(margin, margin, mw, mh); ctx.clip();
  const cw = (CHUNK.width / WORLD.width) * mw, ch = (CHUNK.height / WORLD.height) * mh;
  for (const index of v.explored) {
    const { cx, cy } = chunkCoords(index), [x, y] = at(cx * CHUNK.width, cy * CHUNK.height);
    rect(ctx, x, y, Math.ceil(cw), Math.ceil(ch), "#3e655d");
  }
  for (let x = margin; x < w - margin; x += Math.max(1, Math.round(cw)))
    pixelLine(ctx, x, margin, x, h - margin, "#284653", true);
  for (let y = margin; y < h - margin; y += Math.max(1, Math.round(ch)))
    pixelLine(ctx, margin, y, w - margin, y, "#284653", true);
  const [hx, hy] = at(SCREEN.width / 2, SCREEN.height * 0.6);
  glyph(ctx, ["..1..", ".111.", "12221", ".232.", ".232."], hx - 2, hy - 2, 1,
    { "1": "#e8b06e", "2": "#d2d5b8", "3": "#29474e" });
  for (const l of v.landmarks) {
    const [x, y] = at(l.x, l.y);
    if (v.found.includes(l.id)) {
      rect(ctx, x - 1, y - 2, 3, 5, landmarkInk(l.kind));
      rect(ctx, x - 2, y - 1, 5, 3, landmarkInk(l.kind));
    } else {
      rect(ctx, x, y - 2, 1, 1, "#678780"); rect(ctx, x, y + 2, 1, 1, "#678780");
      rect(ctx, x - 2, y, 1, 1, "#678780"); rect(ctx, x + 2, y, 1, 1, "#678780");
    }
  }
  for (const c of v.chests) {
    const [x, y] = at(c.x, c.y);
    rect(ctx, x - 2, y - 1, 5, 3, c.big ? "#b6b7df" : "#e7ba64");
    rect(ctx, x, y, 1, 2, "#f9e2a1");
  }
  const [px, py] = at(v.player.x, v.player.y);
  if (v.boss) {
    const [bx, by] = at(v.boss.x, v.boss.y);
    pixelLine(ctx, px, py, bx, by, "#a96576", true);
    rect(ctx, bx - 2, by - 2, 5, 5, "#ed8d8c");
    rect(ctx, bx, by - 1, 1, 3, "#452a46");
  }
  // The view outline: the projected iso view's world corners when known, else its box.
  const view = viewRect(v.camera ?? v.player), [left, top] = at(view.x0, view.y0), [right, bottom] = at(view.x1, view.y1);
  const outline = v.camera?.polygon?.length
    ? v.camera.polygon.map((p) => at(p.x, p.y))
    : [[left, top], [right, top], [right, bottom], [left, bottom]] as const;
  outline.forEach(([x0, y0], i) => { const [x1, y1] = outline[(i + 1) % outline.length]!; pixelLine(ctx, x0, y0, x1, y1, "#8fb6a5"); });
  rect(ctx, px - 2, py - 2, 5, 5, "#0b2330"); rect(ctx, px - 1, py - 1, 3, 3, "#ffdf91");
  ctx.restore();
}

const PAW = [
  "....11....11....", "...1221..1221...", "...1221..1221...", "....11....11....",
  ".11..........11.", "1221........1221", "1221..1111..1221", ".11..122221..11.",
  "....12222221....", "...1222222221...", "...1222222221...", "....11111111....",
];
/** Pixel achievement badge, shared by results and roster selection. */
export function paintPaw(canvas: HTMLCanvasElement, ink: string, _seed: number): void {
  const { ctx, w, h } = begin(canvas), size = Math.max(1, Math.floor(Math.min(w / 20, h / 16))),
    x = Math.round((w - 16 * size) / 2), y = Math.round((h - 12 * size) / 2);
  glyph(ctx, PAW, x + size, y + size, size, { "1": "#081d2a", "2": "#081d2a" });
  glyph(ctx, PAW, x, y, size, { "1": ink, "2": "#e9cc87" });
}
