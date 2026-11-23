/**
 * HD-2D night lighting (plan step 8.1, decisions D1 and D6): an offscreen
 * light buffer at view size, filled with the ambient night colour (cool
 * blue-purple, warming with `dawnAmount`), with cached pre-blurred light
 * spots added for lamps, warm yard windows, lanterns, pumpkins, candles,
 * fire cells and skill hits; the buffer is multiplied onto the finished
 * scene. Light never changes the sprites' own ramps (spec section 5).
 *
 * Cost bounds: at most `LIGHTING.maxLights` spots after distance and view
 * culling; with no lights only one multiply fill runs (no buffer), and with
 * no lights and an identity ambient nothing runs at all. Spots are blurred
 * once at cache time (blur.ts); no canvas filter is set per frame. Flicker
 * comes from the render-only visHash of (time bucket, source), never from
 * unseeded randomness or the sim RNG; reduced motion holds it still.
 */
import { surface } from "../../engine/surface.js";
import type { EffectKind, SimState } from "../../game/types.js";
import { FIRE } from "../../defs/fire.js";
import { visHash } from "../hash.js";
import { boxBlurRGBA, pixelsToSurface } from "./blur.js";

type Ctx = CanvasRenderingContext2D;
export type Rgb = readonly [number, number, number];
export type LightKind = "fire" | "hit" | "moon" | "pumpkin" | "lantern" | "lamp" | "window" | "candle";

interface KindSpec {
  /** Half size of the spot at scale 1 (view pixels); ry < rx for the 2:1 ground. */
  rx: number;
  ry: number;
  rgb: Rgb;
  /** Strength at power 1 (buffer alpha of the spot centre). */
  power: number;
  /** Higher survives the cap first. */
  priority: number;
  /** Flicker depth (0 = steady). */
  flicker: number;
}

export const LIGHTING = {
  /** Most spots composited per frame. */
  maxLights: 32,
  /** World units from the focus (the cat) beyond which a source is dropped. */
  cull: 760,
  /** Ambient multiply colour at night and at full dawn. */
  ambient: { night: [164, 168, 214] as Rgb, dawn: [255, 236, 214] as Rgb },
  /** Flicker buckets per second. */
  flickerRate: 8,
  /** Spot falloff bands (pixel-art stepped light) and the cache-time blur. */
  bands: 5,
  blur: { radius: 2, passes: 2 },
  kinds: {
    fire: { rx: 48, ry: 30, rgb: [255, 150, 72], power: 0.9, priority: 6, flicker: 0.2 },
    hit: { rx: 34, ry: 22, rgb: [255, 216, 156], power: 0.75, priority: 5, flicker: 0 },
    moon: { rx: 46, ry: 28, rgb: [194, 212, 255], power: 0.75, priority: 5, flicker: 0 },
    pumpkin: { rx: 52, ry: 32, rgb: [255, 162, 74], power: 0.85, priority: 4, flicker: 0.12 },
    lantern: { rx: 72, ry: 44, rgb: [255, 224, 152], power: 0.9, priority: 4, flicker: 0.05 },
    lamp: { rx: 76, ry: 48, rgb: [255, 206, 140], power: 0.8, priority: 3, flicker: 0.04 },
    window: { rx: 22, ry: 16, rgb: [255, 196, 122], power: 0.7, priority: 2, flicker: 0 },
    candle: { rx: 26, ry: 18, rgb: [255, 188, 108], power: 0.7, priority: 2, flicker: 0.15 },
  } satisfies Record<LightKind, KindSpec>,
} as const;
const KIND_IDS: Record<LightKind, number> = { fire: 1, hit: 2, moon: 3, pumpkin: 4, lantern: 5, lamp: 6, window: 7, candle: 8 };

