/**
 * Night lighting for the low native frame (docs/iso-art-spec.md section 8),
 * in the two-buffer manner of pixelfx: the scene keeps its night-tuned ramps
 * (no full-frame ambient multiply), and an additive light buffer at native
 * size adds warm pools for lamps, yard windows, lanterns, pumpkins, candles,
 * fire cells and skill hits, plus cool moon rims. Each light kind is one
 * cached spot sprite whose falloff is stepped into bands and dithered with
 * the 4 x 4 Bayer matrix (no blur, no gradient), so pools read as chunky
 * pixel light. The brightest kinds also get a small cached bloom sprite.
 * Toward dawn one low-alpha warm fill tints the frame; at dawn 0 it is skipped.
 *
 * Cost bounds: at most `LIGHTING.maxLights` spots after distance and view
 * culling, one clear plus one drawImage per spot (and per bloom) into the
 * buffer and one additive drawImage onto the scene. With no lights and no
 * dawn nothing runs. No canvas filter is set per frame. Flicker comes from
 * the render-only visHash of (time bucket, source); reduced motion holds it.
 */
import { surface } from "../../engine/surface.js";
import type { EffectKind, SimState } from "../../game/types.js";
import { FIRE } from "../../defs/fire.js";
import { visHash } from "../hash.js";
import { bayer } from "../pixelfx/math.js";
import { pixelsToSurface } from "./blur.js";
import { UPRIGHT_SCALE } from "./place.js";

type Ctx = CanvasRenderingContext2D;
export type Rgb = readonly [number, number, number];
export type LightKind = "fire" | "hit" | "moon" | "pumpkin" | "lantern" | "lamp" | "window" | "candle";

interface KindSpec {
  /** Half size of the spot at scale 1 (native pixels); ry < rx for the 2:1 ground. */
  rx: number;
  ry: number;
  /** Additive colour at the spot centre (0..255 per channel, before power). */
  rgb: Rgb;
  /** Strength at power 1 (alpha of the spot sprite when drawn). */
  power: number;
  /** Higher survives the cap first. */
  priority: number;
  /** Flicker depth (0 = steady). */
  flicker: number;
  /** Draw the small bloom sprite over the pool centre. */
  bloom: boolean;
}

export const LIGHTING = {
  /** Most spots composited per frame. */
  maxLights: 32,
  /** World units from the focus (the cat) beyond which a source is dropped. */
  cull: 760,
  /** Warm tint that grows toward dawn (source-over fill, alpha = dawn * alpha). */
  dawn: { rgb: [240, 176, 120] as Rgb, alpha: 0.2 },
  /** Flicker buckets per second. */
  flickerRate: 8,
  /** Falloff bands of the stepped pool; each band edge is Bayer dithered. */
  bands: 4,
  /** Falloff exponent (higher keeps the pool tighter around its centre). */
  falloff: 1.35,
  /** Bloom sprite half size (native pixels) and its centre colour. */
  bloom: { r: 5, rgb: [255, 226, 168] as Rgb },
  kinds: {
    fire: { rx: 26, ry: 15, rgb: [150, 70, 24], power: 0.95, priority: 6, flicker: 0.22, bloom: true },
    hit: { rx: 18, ry: 11, rgb: [130, 104, 66], power: 0.8, priority: 5, flicker: 0, bloom: false },
    moon: { rx: 24, ry: 14, rgb: [62, 82, 130], power: 0.8, priority: 5, flicker: 0, bloom: false },
    pumpkin: { rx: 24, ry: 14, rgb: [140, 70, 18], power: 0.85, priority: 4, flicker: 0.12, bloom: true },
    lantern: { rx: 36, ry: 21, rgb: [124, 92, 40], power: 0.9, priority: 4, flicker: 0.05, bloom: true },
    lamp: { rx: 38, ry: 22, rgb: [118, 82, 36], power: 0.85, priority: 3, flicker: 0.04, bloom: true },
    window: { rx: 12, ry: 8, rgb: [120, 80, 30], power: 0.75, priority: 2, flicker: 0, bloom: false },
    candle: { rx: 13, ry: 8, rgb: [120, 76, 26], power: 0.75, priority: 2, flicker: 0.15, bloom: false },
  } satisfies Record<LightKind, KindSpec>,
} as const;
const KIND_IDS: Record<LightKind, number> = { fire: 1, hit: 2, moon: 3, pumpkin: 4, lantern: 5, lamp: 6, window: 7, candle: 8 };

