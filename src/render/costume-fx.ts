/**
 * Shared paper painters for costume skills: friendly ground sheets under the
 * zones a costume leaves (lanes, rings, pads, landing marks), standing zone
 * pieces (paper turret, go stones) and the three costume impact kinds.
 * Every costume art composes these with its own motif and colours, so no
 * costume id is named here. Reads SimState only; finite cached cuts keyed by
 * motif and colour, live transforms for everything that moves or fades.
 */
import { cachedSprite } from "../engine/sprite.js";
import type { CostumeZone, SimState } from "../game/types.js";
import { costumeArt, type AddSprite, type CostumeArt, type EffectPainter } from "./art-registry.js";
import { ring } from "./combat-fx.js";
import { paperFleck } from "./craft-combat.js";
import { flatCut, flatShadow, paperEmblem, starPoints } from "./paper-kit.js";
import { line, mix, oval, path, stroke, type Ctx, type Point } from "./paper-material.js";

export type LaneMotif = "road" | "beat" | "branch" | "water";
export type CircleMotif = "loop" | "safe" | "curtain" | "go" | "seal";
export type BurstMotif = "rocket" | "star";
/** Which marks a costume's zones get (by zone kind) and how long its telegraphs run. */
export interface ZoneLook {
  readonly lane?: LaneMotif;
  readonly circle?: CircleMotif;
  readonly burst?: BurstMotif;
  /** Seconds from activation to `armed` (for the closing telegraph ring). */
  readonly telegraph?: number;
  /** Seconds of the costume's timed buff: a ring under the cat while it runs. */
  readonly aura?: number;
}
type Colors = CostumeArt["colors"];

const fadeOf = (z: CostumeZone, elapsed: number) => Math.max(0, Math.min(1, (z.until - elapsed) * 3));
/** Circles at most this big are markers (go stones), not areas. */
const MARKER = 14;

/** A finite cached flat cut keyed by motif and colour, centred on (0, 0). */
function piece(key: string, w: number, h: number, paint: (c: Ctx) => void) {
  return cachedSprite(`costume-fx:${key}`, w, h, 2, (c) => {
    c.translate(w / 2, h / 2);
    paint(c);
  }, { x: 0.5, y: 0.5 });
}
const cut = (c: Ctx, shape: readonly Point[] | Path2D, color: string, lift = 0.7) =>
  flatCut(c, shape, { color, thickness: 0.7, lift, rim: 0.6, texture: 0.4 });