/** Glow centre heights above the foot (world units, 1 px each) of the sources world.ts gathers. */
export const LIGHT_HEIGHT: Readonly<Record<LightKind, number>> = { lamp: 30, lantern: 20, pumpkin: 8, candle: 9, fire: 8, hit: 10, moon: 12, window: 0 };
/** Impact kinds that light the ground while they live, and the light they give. */
export const IMPACT_LIGHT: Readonly<Partial<Record<EffectKind, LightKind>>> = {
  hit: "hit", defeat: "hit", claw: "hit", "echo-burst": "hit", "pumpkin-light": "hit", "pumpkin-pulse": "hit",
  evolve: "hit", levelup: "hit", "boss-down": "hit", "chest-open": "hit", "costume-burst": "hit",
  "moon-pulse": "moon", "moon-stun": "moon", "star-fall": "moon", shield: "moon", rescue: "moon",
};
/** Seconds over which a dying impact light fades out. */
export const IMPACT_FADE = 0.25;

/** A light in world units: foot point, height of the glow centre above the ground, strength 0..1. */
export interface LightSource {
  readonly kind: LightKind;
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly power?: number;
  readonly scale?: number;
}
/** A spot placed in view pixels. */
export interface PlacedLight {
  readonly kind: LightKind;
  readonly sx: number;
  readonly sy: number;
  readonly scale: number;
  readonly power: number;
}
export interface LightFrame {
  readonly ambient: Rgb;
  readonly lights: readonly PlacedLight[];
}
export interface LightView {
  /** World point -> view pixel (iso projection with zoom and shake). */
  project: (x: number, y: number) => { x: number; y: number };
  zoom: number;
  width: number;
  height: number;
  /** World point the cull distance is measured from. */
  focus: { x: number; y: number };
  dawn: number;
  time: number;
  reduced: boolean;
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
/** Ambient multiply colour for a dawn amount 0..1. */
export function ambientRgb(dawn: number): Rgb {
  const t = Math.max(0, Math.min(1, Number.isFinite(dawn) ? dawn : 0)), { night, dawn: d } = LIGHTING.ambient;
  return [lerp(night[0], d[0], t), lerp(night[1], d[1], t), lerp(night[2], d[2], t)];
}
const identity = (c: Rgb) => c[0] >= 255 && c[1] >= 255 && c[2] >= 255;

/** Render-only flicker factor of one source for a time bucket. */
function flicker(s: LightSource, time: number, reduced: boolean): number {
  const depth = LIGHTING.kinds[s.kind].flicker;
  if (!depth || reduced || !Number.isFinite(time)) return 1;
  const bucket = Math.floor(time * LIGHTING.flickerRate);
  const h = visHash(Math.imul(Math.round(s.x), 73856093) ^ Math.imul(Math.round(s.y), 19349663) ^ Math.imul(bucket, 83492791) ^ KIND_IDS[s.kind]);
  return 1 - depth * h;
}

/** What one frame can light, in world units (world.ts gathers it from what it draws). */
export interface LightInputs {
  /** Street and yard lamps: foot point and drawn scale. */
  readonly lamps: readonly { x: number; y: number; s: number }[];
  /** Warm yard windows: world point and pane-centre height. */
  readonly windows: readonly { x: number; y: number; z: number }[];
  /** Decor pumpkins and candle clusters of the opening yard. */
  readonly decor: readonly { kind: string; x: number; y: number; s: number }[];
  readonly sim: Pick<SimState, "interactables" | "fire" | "impacts"> | null;
}

/** Light sources of a frame, in a fixed order (pure). */
export function gatherLights(input: LightInputs): LightSource[] {
  const out: LightSource[] = [], H = LIGHT_HEIGHT;
  const sim = input.sim;
  if (sim) {
    for (const [key, left] of Object.entries(sim.fire.cells)) {
      if (!(left > 0)) continue;
      const [ix, iy] = key.split(",").map(Number) as [number, number];
      out.push({ kind: "fire", x: (ix + 0.5) * FIRE.cell, y: (iy + 0.5) * FIRE.cell, z: H.fire, power: Math.min(1, 0.45 + left / FIRE.burnTime) });
    }
    for (const e of sim.impacts) {
      const kind = IMPACT_LIGHT[e.kind];
      if (kind && e.life > 0) out.push({ kind, x: e.x, y: e.y, z: H[kind], power: Math.min(1, e.life / IMPACT_FADE) });
    }
    for (const o of sim.interactables) {
      if (o.kind === "pumpkin" && o.lit > 0) out.push({ kind: "pumpkin", x: o.x, y: o.y, z: H.pumpkin * (o.s ?? 1), scale: o.s ?? 1 });
      if (o.kind === "lantern") out.push({ kind: "lantern", x: o.x, y: o.y, z: H.lantern * (o.s ?? 1), power: 0.3 + 0.7 * Math.max(0, Math.min(1, o.charge)), scale: o.s ?? 1 });
    }
  }
  for (const l of input.lamps) out.push({ kind: "lamp", x: l.x, y: l.y, z: H.lamp * l.s, scale: l.s });
  for (const w of input.windows) out.push({ kind: "window", x: w.x, y: w.y, z: w.z });
  for (const d of input.decor) {
    if (d.kind === "candles") out.push({ kind: "candle", x: d.x, y: d.y, z: H.candle * d.s, scale: d.s });
    // Decor pumpkins glow softly; lit interactive pumpkins are the strong ones.
    if (d.kind === "pumpkin") out.push({ kind: "pumpkin", x: d.x, y: d.y, z: H.pumpkin * d.s, scale: d.s, power: 0.45 });
  }
  return out;
}

/**
 * Culls, orders and caps the sources, and places them in view pixels. Pure:
 * the same sources and view give the same frame. Order: priority, then
 * distance to the focus, then input order.
 */
export function lightFrame(sources: readonly LightSource[], view: LightView): LightFrame {
  const ambient = ambientRgb(view.dawn), kept: { s: LightSource; d: number; i: number; sx: number; sy: number; scale: number }[] = [];
  sources.forEach((s, i) => {
    if ((s.power ?? 1) <= 0) return;
    const d = Math.hypot(s.x - view.focus.x, s.y - view.focus.y);
    if (!(d <= LIGHTING.cull)) return;
    const k = LIGHTING.kinds[s.kind], scale = (s.scale ?? 1) * view.zoom, p = view.project(s.x, s.y);
    const sx = p.x, sy = p.y - (s.z ?? 0) * view.zoom, rx = k.rx * scale, ry = k.ry * scale;
    if (sx + rx < 0 || sx - rx > view.width || sy + ry < 0 || sy - ry > view.height) return;
    kept.push({ s, d, i, sx, sy, scale });
  });
  kept.sort((a, b) => LIGHTING.kinds[b.s.kind].priority - LIGHTING.kinds[a.s.kind].priority || a.d - b.d || a.i - b.i);
  const lights = kept.slice(0, LIGHTING.maxLights).map(({ s, sx, sy, scale }) => ({
    kind: s.kind, sx, sy, scale,
    power: Math.min(1, s.power ?? 1) * LIGHTING.kinds[s.kind].power * flicker(s, view.time, view.reduced),
  }));
  return { ambient, lights };
}

/**
 * Pixels of one light spot: a stepped 2:1 ellipse falloff (`LIGHTING.bands`
 * bands) in the kind's colour, blurred once. Pure of the kind.
 */
export function spotPixels(kind: LightKind): { width: number; height: number; data: Uint8ClampedArray } {
  const k = LIGHTING.kinds[kind], m = LIGHTING.blur.radius * LIGHTING.blur.passes;
  const width = 2 * (k.rx + m), height = 2 * (k.ry + m), data = new Uint8ClampedArray(width * height * 4), bands = LIGHTING.bands;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - width / 2) / k.rx, dy = (y + 0.5 - height / 2) / k.ry, f = 1 - Math.hypot(dx, dy);
      if (f <= 0) continue;
      const band = Math.ceil(f * bands) / bands, o = (y * width + x) * 4;
      data[o] = k.rgb[0];
      data[o + 1] = k.rgb[1];
      data[o + 2] = k.rgb[2];
      data[o + 3] = Math.round(255 * band ** 1.6);
    }
  boxBlurRGBA(data, width, height, LIGHTING.blur.radius, LIGHTING.blur.passes);
  return { width, height, data };
}

