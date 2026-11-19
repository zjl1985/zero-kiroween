/**
 * Presentation timelines for key moments: every cue plays four beats,
 * anticipation -> reveal -> burst -> settle. The rhythm idea follows the
 * public description of video-shotcraft; this is an independent rebuild.
 *
 * Everything here is pure and presentation-only. Slow motion never changes the
 * simulation dt: main.ts feeds the clock less real time, so the sim simply runs
 * fewer FIXED_DT steps per real second (see presentationSteps).
 */
import { tickClock, type Clock } from "../game/clock.js";

export type Phase = "anticipation" | "reveal" | "burst" | "settle";
export const PHASES: readonly Phase[] = ["anticipation", "reveal", "burst", "settle"];
export type Beat = Readonly<Record<Phase, number>>;
export type CueKind = "evolution" | "boss" | "boss-down" | "dawn" | "finale";

/** Beat lengths in real seconds. */
export const BEATS: Readonly<Record<CueKind, Beat>> = {
  evolution: { anticipation: 0.45, reveal: 0.35, burst: 0.5, settle: 0.8 },
  boss: { anticipation: 0.7, reveal: 0.45, burst: 0.35, settle: 0.7 },
  "boss-down": { anticipation: 0.25, reveal: 0.25, burst: 0.55, settle: 0.8 },
  dawn: { anticipation: 0.4, reveal: 0.7, burst: 0.4, settle: 0.9 },
  finale: { anticipation: 0.35, reveal: 0.6, burst: 0.45, settle: 0.6 },
};
/** Under prefers-reduced-motion every cue is a short fade. */
export const REDUCED_BEAT: Beat = { anticipation: 0, reveal: 0, burst: 0.05, settle: 0.3 };

/** Sim speed (share of real time) while each beat plays; settle eases back to 1. */
export const SLOWMO: Readonly<Record<CueKind, Beat>> = {
  evolution: { anticipation: 0.6, reveal: 0.35, burst: 0.3, settle: 0.5 },
  boss: { anticipation: 0.7, reveal: 0.5, burst: 0.45, settle: 0.7 },
  "boss-down": { anticipation: 0.4, reveal: 0.3, burst: 0.25, settle: 0.5 },
  dawn: { anticipation: 1, reveal: 0.85, burst: 0.8, settle: 0.9 },
  // The night is over; the sim no longer steps during the finale.
  finale: { anticipation: 1, reveal: 1, burst: 1, settle: 1 },
};
/** Camera zoom reached at the end of each beat (1 = none); settle returns to 1. */
export const ZOOM: Readonly<Record<CueKind, Omit<Beat, "settle">>> = {
  evolution: { anticipation: 1.06, reveal: 1.07, burst: 1.1 },
  boss: { anticipation: 1, reveal: 1.02, burst: 1.035 },
  "boss-down": { anticipation: 1.04, reveal: 1.06, burst: 1.08 },
  dawn: { anticipation: 1, reveal: 1, burst: 1.015 },
  finale: { anticipation: 1, reveal: 1.02, burst: 1.04 },
};
/** Peak camera tremble in view pixels per beat. */
export const TREMBLE: Readonly<Record<CueKind, Beat>> = {
  evolution: { anticipation: 0.6, reveal: 0, burst: 2.5, settle: 0 },
  boss: { anticipation: 2.2, reveal: 0.8, burst: 3.5, settle: 0 },
  "boss-down": { anticipation: 1, reveal: 0, burst: 4, settle: 0 },
  dawn: { anticipation: 0, reveal: 0, burst: 0, settle: 0 },
  finale: { anticipation: 0, reveal: 0, burst: 1.2, settle: 0 },
};
/** Card dealing: stagger between cards, flight with overshoot, then the paper stack settles. */
export const DEAL = { staggerMs: 70, flightMs: 460, settleMs: 320 } as const;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export function easeInOut(t: number): number {
  const k = clamp01(t);
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}
export function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}
/** Overshoots past 1 and comes back; `overshoot` 1.70158 gives about 10 %. */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  const k = clamp01(t) - 1;
  return 1 + (overshoot + 1) * k * k * k + overshoot * k * k;
}
/** Damped spring from 0 to 1 with `bounces` wobbles; exactly 1 at t >= 1. */
export function springSettle(t: number, bounces = 2, damping = 6): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-damping * t) * Math.cos(t * bounces * Math.PI * 2);
}

