/**
 * HD-2D post layers (plan step 8.3, decisions D1 and D6), drawn in view
 * pixels after the light multiply: two parallax ground-fog layers, a capped
 * set of fireflies, falling leaves and ash, and pre-blurred foreground
 * leaves at the bottom screen corners (fake depth of field). The far layer,
 * the off-map tree wall and fog, is blurred in its own cache (off-map.ts).
 * The gameplay area itself stays sharp: fog is a faint veil and particles
 * are single pixels or small rectangles.
 *
 * Every image here is built once at cache time (blur.ts), never with a
 * canvas filter. Motion comes from time buckets and the render-only visHash
 * of (bucket, index), never from unseeded randomness or the sim RNG.
 * Reduced motion freezes the decorative animation (time 0); the camera
 * parallax still follows the view.
 */
import { surface } from "../../engine/surface.js";
import { visHash } from "../hash.js";
import { boxBlurRGBA, pixelsToSurface } from "./blur.js";

type Ctx = CanvasRenderingContext2D;
type Rgb = readonly [number, number, number];

interface FogLayer {
  /** Fraction of the camera movement the layer follows (ground = 1). */
  parallax: number;
  /** Drift in view pixels per second along x and y. */
  drift: readonly [number, number];
  alpha: number;
  rgb: Rgb;
  blobs: number;
  seed: number;
}

export const POST = {
  fog: {
    tile: { width: 320, height: 160 },
    /** Alpha bands before the blur (stepped, pixel-art fog). */
    steps: 4,
    blur: { radius: 4, passes: 3 },
    /** Fog thins toward dawn by this share. */
    dawnThin: 0.5,
    layers: [
      { parallax: 0.6, drift: [5, 1], alpha: 0.13, rgb: [150, 166, 206], blobs: 9, seed: 11 },
      { parallax: 1.3, drift: [-9, 2], alpha: 0.09, rgb: [182, 192, 226], blobs: 7, seed: 23 },
    ] as readonly FogLayer[],
  },
  particles: {
    /** Hard cap on particles per frame, all kinds together. */
    cap: 48,
    fireflies: 16,
    leaves: 10,
    ashPerFire: 2,
    ashMax: 24,
    /** Seconds of one particle life before its bucket re-rolls its start. */
    period: { firefly: 6, leaf: 7, ash: 2.2 },
    /** Wrap margin around the view (pixels). */
    pad: 24,
    firefly: { core: "#f2e38a", glow: "#b9a85a" },
    leaf: ["#c8743a", "#a4512e", "#d9a347", "#7f3f2a"],
    ash: ["#9a9a9e", "#6f6f76", "#c4c0b8"],
  },
  near: {
    width: 180,
    height: 120,
    blur: { radius: 2, passes: 2 },
    alpha: 0.9,
    /** Alpha when the cat stands inside the corner box. */
    faded: 0.35,
    leaves: ["#0b191c", "#11262a", "#1a3533"],
    clusters: 26,
    /** Sway amplitude (pixels) and speed (radians per second). */
    sway: { amount: 1.5, speed: 0.7 },
  },
} as const;

const mod = (a: number, m: number) => ((a % m) + m) % m;
const frac = (v: number) => v - Math.floor(v);
const hashOf = (...n: number[]) => visHash(n.reduce((s, v) => Math.imul(s ^ (v | 0), 0x01000193) ^ (s >>> 7), 0x811c9dc5));

// ---------------------------------------------------------------- fog
/**
 * Fog tile pixels of a layer: toroidal soft blobs in alpha bands, blurred
 * with wrap-around so the tile repeats without a seam. Pure of the layer.
 */
export function fogTilePixels(layer: number): { width: number; height: number; data: Uint8ClampedArray } {
  const L = POST.fog.layers[layer]!, { width, height } = POST.fog.tile, { radius, passes } = POST.fog.blur;
  const m = radius * passes, W = width + 2 * m, H = height + 2 * m, pad = new Uint8ClampedArray(W * H * 4);
  const blobs = Array.from({ length: L.blobs }, (_, j) => ({
    x: hashOf(L.seed, j, 1) * width, y: hashOf(L.seed, j, 2) * height,
    rx: 34 + hashOf(L.seed, j, 3) * 70, ry: 0, a: 0.45 + hashOf(L.seed, j, 4) * 0.55,
  })).map((b) => ({ ...b, ry: b.rx * 0.42 }));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tx = mod(x - m, width), ty = mod(y - m, height);
      let a = 0;
      for (const b of blobs) {
        // Toroidal distance: the tile wraps on both axes.
        const dx = Math.min(Math.abs(tx - b.x), width - Math.abs(tx - b.x)) / b.rx;
        const dy = Math.min(Math.abs(ty - b.y), height - Math.abs(ty - b.y)) / b.ry;
        const f = 1 - Math.hypot(dx, dy);
        if (f > 0) a = Math.max(a, f * b.a);
      }
      if (a <= 0) continue;
      const o = (y * W + x) * 4, band = Math.ceil(a * POST.fog.steps) / POST.fog.steps;
      pad[o] = L.rgb[0];
      pad[o + 1] = L.rgb[1];
      pad[o + 2] = L.rgb[2];
      pad[o + 3] = Math.round(255 * band);
    }
  boxBlurRGBA(pad, W, H, radius, passes);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) data.set(pad.subarray(((y + m) * W + m) * 4, ((y + m) * W + m + width) * 4), y * width * 4);
  return { width, height, data };
}

