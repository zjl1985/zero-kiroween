/**
 * The paper ruleset, as data. Every emblem, icon and mount drawn with the
 * flat helpers in paper-kit.ts (flatLayer, paperEmblem, crease) follows it:
 *
 * - one moon light from the top-right (PAPER_LIGHT);
 * - one hard cast shadow down-right with a fixed offset (PAPER_SHADOW), the
 *   same for every layer, so stacked cuts read as real sheets;
 * - 1 to 3 flat paper layers per asset (PAPER_LAYERS); a layer may hold
 *   several separate cuts of one colour;
 * - a light cut-edge rim on the lit (top-right) side and a dark lip on the
 *   bottom-left of every layer (PAPER_EDGE), plus a thin card-thickness side;
 * - a subtle paper fibre overlay (PAPER_FIBER);
 * - no gradients, no blurred shadows, no additive light and no specular
 *   highlights (PAPER_GLOSS lists what the ?gallery=1&check=gloss view flags).
 *
 * Pure data plus a render-only probe; no DOM access at import time.
 */
import type { Ctx } from "./paper-material.js";

/** The single moon light: a unit direction pointing toward the light (top-right). */
export const PAPER_LIGHT = Object.freeze({ dirX: 0.6, dirY: -0.8, rim: "#fff1cf" });
/** The cast shadow of every flat layer: fixed offset down-right, in local units. */
export const PAPER_SHADOW = Object.freeze({ dx: 1.1, dy: 1.5, alpha: 0.46, color: "#120d1c" });
/** Cut-edge treatment of every layer. */
export const PAPER_EDGE = Object.freeze({
  /** Lit rim width on the top-right inner edge. */
  rim: 0.6,
  rimAlpha: 0.62,
  /** Dark lip on the bottom-left inner edge. */
  lip: "#1c142b",
  lipAlpha: 0.36,
  /** Visible card thickness (the darker cut side peeking out down-right). */
  thickness: 0.7,
  /** Outline of the cut. */
  cutAlpha: 0.62,
});
/** Paper fibre overlay strength (multiply, clipped to the cut). */
export const PAPER_FIBER = 0.42;
/** Allowed number of flat layers per asset. */
export const PAPER_LAYERS = Object.freeze({ min: 1, max: 3 });

/**
 * Value hierarchy of the combat screen: the ground and plain decor sit
 * lower and greyer than the actors, so cats, ink, shots and the interactive
 * warm lights read first. Applied once when a tile or sprite is baked.
 */
export const PAPER_VALUE = Object.freeze({
  /** Baked ground tiles (district sheets, roads, landmark ground, flat decor). */
  ground: Object.freeze({ desaturate: 0.36, multiply: "#c3bfcf" }),
  /** Plain decor sprites (trees, cottages, bushes, fences, stones, decor pumpkins, candles, lamps). */
  decor: Object.freeze({ desaturate: 0.24, multiply: "#dcd8e3" }),
  /**
   * Washed paper (the baked pencil layer and its fallback): raw paper under
   * moonlight, clearly lighter than painted ground yet no brighter than decor.
   */
  washed: Object.freeze({ desaturate: 0.3, multiply: "#a9a5b8" }),
  /** Light cut-edge rim on the moon side of actors (cats and ink), in drawing units. */
  rim: Object.freeze({ width: 1.15, color: "#fff1cf", alpha: 0.78 }),
  /** Dark paper outline under every player shot. */
  shotOutline: Object.freeze({ color: "#1c142b", width: 1.7, alpha: 0.9 }),
  /** Warm light pool of a non-interactive lamp on the ground (flat, no gradient). */
  lampPool: Object.freeze({ color: "#e9b768", alpha: 0.075, rx: 46, ry: 20 }),
});

/** Canvas features that read as gloss rather than paper. */
export const PAPER_GLOSS = Object.freeze({
  calls: Object.freeze(["createLinearGradient", "createRadialGradient", "createConicGradient"]),
  /** Compositing that adds light instead of laying paper. */
  composite: Object.freeze(["lighter"]),
});

/** What a gloss probe saw while it was running. */
export interface GlossReport {
  gradient: number;
  shadowBlur: number;
  lighter: number;
}
export const glossy = (r: GlossReport): boolean => r.gradient + r.shadowBlur + r.lighter > 0;

/**
 * Watches every 2D context created from the given prototypes (page and
 * offscreen sprite canvases alike) for gradients, blurred shadows and
 * additive compositing while `paint` runs, then restores the prototypes.
 * Render-only developer tooling for the gallery gloss check.
 */
export function probeGloss(protos: readonly object[], paint: () => void): GlossReport {
  const report: GlossReport = { gradient: 0, shadowBlur: 0, lighter: 0 },
    undo: Array<() => void> = [];
  for (const proto of protos) {
    for (const name of PAPER_GLOSS.calls) {
      const own = Object.getOwnPropertyDescriptor(proto, name);
      if (!own || typeof own.value !== "function") continue;
      const original = own.value as (...args: unknown[]) => unknown;
      Object.defineProperty(proto, name, {
        ...own,
        value(this: Ctx, ...args: unknown[]) {
          report.gradient++;
          return original.apply(this, args);
        },
      });
      undo.push(() => Object.defineProperty(proto, name, own));
    }
    for (const [name, hit] of [
      ["shadowBlur", (v: unknown) => typeof v === "number" && v > 0 && (report.shadowBlur++, true)],
      ["globalCompositeOperation", (v: unknown) => PAPER_GLOSS.composite.includes(String(v)) && (report.lighter++, true)],
    ] as const) {
      const own = Object.getOwnPropertyDescriptor(proto, name);
      if (!own?.set) continue;
      const set = own.set;
      Object.defineProperty(proto, name, {
        ...own,
        set(this: Ctx, v: unknown) {
          hit(v);
          set.call(this, v);
        },
      });
      undo.push(() => Object.defineProperty(proto, name, own));
    }
  }
  try {
    paint();
  } finally {
    for (const u of undo.reverse()) u();
  }
  return report;
}