export function beatLength(b: Beat): number {
  return b.anticipation + b.reveal + b.burst + b.settle;
}
export interface PhaseAt {
  /** null once the timeline has finished. */
  phase: Phase | null;
  /** 0..1 inside the current phase. */
  local: number;
  /** 0..1 over the whole timeline. */
  total: number;
}
/** Which beat plays at `t` seconds and how far into it. */
export function phaseAt(b: Beat, t: number): PhaseAt {
  const len = beatLength(b);
  if (t >= len) return { phase: null, local: 1, total: 1 };
  let start = 0;
  const at = Math.max(0, t);
  for (const p of PHASES) {
    const d = b[p];
    if (d > 0 && at < start + d) return { phase: p, local: (at - start) / d, total: len > 0 ? at / len : 1 };
    start += d;
  }
  return { phase: null, local: 1, total: 1 };
}

export interface Cue {
  kind: CueKind;
  /** Real seconds since the cue started. */
  t: number;
  /** Optional world anchor (Boss position, for example). */
  x?: number;
  y?: number;
}
export function beatFor(kind: CueKind, reduced: boolean): Beat {
  return reduced ? REDUCED_BEAT : BEATS[kind];
}
export function cuePhase(c: Cue, reduced: boolean): PhaseAt {
  return phaseAt(beatFor(c.kind, reduced), c.t);
}
export function cueDone(c: Cue, reduced: boolean): boolean {
  return c.t >= beatLength(beatFor(c.kind, reduced));
}
/** Ages cues by real time and drops finished ones. */
export function advanceCues(cues: readonly Cue[], realDt: number, reduced: boolean): Cue[] {
  return cues.map((c) => ({ ...c, t: c.t + Math.max(0, realDt) })).filter((c) => !cueDone(c, reduced));
}

/** 0..1 strength: rises over anticipation, full through reveal and burst, fades in settle. */
export function cueEnvelope(c: Cue, reduced: boolean): number {
  const p = cuePhase(c, reduced);
  if (!p.phase) return 0;
  if (p.phase === "anticipation") return easeInOut(p.local);
  if (p.phase === "settle") return 1 - easeInOut(p.local);
  return 1;
}
/** Sim speed for one cue; 1 under reduced motion. */
export function cueSpeed(c: Cue, reduced: boolean): number {
  if (reduced) return 1;
  const p = cuePhase(c, false),
    s = SLOWMO[c.kind];
  if (!p.phase) return 1;
  if (p.phase === "settle") return lerp(s.settle, 1, easeInOut(p.local));
  return s[p.phase];
}
/** The slowest cue wins. Never above 1, never 0. */
export function presentationSpeed(cues: readonly Cue[], reduced: boolean): number {
  let v = 1;
  for (const c of cues) v = Math.min(v, cueSpeed(c, reduced));
  return Math.max(0.05, v);
}
/** Camera zoom for one cue; each beat eases from the previous target toward its own. */
export function cueZoom(c: Cue, reduced: boolean): number {
  if (reduced) return 1;
  const p = cuePhase(c, false),
    z = ZOOM[c.kind];
  switch (p.phase) {
    case "anticipation":
      return lerp(1, z.anticipation, easeInOut(p.local));
    case "reveal":
      return lerp(z.anticipation, z.reveal, easeOutCubic(p.local));
    case "burst":
      return lerp(z.reveal, z.burst, easeOutBack(p.local));
    case "settle":
      return lerp(z.burst, 1, easeInOut(p.local));
    default:
      return 1;
  }
}
export function presentationZoom(cues: readonly Cue[], reduced: boolean): number {
  let v = 1;
  for (const c of cues) v = Math.max(v, cueZoom(c, reduced));
  return v;
}
/** Tremble offset in view pixels, from real time; zero under reduced motion. */
export function cueTremble(cues: readonly Cue[], time: number, reduced: boolean): { x: number; y: number } {
  if (reduced) return { x: 0, y: 0 };
  let amp = 0;
  for (const c of cues) {
    const p = cuePhase(c, false);
    if (!p.phase) continue;
    const peak = TREMBLE[c.kind][p.phase],
      // Anticipation builds; burst kicks then decays.
      k = p.phase === "anticipation" ? p.local : 1 - p.local;
    amp = Math.max(amp, peak * k);
  }
  return { x: Math.sin(time * 61) * amp, y: Math.cos(time * 47) * amp * 0.6 };
}
/**
 * How many fixed steps to run this frame. Slow motion only scales the real
 * time fed to the clock; every step still uses FIXED_DT.
 */
export function presentationSteps(clock: Clock, realDt: number, speed: number): number {
  return tickClock(clock, Math.max(0, realDt) * clamp01(speed));
}
/** Deal delay of the i-th card in milliseconds. */
export function dealDelayMs(index: number): number {
  return Math.max(0, index) * DEAL.staggerMs;
}

/**
 * Pop-up book: tall buildings and trees stand up as the cat comes near and
 * lie down as it leaves. Render-only; colliders never change.
 * `near` / `far` are distances from the cat (world units) where a piece is
 * fully up / fully down; `min` is how far up a lying piece still shows.
 */