/** Glow centre heights above the foot (world units of the k = 1 art) of the sources world.ts gathers. */
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
  /** Native-pixel offset of the glow from the projected foot (baked voxel sprites; never scaled by UPRIGHT_SCALE). */
  readonly dx?: number;
  readonly lift?: number;
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
  /** Dawn amount 0..1 (warm tint strength). */
  readonly dawn: number;
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

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
/** CSS colour and alpha of the dawn tint for a dawn amount 0..1 (alpha 0 at night). */
export function dawnTint(dawn: number): { css: string; alpha: number } {
  const t = clamp01(dawn), c = LIGHTING.dawn.rgb;
  return { css: `rgb(${c[0]},${c[1]},${c[2]})`, alpha: t * LIGHTING.dawn.alpha };
}

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
  /** Emissive anchors of baked voxel sprites (gen-sprites.ts genGlows): foot plus native-pixel offset. */
  readonly glows?: readonly { kind: LightKind; x: number; y: number; dx: number; lift: number }[];
  readonly sim: Pick<SimState, "interactables" | "fire" | "impacts"> | null;
  readonly nativeEffects?: boolean;
}

/** Light sources of a frame, in a fixed order (pure). */
export function gatherLights(input: LightInputs): LightSource[] {
  const out: LightSource[] = [], H = LIGHT_HEIGHT;
  const sim = input.sim;
  if (sim) {
    for (const [key, left] of Object.entries(sim.fire.cells)) {
      if (!(left > 0)) continue;
      const [ix, iy] = key.split(",").map(Number) as [number, number];
      const power = Math.min(1, 0.45 + left / FIRE.burnTime) * (input.nativeEffects ? 0.37 : 1);
      out.push({ kind: "fire", x: (ix + 0.5) * FIRE.cell, y: (iy + 0.5) * FIRE.cell, z: H.fire, power });
    }
    for (const e of input.nativeEffects ? [] : sim.impacts) {
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
  for (const g of input.glows ?? []) out.push({ kind: g.kind, x: g.x, y: g.y, dx: g.dx, lift: g.lift, ...(g.kind === "pumpkin" ? { power: 0.5 } : {}) });
  return out;
}

/**
 * Culls, orders and caps the sources, and places them in view pixels. Pure:
 * the same sources and view give the same frame. Order: priority, then
 * distance to the focus, then input order. Heights are in the units of the
 * upright art, so they shrink with UPRIGHT_SCALE like the art does.
 */
export function lightFrame(sources: readonly LightSource[], view: LightView): LightFrame {
  const kept: { s: LightSource; d: number; i: number; sx: number; sy: number; scale: number }[] = [];
  sources.forEach((s, i) => {
    if ((s.power ?? 1) <= 0) return;
    const d = Math.hypot(s.x - view.focus.x, s.y - view.focus.y);
    if (!(d <= LIGHTING.cull)) return;
    const k = LIGHTING.kinds[s.kind], scale = (s.scale ?? 1) * view.zoom, p = view.project(s.x, s.y);
    const sx = p.x + (s.dx ?? 0) * view.zoom,
      sy = p.y - Math.round((s.z ?? 0) * view.zoom * UPRIGHT_SCALE) - (s.lift ?? 0) * view.zoom, rx = k.rx * scale, ry = k.ry * scale;
    if (sx + rx < 0 || sx - rx > view.width || sy + ry < 0 || sy - ry > view.height) return;
    kept.push({ s, d, i, sx, sy, scale });
  });
  kept.sort((a, b) => LIGHTING.kinds[b.s.kind].priority - LIGHTING.kinds[a.s.kind].priority || a.d - b.d || a.i - b.i);
  const lights = kept.slice(0, LIGHTING.maxLights).map(({ s, sx, sy, scale }) => ({
    kind: s.kind, sx, sy, scale,
    power: Math.min(1, s.power ?? 1) * LIGHTING.kinds[s.kind].power * flicker(s, view.time, view.reduced),
  }));
  return { dawn: clamp01(view.dawn), lights };
}

/**
 * Pixels of one light spot: a 2:1 ellipse whose falloff is quantised into
 * `LIGHTING.bands` bands, each band edge dithered with the 4 x 4 Bayer
 * matrix, in the kind's additive colour (opaque pixels, black outside). Pure
 * of the kind.
 */
export function spotPixels(kind: LightKind): { width: number; height: number; data: Uint8ClampedArray } {
  const k = LIGHTING.kinds[kind], width = 2 * k.rx, height = 2 * k.ry, bands = LIGHTING.bands;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - width / 2) / k.rx, dy = (y + 0.5 - height / 2) / k.ry, f = 1 - Math.hypot(dx, dy);
      if (f <= 0) continue;
      const level = Math.floor(f * bands + bayer(x, y)) / bands;
      if (level <= 0) continue;
      const v = Math.min(1, level) ** LIGHTING.falloff, o = (y * width + x) * 4;
      data[o] = Math.round(k.rgb[0] * v);
      data[o + 1] = Math.round(k.rgb[1] * v);
      data[o + 2] = Math.round(k.rgb[2] * v);
      data[o + 3] = 255;
    }
  return { width, height, data };
}

