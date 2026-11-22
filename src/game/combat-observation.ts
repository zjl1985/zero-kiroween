/** Exact contacts already resolved by the simulation, for presentation only.
 * Weak keys keep observations tied to the lifetime of the real shot/impact.
 * They never enter SimState, snapshots, saves or the simulation's decisions. */
import { clamp, normalize } from "./collision.js";
import type { EnemyState, Impact, ShotState } from "./types.js";

export type ContactFamily = "bolt" | "orbit" | "star-fall" | "claw" | "crane" | "seed" | "brush" | "cut" | "fold" | "fire" | "wash";
export interface ContactSource {
  readonly family: ContactFamily;
  readonly x: number;
  readonly y: number;
  readonly dx?: number;
  readonly dy?: number;
}
export interface CombatContact {
  readonly family: ContactFamily;
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  /** Target footprint at the moment of contact, before any knockback. */
  readonly radius: number;
}
interface Launch {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly at: number;
}
const launches = new WeakMap<ShotState, Launch>();
const byEnemy = new WeakMap<EnemyState, CombatContact>();
const byImpact = new WeakMap<Impact, CombatContact>();

export function observeLaunch(shot: ShotState, at: number): void {
  const dir = normalize(shot.vx, shot.vy);
  launches.set(shot, { x: shot.x, y: shot.y, dx: dir.x, dy: dir.y, at });
}
export function shotLaunch(shot: ShotState): Launch | undefined { return launches.get(shot); }
export function enemyContact(enemy: EnemyState): CombatContact | undefined { return byEnemy.get(enemy); }
export function impactContact(impact: Impact): CombatContact | undefined { return byImpact.get(impact); }

export function observeImpact(impact: Impact | undefined, contact: CombatContact | undefined): void {
  if (impact && contact) byImpact.set(impact, contact);
}

export function observeContact(enemy: EnemyState, radius: number, source?: ContactSource): CombatContact | undefined {
  if (!source) {
    byEnemy.delete(enemy);
    return;
  }
  const vx = enemy.x - source.x, vy = enemy.y - source.y;
  const side = normalize(vx, vy);
  const dir = source.dx === undefined ? side : normalize(source.dx, source.dy ?? 0);
  const distance = Math.min(radius, Math.hypot(vx, vy));
  const contact = { family: source.family,
    x: enemy.x - side.x * distance, y: enemy.y - side.y * distance,
    dx: dir.x, dy: dir.y, radius };
  byEnemy.set(enemy, contact);
  return contact;
}

/** Find the first touching centre along a segment that has already hit. This
 * locates the paint spark without changing the swept hit test or its order. */
export function projectileContact(ox: number, oy: number, shot: ShotState, enemy: EnemyState, reach: number): ContactSource {
  const dir = normalize(shot.vx, shot.vy);
  const vx = enemy.x - ox, vy = enemy.y - oy;
  const along = vx * dir.x + vy * dir.y;
  const across = vx * dir.y - vy * dir.x;
  const first = clamp(along - Math.sqrt(Math.max(0, reach * reach - across * across)), 0, Math.hypot(shot.x - ox, shot.y - oy));
  return { family: shot.weapon === "crane" ? "crane" : "bolt",
    x: ox + dir.x * first, y: oy + dir.y * first, dx: dir.x, dy: dir.y };
}
