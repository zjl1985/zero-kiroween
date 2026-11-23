// Frames and live effect instances.
// Ported to TypeScript from pixelfx src/core/fx.js (MIT, see LICENSE in this folder). The stock actor
// option of the original is left out: effects here draw around our own cats and enemies.

import { Painter } from './painter.js';
import { clamp } from './math.js';
import { fit, toHex } from './color.js';
import type { Frame } from './frame.js';

export { createFrame, clearFrame, type Frame } from './frame.js';

const painters = new WeakMap<Frame, Painter>();
/** The painter for a frame (one per frame, reused). */
export function painterFor(frame: Frame): Painter {
  let p = painters.get(frame);
  if (!p) painters.set(frame, (p = new Painter(frame)));
  return p.reset();
}

const FADE = 0.3;

export type FxOptions = Record<string, unknown> & {
  x?: number; y?: number; flip?: boolean; angle?: number; seed?: number; light?: number;
};
export interface FxMeta { duration?: number; loop?: boolean; options?: Record<string, unknown>; }
export interface FxImpl {
  update?(dt: number, o: FxOptions): void;
  draw(p: Painter, t: number, o: FxOptions): void;
  drawBack?(p: Painter, t: number, o: FxOptions): void;
}
export interface FxModule {
  meta?: FxMeta;
  create?(o: FxOptions): FxImpl;
  draw?(p: Painter, t: number, o: FxOptions): void;
  drawBack?(p: Painter, t: number, o: FxOptions): void;
  update?(dt: number, o: FxOptions): void;
}
export interface Fx {
  readonly meta: FxMeta;
  readonly options: FxOptions;
  readonly t: number;
  update(dt: number): void;
  draw(frame: Frame, layer?: 'back' | 'front'): void;
  stop(): void;
  done(): boolean;
}

const isRamp = (v: unknown): v is (number | string)[] =>
  Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === 'number' || (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)));

/**
 * An effect's options: its defaults with the caller's on top. Any color ramp (palette, or another ramp option
 * like dust or smoke) of a different length than its default is resampled to the default's length, so effects
 * can index steps by number whatever a caller passes.
 */
export function resolveOptions(meta: FxMeta, o: FxOptions = {}): FxOptions {
  const opts: FxOptions = { ...(meta.options ?? {}), ...o };
  for (const [k, def] of Object.entries(meta.options ?? {})) {
    const given = o[k];
    if (isRamp(def) && isRamp(given) && given.length !== def.length) opts[k] = fit(given, def.length).map(toHex);
  }
  return opts;
}

/**
 * A live instance of an effect module: { update(dt), draw(frame, layer), stop(), done() }.
 * o: { x, y, flip, angle, seed, palette, light (glow strength), ...the effect's own options }.
 * draw(frame, "back") draws what goes behind a character, "front" what goes in front, nothing both.
 * Time comes only from update(dt): no clocks and no unseeded randomness.
 */
export function createFx(mod: FxModule, o: FxOptions = {}): Fx {
  const meta = mod.meta ?? {};
  const opts = resolveOptions(meta, o);
  const impl: FxImpl = mod.create ? mod.create(opts) : (mod as FxImpl);
  const D = meta.duration ?? 1;
  let t = 0, stopAt = Infinity;
  return {
    meta,
    options: opts,
    get t() {
      return t;
    },
    update(dt: number) {
      t += dt;
      if (!impl.update) return;
      // simulations step at 120 Hz or finer whatever the caller's frame rate, so they look the same everywhere
      const n = Math.max(1, Math.ceil(dt * 120 - 1e-9));
      for (let i = 0; i < n; i++) impl.update(dt / n, opts);
    },
    draw(frame: Frame, layer?: 'back' | 'front') {
      const p = painterFor(frame);
      p.place(opts.x ?? 0, opts.y ?? 0, !!opts.flip, opts.angle ?? 0);
      p.fade = stopAt === Infinity ? 1 : clamp(1 - (t - stopAt) / FADE);
      p.lightK = opts.light ?? 1;
      const tt = meta.loop ? t % D : Math.min(t, D);
      if (layer !== 'front' && impl.drawBack) {
        p.layer = 'back';
        impl.drawBack(p, tt, opts);
      }
      if (layer !== 'back') {
        p.layer = 'front';
        impl.draw(p, tt, opts);
      }
    },
    /** Let it end: loops fade out, one-shots cut short. */
    stop() {
      if (stopAt === Infinity) stopAt = t;
    },
    done() {
      return t - stopAt >= FADE || (!meta.loop && t >= D);
    },
  };
}

/** Bytes a composite writes into: a Uint8ClampedArray (ImageData.data) or any w * h * 4 byte array. */
export type RGBABytes = { [i: number]: number; length: number };

/**
 * Color over a background, plus light, into RGBA bytes (a Uint8ClampedArray or Buffer, w * h * 4).
 * bg: null for transparent, a color number, or a Uint32Array of the frame's size. Over transparency, light
 * becomes color with alpha (its brightest channel), which reads as additive over dark backgrounds.
 */
export function composite<T extends RGBABytes>(f: Frame, out: T, bg: number | Uint32Array | null = null, lightK = 1): T {
  const n = f.w * f.h, C = f.color, L = f.light;
  for (let i = 0; i < n; i++) {
    const c = C[i] as number, l = (L[i] as number) & 0xffffff;
    let r: number, g: number, b: number, a: number;
    const ca = c >>> 24;
    if (ca === 255) {
      r = c & 255; g = (c >>> 8) & 255; b = (c >>> 16) & 255; a = 255;
    } else if (bg === null) {
      // translucent color over nothing keeps its alpha
      r = c & 255; g = (c >>> 8) & 255; b = (c >>> 16) & 255; a = ca;
    } else {
      const k = typeof bg === 'number' ? bg : (bg[i] as number), t = ca / 255;
      r = (c & 255) * t + (k & 255) * (1 - t); g = ((c >>> 8) & 255) * t + ((k >>> 8) & 255) * (1 - t);
      b = ((c >>> 16) & 255) * t + ((k >>> 16) & 255) * (1 - t); a = 255;
    }
    if (l) {
      const lr = (l & 255) * lightK, lg = ((l >>> 8) & 255) * lightK, lb = ((l >>> 16) & 255) * lightK;
      if (a < 255) {
        // over transparency: premultiply what's there, add the light, divide by the new alpha
        const pa = a / 255, pr = r * pa + lr, pg = g * pa + lg, pb = b * pa + lb;
        const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
        if (na > 0) { r = Math.min(255, pr / na); g = Math.min(255, pg / na); b = Math.min(255, pb / na); a = na * 255; }
      } else {
        r = Math.min(255, r + lr); g = Math.min(255, g + lg); b = Math.min(255, b + lb);
      }
    }
    const j = i * 4;
    out[j] = Math.round(r); out[j + 1] = Math.round(g); out[j + 2] = Math.round(b); out[j + 3] = Math.round(a);
  }
  return out;
}
