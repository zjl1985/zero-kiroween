/**
 * The sound mix as plain data: every cue is a list of oscillator / filtered
 * noise layers, so its peak, length and band can be read (and tested) without
 * an AudioContext. src/audio/sfx.ts plays these layers through Web Audio.
 */
export type Cue =
  | "shot"
  | "hit"
  | "defeat"
  | "pickup"
  | "levelup"
  | "evolve"
  | "hurt"
  | "shield"
  | "boss"
  | "win"
  | "lose"
  | "pumpkin"
  | "treat"
  | "moon"
  | "streak"
  | "skill"
  | "card"
  | "tear"
  | "crackle"
  | "splash"
  | "pigment"
  | "rain"
  | "snip"
  | "fold"
  | "steam"
  | "chest";

export interface ToneLayer {
  readonly kind: "tone";
  readonly freq: number;
  readonly dur: number;
  readonly gain: number;
  readonly type?: OscillatorType;
  /** Pitch glides exponentially to this frequency over `dur`. */
  readonly to?: number;
  readonly delay?: number;
  readonly attack?: number;
}
export interface NoiseLayer {
  readonly kind: "noise";
  readonly dur: number;
  readonly gain: number;
  /** Filter cutoff or centre. */
  readonly freq: number;
  readonly filter?: BiquadFilterType;
  readonly q?: number;
  /** The filter glides exponentially to this frequency over `dur`. */
  readonly to?: number;
  readonly delay?: number;
}
export type Layer = ToneLayer | NoiseLayer;
/**
 * How often a cue sounds: "frequent" fires many times a second in a fight,
 * "action" a few times a minute up to every few seconds (player and world
 * actions), "event" marks rare milestones and must stand above the rest.
 */
export type MixTier = "frequent" | "action" | "event";

/** Gain envelope floor and fixed attacks (exponential ramps cannot reach 0). */
export const ENVELOPE = { floor: 0.0001, toneAttack: 0.005, noiseAttack: 0.006 } as const;
/**
 * The bus: master gain, a gentle glue compressor for crowded fights, then a
 * hard limiter so stacked cues can never pass full scale.
 */
export const MASTER = {
  gain: 0.55,
  compressor: { threshold: -18, ratio: 4 },
  limiter: { threshold: -3, knee: 0, ratio: 20, attack: 0.002, release: 0.12 },
  /** Ambience bus level under the cues. */
  ambience: 0.1,
} as const;

/**
 * Minimum seconds between repeats of a cue. Every cue has one, which caps how
 * many copies of it can overlap (its voice cap is ceil(duration / gap)).
 */
export const THROTTLE: Readonly<Record<Cue, number>> = {
  shot: 0.07,
  hit: 0.045,
  defeat: 0.05,
  pickup: 0.05,
  levelup: 0.3,
  evolve: 1,
  hurt: 0.2,
  shield: 0.2,
  boss: 2,
  win: 1,
  lose: 1,
  pumpkin: 0.2,
  treat: 0.1,
  moon: 0.5,
  streak: 0.1,
  skill: 0.1,
  card: 0.06,
  tear: 0.08,
  // Repeats while anything burns; the gap sets the crackle's pace.
  crackle: 0.28,
  splash: 0.12,
  pigment: 0.08,
  rain: 0.6,
  snip: 0.1,
  fold: 0.2,
  steam: 0.16,
  chest: 0.4,
};

export const CUE_TIER: Readonly<Record<Cue, MixTier>> = {
  shot: "frequent",
  hit: "frequent",
  defeat: "frequent",
  pickup: "frequent",
  pigment: "frequent",
  crackle: "frequent",
  streak: "frequent",
  hurt: "action",
  shield: "action",
  pumpkin: "action",
  treat: "action",
  skill: "action",
  card: "action",
  tear: "action",
  splash: "action",
  rain: "action",
  snip: "action",
  fold: "action",
  steam: "action",
  levelup: "event",
  evolve: "event",
  boss: "event",
  win: "event",
  lose: "event",
  moon: "event",
  chest: "event",
};

const tone = (freq: number, dur: number, o: Omit<ToneLayer, "kind" | "freq" | "dur">): ToneLayer => ({ kind: "tone", freq, dur, ...o });
const noise = (dur: number, o: Omit<NoiseLayer, "kind" | "dur">): NoiseLayer => ({ kind: "noise", dur, ...o });

/**
 * Layers of each cue. `k` is the cue's intensity (kills this frame, streak,
 * burning cells ...); `rand` in [0, 1) only scatters crackle pops and rain
 * ticks (audio never reads the sim RNG).
 */
