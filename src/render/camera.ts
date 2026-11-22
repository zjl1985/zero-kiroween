/**
 * Presentation-only follow camera. It lives in main.ts / the renderer and is
 * never stored in SimState; it reads the cat's position and nothing else.
 */
import { SCREEN, WORLD } from "../game/world-gen.js";

export interface Camera {
  /** World position at the centre of the view. */
  x: number;
  y: number;
  /** Logical display dimensions. Older callers use the original yard framing. */
  width?: number;
  height?: number;
}
export interface ViewSize {
  width: number;
  height: number;
}
export function cameraSize(cam: Camera): ViewSize {
  return { width: cam.width ?? SCREEN.width, height: cam.height ?? SCREEN.height };
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
export function clampCamera(x: number, y: number, width?: number, height?: number): Camera {
  const w = Math.min(width ?? SCREEN.width, WORLD.width), h = Math.min(height ?? SCREEN.height, WORLD.height);
  return {
    x: clampN(x, WORLD.minX + w / 2, WORLD.maxX - w / 2),
    y: clampN(y, WORLD.minY + h / 2, WORLD.maxY - h / 2),
    ...(width === undefined ? {} : { width: w }),
    ...(height === undefined ? {} : { height: h }),
  };
}
/** Frame the start yard; tall views also show the road to its south. */
export function createCamera(width?: number, height?: number): Camera {
  return clampCamera(SCREEN.width / 2, SCREEN.height / 2, width, height);
}
/** Keep some sky above the homesteads when the landscape camera settles at
 * the opening. Give that space back gradually as the cat leaves the yard. */
function openingLookNorth(x: number, y: number): number {
  const smooth = (value: number) => {
    const t = clampN(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const yardWidth = smooth(Math.min(x, SCREEN.width - x) / 144);
  const beforeJunction = smooth((610 - y) / 230);
  return 72 * yardWidth * beforeJunction;
}
/** Moves `cam` toward `target` with a deadzone and frame-rate independent smoothing. */
export function followCamera(cam: Camera, target: { x: number; y: number }, dt: number): Camera {
  const want = (c: number, t: number, dz: number) =>
    t > c + dz ? t - dz : t < c - dz ? t + dz : c;
  const { width, height } = cameraSize(cam);
  const y = height <= SCREEN.height ? target.y - openingLookNorth(target.x, target.y) : target.y;
  const k = 1 - Math.exp(-CAMERA.smoothing * Math.max(0, dt)),
    wx = want(cam.x, target.x, CAMERA.deadzoneX * Math.min(1, width / SCREEN.width)),
    wy = want(cam.y, y, CAMERA.deadzoneY * Math.min(1, height / SCREEN.height));
  return clampCamera(cam.x + (wx - cam.x) * k, cam.y + (wy - cam.y) * k, cam.width, cam.height);
}
export interface ViewRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** The world rectangle the camera shows, grown by `margin`. */
export function viewRect(cam: Camera, margin = 0): ViewRect {
  const { width, height } = cameraSize(cam);
  return {
    x0: cam.x - width / 2 - margin,
    y0: cam.y - height / 2 - margin,
    x1: cam.x + width / 2 + margin,
    y1: cam.y + height / 2 + margin,
  };
}
/** The same world-to-screen transform is used to paint the town and place its edge markers. */
export function cameraProjection(cam: Camera, focus = { x: cam.x, y: cam.y }, zoom = 1, shake = { x: 0, y: 0 }) {
  const { width, height } = cameraSize(cam);
  const left = Math.round((cam.x - width / 2) * 2) / 2;
  const top = Math.round((cam.y - height / 2) * 2) / 2;
  return {
    width, height, zoom,
    x: shake.x - left + focus.x * (1 - zoom),
    y: shake.y - top + focus.y * (1 - zoom),
  };
}
export function inView(r: ViewRect, x: number, y: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
}
