// A frame: w x h pixels whose top-left sits at (ox, oy) in world space. `color` holds opaque pixels,
// `light` additive glow; composite() in fx.ts puts them together. Same shape as Sprite Fusion's VFX frames.
// Ported to TypeScript from pixelfx src/core/fx.js (MIT, see LICENSE in this folder).

export interface Frame {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

export function createFrame(w: number, h: number, ox = 0, oy = 0): Frame {
  return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
}

export function clearFrame(f: Frame): Frame {
  f.color.fill(0);
  f.light.fill(0);
  return f;
}