export const CUE_LAYERS: Readonly<Record<Cue, (k: number, rand: () => number) => readonly Layer[]>> = {
  shot: () => [tone(980, 0.07, { type: "triangle", gain: 0.035, to: 1500 })],
  hit: () => [noise(0.05, { freq: 2200, q: 2, gain: 0.06 })],
  // Paper tear plus a soft drop.
  defeat: (k) => [
    noise(0.14, { filter: "highpass", freq: 2600, gain: 0.045 }),
    tone(320 + Math.min(k, 8) * 40, 0.14, { gain: 0.03, to: 120 }),
  ],
  pickup: (k) => [tone(1150 + Math.min(k, 8) * 60, 0.08, { gain: 0.04, to: 1800 })],
  levelup: () =>
    [523.3, 659.3, 784, 1046.5].map((f, i) => tone(f, 0.22, { type: "triangle", gain: 0.08, delay: i * 0.08 })),
  evolve: () => [
    ...[392, 493.9, 587.3, 784].flatMap((f, i) => [
      tone(f, 1.1, { gain: 0.05, delay: i * 0.05, attack: 0.04 }),
      tone(f * 1.005, 1.1, { gain: 0.03, delay: i * 0.05 + 0.02, attack: 0.05 }),
    ]),
    noise(0.9, { freq: 6000, q: 0.7, gain: 0.03, to: 2000 }),
  ],
  hurt: () => [
    tone(220, 0.2, { type: "square", gain: 0.05, to: 90 }),
    noise(0.12, { filter: "lowpass", freq: 900, gain: 0.07 }),
  ],
  shield: () => [tone(660, 0.35, { gain: 0.06 }), tone(990, 0.35, { gain: 0.04, delay: 0.02 })],
  boss: () =>
    [0, 1].flatMap((i) => [
      tone(98, 0.5, { type: "sawtooth", gain: 0.08, delay: i * 0.6, attack: 0.08, to: 82 }),
      tone(147, 0.5, { type: "triangle", gain: 0.05, delay: i * 0.6, attack: 0.08 }),
    ]),
  win: () =>
    [784, 987.8, 1174.7, 1568].flatMap((f, i) => [
      tone(f, 1.4, { gain: 0.06, delay: i * 0.18 }),
      tone(f * 2, 0.9, { gain: 0.015, delay: i * 0.18 }),
    ]),
  lose: () => [392, 329.6, 261.6, 196].map((f, i) => tone(f, 0.45, { type: "triangle", gain: 0.08, delay: i * 0.16 })),
  pumpkin: () => [
    noise(0.45, { filter: "lowpass", freq: 300, to: 1400, gain: 0.07 }),
    tone(330, 0.4, { type: "triangle", gain: 0.04, to: 495, attack: 0.05 }),
  ],
  treat: () => [
    tone(520, 0.09, { type: "triangle", gain: 0.06 }),
    tone(700, 0.12, { type: "triangle", gain: 0.06, delay: 0.09 }),
  ],
  moon: () => [
    tone(523.3, 1.6, { gain: 0.07, attack: 0.02 }),
    tone(784, 1.6, { gain: 0.05, delay: 0.04 }),
    tone(1046.5, 1.2, { gain: 0.03, delay: 0.08 }),
    noise(1.0, { freq: 800, to: 5000, q: 0.6, gain: 0.04 }),
  ],
  streak: (k) => [tone(1320 + Math.min(k, 50) * 6, 0.12, { type: "square", gain: 0.025 })],
  skill: () => [noise(0.18, { freq: 900, to: 3000, q: 1.4, gain: 0.07 })],
  card: () => [noise(0.08, { filter: "highpass", freq: 3000, gain: 0.05 })],
  // A short rip: band-passed noise sweeping down, then a dry flap.
  tear: () => [
    noise(0.16, { freq: 4200, to: 1400, q: 2.2, gain: 0.08 }),
    noise(0.05, { filter: "lowpass", freq: 700, gain: 0.05, delay: 0.12 }),
  ],
  // Fire: a few tiny pops over a low hiss, scaled by how much is burning.
  crackle: (k, rand) => {
    const pops = 2 + Math.min(3, Math.floor(k / 8)),
      out: Layer[] = [noise(0.3, { filter: "lowpass", freq: 520, gain: 0.025 + Math.min(k, 20) * 0.001 })];
    for (let i = 0; i < pops; i++)
      out.push(noise(0.018, { filter: "highpass", freq: 2600 + rand() * 2400, gain: 0.04, delay: rand() * 0.24 }));
    return out;
  },
  // Water lands: a low wet plop, then a short bright spray.
  splash: () => [
    tone(180, 0.12, { type: "sine", gain: 0.05, to: 90 }),
    noise(0.18, { filter: "highpass", freq: 3200, gain: 0.04, delay: 0.03, to: 1800 }),
  ],
  // Pigment splashes back: a soft round pop that rises with the count.
  pigment: (k) => [
    tone(620 + Math.min(k, 6) * 50, 0.1, { type: "triangle", gain: 0.035, to: 880 }),
    noise(0.05, { freq: 1800, q: 1.2, gain: 0.025, delay: 0.02 }),
  ],
  // Scissors: two blade clicks with a dry paper shear between them. The clicks sit
  // above 5 kHz, where the ear is most sensitive, so they stay a step under the shear.
  snip: () => [
    noise(0.025, { filter: "highpass", freq: 5200, gain: 0.05 }),
    noise(0.12, { freq: 3600, to: 2200, q: 3, gain: 0.07, delay: 0.02 }),
    noise(0.02, { filter: "highpass", freq: 6000, gain: 0.045, delay: 0.13 }),
    tone(1900, 0.05, { type: "triangle", gain: 0.02, delay: 0.13, to: 1500 }),
  ],
  // A page turning over: a rising air whoosh, then a low flat slap and a crease rub.
  // Its body sits under 600 Hz with the wind and drone, so it peaks a step above the snip.
  fold: () => [
    noise(0.26, { filter: "lowpass", freq: 600, to: 1800, gain: 0.06 }),
    noise(0.06, { filter: "lowpass", freq: 420, gain: 0.075, delay: 0.24 }),
    noise(0.09, { freq: 2600, q: 2, gain: 0.035, delay: 0.27 }),
  ],
  // Paper rain: a patter of tiny ticks over a soft hiss.
  rain: (_k, rand) => {
    const out: Layer[] = [noise(0.9, { filter: "lowpass", freq: 1400, gain: 0.03 })];
    for (let i = 0; i < 9; i++)
      out.push(noise(0.015, { filter: "highpass", freq: 3800 + rand() * 2600, gain: 0.03, delay: rand() * 0.8 }));
    return out;
  },
  // Water quenching fire: a crisp rising hiss that settles softly.
  steam: () => [
    noise(0.26, { filter: "bandpass", freq: 4200, to: 1500, q: 1.4, gain: 0.055 }),
    noise(0.14, { filter: "highpass", freq: 5200, to: 2800, gain: 0.025, delay: 0.03 }),
  ],
  // Treasure chest burst: bright rising golden fanfare with a soft sparkle shimmer.
  chest: () => [
    ...[587.3, 784, 987.8, 1174.7].map((f, i) =>
      tone(f, 0.28, { type: "triangle", gain: 0.075, delay: i * 0.065 }),
    ),
    tone(1568, 0.42, { type: "sine", gain: 0.05, delay: 0.24, attack: 0.015 }),
    noise(0.22, { filter: "highpass", freq: 4800, to: 7200, gain: 0.025, delay: 0.18 }),
  ],
};