/** Pixels of the bloom sprite: a small dithered warm core (additive, black outside). */
export function bloomPixels(): { width: number; height: number; data: Uint8ClampedArray } {
  const { r, rgb } = LIGHTING.bloom, width = 2 * r, height = 2 * r, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const f = 1 - Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (f <= 0) continue;
      const level = Math.floor(f * 3 + bayer(x, y)) / 3;
      if (level <= 0) continue;
      const v = Math.min(1, level) ** 2 * 0.55, o = (y * width + x) * 4;
      data[o] = Math.round(rgb[0] * v);
      data[o + 1] = Math.round(rgb[1] * v);
      data[o + 2] = Math.round(rgb[2] * v);
      data[o + 3] = 255;
    }
  return { width, height, data };
}

/** A drawable spot image and its size at scale 1. */
export interface Spot { image: CanvasImageSource; width: number; height: number }
const spots = new Map<LightKind | "bloom", Spot | null>();
const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
function cachedSpot(key: LightKind | "bloom", make: () => { width: number; height: number; data: Uint8ClampedArray }): Spot | undefined {
  if (!spots.has(key)) {
    const p = make(), image = pixelsToSurface(canMake() ? surface : undefined, p.data, p.width, p.height);
    spots.set(key, image ? { image, width: p.width, height: p.height } : null);
  }
  return spots.get(key) ?? undefined;
}
/** Cached spot image of a kind (one per kind, so the cache is bounded by the kinds). */
export function lightSpot(kind: LightKind): Spot | undefined {
  return cachedSpot(kind, () => spotPixels(kind));
}
/** The cached bloom sprite. */
export function bloomSpot(): Spot | undefined {
  return cachedSpot("bloom", bloomPixels);
}

/** The view-size light buffer; reused while the view size holds. */
export interface LightBuffer { canvas: CanvasImageSource & { width: number; height: number }; ctx: Ctx }
let buffer: LightBuffer | null = null;
/** True when the buffer holds this frame's light (read by the retro layer's colour split). */
let bufferLive = false, liveCanvas: LightBuffer["canvas"] | undefined;
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
/** This frame's light buffer, or undefined when no light was drawn (retro.ts colour split). */
export function frameLightBuffer(): LightBuffer["canvas"] | undefined {
  return bufferLive ? liveCanvas : undefined;
}
/** Releases the light buffer and the cached spots. */
export function clearLighting(): void {
  if (buffer) { buffer.canvas.width = 0; buffer.canvas.height = 0; }
  buffer = null;
  bufferLive = false;
  liveCanvas = undefined;
  spots.clear();
}

export type LightComposite = "none" | "tint" | "buffer";
export interface LightOptions {
  /** Native-view emissive pixels from this frame's combat effects. */
  effects?: CanvasImageSource;
  /** Test hooks: the buffer and spot images to use instead of the module caches. */
  buffer?: LightBuffer;
  spot?: (kind: LightKind) => Spot | undefined;
  bloom?: () => Spot | undefined;
}

/**
 * Adds the light frame onto `ctx` in view pixels (identity transform
 * relative to the view). Returns what ran: nothing when there is nothing to
 * light, only the dawn tint when there are no spots, else the buffer.
 */
export function drawLighting(ctx: Ctx, frame: LightFrame, width: number, height: number, opts: LightOptions = {}): LightComposite {
  bufferLive = false;
  const tint = dawnTint(frame.dawn);
  if (!frame.lights.length && !opts.effects && tint.alpha <= 0) return "none";
  ctx.save();
  ctx.globalAlpha = 1;
  if (tint.alpha > 0) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.css;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
  const buf = frame.lights.length || opts.effects ? opts.buffer ?? viewBuffer(width, height) : undefined;
  if (!buf) {
    ctx.restore();
    return "tint";
  }
  const b = buf.ctx, spotOf = opts.spot ?? lightSpot, bloomOf = opts.bloom ?? bloomSpot;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = "source-over";
  b.globalAlpha = 1;
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, buf.canvas.width, buf.canvas.height);
  b.globalCompositeOperation = "lighter";
  if (opts.effects) b.drawImage(opts.effects, 0, 0);
  for (const l of frame.lights) {
    const s = spotOf(l.kind);
    if (!s) continue;
    const w = Math.round(s.width * l.scale), h = Math.round(s.height * l.scale);
    b.globalAlpha = Math.max(0, Math.min(1, l.power));
    b.drawImage(s.image, Math.round(l.sx - w / 2), Math.round(l.sy - h / 2), w, h);
  }
  const bloom = bloomOf();
  if (bloom) for (const l of frame.lights) {
    if (!LIGHTING.kinds[l.kind].bloom) continue;
    b.globalAlpha = Math.max(0, Math.min(1, l.power));
    b.drawImage(bloom.image, Math.round(l.sx - bloom.width / 2), Math.round(l.sy - bloom.height / 2));
  }
  b.globalCompositeOperation = "source-over";
  b.globalAlpha = 1;
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(buf.canvas, 0, 0, width, height);
  ctx.restore();
  bufferLive = true;
  liveCanvas = buf.canvas;
  return "buffer";
}
