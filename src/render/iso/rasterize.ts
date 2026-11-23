/**
 * Bake an isometric volume model (model.ts) to pixels at the fixed 2:1 angle
 * (docs/iso-art-spec.md sections 1, 5, 6).
 *
 * - Projection: toScreen for the ground, `ISO_VOLUME.height` screen px up per
 *   world unit of height. A face is drawn only when its outward normal points
 *   toward the viewer, (1, 1, 1 / height) in world space.
 * - Shading: faces whose normal is mostly up take ISO_FACE.top; walls and
 *   steep slopes facing screen right (the moon side) take ISO_FACE.lit,
 *   facing screen left ISO_FACE.dark; the bottom row of a wall standing on the
 *   ground takes ISO_FACE.seam.
 * - Outline: 1 px sel-out around the silhouette, the neighbouring pixel's ramp
 *   one step darker (hue kept, never a flat black line).
 * - Alpha is binary. The hard shadow toward screen lower-left is a separate
 *   binary mask; only drawing applies `ISO_VOLUME.shadow.alpha` to it.
 *
 * `rasterizeModel` is pure (a typed RGBA buffer, usable in Node). The cached
 * canvas wrapper `isoVolume` keeps a finite LRU and releases evicted canvases.
 */
import { surface, type CanvasContext, type CanvasSurface } from "../../engine/surface.js";
import type { Face, FacePaint, Footprint, IsoModel, Vec3 } from "./model.js";
import { ISO_FACE, ISO_RAMP_LIST, ISO_RAMPS, rampRgb, type RampName } from "./palette.js";
import { toScreen, type Vec } from "./projection.js";

export const ISO_VOLUME = {
  /** Screen px per world unit of height. */
  height: 1,
  /** A face with normal z at or above this counts as a top face. */
  topAt: 0.6,
  shadow: {
    /** Ground offset per world unit of height: world +y is screen lower-left. */
    x: 0,
    y: 0.75,
    ramp: "ink" as RampName,
    step: 0,
    /** Draw-time opacity of the binary shadow mask. */
    alpha: 0.42,
  },
  /** Cached volume entries alive at once. */
  cacheLimit: 64,
} as const;

/** Screen-space box relative to the anchor. */
export interface ScreenBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface IsoRaster {
  readonly width: number;
  readonly height: number;
  /** Buffer pixel of the model's local origin (0, 0, 0): place it on the snapped screen foot. */
  readonly anchor: Vec;
  /** Volume and outline, RGBA, alpha 0 or 255. */
  readonly pixels: Uint8ClampedArray;
  /** Hard ground shadow mask, RGBA, alpha 0 or 255, never under volume pixels. */
  readonly shadow: Uint8ClampedArray;
  /** The whole buffer relative to the anchor. */
  readonly bounds: ScreenBox;
  /** Opaque volume pixels (outline included) relative to the anchor. */
  readonly volume: ScreenBox;
  /** The declared base corners projected, relative to the anchor. */
  readonly footprint: readonly Vec[];
}

const H = () => ISO_VOLUME.height;
/** Screen point of a model point (float, relative to the origin). */
export function project3(p: Vec3): Vec {
  return { x: p.x - p.y, y: (p.x + p.y) / 2 - p.z * H() };
}
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/** Visible-face test: the outward normal points toward the viewer. */
export function faceVisible(face: Face): boolean {
  const n = face.normal;
  return n.x + n.y + n.z / H() > 1e-9;
}

/** The ramp step a face direction takes (spec section 5). */
export function faceStep(normal: Vec3): number {
  if (normal.z >= ISO_VOLUME.topAt) return ISO_FACE.top;
  return normal.x >= normal.y ? ISO_FACE.lit : ISO_FACE.dark;
}

const RAMP_INDEX = new Map<RampName, number>(ISO_RAMP_LIST.map((r, i) => [r.name, i]));
const code = (ramp: RampName, step: number) => {
  const max = ISO_RAMPS[ramp].length - 1;
  return RAMP_INDEX.get(ramp)! * 8 + Math.max(0, Math.min(max, Math.floor(step)));
};
const codeRamp = (c: number) => ISO_RAMP_LIST[c >> 3]!.name;