function lane(ctx: Ctx, z: CostumeZone, motif: LaneMotif, colors: Colors, fade: number): void {
  const x2 = z.x2 ?? z.x, y2 = z.y2 ?? z.y, len = Math.hypot(x2 - z.x, y2 - z.y) || 1,
    ux = (x2 - z.x) / len, uy = (y2 - z.y) / len, nx = -uy, ny = ux, w = z.radius;
  const at = (t: number, s: number): Point => [z.x + ux * t + nx * s, z.y + uy * t + ny * s];
  ctx.save();
  ctx.globalAlpha *= fade;
  // One friendly paper sheet laid flat along the lane.
  ctx.save();
  ctx.globalAlpha *= 0.16;
  ctx.fillStyle = colors.tag;
  ctx.fill(path([at(0, -w), at(len, -w), at(len, w), at(0, w)]));
  ctx.restore();
  const edge = new Path2D();
  for (const s of [-w, w]) {
    edge.moveTo(...at(0, s));
    edge.lineTo(...at(len, s));
  }
  stroke(ctx, edge, "#231c30", 2.2, 0.32);
  stroke(ctx, edge, colors.tag, 0.9, 0.8);
  const marks = new Path2D();
  if (motif === "road") {
    // Two wheel tracks and chevrons pointing down the road.
    for (const s of [-w * 0.45, w * 0.45]) for (let t = 6; t < len - 6; t += 14) {
      marks.moveTo(...at(t, s));
      marks.lineTo(...at(t + 8, s));
    }
    for (let t = 24; t < len - 10; t += 34) {
      marks.moveTo(...at(t - 6, -7));
      marks.lineTo(...at(t, 0));
      marks.lineTo(...at(t - 6, 7));
    }
    stroke(ctx, marks, colors.ink, 1.6, 0.75);
  } else if (motif === "beat") {
    // A dashed beat line with rising and falling tick marks.
    for (let t = 4, i = 0; t < len - 4; t += 16, i++) {
      const h = i % 2 ? 5 : 9;
      marks.moveTo(...at(t, -h));
      marks.lineTo(...at(t, h));
    }
    stroke(ctx, marks, colors.ink, 1.4, 0.7);
    const beat = new Path2D();
    beat.moveTo(...at(0, 0));
    beat.lineTo(...at(len, 0));
    ctx.save();
    ctx.setLineDash([6, 5]);
    stroke(ctx, beat, colors.ink, 1.1, 0.9);
    ctx.restore();
  } else if (motif === "branch") {
    // A twig along the lane with paper leaves at its knots.
    const twig = new Path2D();
    twig.moveTo(...at(0, 0));
    for (let t = 12; t <= len; t += 12) twig.lineTo(...at(t, (t / 12) % 2 ? 2.5 : -2.5));
    stroke(ctx, twig, "#5b4334", 2.2, 0.9);
    for (let t = 20; t < len; t += 30) {
      const [lx, ly] = at(t, (t / 30) % 2 ? 6 : -6);
      piece(`leaf:${colors.ink}`, 16, 12, (c) => cut(c, oval(0, 0, 5, 2.6), colors.ink, 0.5)).draw(ctx, { x: lx, y: ly });
    }
  } else {
    // A pencil water line with small ripple arcs.
    const wave = new Path2D();
    wave.moveTo(...at(0, 0));
    for (let t = 6; t <= len; t += 6) wave.lineTo(...at(t, Math.sin(t / 9) * 3.5));
    stroke(ctx, wave, "#2f4f7a", 2.4, 0.5);
    stroke(ctx, wave, colors.ink, 1.1, 0.95);
    for (let t = 18; t < len; t += 36) {
      const [rx, ry] = at(t, w * 0.55);
      stroke(ctx, new Path2D(`M ${rx - 5} ${ry} Q ${rx} ${ry - 3} ${rx + 5} ${ry}`), colors.ink, 0.9, 0.6);
    }
  }
  ctx.restore();
}

