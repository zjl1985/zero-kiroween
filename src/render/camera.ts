/**
 * Presentation-only follow camera. It lives in main.ts / the renderer and is
 * never stored in SimState; it reads the cat's position and nothing else.
 */
import { SCREEN, WORLD } from "../game/world-gen.js";

export interface Camera {
  /** World position at the centre of the view. */
  x: number;
  y: number;
}
export const CAMERA = {
  /** The cat moves this far from the view centre before the camera follows. */
  deadzoneX: 60,
  deadzoneY: 40,
  /** Exponential catch-up rate per second. */
  smoothing: 7,
} as const;
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Keeps the whole view inside the world bounds. */
export function clampCamera(x: number, y: number): Camera {
  return {
    x: clampN(x, WORLD.minX + SCREEN.width / 2, WORLD.maxX - SCREEN.width / 2),
    y: clampN(y, WORLD.minY + SCREEN.height / 2, WORLD.maxY - SCREEN.height / 2),
  };
}
/** The title framing: exactly the original start yard. */
export function createCamera(): Camera {
  return { x: SCREEN.width / 2, y: SCREEN.height / 2 };
}
/** Moves `cam` toward `target` with a deadzone and frame-rate independent smoothing. */
export function followCamera(cam: Camera, target: { x: number; y: number }, dt: number): Camera {
  const want = (c: number, t: number, dz: number) =>
    t > c + dz ? t - dz : t < c - dz ? t + dz : c;
  const k = 1 - Math.exp(-CAMERA.smoothing * Math.max(0, dt)),
    wx = want(cam.x, target.x, CAMERA.deadzoneX),
    wy = want(cam.y, target.y, CAMERA.deadzoneY);
  return clampCamera(cam.x + (wx - cam.x) * k, cam.y + (wy - cam.y) * k);
}
export interface ViewRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** The world rectangle the camera shows, grown by `margin`. */
export function viewRect(cam: Camera, margin = 0): ViewRect {
  return {
    x0: cam.x - SCREEN.width / 2 - margin,
    y0: cam.y - SCREEN.height / 2 - margin,
    x1: cam.x + SCREEN.width / 2 + margin,
    y1: cam.y + SCREEN.height / 2 + margin,
  };
}
export function inView(r: ViewRect, x: number, y: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
}