/** A face's local pixel frame: point = o + u a + v b. */
interface Frame {
  o: Vec3; a: Vec3; b: Vec3;
  width: number; height: number;
  vertical: boolean;
}

function faceFrame(face: Face): Frame {
  const pts = face.points, n = face.normal;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) { minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  if (Math.abs(n.z) < 1e-9) {
    // Wall: u = one screen column to the right, v = one screen row down.
    const ex = -n.y, ey = n.x; // horizontal edge direction
    const cols = ex - ey; // screen x per world unit along (ex, ey)
    const s = cols >= 0 ? 1 : -1;
    const a = { x: (ex * s) / Math.abs(cols), y: (ey * s) / Math.abs(cols), z: 0 };
    let left = pts[0]!, minSx = Infinity, maxSx = -Infinity;
    for (const p of pts) {
      const sx = p.x - p.y;
      if (sx < minSx) { minSx = sx; left = p; }
      maxSx = Math.max(maxSx, sx);
    }
    return {
      o: { x: left.x, y: left.y, z: maxZ },
      a,
      b: { x: 0, y: 0, z: -1 / H() },
      width: Math.max(1, Math.ceil(maxSx - minSx - 1e-9)),
      height: Math.max(1, Math.ceil((maxZ - minZ) * H() - 1e-9)),
      vertical: true,
    };
  }
  // Top or slope: u along world x, v along world y, both on the face plane.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const p0 = pts[0]!;
  const zAt = (x: number, y: number) => p0.z - (n.x * (x - p0.x) + n.y * (y - p0.y)) / n.z;
  return {
    o: { x: x0, y: y0, z: zAt(x0, y0) },
    a: { x: 1, y: 0, z: -n.x / n.z },
    b: { x: 0, y: 1, z: -n.y / n.z },
    width: Math.max(1, Math.ceil(x1 - x0 - 1e-9)),
    height: Math.max(1, Math.ceil(y1 - y0 - 1e-9)),
    vertical: false,
  };
}

/** Run a face's detail painter into its local grid (-1 = no detail). */
function paintDetail(face: Face, frame: Frame): Int16Array | null {
  if (!face.detail) return null;
  const { width, height } = frame;
  const grid = new Int16Array(width * height).fill(-1);
  const set = (u: number, v: number, ramp: RampName, step: number) => {
    const iu = Math.floor(u), iv = Math.floor(v);
    if (iu < 0 || iv < 0 || iu >= width || iv >= height) return;
    grid[iv * width + iu] = code(ramp, step);
  };
  const paint: FacePaint = {
    width, height, role: face.role, set,
    rect(u, v, w, h, ramp, step) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(u + i, v + j, ramp, step);
    },
  };
  face.detail(paint);
  return grid;
}

function inside(poly: readonly Vec[], x: number, y: number): boolean {
  let pos = false, neg = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c > 1e-7) pos = true;
    else if (c < -1e-7) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