function circle(ctx: Ctx, z: CostumeZone, motif: CircleMotif, colors: Colors, elapsed: number, telegraph: number, fade: number): void {
  if (z.radius <= MARKER) return;
  const waiting = (z.armed ?? -Infinity) > elapsed;
  ctx.save();
  ctx.globalAlpha *= fade;
  if (waiting) {
    // Telegraph: a pale ring that closes as the zone arms.
    const left = (z.armed! - elapsed) / Math.max(0.1, telegraph);
    ctx.save();
    ctx.setLineDash([5, 6]);
    stroke(ctx, oval(z.x, z.y, z.radius, z.radius * 0.62), colors.tag, 1.2, 0.85);
    ctx.restore();
    ring(ctx, z.x, z.y, z.radius, colors.ink, 0.62, 1 - Math.max(0, Math.min(1, left)));
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha *= motif === "safe" ? 0.2 : 0.13;
  ctx.fillStyle = colors.tag;
  ctx.fill(oval(z.x, z.y, z.radius, z.radius * 0.62));
  ctx.restore();
  ring(ctx, z.x, z.y, z.radius, colors.ink, 0.62);
  const around = (n: number, draw: (x: number, y: number, a: number, i: number) => void) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      draw(z.x + Math.cos(a) * z.radius, z.y + Math.sin(a) * z.radius * 0.62, a, i);
    }
  };
  if (motif === "loop") {
    // Loop arrows chasing round the ring: "redo this bit".
    around(3, (x, y, a) => {
      const tx = -Math.sin(a), ty = Math.cos(a) * 0.62, k = Math.hypot(tx, ty) || 1;
      const ax = tx / k, ay = ty / k;
      stroke(ctx, path([[x - ax * 6 - ay * 5, y - ay * 6 + ax * 5], [x, y], [x - ax * 6 + ay * 5, y - ay * 6 - ax * 5]]), colors.ink, 1.8, 0.9);
    });
  } else if (motif === "safe") {
    around(4, (x, y) => piece(`safe-star:${colors.ink}`, 14, 14, (c) => cut(c, starPoints(0, 0, 4.5, 4, 0.45), colors.ink, 0.4)).draw(ctx, { x, y }));
  } else if (motif === "curtain") {
    // A scalloped pelmet edge: the comic pause on stage.
    const scallop = new Path2D();
    around(12, (x, y, a) => {
      scallop.moveTo(x + 5, y);
      scallop.ellipse(x, y, 5, 3, 0, 0, Math.PI, false);
      void a;
    });
    stroke(ctx, scallop, "#a8433c", 1.4, 0.85);
  } else if (motif === "go") {
    // A few grid lines of a go board inside the ring.
    const grid = new Path2D();
    for (const k of [-0.5, 0, 0.5]) {
      grid.moveTo(z.x - z.radius * 0.8, z.y + k * z.radius * 0.62);
      grid.lineTo(z.x + z.radius * 0.8, z.y + k * z.radius * 0.62);
      grid.moveTo(z.x + k * z.radius, z.y - z.radius * 0.5);
      grid.lineTo(z.x + k * z.radius, z.y + z.radius * 0.5);
    }
    stroke(ctx, grid, colors.ink, 0.8, 0.4);
  } else {
    // Paper seal tags pinned round the edge: "put away for tonight".
    around(4, (x, y) => piece(`seal-tag:${colors.tag}:${colors.ink}`, 22, 18, (c) => {
      cut(c, [[-7, -5], [7, -5], [7, 5], [-7, 5]], colors.tag, 0.6);
      cut(c, moon(0, 0, 3.2), colors.ink, 0.2);
    }).draw(ctx, { x, y }));
  }
  ctx.restore();
}
/** A crescent moon cut. */
export function moon(x: number, y: number, r: number): Path2D {
  const p = new Path2D();
  p.arc(x, y, r, 0.6, Math.PI * 2 - 0.6, false);
  p.arc(x + r * 0.55, y - r * 0.15, r * 0.82, Math.PI * 2 - 0.9, 0.9, true);
  p.closePath();
  return p;
}

function burst(ctx: Ctx, z: CostumeZone, motif: BurstMotif, colors: Colors, elapsed: number, telegraph: number): void {
  if ((z.armed ?? -Infinity) <= elapsed || z.clock === 1) return;
  // Friendly landing mark under actors: a pale target, a closing ring and the motif.
  const left = (z.armed! - elapsed) / Math.max(0.1, telegraph);
  ctx.save();
  ctx.globalAlpha *= 0.14;
  ctx.fillStyle = colors.tag;
  ctx.fill(oval(z.x, z.y, z.radius, z.radius * 0.62));
  ctx.restore();
  ctx.save();
  ctx.setLineDash([4, 5]);
  stroke(ctx, oval(z.x, z.y, z.radius, z.radius * 0.62), colors.tag, 1.3, 0.9);
  ctx.restore();
  ring(ctx, z.x, z.y, z.radius * (0.35 + 0.65 * Math.max(0, Math.min(1, left))), colors.ink, 0.62);
  motifPiece(motif, colors).draw(ctx, { x: z.x, y: z.y });
}
function motifPiece(motif: BurstMotif, colors: Colors) {
  return piece(`burst-${motif}:${colors.ink}`, 30, 30, (c) => {
    if (motif === "star") cut(c, starPoints(0, 0, 9, 5, 0.45), colors.ink, 0.8);
    else {
      // A folded paper rocket nose-down onto its mark.
      cut(c, [[-4, -10], [4, -10], [4, 4], [0, 10], [-4, 4]], "#e9e0cc", 0.8);
      cut(c, [[-4, -10], [-8, -13], [-4, -4]], colors.ink, 0.4);
      cut(c, [[4, -10], [8, -13], [4, -4]], colors.ink, 0.4);
      cut(c, oval(0, -1, 1.8, 1.8), colors.tag, 0.1);
    }
  });
}

