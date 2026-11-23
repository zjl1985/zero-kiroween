/**
 * Isometric volume models (plan step 4.1, decision D3): buildings and props
 * are code-modelled convex volumes in local world units (x, y on the ground,
 * z up), baked to pixels by rasterize.ts at the one fixed iso angle.
 *
 * Every face names a palette ramp from palette.ts; the rasterizer picks the
 * step from the face direction (spec section 5). A face may carry a detail
 * painter that draws in the face's own 2D pixel grid (windows, planks,
 * shingles); rasterize.ts maps that grid onto the face with integer shear
 * steps, so pixel art stays on the lattice.
 *
 * Pure data and pure functions: no canvas, no RNG, usable in Node.
 */
import type { RampName } from "./palette.js";

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** What a face is, for detail painters and shading. */
export type FaceRole = "top" | "side" | "roof" | "gable";

/**
 * A face-local pixel grid, (0, 0) at the top left of the face, u to the right
 * on screen, v downward. Walls: one cell per screen column and row. Tops and
 * roofs: one cell per world unit along world x (u) and world y (v).
 */
export interface FacePaint {
  readonly width: number;
  readonly height: number;
  readonly role: FaceRole;
  /** Paint one cell; cells outside the grid are ignored. */
  set(u: number, v: number, ramp: RampName, step: number): void;
  /** Paint a w x h block of cells. */
  rect(u: number, v: number, w: number, h: number, ramp: RampName, step: number): void;
}
export type FaceDetail = (paint: FacePaint) => void;

/** A ramp name, or a ramp with a detail painter. */
export type FaceMaterial = RampName | { readonly ramp: RampName; readonly detail?: FaceDetail };

export interface Face {
  /** Convex planar polygon. */
  readonly points: readonly Vec3[];
  /** Unit outward normal. */
  readonly normal: Vec3;
  readonly role: FaceRole;
  readonly ramp: RampName;
  readonly detail?: FaceDetail;
}

export type PrimitiveKind = "box" | "gable" | "hip" | "cylinder" | "prism";
export interface Primitive {
  readonly kind: PrimitiveKind;
  readonly faces: readonly Face[];
}

/** The declared ground footprint, a world rectangle at z = 0. It must match the sim collider (tested per building). */
export interface Footprint {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly d: number;
}

export interface IsoModel {
  readonly base: Footprint;
  readonly parts: readonly Primitive[];
}

const p3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

function material(m: FaceMaterial): { ramp: RampName; detail?: FaceDetail } {
  return typeof m === "string" ? { ramp: m } : m;
}

/** Newell normal, normalised. */
function newell(points: readonly Vec3[]): Vec3 {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  return p3(nx / len, ny / len, nz / len);
}

function centroid(points: readonly Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (const p of points) { x += p.x; y += p.y; z += p.z; }
  const n = points.length || 1;
  return p3(x / n, y / n, z / n);
}

/** Drop consecutive duplicate vertices (a square hip roof turns its trapezoids into triangles). */
function dedupe(points: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of points) {
    const q = out[out.length - 1];
    if (!q || q.x !== p.x || q.y !== p.y || q.z !== p.z) out.push(p);
  }
  while (out.length > 1 && out[0]!.x === out[out.length - 1]!.x && out[0]!.y === out[out.length - 1]!.y && out[0]!.z === out[out.length - 1]!.z) out.pop();
  return out;
}

type RawFace = { points: Vec3[]; role: FaceRole; mat: FaceMaterial };

/** Orient every face normal away from the primitive's centre (the volumes are convex). */
function primitive(kind: PrimitiveKind, raw: readonly RawFace[]): Primitive {
  const centre = centroid(raw.flatMap((f) => f.points));
  const faces = raw.map((f): Face => {
    const points = dedupe(f.points);
    let normal = newell(points);
    const c = centroid(points);
    if (normal.x * (c.x - centre.x) + normal.y * (c.y - centre.y) + normal.z * (c.z - centre.z) < 0)
      normal = p3(-normal.x, -normal.y, -normal.z);
    const m = material(f.mat);
    return m.detail ? { points, normal, role: f.role, ramp: m.ramp, detail: m.detail } : { points, normal, role: f.role, ramp: m.ramp };
  });
  return { kind, faces };
}

