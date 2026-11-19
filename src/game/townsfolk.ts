/**
 * Neutral townsfolk: where they live and where they stand at time t. Pure
 * world data like world-gen: hashed from (seed, landmark), no SimState and
 * no sim RNG, so the sim never sees them (they cannot block, fight or take
 * damage) and the renderer and HUD may ask freely.
 *
 * Each eligible landmark (kind in a def's `homes`, first matching def in
 * registration order, first TOWNSFOLK.cap landmarks) gets at most one
 * resident. Its home and stroll waypoints are rejected when they touch water,
 * colliders, interaction spots or a court's activity circle, and every leg
 * between waypoints is sampled the same way, so any pose on the route is
 * safe by construction.
 */
import "../defs/world-index.js";
import { LANDMARK_DEFS, TOWNSFOLK_DEFS } from "../defs/registries.js";
import { landmarkActivityPoint } from "../defs/landmark-activities.js";
import { TOWNSFOLK } from "../defs/townsfolk/tuning.js";
import type { Point, TownsfolkDef } from "../defs/types.js";
import { touchesWaterShore } from "../defs/water.js";
import { pointSegDist } from "./collision.js";
import { WORLD, hash2, insideWorld, landmarkParts, landmarks, nearColliders, waterRegionsNear, type Landmark } from "./world-gen.js";

export interface Townsfolk {
  /** Stable id: `<landmark id>:<def id>`. */
  readonly id: string;
  /** TOWNSFOLK_DEFS id. */
  readonly kind: string;
  readonly landmark: string;
  readonly home: Point;
  /** Closed ping-pong stroll route starting at home (one point: stands still). */
  readonly route: readonly Point[];
  /** 0..1 offset into the stroll loop. */
  readonly phase: number;
  /** Render seed and tip offset. */
  readonly seed: number;
}
export interface TownsfolkPose {
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly moving: boolean;
  /** Finite step frame (0 or 1); the art caches per frame, never per time. */
  readonly frame: 0 | 1;
}

const siteMemo = new Map<number, readonly { l: Landmark; def: TownsfolkDef }[]>();
const placeMemo = new Map<string, Townsfolk | null>();
const capped = <K, V>(m: Map<K, V>, cap: number) => { if (m.size >= cap) m.clear(); };
/** Drops the memo tables; results are pure, so this only costs time (tests). */
export function clearTownsfolkCache(): void {
  siteMemo.clear();
  placeMemo.clear();
}

/** Eligible landmarks of a seed and their resident kind, capped. */
function sites(seed: number): readonly { l: Landmark; def: TownsfolkDef }[] {
  let out = siteMemo.get(seed);
  if (!out) {
    const list: { l: Landmark; def: TownsfolkDef }[] = [];
    for (const l of landmarks(seed)) {
      if (list.length >= TOWNSFOLK.cap) break;
      const def = TOWNSFOLK_DEFS.all().find((d) => d.homes.includes(l.kind));
      if (def) list.push({ l, def });
    }
    capped(siteMemo, 16);
    siteMemo.set(seed, out = list);
  }
  return out;
}