/** Andrew's monotone chain, deterministic for equal inputs. */
function hull(points: Vec[]): Vec[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec[] = [], upper: Vec[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const shadowPoint = (p: Vec3): Vec =>
  toScreen(p.x + p.z * ISO_VOLUME.shadow.x, p.y + p.z * ISO_VOLUME.shadow.y);

function baseCorners(b: Footprint): Vec[] {
  return [toScreen(b.x, b.y), toScreen(b.x + b.w, b.y), toScreen(b.x + b.w, b.y + b.d), toScreen(b.x, b.y + b.d)];
}

/** Rasterize a model into RGBA buffers. Same model, same pixels. */
export function rasterizeModel(model: IsoModel): IsoRaster {
  const faces = model.parts.flatMap((p) => p.faces).filter(faceVisible);
  const shadows = model.parts.map((part) => hull(part.faces.flatMap((f) => f.points.map(shadowPoint))));
  const footprint = baseCorners(model.base);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (s: Vec) => { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x); maxY = Math.max(maxY, s.y); };
  for (const f of faces) for (const p of f.points) grow(project3(p));
  for (const s of shadows) s.forEach(grow);
  footprint.forEach(grow);
  if (!(minX <= maxX)) { minX = minY = 0; maxX = maxY = 0; }
  const ox = Math.floor(minX) - 1, oy = Math.floor(minY) - 1;
  const width = Math.ceil(maxX) + 1 - ox, height = Math.ceil(maxY) + 1 - oy;
  const anchor = { x: -ox, y: -oy };

  const n = width * height;
  const codes = new Int16Array(n).fill(-1);
  const depth = new Float64Array(n).fill(-Infinity);
  const ih = 1 / H();

  for (const face of faces) {
    const frame = faceFrame(face);
    const sa = project3(frame.a), sb = project3(frame.b), so = project3(frame.o);
    const det = sa.x * sb.y - sa.y * sb.x;
    if (Math.abs(det) < 1e-9) continue;
    const grid = paintDetail(face, frame);
    const base = faceStep(face.normal);
    const grounded = frame.vertical && face.points.some((p) => p.z === 0);
    const poly = face.points.map((p) => { const s = project3(p); return { x: s.x + anchor.x, y: s.y + anchor.y }; });
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const s of poly) { bx0 = Math.min(bx0, s.x); by0 = Math.min(by0, s.y); bx1 = Math.max(bx1, s.x); by1 = Math.max(by1, s.y); }
    for (let py = Math.max(0, Math.floor(by0)); py < Math.min(height, Math.ceil(by1)); py++) {
      for (let px = Math.max(0, Math.floor(bx0)); px < Math.min(width, Math.ceil(bx1)); px++) {
        const cx = px + 0.5, cy = py + 0.5;
        if (!inside(poly, cx, cy)) continue;
        const dx = cx - anchor.x - so.x, dy = cy - anchor.y - so.y;
        const u = (dx * sb.y - dy * sb.x) / det, v = (sa.x * dy - sa.y * dx) / det;
        const wx = frame.o.x + u * frame.a.x + v * frame.b.x;
        const wy = frame.o.y + u * frame.a.y + v * frame.b.y;
        const wz = frame.o.z + u * frame.a.z + v * frame.b.z;
        const d = wx + wy + wz * ih;
        const i = py * width + px;
        if (!(d > depth[i]! + 1e-9)) continue;
        depth[i] = d;
        const iu = Math.min(frame.width - 1, Math.max(0, Math.floor(u)));
        const iv = Math.min(frame.height - 1, Math.max(0, Math.floor(v)));
        const detail = grid ? grid[iv * frame.width + iu]! : -1;
        codes[i] = detail >= 0 ? detail : code(face.ramp, grounded && iv === frame.height - 1 ? ISO_FACE.seam : base);
      }
    }
  }

  // Sel-out: each empty pixel touching the silhouette takes its neighbour's ramp, one step darker.
  const final = codes.slice();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = py * width + px;
      if (codes[i]! >= 0) continue;
      const near =
        py > 0 && codes[i - width]! >= 0 ? codes[i - width]! :
        px > 0 && codes[i - 1]! >= 0 ? codes[i - 1]! :
        px < width - 1 && codes[i + 1]! >= 0 ? codes[i + 1]! :
        py < height - 1 && codes[i + width]! >= 0 ? codes[i + width]! : -1;
      if (near >= 0) final[i] = code(codeRamp(near), (near & 7) - 1);
    }
  }

  const pixels = new Uint8ClampedArray(n * 4);
  let vx0 = Infinity, vy0 = Infinity, vx1 = -Infinity, vy1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const c = final[i]!;
    if (c < 0) continue;
    const [r, g, b] = rampRgb(codeRamp(c), c & 7);
    pixels[i * 4] = r; pixels[i * 4 + 1] = g; pixels[i * 4 + 2] = b; pixels[i * 4 + 3] = 255;
    const px = i % width, py = (i - px) / width;
    vx0 = Math.min(vx0, px); vy0 = Math.min(vy0, py); vx1 = Math.max(vx1, px); vy1 = Math.max(vy1, py);
  }

  const shadow = new Uint8ClampedArray(n * 4);
  const [sr, sg, sbl] = rampRgb(ISO_VOLUME.shadow.ramp, ISO_VOLUME.shadow.step);
  for (const s of shadows) {
    if (s.length < 3) continue;
    const poly = s.map((p) => ({ x: p.x + anchor.x, y: p.y + anchor.y }));
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const p of poly) { bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x); by1 = Math.max(by1, p.y); }
    for (let py = Math.max(0, Math.floor(by0)); py < Math.min(height, Math.ceil(by1)); py++)
      for (let px = Math.max(0, Math.floor(bx0)); px < Math.min(width, Math.ceil(bx1)); px++) {
        const i = py * width + px;
        if (final[i]! >= 0 || shadow[i * 4 + 3] || !inside(poly, px + 0.5, py + 0.5)) continue;
        shadow[i * 4] = sr; shadow[i * 4 + 1] = sg; shadow[i * 4 + 2] = sbl; shadow[i * 4 + 3] = 255;
      }
  }

  return {
    width, height, anchor, pixels, shadow,
    bounds: { x: ox, y: oy, w: width, h: height },
    volume: vx0 <= vx1 ? { x: vx0 - anchor.x, y: vy0 - anchor.y, w: vx1 - vx0 + 1, h: vy1 - vy0 + 1 } : { x: 0, y: 0, w: 0, h: 0 },
    footprint,
  };
}