/**
 * Box faces by screen side: `right` faces world +x (screen right, moon-lit),
 * `left` faces world +y (screen left, dark). `back` covers the hidden -x / -y
 * faces, which the visible-face test drops. Unset sides use `top`.
 */
export interface BoxFaces {
  readonly top: FaceMaterial;
  readonly right?: FaceMaterial;
  readonly left?: FaceMaterial;
  readonly back?: FaceMaterial;
}

export function box(x: number, y: number, z: number, w: number, d: number, h: number, faces: FaceMaterial | BoxFaces): Primitive {
  const f: BoxFaces = typeof faces === "string" || !("top" in faces) ? { top: faces as FaceMaterial } : faces;
  const right = f.right ?? f.top, left = f.left ?? f.top, back = f.back ?? f.top;
  const x1 = x + w, y1 = y + d, z1 = z + h;
  return primitive("box", [
    { role: "top", mat: f.top, points: [p3(x, y, z1), p3(x1, y, z1), p3(x1, y1, z1), p3(x, y1, z1)] },
    { role: "side", mat: right, points: [p3(x1, y, z1), p3(x1, y1, z1), p3(x1, y1, z), p3(x1, y, z)] },
    { role: "side", mat: left, points: [p3(x, y1, z1), p3(x1, y1, z1), p3(x1, y1, z), p3(x, y1, z)] },
    { role: "side", mat: back, points: [p3(x, y, z1), p3(x1, y, z1), p3(x1, y, z), p3(x, y, z)] },
    { role: "side", mat: back, points: [p3(x, y, z1), p3(x, y1, z1), p3(x, y1, z), p3(x, y, z)] },
  ]);
}

export interface RoofFaces {
  readonly roof: FaceMaterial;
  /** The vertical gable triangles (gable roofs only). Defaults to `roof`. */
  readonly gable?: FaceMaterial;
}
function roofFaces(faces: FaceMaterial | RoofFaces): { roof: FaceMaterial; gable: FaceMaterial } {
  const f: RoofFaces = typeof faces === "string" || !("roof" in faces) ? { roof: faces as FaceMaterial } : faces;
  return { roof: f.roof, gable: f.gable ?? f.roof };
}

/** A gable roof over the w x d rectangle at height z, ridge `h` above it, running along world `along`. */
export function gableRoof(
  x: number, y: number, z: number, w: number, d: number, h: number,
  along: "x" | "y", faces: FaceMaterial | RoofFaces,
): Primitive {
  const { roof, gable } = roofFaces(faces);
  const x1 = x + w, y1 = y + d, zt = z + h;
  if (along === "x") {
    const ym = y + d / 2;
    return primitive("gable", [
      { role: "roof", mat: roof, points: [p3(x, y, z), p3(x1, y, z), p3(x1, ym, zt), p3(x, ym, zt)] },
      { role: "roof", mat: roof, points: [p3(x, ym, zt), p3(x1, ym, zt), p3(x1, y1, z), p3(x, y1, z)] },
      { role: "gable", mat: gable, points: [p3(x, y, z), p3(x, ym, zt), p3(x, y1, z)] },
      { role: "gable", mat: gable, points: [p3(x1, y, z), p3(x1, ym, zt), p3(x1, y1, z)] },
    ]);
  }
  const xm = x + w / 2;
  return primitive("gable", [
    { role: "roof", mat: roof, points: [p3(x, y, z), p3(xm, y, zt), p3(xm, y1, zt), p3(x, y1, z)] },
    { role: "roof", mat: roof, points: [p3(xm, y, zt), p3(x1, y, z), p3(x1, y1, z), p3(xm, y1, zt)] },
    { role: "gable", mat: gable, points: [p3(x, y, z), p3(xm, y, zt), p3(x1, y, z)] },
    { role: "gable", mat: gable, points: [p3(x, y1, z), p3(xm, y1, zt), p3(x1, y1, z)] },
  ]);
}