/** True when a townsfolk body can stand at (x, y) near landmark `l`. */
export function townsfolkSafeAt(seed: number, l: Landmark, x: number, y: number): boolean {
  const r = TOWNSFOLK.body;
  if (!insideWorld(x, y, r + 8) || y < WORLD.playTop + 20) return false;
  if (waterRegionsNear(seed, x, y, r + 2).some((w) => touchesWaterShore(w, x, y, r + 2))) return false;
  for (const c of nearColliders(seed, x, y))
    if (pointSegDist(x, y, c.x1, c.y1, c.x2, c.y2) < c.radius + r) return false;
  for (const s of landmarkParts(l).spots) if (Math.hypot(s.x - x, s.y - y) < TOWNSFOLK.spotPad) return false;
  for (const o of landmarks(seed)) {
    const activity = LANDMARK_DEFS.get(o.kind).activity;
    if (!activity) continue;
    const p = landmarkActivityPoint(o);
    if (Math.hypot(p.x - x, p.y - y) < activity.radius + TOWNSFOLK.courtPad) return false;
  }
  return true;
}
function legSafe(seed: number, l: Landmark, a: Point, b: Point): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / TOWNSFOLK.sample));
  for (let i = 1; i <= n; i++)
    if (!townsfolkSafeAt(seed, l, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  return true;
}
function place(seed: number, l: Landmark, def: TownsfolkDef): Townsfolk | null {
  const key = `${seed}:${l.id}`;
  if (placeMemo.has(key)) return placeMemo.get(key)!;
  let out: Townsfolk | null = null;
  const h = (a: number, salt: number) => hash2(seed, l.x + a, l.y, 900 + salt);
  const [r0, r1] = TOWNSFOLK.ring;
  for (let i = 0; i < TOWNSFOLK.tries && !out; i++) {
    const ang = h(i, 0) * Math.PI * 2,
      dist = l.radius * (r0 + h(i, 1) * (r1 - r0)),
      home = { x: Math.round(l.x + Math.cos(ang) * dist), y: Math.round(l.y + Math.sin(ang) * dist * 0.7) };
    if (!townsfolkSafeAt(seed, l, home.x, home.y)) continue;
    const path: Point[] = [home];
    for (let w = 0; w < TOWNSFOLK.waypoints; w++)
      for (let k = 0; k < TOWNSFOLK.waypointTries; k++) {
        const a = h(i * 31 + w * 7 + k, 2) * Math.PI * 2,
          d = def.wander.radius * (0.45 + h(i * 31 + w * 7 + k, 3) * 0.55),
          p = { x: Math.round(home.x + Math.cos(a) * d), y: Math.round(home.y + Math.sin(a) * d * 0.6) };
        if (Math.hypot(p.x - home.x, p.y - home.y) > def.wander.radius) continue;
        if (!legSafe(seed, l, path[path.length - 1]!, p)) continue;
        path.push(p);
        break;
      }
    // Walk out and back along the same checked legs.
    const route = path.length > 1 ? [...path, ...path.slice(1, -1).reverse()] : path;
    out = {
      id: `${l.id}:${def.id}`, kind: def.id, landmark: l.id, home, route,
      phase: h(i, 4), seed: Math.floor(h(i, 5) * 1e6),
    };
  }
  capped(placeMemo, 400);
  placeMemo.set(key, out);
  return out;
}

/** Every townsfolk of a seed, in landmark order (pure, capped at TOWNSFOLK.cap). */
export function townsfolk(seed: number): readonly Townsfolk[] {
  return sites(seed).map(({ l, def }) => place(seed, l, def)).filter((t): t is Townsfolk => !!t);
}
/** Townsfolk whose stroll may reach within `radius` of (x, y). Only nearby homes are computed. */
export function townsfolkNear(seed: number, x: number, y: number, radius: number): Townsfolk[] {
  const out: Townsfolk[] = [];
  for (const { l, def } of sites(seed)) {
    if (Math.hypot(l.x - x, l.y - y) > radius + l.radius * TOWNSFOLK.ring[1] + def.wander.radius) continue;
    const t = place(seed, l, def);
    if (t && Math.hypot(t.home.x - x, t.home.y - y) <= radius + def.wander.radius) out.push(t);
  }
  return out;
}
/** Where a townsfolk stands at time `t` (seconds): a pure function of the route and t. */
export function townsfolkPose(npc: Townsfolk, t: number): TownsfolkPose {
  const def = TOWNSFOLK_DEFS.get(npc.kind), route = npc.route, n = route.length;
  if (n === 1) {
    const p = route[0]!, turn = Math.floor(t / (def.wander.pause * 2) + npc.phase * 4);
    return { x: p.x, y: p.y, facing: turn % 2 ? -1 : 1, moving: false, frame: 0 };
  }
  let period = 0;
  for (let i = 0; i < n; i++) {
    const a = route[i]!, b = route[(i + 1) % n]!;
    period += def.wander.pause + Math.hypot(b.x - a.x, b.y - a.y) / def.wander.speed;
  }
  let local = (((t + npc.phase * period) % period) + period) % period;
  for (let i = 0; i < n; i++) {
    const a = route[i]!, b = route[(i + 1) % n]!,
      walk = Math.hypot(b.x - a.x, b.y - a.y) / def.wander.speed,
      facing: 1 | -1 = b.x < a.x ? -1 : 1;
    if (local < def.wander.pause) return { x: a.x, y: a.y, facing, moving: false, frame: 0 };
    local -= def.wander.pause;
    if (local < walk) {
      const k = walk > 0 ? local / walk : 1;
      return {
        x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, facing, moving: true,
        frame: Math.floor(local * 4) % 2 ? 1 : 0,
      };
    }
    local -= walk;
  }
  const p = route[0]!;
  return { x: p.x, y: p.y, facing: 1, moving: false, frame: 0 };
}
/** The tip number (1..def.tips) a townsfolk gives at time t. */
export function townsfolkTip(npc: Townsfolk, t: number): number {
  const tips = Math.max(1, TOWNSFOLK_DEFS.get(npc.kind).tips);
  return 1 + ((Math.floor(Math.max(0, t) / TOWNSFOLK.tipSeconds) + npc.seed) % tips);
}
/** The closest townsfolk within its talk radius of (x, y) at time t, if any. */
export function nearestTownsfolk(
  seed: number, x: number, y: number, t: number,
): { npc: Townsfolk; pose: TownsfolkPose; distance: number; tip: number } | null {
  let best: { npc: Townsfolk; pose: TownsfolkPose; distance: number; tip: number } | null = null;
  const reach = Math.max(0, ...TOWNSFOLK_DEFS.all().map((d) => d.talkRadius));
  for (const npc of townsfolkNear(seed, x, y, reach)) {
    const pose = townsfolkPose(npc, t), distance = Math.hypot(pose.x - x, pose.y - y);
    if (distance > TOWNSFOLK_DEFS.get(npc.kind).talkRadius || (best && distance >= best.distance)) continue;
    best = { npc, pose, distance, tip: townsfolkTip(npc, t) };
  }
  return best;
}