/** A drawable spot image and its size at scale 1. */
export interface Spot { image: CanvasImageSource; width: number; height: number }
const spots = new Map<LightKind, Spot | null>();
const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
/** Cached spot image of a kind (one per kind, so the cache is bounded by the kinds). */
export function lightSpot(kind: LightKind): Spot | undefined {
  if (!spots.has(kind)) {
    const p = spotPixels(kind), image = pixelsToSurface(canMake() ? surface : undefined, p.data, p.width, p.height);
    spots.set(kind, image ? { image, width: p.width, height: p.height } : null);
  }
  return spots.get(kind) ?? undefined;
}

/** The view-size light buffer; reused while the view size holds. */
export interface LightBuffer { canvas: CanvasImageSource & { width: number; height: number }; ctx: Ctx }
let buffer: LightBuffer | null = null;
function viewBuffer(width: number, height: number): LightBuffer | undefined {
  const w = Math.max(1, Math.ceil(width)), h = Math.max(1, Math.ceil(height));
  if (buffer && buffer.canvas.width === w && buffer.canvas.height === h) return buffer;
  if (!canMake()) return undefined;
  const canvas = surface(w, h), ctx = canvas.getContext("2d") as Ctx | null;
  if (!ctx) return undefined;
  if (buffer) { buffer.canvas.width = 0; buffer.canvas.height = 0; }
  buffer = { canvas: canvas as LightBuffer["canvas"], ctx };
  return buffer;
}
/** Releases the light buffer and the cached spots. */
export function clearLighting(): void {
  if (buffer) { buffer.canvas.width = 0; buffer.canvas.height = 0; }
  buffer = null;
  spots.clear();
}

