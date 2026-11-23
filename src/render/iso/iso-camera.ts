/**
 * Presentation-only isometric follow camera. Its centre lives in projected
 * screen space; it reads the cat's world position and never touches SimState.
 * Deadzone and smoothing reuse CAMERA from the top-down camera.
 */
import { CAMERA } from "../camera.js";
import { SCREEN, WORLD } from "../../game/world-gen.js";
import { snap, toScreen, toWorld, type Vec } from "./projection.js";

export interface IsoCamera {
  /** Projected screen-space point at the centre of the view. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ISO_CAMERA = {
  /** Screen pixels past the projected world diamond where the tree wall / night fog is drawn. */
  margin: 320,
  /** The cat's foot point always stays this many pixels inside the view (room for its sprite height). */
  keepPad: 64,
} as const;

/** The four projected WORLD corners in screen space: top, right, bottom, left. */
export function worldDiamond(): readonly Vec[] {
  return [
    toScreen(WORLD.minX, WORLD.minY),
    toScreen(WORLD.maxX, WORLD.minY),
    toScreen(WORLD.maxX, WORLD.maxY),
    toScreen(WORLD.minX, WORLD.maxY),
  ];
}

const clampN = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/**
 * Half-planes n . c <= d of the centres whose whole view fits inside the
 * diamond grown by `margin`. Edges run clockwise in screen space (y down),
 * so the outward normal of edge a -> b is (dy, -dx).
 */
function centreLimits(width: number, height: number, margin: number) {
  const d = worldDiamond();
  return d.map((a, i) => {
    const b = d[(i + 1) % d.length]!, ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey);
    const nx = ey / len, ny = -ex / len;
    const support = (width / 2) * Math.abs(nx) + (height / 2) * Math.abs(ny);
    return { nx, ny, d: nx * a.x + ny * a.y + margin - support };
  });
}

/** Keeps the view inside the grown diamond, then keeps `keep` (the cat's projected foot) on screen. */
export function clampIsoCamera(x: number, y: number, width: number, height: number, keep?: Vec): IsoCamera {
  let cx = x, cy = y;
  // Alternating projections onto the convex half-planes converge quickly; a few passes are plenty.
  const limits = centreLimits(width, height, ISO_CAMERA.margin);
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const l of limits) {
      const over = l.nx * cx + l.ny * cy - l.d;
      if (over > 1e-9) {
        cx -= over * l.nx;
        cy -= over * l.ny;
        moved = true;
      }
    }
    if (!moved) break;
  }
  if (keep) {
    const px = Math.max(0, width / 2 - ISO_CAMERA.keepPad), py = Math.max(0, height / 2 - ISO_CAMERA.keepPad);
    cx = clampN(cx, keep.x - px, keep.x + px);
    cy = clampN(cy, keep.y - py, keep.y + py);
  }
  return { x: cx, y: cy, width, height };
}

/** Frames a world point (the start yard by default). */
export function createIsoCamera(
  width = SCREEN.width,
  height = SCREEN.height,
  at: Vec = { x: SCREEN.width / 2, y: SCREEN.height / 2 },
): IsoCamera {
  const s = toScreen(at.x, at.y);
  return clampIsoCamera(s.x, s.y, width, height, s);
}

/** Moves the camera toward the projected `target` with a screen-space deadzone and frame-rate independent smoothing. */
export function followIsoCamera(cam: IsoCamera, target: Vec, dt: number): IsoCamera {
  const t = toScreen(target.x, target.y);
  const want = (c: number, v: number, dz: number) => (v > c + dz ? v - dz : v < c - dz ? v + dz : c);
  const k = 1 - Math.exp(-CAMERA.smoothing * Math.max(0, dt)),
    wx = want(cam.x, t.x, CAMERA.deadzoneX * Math.min(1, cam.width / SCREEN.width)),
    wy = want(cam.y, t.y, CAMERA.deadzoneY * Math.min(1, cam.height / SCREEN.height));
  return clampIsoCamera(cam.x + (wx - cam.x) * k, cam.y + (wy - cam.y) * k, cam.width, cam.height, t);
}

/**
 * The translate / scale for drawing projected coordinates, shaped like
 * cameraProjection: pixel = (x, y) + zoom * toScreen(world). The camera
 * offset is pre-snapped so cached ground does not shimmer by half pixels.
 */
export function isoProjection(cam: IsoCamera, focus: Vec = toWorld(cam.x, cam.y), zoom = 1, shake: Vec = { x: 0, y: 0 }) {
  const { width, height } = cam;
  const left = snap(cam.x - width / 2), top = snap(cam.y - height / 2), f = toScreen(focus.x, focus.y);
  return {
    width, height, zoom,
    x: shake.x - left + f.x * (1 - zoom),
    y: shake.y - top + f.y * (1 - zoom),
  };
}
export type IsoProjection = ReturnType<typeof isoProjection>;

/** A world point as a snapped view pixel under `proj`. */
export function projectToView(proj: IsoProjection, x: number, y: number): Vec {
  const s = toScreen(x, y);
  return { x: snap(proj.x + proj.zoom * s.x), y: snap(proj.y + proj.zoom * s.y) };
}

/** The view corners (grown by `margin` screen pixels) in world space: top-left, top-right, bottom-right, bottom-left. */
export function viewWorldPolygon(cam: IsoCamera, margin = 0): readonly Vec[] {
  const x0 = cam.x - cam.width / 2 - margin, x1 = cam.x + cam.width / 2 + margin,
    y0 = cam.y - cam.height / 2 - margin, y1 = cam.y + cam.height / 2 + margin;
  return [toWorld(x0, y0), toWorld(x1, y0), toWorld(x1, y1), toWorld(x0, y1)];
}