function pad(ctx: Ctx, z: CostumeZone, colors: Colors, fade: number): void {
  ctx.save();
  ctx.globalAlpha *= fade;
  piece(`pad:${colors.tag}:${colors.ink}`, 40, 34, (c) => {
    // A square sticky note laid flat, one corner lifted.
    cut(c, [[-13, -10], [13, -11], [14, 9], [8, 11], [-12, 10]], colors.tag, 0.5);
    cut(c, [[8, 11], [14, 9], [9, 6]], mix(colors.tag, "#1c142b", 0.25), 0.4);
    for (const y of [-4, 1]) line(c, -8, y, 8, y - 0.5, mix(colors.tag, "#1c142b", 0.55), 1, 0.7);
  }).draw(ctx, { x: z.x, y: z.y });
  ctx.restore();
}

function turretPiece(colors: Colors) {
  return cachedSprite(`costume-fx:turret:${colors.tag}:${colors.ink}`, 40, 46, 2, (c) => {
    c.translate(20, 38);
    flatShadow(c, 0, 0, 12, 3.5);
    // A little folded paper easel with a rolled sketch barrel: "make one that runs first".
    cut(c, [[-10, 0], [-3, -18], [-1, -18], [-6, 0]], "#9a7a55", 0.6);
    cut(c, [[10, 0], [3, -18], [1, -18], [6, 0]], "#8a6c4b", 0.6);
    cut(c, [[-9, -28], [9, -28], [9, -14], [-9, -14]], colors.tag, 0.8);
    cut(c, [[0, -24], [15, -27], [15, -21], [0, -19]], "#efe2c4", 0.6);
    for (let i = 0; i < 4; i++) line(c, -7 + i * 4, -25, -6 + i * 4, -17, colors.ink, 0.7, 0.6);
  }, { x: 0.5, y: 38 / 46 });
}
function stonePiece(white: boolean) {
  return cachedSprite(`costume-fx:stone:${white ? "w" : "b"}`, 26, 18, 2, (c) => {
    c.translate(13, 10);
    flatShadow(c, 0, 3, 9, 2.5);
    cut(c, oval(0, 0, 8.5, 5.2), white ? "#f2ecdc" : "#1f1b22", 0.5);
  }, { x: 0.5, y: 10 / 18 });
}

/** All ground marks of a zone list (also used by the gallery preview with a fixed clock). */
export function drawZonesGround(ctx: Ctx, zones: readonly CostumeZone[], elapsed: number, look: ZoneLook, colors: Colors): void {
  const telegraph = look.telegraph ?? 0.8;
  for (const z of zones) {
    const fade = fadeOf(z, elapsed);
    if (fade <= 0) continue;
    if (z.kind === "lane") lane(ctx, z, look.lane ?? "road", colors, fade);
    else if (z.kind === "circle") circle(ctx, z, look.circle ?? "safe", colors, elapsed, telegraph, fade);
    else if (z.kind === "burst") burst(ctx, z, look.burst ?? "star", colors, elapsed, telegraph);
    else if (z.kind === "pad") pad(ctx, z, colors, fade);
    else if (z.kind === "turret") {
      ctx.save();
      ctx.globalAlpha *= 0.45 * fade;
      ctx.setLineDash([3, 6]);
      stroke(ctx, oval(z.x, z.y, z.radius, z.radius * 0.62), colors.tag, 1, 0.7);
      ctx.restore();
    }
  }
}
/** Standing pieces of a zone list: the paper turret and go stones, y-sorted. */
export function zoneSprites(ctx: Ctx, zones: readonly CostumeZone[], elapsed: number, colors: Colors, add: AddSprite): void {
  let stone = 0;
  for (const z of zones) {
    const fade = fadeOf(z, elapsed);
    if (fade <= 0) continue;
    const sprite = z.kind === "turret" ? turretPiece(colors) : z.kind === "circle" && z.radius <= MARKER ? stonePiece(stone++ % 2 === 0) : null;
    if (!sprite) continue;
    add(z.y, () => {
      ctx.save();
      ctx.globalAlpha *= fade;
      sprite.draw(ctx, { x: z.x, y: z.y });
      ctx.restore();
    });
  }
}