/** A baked volume: canvases where the platform has them, plus placement data. */
export interface IsoVolume {
  readonly key: string;
  readonly anchor: Vec;
  readonly bounds: ScreenBox;
  readonly volume: ScreenBox;
  readonly footprint: readonly Vec[];
  /** Volume and outline; undefined without a canvas (Node). */
  readonly canvas?: CanvasSurface;
  /** Shadow mask; undefined without a canvas or when empty. */
  readonly shadow?: CanvasSurface;
}

function toCanvas(width: number, height: number, data: Uint8ClampedArray): CanvasSurface | undefined {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return undefined;
  try {
    const canvas = surface(width, height);
    const ctx = canvas.getContext("2d") as CanvasContext | null;
    if (!ctx || typeof ctx.createImageData !== "function") return undefined;
    const image = ctx.createImageData(width, height);
    image.data.set(data);
    ctx.putImageData(image, 0, 0);
    return canvas;
  } catch {
    return undefined;
  }
}

function release(v: IsoVolume): void {
  for (const c of [v.canvas, v.shadow]) if (c) { c.width = 0; c.height = 0; }
}

const volumes = new Map<string, IsoVolume>();

/**
 * The cached bake of `build()` under `key` (the key must fully describe the
 * model). `build` only runs on a miss; the least recently used entry beyond
 * `ISO_VOLUME.cacheLimit` is dropped and its canvases released.
 */
export function isoVolume(key: string, build: () => IsoModel): IsoVolume {
  const hit = volumes.get(key);
  if (hit) {
    volumes.delete(key);
    volumes.set(key, hit);
    return hit;
  }
  const r = rasterizeModel(build());
  const canvas = toCanvas(r.width, r.height, r.pixels);
  const hasShadow = r.shadow.some((v, i) => (i & 3) === 3 && v > 0);
  const shadow = hasShadow ? toCanvas(r.width, r.height, r.shadow) : undefined;
  const v: IsoVolume = {
    key, anchor: r.anchor, bounds: r.bounds, volume: r.volume, footprint: r.footprint,
    ...(canvas ? { canvas } : {}),
    ...(shadow ? { shadow } : {}),
  };
  volumes.set(key, v);
  while (volumes.size > ISO_VOLUME.cacheLimit) {
    const oldest = volumes.keys().next().value!;
    release(volumes.get(oldest)!);
    volumes.delete(oldest);
  }
  return v;
}

/** Stamp the shadow mask with its foot on the integer screen point (x, y). */
export function drawIsoShadow(ctx: CanvasContext, v: IsoVolume, x: number, y: number): void {
  if (!v.shadow) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * ISO_VOLUME.shadow.alpha;
  ctx.drawImage(v.shadow, x - v.anchor.x, y - v.anchor.y);
  ctx.globalAlpha = a;
}

/** Stamp the volume with its foot on the integer screen point (x, y). */
export function drawIsoVolume(ctx: CanvasContext, v: IsoVolume, x: number, y: number): void {
  if (v.canvas) ctx.drawImage(v.canvas, x - v.anchor.x, y - v.anchor.y);
}

export function isoVolumeCacheSize(): number {
  return volumes.size;
}
export function clearIsoVolumeCache(): void {
  for (const v of volumes.values()) release(v);
  volumes.clear();
}
