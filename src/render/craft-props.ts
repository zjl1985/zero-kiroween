/**
 * World props (fences, bushes, paper grass) in their sim phase, the fire grid
 * (flames, scorch, ash) and the scraps that flutter off torn props. Reads
 * SimState only; flutter comes from the sim's prop impacts, flicker from the
 * view time and render hashes. Never touches the sim RNG.
 */
import { FIRE } from "../defs/fire.js";
import { PROP_DEFS } from "../defs/registries.js";
import { PROP_PHASES, type PropSpot } from "../defs/types.js";
import { cachedSprite } from "../engine/sprite.js";
import type { Impact, SimState } from "../game/types.js";
import { EFFECT_LIFE } from "../game/types.js";
import { chunkContent, chunkOf } from "../game/world-gen.js";
import { PROP_ART, type PropArt } from "./art-registry.js";
import type { Camera } from "./camera.js";
import { viewRect } from "./camera.js";
import { glow, hash, mix, path, piece, type Ctx, type Point } from "./paper-material.js";

const PAD = 8;
type Add = (y: number, draw: () => void) => void;

function propSprite(art: PropArt, p: PropSpot, phase: 0 | 1 | 2, burnt: boolean) {
  const b = art.bounds,
    s = Math.round(p.s * 20) / 20,
    v = Math.abs(p.seed) % art.variants,
    w = (b.r - b.l) * s + PAD * 2,
    h = (b.b - b.t) * s + PAD * 2,
    ax = -b.l * s + PAD,
    ay = -b.t * s + PAD,
    name = PROP_PHASES[phase]!;
  return cachedSprite(
    `prop:${art.id}:${name}:${burnt ? 1 : 0}:${s}:${v}`,
    w,
    h,
    2,
    (c) => art.paint(c, ax, ay, s, v, name, burnt),
    { x: ax / w, y: ay / h },
  );
}
/** A cut-paper flame with an inner tongue; `k` 0..1 flickers its height. */
function flame(ctx: Ctx, x: number, y: number, size: number, k: number, seed: number): void {
  const h = size * (0.8 + k * 0.45),
    w = size * 0.42,
    sway = (k - 0.5) * size * 0.25;
  const outer: Point[] = [
    [x - w, y],
    [x - w * 0.9, y - h * 0.35],
    [x - w * 0.35 + sway, y - h * 0.62],
    [x - w * 0.2 + sway, y - h * 0.48],
    [x + sway * 1.4, y - h],
    [x + w * 0.35 + sway, y - h * 0.56],
    [x + w * 0.5 + sway, y - h * 0.7],
    [x + w * 0.95, y - h * 0.3],
    [x + w, y],
  ];
  piece(ctx, path(outer, true), "#df7434", { shadow: 0, edge: "#f7b25a", texture: 0, thickness: 0.6 });
  const inner: Point[] = [
    [x - w * 0.5, y],
    [x - w * 0.3 + sway * 0.6, y - h * 0.4],
    [x + sway, y - h * 0.68],
    [x + w * 0.35 + sway * 0.6, y - h * 0.38],
    [x + w * 0.5, y],
  ];
  piece(ctx, path(inner, true), hash(seed) > 0.5 ? "#f3c45b" : "#f0b54c", { shadow: 0, edge: "#fbe3a0", texture: 0, thickness: 0.4 });
}
const flicker = (time: number, seed: number) => 0.5 + 0.5 * Math.sin(time * (8 + hash(seed) * 5) + seed);