/** Tile origin of a fog layer in view pixels (in -tile..0), from the camera and time. */
export function fogOffset(layer: number, cameraX: number, cameraY: number, time: number, reduced: boolean): { x: number; y: number } {
  const L = POST.fog.layers[layer]!, { width, height } = POST.fog.tile, t = reduced || !Number.isFinite(time) ? 0 : time;
  return {
    x: Math.round(mod(-cameraX * L.parallax + t * L.drift[0], width)) - width,
    y: Math.round(mod(-cameraY * L.parallax + t * L.drift[1], height)) - height,
  };
}

const canMake = () => typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
const images = new Map<string, CanvasImageSource | null>();
function cachedImage(key: string, build: () => { width: number; height: number; data: Uint8ClampedArray }): CanvasImageSource | undefined {
  if (!images.has(key)) {
    const p = build();
    images.set(key, pixelsToSurface(canMake() ? surface : undefined, p.data, p.width, p.height) ?? null);
  }
  return images.get(key) ?? undefined;
}
/** Releases the cached fog tiles and foreground leaves. */
export function clearPost(): void {
  for (const image of images.values()) if (image && "width" in image) { (image as { width: number }).width = 0; (image as { height: number }).height = 0; }
  images.clear();
}

/** Both fog layers tiled over the view. Draws nothing where no canvas exists. */
export function drawFog(ctx: Ctx, width: number, height: number, cameraX: number, cameraY: number, time: number, reduced: boolean, dawn = 0): void {
  const { width: tw, height: th } = POST.fog.tile;
  POST.fog.layers.forEach((L, i) => {
    const tile = cachedImage(`fog:${i}`, () => fogTilePixels(i));
    if (!tile) return;
    const o = fogOffset(i, cameraX, cameraY, time, reduced);
    ctx.save();
    ctx.globalAlpha *= L.alpha * (1 - POST.fog.dawnThin * Math.max(0, Math.min(1, dawn)));
    for (let y = o.y; y < height; y += th)
      for (let x = o.x; x < width; x += tw) ctx.drawImage(tile, x, y, tw, th);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- particles
export type ParticleKind = "firefly" | "leaf" | "ash";
export interface Particle {
  readonly kind: ParticleKind;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: string;
  readonly alpha: number;
}
export interface ParticleView {
  width: number;
  height: number;
  /** Camera position in projected pixels (the ground scrolls by it). */
  cameraX: number;
  cameraY: number;
  time: number;
  reduced: boolean;
  dawn: number;
  /** Burning fire cells in view pixels (ash rises from the first few). */
  fires: readonly { x: number; y: number }[];
}

/** One particle's life: bucket and phase of index `i` with period `p` (pure). */
function life(i: number, salt: number, period: number, t: number): { bucket: number; u: number } {
  const v = t / period + hashOf(salt, i, 7);
  return { bucket: Math.floor(v), u: frac(v) };
}

/**
 * The frame's particles in view pixels, at most `POST.particles.cap`.
 * A pure function of the view: same input, same particles. Reduced motion
 * uses time 0, so the set holds still.
 */
export function particles(view: ParticleView): Particle[] {
  const P = POST.particles, t = view.reduced || !Number.isFinite(view.time) ? 0 : view.time;
  const dawn = Math.max(0, Math.min(1, view.dawn || 0)), out: Particle[] = [];
  const spanX = view.width + P.pad * 2, spanY = view.height + P.pad * 2;
  const wrap = (x: number, y: number, parallax: number) => ({
    x: Math.round(mod(x - view.cameraX * parallax, spanX) - P.pad),
    y: Math.round(mod(y - view.cameraY * parallax, spanY) - P.pad),
  });
  const flies = Math.round(P.fireflies * (1 - dawn));
  for (let i = 0; i < flies; i++) {
    const { bucket, u } = life(i, 101, P.period.firefly, t);
    const hx = hashOf(101, i, bucket, 1) * spanX, hy = hashOf(101, i, bucket, 2) * spanY;
    const at = wrap(hx + Math.sin(u * Math.PI * 2 + i) * 8, hy - u * 10 + Math.cos(u * Math.PI * 3 + i) * 4, 1);
    const blink = 0.55 + 0.45 * Math.sin(u * Math.PI * 6 + i * 1.7);
    const alpha = Math.sin(Math.PI * u) * blink * (1 - dawn);
    if (alpha <= 0.05) continue;
    out.push({ kind: "firefly", ...at, w: 2, h: 2, color: P.firefly.core, alpha: Math.min(1, alpha) });
  }
  for (let i = 0; i < P.leaves; i++) {
    const { bucket, u } = life(i, 211, P.period.leaf, t);
    const hx = hashOf(211, i, bucket, 1) * spanX, hy = hashOf(211, i, bucket, 2) * spanY;
    const at = wrap(hx + u * 26 + Math.sin(u * Math.PI * 4 + i) * 6, hy + u * 90, 1.1);
    const flat = Math.floor(u * 8 + i) % 2 === 0;
    out.push({
      kind: "leaf", ...at, w: flat ? 2 : 1, h: flat ? 1 : 2,
      color: P.leaf[Math.floor(hashOf(211, i, bucket, 3) * P.leaf.length)]!,
      alpha: Math.min(1, Math.sin(Math.PI * u) * 1.4),
    });
  }
  const ash = Math.min(P.ashMax, view.fires.length * P.ashPerFire);
  for (let i = 0; i < ash; i++) {
    const f = view.fires[i % view.fires.length]!, { bucket, u } = life(i, 307, P.period.ash, t);
    const dx = (hashOf(307, i, bucket, 1) - 0.5) * 20 + Math.sin(u * Math.PI * 2 + i) * 3;
    out.push({
      kind: "ash", x: Math.round(f.x + dx), y: Math.round(f.y - 6 - u * 38), w: 1, h: 1,
      color: P.ash[Math.floor(hashOf(307, i, bucket, 2) * P.ash.length)]!,
      alpha: 1 - u,
    });
  }
  // Ash first (it marks live fire), then fireflies and leaves, up to the cap.
  out.sort((a, b) => (a.kind === "ash" ? 0 : 1) - (b.kind === "ash" ? 0 : 1));
  return out.slice(0, P.cap);
}

/** Draws particles as whole-pixel rectangles; fireflies get a one-pixel glow ring. */
export function drawParticles(ctx: Ctx, list: readonly Particle[]): void {
  if (!list.length) return;
  ctx.save();
  const base = ctx.globalAlpha;
  for (const p of list) {
    if (p.kind === "firefly") {
      ctx.globalAlpha = base * p.alpha * 0.35;
      ctx.fillStyle = POST.particles.firefly.glow;
      ctx.fillRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    }
    ctx.globalAlpha = base * p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- near layer
/**
 * Foreground leaf clusters for the bottom-left corner (side 0) or the
 * mirrored bottom-right corner (side 1), blurred once: the fake
 * depth-of-field near layer. Pure of the side.
 */
export function nearLeavesPixels(side: 0 | 1): { width: number; height: number; data: Uint8ClampedArray } {
  const N = POST.near, { width, height } = N, { radius, passes } = N.blur;
  const data = new Uint8ClampedArray(width * height * 4);
  const rgb = N.leaves.map((c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] as const);
  for (let j = 0; j < N.clusters; j++) {
    // Clusters gather in the corner: radius from the corner grows with j.
    // The first clusters sit right in the corner so it is always filled.
    const reach = j < 3 ? 0.04 + j * 0.12 : 0.25 + 0.75 * hashOf(401, j, 1), ang = hashOf(401, j, 2) * Math.PI / 2;
    const cx = Math.cos(ang) * reach * width * 0.85, cy = height - Math.sin(ang) * reach * height * 0.9;
    const rx = 10 + hashOf(401, j, 3) * 18 * (1.2 - reach), ry = rx * 0.6, tone = rgb[Math.floor(hashOf(401, j, 4) * rgb.length)]!;
    for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(height, Math.ceil(cy + ry)); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(width, Math.ceil(cx + rx)); x++) {
        if (Math.hypot((x - cx) / rx, (y - cy) / ry) > 1) continue;
        const px = side ? width - 1 - x : x, o = (y * width + px) * 4;
        data[o] = tone[0];
        data[o + 1] = tone[1];
        data[o + 2] = tone[2];
        data[o + 3] = 255;
      }
  }
  boxBlurRGBA(data, width, height, radius, passes);
  return { width, height, data };
}

/** Screen box of a near corner (view pixels). */
export function nearBox(side: 0 | 1, width: number, height: number): { x: number; y: number; w: number; h: number } {
  return { x: side ? width - POST.near.width : 0, y: height - POST.near.height, w: POST.near.width, h: POST.near.height };
}

/**
 * The blurred foreground leaves in both bottom corners. A corner fades when
 * the cat's projected foot (`viewer`, view pixels) stands inside it.
 */
export function drawNearLayer(ctx: Ctx, width: number, height: number, viewer: { x: number; y: number } | undefined, time: number, reduced: boolean): void {
  const S = POST.near.sway, sway = reduced || !Number.isFinite(time) ? 0 : Math.round(Math.sin(time * S.speed) * S.amount);
  for (const side of [0, 1] as const) {
    const image = cachedImage(`near:${side}`, () => nearLeavesPixels(side));
    if (!image) continue;
    const box = nearBox(side, width, height);
    const inside = !!viewer && viewer.x >= box.x && viewer.x <= box.x + box.w && viewer.y >= box.y - 40 && viewer.y <= box.y + box.h;
    ctx.save();
    ctx.globalAlpha *= inside ? POST.near.faded : POST.near.alpha;
    ctx.drawImage(image, box.x + (side ? -sway : sway), box.y, box.w, box.h);
    ctx.restore();
  }
}