export const POPUP = { near: 430, far: 700, min: 0.14, rate: 3.2 } as const;
/** Target fold (POPUP.min..1) for a piece `dist` away from the cat. */
export function popupTarget(dist: number): number {
  const k = clamp01((POPUP.far - dist) / (POPUP.far - POPUP.near));
  return lerp(POPUP.min, 1, easeInOut(k));
}
/** Moves `fold` toward `target` at POPUP.rate per second; reduced motion snaps. */
export function popupStep(fold: number, target: number, dt: number, reduced: boolean): number {
  if (reduced) return target;
  const step = POPUP.rate * Math.max(0, dt);
  return Math.abs(target - fold) <= step ? target : fold + Math.sign(target - fold) * step;
}

/**
 * Watercolour wash transitions (render only; the sim stamps WashCell.changedAt
 * and the renderer notices quantised changes). A cell that loses its colour
 * first blooms with lifted pigment, pushes a darker tide line out to its edge,
 * then settles to raw paper; repainted cells bloom with the new pigment and
 * dry into the painted ground. `seconds` is the whole transition, `bloomPeak`
 * and `tidePeak` the fractions where pigment and tide line are strongest;
 * `maxBlooms` caps live blooms per frame; `tideAlpha` is the dried tide line
 * that stays along every wash edge.
 */
export const WASH_LOOK = { seconds: 1.2, bloomPeak: 0.16, tidePeak: 0.42, maxBlooms: 48, tideAlpha: 0.34 } as const;
/**
 * Fold protection mark (a quiet folded sheet over each live fold circle):
 * fades in, holds for the whole protection time read from the fold's
 * `until`, and fades out over its last `fadeOut` seconds.
 */
export const FOLD_GUARD_LOOK = { fadeIn: 0.2, fadeOut: 0.5, sheetAlpha: 0.1, edgeAlpha: 0.42, creaseAlpha: 0.3 } as const;
/** Opacity share (0..1) of a fold mark `age` seconds after it was made, `left` seconds before it ends. */
export function foldGuardFade(age: number, left: number): number {
  if (!(left > 0) || age < 0) return 0;
  return clamp01(Math.min(age / FOLD_GUARD_LOOK.fadeIn, left / FOLD_GUARD_LOOK.fadeOut));
}
export interface WashBloom {
  /** Progress 0..1. */
  readonly t: number;
  /** How far the bloom has spread, 0..1 (ease out). */
  readonly spread: number;
  /** Pigment opacity, 0 when settled. */
  readonly pigment: number;
  /** Extra tide-line opacity, 0 when settled. */
  readonly tide: number;
}
/** Bloom envelope `age` seconds after a change; all zero once settled (and before it starts). */
export function washBloom(age: number): WashBloom {
  if (!(age >= 0) || age >= WASH_LOOK.seconds) return { t: age > 0 ? 1 : 0, spread: age > 0 ? 1 : 0, pigment: 0, tide: 0 };
  const t = clamp01(age / WASH_LOOK.seconds),
    { bloomPeak: b, tidePeak: p } = WASH_LOOK,
    pigment = t < b ? (t / b) * 0.55 : 0.55 * (1 - (t - b) / (1 - b)) ** 1.6,
    tide = 0.62 * (t < p ? t / p : 1 - (t - p) / (1 - p));
  return { t, spread: easeOutCubic(t), pigment, tide };
}

/**
 * Paper verbs. `foldTurn`: seconds the page-fold flap takes to turn over the
 * crease (then it lies flat and fades). `foldLift`: how far up the screen the
 * turning flap rises per unit of depth (fake perspective). `wallRise` /
 * `wallSink`: seconds a paper wall takes to stand up and to fold away.
 */
export const PAPER_VERB_LOOK = { foldTurn: 0.34, foldLift: 0.55, wallRise: 0.22, wallSink: 0.35, wallHeight: 30 } as const;
/** Turn of the fold flap `age` seconds after the fold: 0 flat before, 1 turned over. */
export function foldTurn(age: number): number {
  return easeInOut(clamp01(age / PAPER_VERB_LOOK.foldTurn));
}
/** Standing height share of a paper wall with `life` of `maxLife` seconds left. */
export function wallStand(life: number, maxLife: number): number {
  const up = clamp01((maxLife - life) / PAPER_VERB_LOOK.wallRise),
    down = clamp01(life / PAPER_VERB_LOOK.wallSink);
  return easeOutBack(Math.min(up, 1), 1.2) * easeInOut(down);
}
/**
 * Cat wear: hp shares below which the body shows a crease, a first tear and a
 * second tear, and the seconds tape patches stay after a heal (the last
 * `tapeFade` seconds fading).
 */
export const CAT_WEAR = { crease: 0.8, tear: 0.55, tear2: 0.3, tapeSeconds: 3.2, tapeFade: 0.8 } as const;
