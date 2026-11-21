/**
 * World props (fences, bushes, paper grass) in their sim phase, the fire grid
 * (flames, scorch, ash) and the scraps that flutter off torn props. Reads
 * SimState only; flutter comes from the sim's prop impacts, flicker from the
 * view time and render hashes. Never touches the sim RNG.
 */
import { reducedPaperMotion } from "./paper-motion.js";
import { FIRE } from "../defs/fire.js";
import { PROP_DEFS } from "../defs/registries.js";
import { PROP_PHASES, type PropSpot } from "../defs/types.js";
import { cachedSprite, type CanvasSprite } from "../engine/sprite.js";
import type { Impact, SimState } from "../game/types.js";
import { EFFECT_LIFE } from "../game/types.js";
import { chunkContent, chunkOf } from "../game/world-gen.js";
import { inFootprint } from "../game/props.js";
import { PROP_ART, PROP_LOOK, type PropArt } from "./art-registry.js";
import type { Camera } from "./camera.js";
import { viewRect } from "./camera.js";
import { paperOccludesActor } from "./craft-world.js";
import { glow, hash, mix, path, stroke, withFlatShadows, type Ctx, type Point } from "./paper-material.js";
import { PAPER_VALUE } from "./paper-rules.js";
import { gradeCanvas } from "./paper-value.js";
import { crease, flatCut, foldLine, PAPER_STOCK, tornEdge } from "./paper-kit.js";
import { drawPaperFlame, drawRegrowCue } from "./paper-status-art.js";
import { variant } from "./variants.js";
import { sketchAmount, sketchedSprite } from "./sprite-sketch.js";

const PAD = 8;
type Add = (y: number, draw: () => void, occludesPlayer?: boolean) => void;

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
    (c, canvas) => {
      withFlatShadows(() => art.paint(c, ax, ay, s, v, name, burnt));
      // Props sit with the scenery, a value step below cats, ink and shots.
      gradeCanvas(canvas, PAPER_VALUE.decor);
    },
    { x: ax / w, y: ay / h },
  );
}
/** Ink soaks into the cut's own alpha, with two restrained pooling/sheened edges. */
function inkCoating(sprite: CanvasSprite): CanvasSprite {
  if (!sprite.canvas) return sprite;
  return cachedSprite(`prop-ink:${sprite.id}`, sprite.width, sprite.height, sprite.scale, (c) => {
    sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 0.65;
    c.fillStyle = "#30233f";
    c.fillRect(0, 0, sprite.width, sprite.height);
    const w = sprite.width, h = sprite.height;
    c.globalAlpha = 0.3;
    c.fillStyle = "#21182f";
    c.fill(new Path2D(`M 0 ${h * 0.3} Q ${w * 0.6} ${h * 0.7} ${w} ${h * 0.2} L ${w} ${h} L 0 ${h} Z`));
    c.strokeStyle = "#b1a1bd";
    c.lineWidth = 1.1;
    c.stroke(new Path2D(`M ${w * 0.1} ${h * 0.32} Q ${w * 0.5} ${h * 0.58} ${w * 0.86} ${h * 0.31}`));
    c.restore();
  }, sprite.anchor);
}
const flame = drawPaperFlame;
/** Burn damage is baked into the prop's own alpha, never punched into the scene.
 * Three small holes leave the silhouette/obstacle readable. No time-based cache keys.
 */
function scorchedPaper(sprite: CanvasSprite): CanvasSprite {
  if (!sprite.canvas) return sprite;
  return cachedSprite(`prop-char-curl:${sprite.id}`, sprite.width, sprite.height, sprite.scale, (c) => {
    sprite.draw(c, { x: sprite.width * sprite.anchor.x, y: sprite.height * sprite.anchor.y });
    const w = sprite.width, h = sprite.height;
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "#362417";
    c.globalAlpha = 0.48;
    c.fillRect(0, 0, w, h);
    c.globalAlpha = 1;
    const holes: Path2D[] = [];
    for (let i = 0; i < 3; i++) {
      const x = w * (0.36 + i * 0.14), y = h * (0.55 + (i % 2) * 0.17),
        r = Math.min(6, w * 0.045, h * 0.045),
        hole = path([[x - r, y], [x - r * 0.5, y - r], [x + r * 0.8, y - r * 0.65],
          [x + r, y + r * 0.45], [x, y + r * 0.8]]);
      holes.push(hole);
      stroke(c, hole, "#21191c", 3, 0.9);
      // A curled reverse with a charred lip beside the missing paper.
      c.fillStyle = "#8c7258";
      c.fill(path([[x - r, y], [x - r * 1.5, y - r * 1.15], [x, y - r * 1.4], [x - r * 0.5, y - r]]));
      crease(c, x - r * 1.5, y - r * 1.15, x, y - r * 1.4, 0.7);
    }
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "#000000";
    for (const hole of holes) c.fill(hole);
    c.restore();
  }, sprite.anchor);
}
export interface PropVisualState {
  readonly folded?: boolean;
  readonly inked?: boolean;
  readonly regrow?: number;
  /** Pencil amount (0 painted .. 1 colourless) of the paper under the prop. */
  readonly sketch?: number;
}
const flicker = (time: number, seed: number) => 0.5 + 0.5 * Math.sin(time * (8 + hash(seed) * 5) + seed);