/** Props inside the view as y-sorted sprites, burning ones with flames. */
export function propSprites(ctx: Ctx, sim: SimState | null, seed: number, cam: Camera, time: number, add: Add): void {
  const view = viewRect(cam, 60),
    a = chunkOf(view.x0 - 120, view.y0 - 60),
    b = chunkOf(view.x1 + 120, view.y1 + 60);
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++)
      for (const p of chunkContent(seed, cx, cy).props) {
        const art = PROP_ART.find(PROP_DEFS.get(p.kind).art);
        if (!art) continue;
        const bd = art.bounds;
        if (p.x + bd.r * p.s < view.x0 || p.x + bd.l * p.s > view.x1 || p.y + bd.b * p.s < view.y0 || p.y + bd.t * p.s > view.y1)
          continue;
        const m = sim?.props[p.id],
          phase = m?.phase ?? 0,
          burnt = !!m?.burnt,
          burning = !!sim && m?.burnAt !== undefined && phase < 2 && sim.elapsed - m.burnAt < FIRE.tick * 1.6;
        add(p.y, () => {
          const sprite = propSprite(art, p, phase, burnt);
          if (burning) {
            // Charring: the paper browns while its edges glow.
            ctx.save();
            ctx.filter = "sepia(0.7) brightness(0.66)";
            sprite.draw(ctx, { x: p.x, y: p.y });
            ctx.restore();
            glow(ctx, p.x, p.y - 10 * p.s, 46 * p.s, "#f08a3c", 0.45, 0.6);
            art.flames.forEach(([fx, fy], i) =>
              flame(ctx, p.x + fx * p.s, p.y + fy * p.s, 13 * p.s, flicker(time, p.seed + i), p.seed + i),
            );
          } else sprite.draw(ctx, { x: p.x, y: p.y });
        });
      }
}
function cellsInView(cells: Record<string, number>, cam: Camera): [number, number, number][] {
  const view = viewRect(cam, FIRE.cell * 2),
    out: [number, number, number][] = [];
  for (const key in cells) {
    const [ix, iy] = key.split(",").map(Number) as [number, number],
      x = (ix + 0.5) * FIRE.cell,
      y = (iy + 0.5) * FIRE.cell;
    if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
    out.push([x, y, cells[key]!]);
  }
  return out;
}
/** Scorched ground under burning cells and the ash left behind (flat layer). */
export function drawFireGround(ctx: Ctx, sim: SimState, cam: Camera): void {
  const r = FIRE.cell * 0.62;
  ctx.save();
  for (const [x, y] of cellsInView(sim.fire.ash, cam)) {
    const sd = Math.floor(x * 7 + y * 13);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#2b2628";
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.9 + hash(sd) * 0.3), r * 0.55, hash(sd + 1) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#5c5450";
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 1, r * 0.45, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y] of cellsInView(sim.fire.cells, cam)) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#3a2420";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
/** One flame per burning cell, y-sorted with the rest of the world. */
export function fireSprites(ctx: Ctx, sim: SimState, cam: Camera, time: number, add: Add): void {
  for (const [x, y, left] of cellsInView(sim.fire.cells, cam)) {
    const sd = Math.floor(x * 3 + y * 5),
      // Flames grow as a cell catches and shrink as it burns out.
      life = Math.min(1, (FIRE.burnTime - left) / 0.4, left / 0.6);
    add(y + FIRE.cell * 0.3, () => {
      glow(ctx, x, y - 6, 34, "#f08a3c", 0.32 * life, 0.7);
      flame(ctx, x + (hash(sd) - 0.5) * 6, y + 4, 16 * Math.max(0.35, life), flicker(time, sd), sd);
    });
  }
}
/** Flecks, scraps and embers from prop impacts. Returns true when drawn. */
export function drawPropEffect(ctx: Ctx, e: Impact): boolean {
  if (e.kind !== "prop-tear" && e.kind !== "prop-scraps" && e.kind !== "ember") return false;
  const total = EFFECT_LIFE[e.kind],
    t = 1 - Math.max(0, e.life) / total,
    fade = 1 - t,
    art = e.src ? PROP_ART.find(e.src) : undefined,
    burnt = e.kind === "prop-scraps" && e.amount === 1,
    colors = burnt ? ["#3b3534", "#59504b", "#1f1a1d"] : (art?.scraps ?? ["#d8c8a0"]);
  ctx.save();
  if (e.kind === "ember") {
    for (let i = 0; i < 9; i++) {
      const sd = (e.seed ?? 0) * 31 + i,
        x = e.x + (hash(sd) - 0.5) * 40 + Math.sin(t * 6 + i) * 4,
        y = e.y - 4 - t * (24 + hash(sd + 1) * 30);
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = i % 3 ? "#f3a347" : "#fbe08f";
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
    return true;
  }
  const count = e.kind === "prop-tear" ? 5 : 12,
    spread = e.kind === "prop-tear" ? 22 : 38;
  for (let i = 0; i < count; i++) {
    const sd = (e.seed ?? 0) * 17 + i,
      dir = (hash(sd) - 0.5) * 2,
      up = 0.6 + hash(sd + 3) * 0.8,
      // Out and up, then a slow swaying fall like paper.
      x = e.x + dir * spread * t + Math.sin(t * 9 + i) * 3 * t,
      y = e.y - up * 30 * t + 44 * t * t + (burnt ? -30 * t : 0),
      w = 2.4 + hash(sd + 5) * 3,
      a = t * (4 + hash(sd + 7) * 6) * (i % 2 ? 1 : -1),
      c = colors[i % colors.length]!;
    ctx.save();
    ctx.globalAlpha = Math.min(1, fade * 1.6);
    ctx.translate(x, y);
    ctx.rotate(a);
    // Flutter: the fleck turns edge-on and back.
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 10 + i)));
    ctx.fillStyle = c;
    ctx.fill(path([[-w, -w * 0.5], [w * 0.8, -w * 0.7], [w, w * 0.4], [-w * 0.6, w * 0.6]]));
    ctx.strokeStyle = mix(c, "#f1dcb0", 0.5);
    ctx.lineWidth = 0.5;
    ctx.stroke(path([[-w, -w * 0.5], [w * 0.8, -w * 0.7]]));
    ctx.restore();
  }
  ctx.restore();
  return true;
}