export type LightComposite = "none" | "ambient" | "buffer";
export interface LightOptions {
  /** Test hooks: the buffer and spot images to use instead of the module caches. */
  buffer?: LightBuffer;
  spot?: (kind: LightKind) => Spot | undefined;
}
const css = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;

/**
 * Multiplies the light frame onto `ctx` in view pixels (identity transform
 * relative to the view). Returns what ran: nothing when there is nothing to
 * light, one ambient multiply fill when there are no spots, else the buffer.
 */
export function drawLighting(ctx: Ctx, frame: LightFrame, width: number, height: number, opts: LightOptions = {}): LightComposite {
  if (!frame.lights.length && identity(frame.ambient)) return "none";
  const buf = frame.lights.length ? opts.buffer ?? viewBuffer(width, height) : undefined;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "multiply";
  if (!buf) {
    ctx.fillStyle = css(frame.ambient);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return "ambient";
  }
  const b = buf.ctx, spotOf = opts.spot ?? lightSpot;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = "source-over";
  b.globalAlpha = 1;
  b.imageSmoothingEnabled = false;
  b.fillStyle = css(frame.ambient);
  b.fillRect(0, 0, buf.canvas.width, buf.canvas.height);
  b.globalCompositeOperation = "lighter";
  for (const l of frame.lights) {
    const s = spotOf(l.kind);
    if (!s) continue;
    const w = Math.round(s.width * l.scale), h = Math.round(s.height * l.scale);
    b.globalAlpha = Math.max(0, Math.min(1, l.power));
    b.drawImage(s.image, Math.round(l.sx - w / 2), Math.round(l.sy - h / 2), w, h);
  }
  b.globalCompositeOperation = "source-over";
  b.globalAlpha = 1;
  ctx.drawImage(buf.canvas, 0, 0, width, height);
  ctx.restore();
  return "buffer";
}