const FALLBACK: Colors = { tag: "#e9d9b0", ink: "#6c5a86" };
const colorsOf = (state?: SimState) => costumeArt(state)?.colors ?? FALLBACK;
/** The three costume impact kinds, tinted by the worn costume. */
export const COSTUME_EFFECTS: Readonly<Record<string, EffectPainter>> = {
  "costume-burst"(ctx, e, k, state) {
    const c = colorsOf(state), r = e.radius ?? 60;
    ctx.globalAlpha *= k.fade;
    ring(ctx, e.x, e.y, r * (0.4 + 0.6 * k.ease), c.ink, 0.62);
    ring(ctx, e.x, e.y, r * 0.3 * (1 + k.ease), c.tag, 0.62);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, d = 8 + k.ease * r * 0.8;
      paperFleck(ctx, e.x + Math.cos(a) * d, e.y - 6 + Math.sin(a) * d * 0.6 + k.t * k.t * 10, 3 * (0.6 + k.fade * 0.5), i % 2 ? c.tag : c.ink, a + k.t * 3);
    }
  },
  "costume-push"(ctx, e, k, state) {
    const c = colorsOf(state), r = e.radius ?? 120;
    ctx.globalAlpha *= k.fade;
    ring(ctx, e.x, e.y, r * (0.3 + 0.7 * k.ease), c.ink, 0.62);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, d = r * (0.25 + 0.7 * k.ease), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.62,
        ux = Math.cos(a), uy = Math.sin(a) * 0.62;
      stroke(ctx, path([[x - ux * 6 - uy * 5, y - uy * 6 + ux * 5], [x, y], [x - ux * 6 + uy * 5, y - uy * 6 - ux * 5]]), c.tag, 1.8, 0.9);
    }
  },
  "costume-pull"(ctx, e, k, state) {
    const c = colorsOf(state), r = e.radius ?? 200;
    ctx.globalAlpha *= k.fade;
    ring(ctx, e.x, e.y, r * (1 - 0.8 * k.ease), c.tag, 0.62);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k.t, d = r * (1 - 0.85 * k.ease);
      paperFleck(ctx, e.x + Math.cos(a) * d, e.y - 8 + Math.sin(a) * d * 0.6, 2.6, c.ink, a);
    }
  },
};

/**
 * Ground, sprites and effects of a costume's zones from its look and colours,
 * reading only the worn costume's state.
 */
export function zoneArt(look: ZoneLook, colors: Colors): Pick<CostumeArt, "ground" | "sprites" | "effects"> {
  return {
    effects: COSTUME_EFFECTS,
    ground(ctx, state) {
      const c = state.costume;
      if (!c) return;
      if (c.zones.length) drawZonesGround(ctx, c.zones, state.elapsed, look, colors);
      if (look.aura && c.buff > 0) {
        // A timed buff shows as a small friendly ring under the cat, emptying as it runs out.
        const p = state.player;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, c.buff * 2);
        ring(ctx, p.x, p.y, 24, colors.tag, 0.5, Math.min(1, c.buff / look.aura));
        ctx.restore();
      }
    },
    sprites(ctx, state, _time, add) {
      if (state.costume?.zones.length) zoneSprites(ctx, state.costume.zones, state.elapsed, colors, add);
    },
  };
}
/** A static gallery preview of sample zones at a fixed clock (no simulation). */
export function previewZones(ctx: Ctx, zones: readonly CostumeZone[], elapsed: number, look: ZoneLook, colors: Colors): void {
  drawZonesGround(ctx, zones, elapsed, look, colors);
  const standing: { y: number; draw: () => void }[] = [];
  zoneSprites(ctx, zones, elapsed, colors, (y, draw) => standing.push({ y, draw }));
  standing.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
}

/**
 * The wardrobe glyph: a hanging paper tag (layer 1), its punched-hole
 * reinforcement (layer 2) and the costume's own motif cut (layer 3), drawn
 * by the flat ruleset only (no gradients, blur or additive light).
 */
export function costumeTicket(ctx: Ctx, colors: Colors, motif: readonly Point[] | Path2D): void {
  paperEmblem(ctx, [
    { shape: [[6, 7], [21, 4], [28, 11], [27, 27], [8, 28]], color: colors.tag, lift: 0.9 },
    { shape: oval(23, 10, 2.4, 2.4), color: mix(colors.tag, "#1c142b", 0.35), lift: 0 },
    { shape: motif, color: colors.ink, lift: 0.7 },
  ]);
}