/**
 * One prop at its base point in a phase. The cached sprite holds the art
 * variant; the placement look (size, tilt, mirror) comes from the prop's
 * seed through render/variants.ts. Also used by the ?gallery=1 page.
 */
export function drawProp(
  ctx: Ctx,
  art: PropArt,
  p: PropSpot,
  phase: 0 | 1 | 2,
  burnt: boolean,
  burning: boolean,
  time: number,
  state: PropVisualState = {},
): void {
  const sprite = propSprite(art, p, phase, burnt),
    look = variant(p.seed, { palette: art.scraps, ...(art.look ?? PROP_LOOK) });
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(look.angle);
  ctx.scale(look.flip * look.scale, look.scale);
  const folded = state.folded && phase < 2;
  ctx.save();
  if (folded) ctx.transform(1, 0, -0.2, 0.2, 0, 0);
  const inked = state.inked && phase < 2 ? inkCoating(sprite) : sprite,
    paper = state.sketch ? sketchedSprite(inked, state.sketch) : inked;
  if (burning) {
    // Charring stays inside the cached paper silhouette; flames remain live.
    scorchedPaper(paper).draw(ctx, { x: 0, y: 0 });
    glow(ctx, 0, -10 * p.s, 46 * p.s, "#f08a3c", 0.45, 0.6);
    art.flames.forEach(([fx, fy], i) => flame(ctx, fx * p.s, fy * p.s, 13 * p.s, flicker(time, p.seed + i), p.seed + i));
  } else paper.draw(ctx, { x: 0, y: 0 });
  ctx.restore();
  if (folded) {
    const b = art.bounds, y = b.t * p.s * 0.08;
    foldLine(ctx, b.l * p.s * 0.65, y, b.r * p.s * 0.65, y, 0.75);
    stroke(ctx, path([[b.l * p.s * 0.55, y + 1.5], [b.r * p.s * 0.55, y + 1.5]]), "#332b36", 1, 0.6);
  }
  if (phase === 2 && state.regrow) drawRegrowCue(ctx, 0, 0, state.regrow, p.s);
  ctx.restore();
}