/** A hip roof: four slopes meeting on a ridge along the longer side (a pyramid when square). */
export function hipRoof(x: number, y: number, z: number, w: number, d: number, h: number, faces: FaceMaterial | RoofFaces): Primitive {
  const { roof } = roofFaces(faces);
  const x1 = x + w, y1 = y + d, zt = z + h;
  if (w >= d) {
    const ym = y + d / 2, ra = x + d / 2, rb = x1 - d / 2;
    return primitive("hip", [
      { role: "roof", mat: roof, points: [p3(x, y, z), p3(x1, y, z), p3(rb, ym, zt), p3(ra, ym, zt)] },
      { role: "roof", mat: roof, points: [p3(ra, ym, zt), p3(rb, ym, zt), p3(x1, y1, z), p3(x, y1, z)] },
      { role: "roof", mat: roof, points: [p3(x, y, z), p3(ra, ym, zt), p3(x, y1, z)] },
      { role: "roof", mat: roof, points: [p3(x1, y, z), p3(x1, y1, z), p3(rb, ym, zt)] },
    ]);
  }
  const xm = x + w / 2, ra = y + w / 2, rb = y1 - w / 2;
  return primitive("hip", [
    { role: "roof", mat: roof, points: [p3(x, y, z), p3(xm, ra, zt), p3(xm, rb, zt), p3(x, y1, z)] },
    { role: "roof", mat: roof, points: [p3(xm, ra, zt), p3(x1, y, z), p3(x1, y1, z), p3(xm, rb, zt)] },
    { role: "roof", mat: roof, points: [p3(x, y, z), p3(x1, y, z), p3(xm, ra, zt)] },
    { role: "roof", mat: roof, points: [p3(x, y1, z), p3(xm, rb, zt), p3(x1, y1, z)] },
  ]);
}

export interface ColumnFaces {
  readonly side: FaceMaterial;
  readonly top?: FaceMaterial;
}
function columnFaces(faces: FaceMaterial | ColumnFaces): { side: FaceMaterial; top: FaceMaterial } {
  const f: ColumnFaces = typeof faces === "string" || !("side" in faces) ? { side: faces as FaceMaterial } : faces;
  return { side: f.side, top: f.top ?? f.side };
}

/** An upright extrusion of a convex ground polygon from z to z + h. */
export function prism(points: readonly { x: number; y: number }[], z: number, h: number, faces: FaceMaterial | ColumnFaces): Primitive {
  return extrude("prism", points, z, h, faces);
}

/** An upright cylinder of radius r around (cx, cy), as a `segments`-sided prism. */
export function cylinder(cx: number, cy: number, z: number, r: number, h: number, faces: FaceMaterial | ColumnFaces, segments = 12): Primitive {
  const n = Math.max(3, Math.floor(segments));
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  return extrude("cylinder", ring, z, h, faces);
}

function extrude(kind: PrimitiveKind, ring: readonly { x: number; y: number }[], z: number, h: number, faces: FaceMaterial | ColumnFaces): Primitive {
  const { side, top } = columnFaces(faces);
  const z1 = z + h;
  const raw: RawFace[] = [{ role: "top", mat: top, points: ring.map((p) => p3(p.x, p.y, z1)) }];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!, b = ring[(i + 1) % ring.length]!;
    raw.push({ role: "side", mat: side, points: [p3(a.x, a.y, z1), p3(b.x, b.y, z1), p3(b.x, b.y, z), p3(a.x, a.y, z)] });
  }
  return primitive(kind, raw);
}

/** A model: its declared footprint plus the volumes that stand on it. */
export function isoModel(base: Footprint, ...parts: Primitive[]): IsoModel {
  return { base, parts };
}

/** The ground (z = 0) extent the parts actually cover, as a rectangle; compare with `base`. */
export function groundExtent(model: IsoModel): Footprint | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const part of model.parts)
    for (const face of part.faces)
      for (const p of face.points)
        if (p.z === 0) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return x0 <= x1 ? { x: x0, y: y0, w: x1 - x0, d: y1 - y0 } : null;
}
