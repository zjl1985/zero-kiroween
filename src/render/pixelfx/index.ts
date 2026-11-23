// pixelfx core, ported to strict TypeScript (MIT, see LICENSE in this folder): everything an effect imports.
// Renderer-only. Deterministic: seeded Rng and hashes, no unseeded randomness, no DOM, never the simulation RNG.

export * from './math.js';
export * from './color.js';
export * from './particles.js';
export * from './shapes.js';
// As in pixelfx, the simulated particle system wins the Particles name; the closed-form list is Drift.
export { Particles as Drift } from './particles.js';
export { Particles, Bits, Lights, Blazes, P, PF, B, GRAVITY, FIRE_RAMP, SMOKE_RAMP, sparkle, flare, band, crystal } from './sim.js';
export { Painter } from './painter.js';
export { FONTS, textWidth, rasterText } from './font.js';
export { createFrame, clearFrame, createFx, composite, painterFor, resolveOptions } from './fx.js';
export type { Frame } from './frame.js';
export type { Fx, FxModule, FxImpl, FxMeta, FxOptions } from './fx.js';
