/**
 * Isometric material ramps (docs/iso-art-spec.md section 7). Each ramp runs
 * from a cool purple shadow (step 0) to a warm highlight (last step) and is
 * strictly ordered by luminance. Volumes use step 4 on the top face, 3 on the
 * lit right face, 2 on the dark left face, 0 for the ground seam.
 */

export type RampName =
  | "grass" | "dirt" | "stone" | "soil" | "shallow" | "deep"
  | "wood" | "greyTile" | "redTile" | "cloth" | "wax" | "ink";

/** The cap on distinct RGB values across every iso asset (spec section 7). */
export const ISO_COLOUR_CAP = 256;

/** Allowed ramp length (spec: 4 to 6 steps). */
export const ISO_RAMP_STEPS = { min: 4, max: 6 } as const;

/** Face steps for code-modelled volumes (spec section 5). */
export const ISO_FACE = { top: 4, lit: 3, dark: 2, seam: 0 } as const;

export const ISO_RAMPS: Readonly<Record<RampName, readonly string[]>> = {
  grass: ["#1d2a3a", "#25443f", "#2f6045", "#4f7f45", "#86a35a"],
  dirt: ["#2a2233", "#46353b", "#6a4e42", "#8f6c4e", "#b8925f"],
  stone: ["#22233a", "#3a3d55", "#585c70", "#7c7f88", "#a8a69c"],
  soil: ["#1f1828", "#352433", "#4f3236", "#6c4638", "#8b5f40"],
  shallow: ["#1c2f52", "#24496a", "#2f6580", "#4a8a96", "#7fb5ae"],
  deep: ["#0e1430", "#141f44", "#1b2c58", "#253d6c", "#365480"],
  wood: ["#26192b", "#432a33", "#66403a", "#8c5d42", "#b9844f"],
  greyTile: ["#1e2034", "#33364d", "#4c5066", "#6a6e80", "#9095a0"],
  redTile: ["#2a1730", "#4c1f36", "#72293a", "#9a3d3c", "#c4614a"],
  cloth: ["#2b2340", "#4a3d62", "#6e6183", "#9c8ea6", "#d2c7c4"],
  wax: ["#3a2a3c", "#6a4d50", "#a07c63", "#d4b07a", "#f6e2a6"],
  ink: ["#0b0a18", "#151429", "#221f3c", "#332e52", "#4a4470"],
};

/** Every ramp in a fixed order (the order of ISO_RAMPS). */
export const ISO_RAMP_LIST: readonly { name: RampName; steps: readonly string[] }[] =
  (Object.keys(ISO_RAMPS) as RampName[]).map((name) => ({ name, steps: ISO_RAMPS[name] }));

export type Rgb = readonly [number, number, number];

export function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const [r, g, b] = hexRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Ramp colour, clamped to the ramp's ends. */
export function rampColour(name: RampName, step: number): string {
  const ramp = ISO_RAMPS[name];
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(step)))]!;
}

const rgbMemo = new Map<string, Rgb>();
/** Ramp colour as RGB for pixel writers (memoised by colour). */
export function rampRgb(name: RampName, step: number): Rgb {
  const hex = rampColour(name, step);
  let rgb = rgbMemo.get(hex);
  if (!rgb) { rgb = hexRgb(hex); rgbMemo.set(hex, rgb); }
  return rgb;
}

/** Distinct colours across every ramp, lower-case #rrggbb. */
export function isoPaletteColours(): readonly string[] {
  return [...new Set(ISO_RAMP_LIST.flatMap((r) => r.steps.map((c) => c.toLowerCase())))];
}