/** Props inside the view as y-sorted sprites, burning ones with flames. */
export function propSprites(ctx: Ctx, sim: SimState | null, seed: number, cam: Camera, time: number, add: Add): void {
  const activeFire = sim ? cellsInView(sim.fire.cells, cam).filter(([, , left]) => left > 0) : [];
  const view = viewRect(cam, 60),
    a = chunkOf(view.x0 - 120, view.y0 - 60),
    b = chunkOf(view.x1 + 120, view.y1 + 60);
  for (let cy = a.cy; cy <= b.cy; cy++)
    for (let cx = a.cx; cx <= b.cx; cx++)
      for (const p of chunkContent(seed, cx, cy).props) {
        const def = PROP_DEFS.get(p.kind), art = PROP_ART.find(def.art);
        if (!art) continue;
        const bd = art.bounds;
        if (p.x + bd.r * p.s < view.x0 || p.x + bd.l * p.s > view.x1 || p.y + bd.b * p.s < view.y0 || p.y + bd.t * p.s > view.y1)
          continue;
        const m = sim?.props[p.id],
          phase = m?.phase ?? 0,
          burnt = !!m?.burnt,
          burning = !!sim && m?.burnAt !== undefined && phase < 2 && sim.elapsed - m.burnAt < FIRE.tick * 1.6 &&
                      activeFire.some(([x, y]) => inFootprint(p, def, x, y, 0));
        const elapsed = sim?.elapsed ?? 0, folded = m?.foldedUntil !== undefined,
          regrow = m?.regrowAt !== undefined && m.destroyedAt !== undefined
            ? Math.max(0, Math.min(1, (elapsed - m.destroyedAt) / Math.max(0.01, m.regrowAt - m.destroyedAt))) : 0;
        add(p.y, () => drawProp(ctx, art, p, phase, burnt, burning, time, {
          folded,
          inked: (m?.inkedUntil ?? 0) > elapsed,
          regrow,
          sketch: sim ? sketchAmount(sim, p.x, p.y) : 0,
        }), !!sim && phase < 2 && !folded && paperOccludesActor(p.x, p.y, p.s, bd, sim.player));
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
  for (const [x, y, left] of cellsInView(sim.fire.cells, cam)) {
    if (left <= 0) continue;
    const half = FIRE.cell / 2;
    // The scorched sheet is the actual square simulation cell, not an ellipse
    // implying a smaller safe corner or a larger decorative damage area.
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#633a2b";
    ctx.fillRect(x - half, y - half, FIRE.cell, FIRE.cell);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#c28a59";
    ctx.lineWidth = 0.75;
    ctx.strokeRect(x - half + 0.5, y - half + 0.5, FIRE.cell - 1, FIRE.cell - 1);
  }
  ctx.restore();
}
/** One flame per burning cell, y-sorted with the rest of the world. */
export function fireSprites(ctx: Ctx, sim: SimState, cam: Camera, time: number, add: Add): void {
  for (const [x, y, left] of cellsInView(sim.fire.cells, cam)) {
    if (left <= 0) continue;
    const sd = Math.floor(x * 3 + y * 5),
      // Flames grow as a cell catches and shrink as it burns out.
      life = Math.max(0, Math.min(1, (FIRE.burnTime - left) / 0.4, left / 0.6));
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
    motion = reducedPaperMotion() ? 0.2 : t,
    art = e.src ? PROP_ART.find(e.src) : undefined,
    burnt = e.kind === "prop-scraps" && e.amount === 1,
    colors = burnt ? ["#3b3534", "#59504b", "#1f1a1d"] : (art?.scraps ?? ["#d8c8a0"]);
  ctx.save();
  if (e.kind === "ember") {
    for (let i = 0; i < 9; i++) {
      const sd = (e.seed ?? 0) * 31 + i,
        x = e.x + (hash(sd) - 0.5) * 40 + Math.sin(motion * 6 + i) * 4,
        y = e.y - 4 - motion * (24 + hash(sd + 1) * 30);
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = i % 3 ? "#f3a347" : "#fbe08f";
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
    return true;
  }
  // A few large fluttering pieces read better at gameplay zoom than a cloud of specks.
  const count = e.kind === "prop-tear" ? 4 : 7,
    spread = e.kind === "prop-tear" ? 22 : 38;
  for (let i = 0; i < count; i++) {
    const sd = (e.seed ?? 0) * 17 + i,
      dir = (hash(sd) - 0.5) * 2,
      up = 0.6 + hash(sd + 3) * 0.8,
      // Out and up, then a slow swaying fall like paper.
      x = e.x + dir * spread * motion + Math.sin(motion * 9 + i) * 3 * motion,
      y = e.y - up * 30 * motion + 44 * motion * motion + (burnt ? -30 * motion : 0),
      w = 4 + hash(sd + 5) * 3.5,
      a = motion * (4 + hash(sd + 7) * 6) * (i % 2 ? 1 : -1),
      c = colors[i % colors.length]!;
    ctx.save();
    ctx.globalAlpha = Math.min(1, fade * 1.6);
    ctx.translate(x, y);
    ctx.rotate(a);
    // Flutter: the fleck turns edge-on and back.
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(motion * 10 + i)));
    const flip = Math.cos(motion * 10 + i) < 0;
    propFragment(c, flip, burnt, i % 3).draw(ctx, { x: 0, y: 0, scale: w / 6 });
    ctx.restore();
  }
  ctx.restore();
  return true;
}

/** Finite cut fragments: rough exposed fibres and a folded reverse, baked once. */
function propFragment(color: string, back: boolean, burnt: boolean, variant: number): CanvasSprite {
  return cachedSprite(`prop-fragment:${color}:${back}:${burnt}:${variant}`, 22, 18, 2, (c) => {
    const edge = tornEdge(4, 6, 14.8, 4.8, 7, 0.45, variant + 17),
      points: Point[] = [...edge, [16, 11.4], [6.4, 12.6]];
    flatCut(c, points, { ...PAPER_STOCK.thin, color: back && !burnt ? PAPER_STOCK.back : color, texture: 0 });
    stroke(c, path(edge), burnt ? "#796457" : "#f6e9d2", 0.85, 0.95);
    c.fillStyle = burnt ? "#342729" : mix(color, PAPER_STOCK.back, 0.65);
    c.fill(path([[6.4, 12.6], [9, 8.5], [16, 11.4]]));
    crease(c, 9, 8.5, 16, 11.4, 0.7);
  }, { x: 10 / 22, y: 9 / 18 });
}