/** Envelope gain of one layer `t` seconds after the cue starts (same ramps as sfx.ts). */
export function layerGain(layer: Layer, t: number): number {
  const start = layer.delay ?? 0,
    attack = layer.kind === "tone" ? (layer.attack ?? ENVELOPE.toneAttack) : ENVELOPE.noiseAttack,
    floor = ENVELOPE.floor,
    u = t - start;
  if (u < 0 || u > layer.dur) return 0;
  if (u <= attack) return floor * (layer.gain / floor) ** (u / attack);
  return layer.gain * (floor / layer.gain) ** ((u - attack) / (layer.dur - attack));
}

export interface CueLevel {
  tier: MixTier;
  /** Highest summed envelope gain of the layers (coherent worst case). */
  peak: number;
  /** Seconds until the last layer ends. */
  duration: number;
  /** Lowest and highest oscillator or filter frequency, in Hz. */
  low: number;
  high: number;
  throttle: number;
  /** Most copies of the cue that can overlap under its throttle. */
  voices: number;
}

/** A fixed, evenly spread stand-in for Math.random (golden-ratio steps), so the table is stable. */
export function spreadRand(): () => number {
  let x = 0;
  return () => (x = (x + 0.6180339887) % 1);
}
/** Peak, length and band of one cue at intensity `k`. */
export function cueLevel(cue: Cue, k = 20, rand: () => number = spreadRand()): CueLevel {
  const layers = CUE_LAYERS[cue](k, rand);
  let duration = 0,
    low = Infinity,
    high = 0;
  for (const l of layers) {
    duration = Math.max(duration, (l.delay ?? 0) + l.dur);
    for (const f of [l.freq, l.to ?? l.freq]) {
      low = Math.min(low, f);
      high = Math.max(high, f);
    }
  }
  let peak = 0;
  for (let t = 0; t <= duration; t += 0.0005) {
    let sum = 0;
    for (const l of layers) sum += layerGain(l, t);
    peak = Math.max(peak, sum);
  }
  const throttle = THROTTLE[cue];
  return { tier: CUE_TIER[cue], peak, duration, low, high, throttle, voices: Math.max(1, Math.ceil(duration / throttle)) };
}

/** The whole mix table, one row per cue. */
export function mixTable(): Readonly<Record<Cue, CueLevel>> {
  return Object.fromEntries(
    (Object.keys(CUE_LAYERS) as Cue[]).map((c) => [c, cueLevel(c)]),
  ) as Record<Cue, CueLevel>;
}
