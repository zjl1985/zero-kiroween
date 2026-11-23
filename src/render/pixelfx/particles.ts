// Particles without a simulation: each one's position is a closed-form function of its age, so an effect
// can be drawn at any time t, scrubbed, looped and rendered to a sprite sheet frame by frame.
// Ported to TypeScript from pixelfx src/core/particles.js (MIT, see LICENSE in this folder).

import { rng, clamp, type Rng } from './math.js';

/**
 * Where a particle is after t seconds, launched from (x, y) at (vx, vy) px/s, under gravity g (px/s^2,
 * positive is down) and linear drag (1/s). Returns [x, y].
 */
export function fly(x: number, y: number, vx: number, vy: number, t: number, g = 0, drag = 0): [number, number] {
  if (drag <= 0) return [x + vx * t, y + vy * t + 0.5 * g * t * t];
  const f = (1 - Math.exp(-drag * t)) / drag, vt = g / drag;
  return [x + vx * f, y + vt * t + (vy - vt) * f];
}
/** Its velocity at t, for streaks that point along the motion. Returns [vx, vy]. */
export function flyV(vx: number, vy: number, t: number, g = 0, drag = 0): [number, number] {
  if (drag <= 0) return [vx, vy + g * t];
  const e = Math.exp(-drag * t), vt = g / drag;
  return [vx * e, vt + (vy - vt) * e];
}

/** n one-shot particles: fn(r, i) with a repeatable rng per particle (the same numbers every frame). */
export function burst(n: number, seed: number, fn: (r: Rng, i: number) => void): void {
  for (let i = 0; i < n; i++) fn(rng(seed, i), i);
}

type Life = number | ((r: Rng) => number);
type Live = (age: number, life: number, r: Rng, i: number) => void;

/**
 * Particles that repeat every `period` seconds, for loops with no seam. Particle i is born at its own
 * phase in the period and lives `life` seconds (a number, or a function of an rng). For every live copy,
 * fn(age, life, r, i) is called; r is a fresh rng for particle i, the same each period.
 */
export function cycle(t: number, period: number, count: number, seed: number, life: Life, fn: Live): void {
  for (let i = 0; i < count; i++) {
    const g = rng(seed, i, 911);
    const born = g.next() * period;
    const L = typeof life === 'function' ? life(g) : life;
    let age = (((t - born) % period) + period) % period;
    for (; age < L; age += period) fn(age, L, rng(seed, i), i);
  }
}

/**
 * Particles born at a steady rate between t0 and t1 (an emitter that stops): fn(age, life, r, i) for every
 * particle alive at t. rate is particles per second.
 */
export function stream(t: number, t0: number, t1: number, rate: number, seed: number, life: Life, fn: Live): void {
  const n = Math.floor((Math.min(t, t1) - t0) * rate);
  for (let i = 0; i <= n; i++) {
    const born = t0 + i / rate, g = rng(seed, i, 911), L = typeof life === 'function' ? life(g) : life;
    const age = t - born;
    if (age >= 0 && age < L) fn(age, L, rng(seed, i), i);
  }
}

export interface DriftParticle {
  x: number; y: number; vx: number; vy: number; life: number;
  age: number; g: number; drag: number; ground?: number; bounce?: number;
  [extra: string]: unknown;
}
export interface DriftInit {
  x: number; y: number; vx: number; vy: number; life: number;
  g?: number; drag?: number; ground?: number; bounce?: number;
  [extra: string]: unknown;
}

/**
 * A simple simulated particle list, for effects that export create() and keep state. (The original exports it
 * as Particles too; the index re-exports the richer sim.ts Particles under that name, as pixelfx does.)
 */
export class Particles {
  list: DriftParticle[] = [];
  /** p: { x, y, vx, vy, life, g?, drag?, ground?, bounce? } plus anything you want to draw with. */
  add(init: DriftInit): DriftParticle {
    const p: DriftParticle = { ...init, age: 0, g: init.g ?? 0, drag: init.drag ?? 0 };
    this.list.push(p);
    return p;
  }
  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i] as DriftParticle;
      if ((p.age += dt) >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.vx -= p.vx * p.drag * dt;
      p.vy += p.g * dt - p.vy * p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.ground !== undefined && p.y > p.ground) {
        p.y = p.ground;
        p.vy = -Math.abs(p.vy) * (p.bounce ?? 0.3);
        p.vx *= 0.7;
      }
    }
  }
  /** Life left, 1 at birth to 0 at death. */
  static k(p: DriftParticle): number {
    return clamp(1 - p.age / p.life);
  }
}
