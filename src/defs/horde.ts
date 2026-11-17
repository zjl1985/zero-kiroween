/**
 * Survivors pacing: how many ink enemies, which kinds, waves and elites.
 * Kinds are registered enemy ids (tests/registry.test.mjs checks them).
 */
import type { EnemyKind } from "./types.js";

/**
 * Index = whole minutes elapsed (0..9 of the 10-minute night). The living
 * count ramps from about a dozen to near 100 and never passes hardCap, Boss
 * summons, crumple splits, waves and elites included. Spawn points come from
 * SPAWN_RING (ring margin, leash) in src/game/world-gen.ts.
 */
export const HORDE = {
  capByMinute: [12, 18, 26, 34, 44, 54, 64, 74, 84, 96],
  spawnPerSecondByMinute: [0.7, 1, 1.3, 1.7, 2.1, 2.5, 2.9, 3.3, 3.7, 4.2],
  hardCap: 100,
  /** Grace seconds before the first ring spawn. */
  firstSpawn: 3,
  /** Room kept free for the Eraser's summons while it is alive. */
  bossRoom: 8,
  /** Extra hp per minute for common kinds (0.15 = +15 % each minute). */
  hpPerMinute: 0.15,
  /** Extra speed per night phase for common kinds. */
  speedPerPhase: 4,
} as const;
/** The plain kind: opening blots, and what capped spawn rolls fall back to. */
export const FILLER_KIND: EnemyKind = "ink-blob";
/** At most this many of a kind alive at once; extra rolls become FILLER_KIND. */
export const KIND_CAP: Partial<Record<EnemyKind, number>> = {
  smudge: 8,
  crumple: 14,
};
/** Night phase boundaries as fractions of the session (90 s, 270 s, 480 s of 600). */
export const PHASE_AT: readonly [number, number, number] = [0.15, 0.45, 0.8];
/**
 * Elites: a bigger, tougher common with a paper crown, on a fixed timer.
 * Each one drops a chest. They skip their slot while the Boss is alive.
 */
export const ELITE = {
  first: 60,
  every: 60,
  /** No elites after this many seconds (the Boss owns the last stretch). */
  until: 500,
  hpMul: 9,
  radiusMul: 1.55,
  speedMul: 0.85,
  xpMul: 5,
  knockbackMul: 0.35,
  /** Cycled by elite index. */
  kinds: ["ink-blob", "paper-bat", "crumple", "smudge"] as readonly EnemyKind[],
} as const;
/** Regular spawn weights per night phase (0..3). */
export const SPAWN_TABLE: readonly (readonly [EnemyKind, number][])[] = [
  [["ink-blob", 1]],
  [
    ["ink-blob", 3],
    ["paper-bat", 2],
  ],
  [
    ["ink-blob", 2],
    ["paper-bat", 2],
    ["crumple", 1],
    ["smudge", 1],
  ],
  [
    ["ink-blob", 2],
    ["paper-bat", 3],
    ["crumple", 2],
    ["smudge", 2],
  ],
];
/**
 * Scripted waves at fixed fractions of the session, bounded by HORDE.hardCap.
 * "side": a flock from the left or right edge of the view; "ring": an even
 * circle around the cat that closes in; "line": a row marching in from one
 * side of the view.
 */
export type WavePattern = "side" | "ring" | "line";
export interface WaveDef {
  at: number;
  kind: EnemyKind;
  count: number;
  pattern: WavePattern;
}
export const WAVES: readonly WaveDef[] = [
  { at: 0.17, kind: "paper-bat", count: 6, pattern: "side" },
  { at: 0.25, kind: "paper-bat", count: 10, pattern: "ring" },
  { at: 0.35, kind: "ink-blob", count: 9, pattern: "line" },
  { at: 0.45, kind: "crumple", count: 3, pattern: "side" },
  { at: 0.55, kind: "paper-bat", count: 14, pattern: "ring" },
  { at: 0.62, kind: "smudge", count: 3, pattern: "side" },
  { at: 0.7, kind: "ink-blob", count: 12, pattern: "line" },
  { at: 0.8, kind: "paper-bat", count: 18, pattern: "ring" },
  { at: 0.95, kind: "ink-blob", count: 14, pattern: "line" },
];
/**
 * A "ring" wave is an even ellipse around the view centre that contains the
 * whole view (SPAWN_RING half-extents times `scale`), so it starts off screen.
 */
export const WAVE_RING = { scale: 1.18 } as const;
