/**
 * Shared skill primitives for costume defs. Sim helpers only: no render, UI or
 * DOM imports, no randomness. Boss rule (from the old assist cards): the Boss
 * is never pushed or frozen by a costume; it only takes bounded damage
 * (`burst`) or has its shots cleared.
 */
import { pointSegDist } from "../../game/collision.js";
import type { CostumeZone, EnemyState, SimState } from "../../game/types.js";
import { EFFECT_LIFE } from "../../game/types.js";
import { ENEMY_DEFS } from "../registries.js";
import type { SimContext } from "../types.js";
import { COSTUME } from "./tuning.js";

const isBoss = (e: EnemyState) => ENEMY_DEFS.find(e.kind)?.boss === true;
/** Living, arrived, ordinary ink whose centre is within `radius` of (x, y). */
function normalsNear(state: SimState, x: number, y: number, radius: number): EnemyState[] {
  return state.enemies.filter(
    (e) => e.alive && e.spawnTime <= 0 && !isBoss(e) && Math.hypot(e.x - x, e.y - y) <= radius,
  );
}

/**
 * Pushes ordinary ink within `radius` of (x, y) outward to distance `to`
 * (elites only part of the way, by their knockback scale). The Boss stays.
 * Returns how many were pushed.
 */
export function pushRing(state: SimState, ctx: SimContext, x: number, y: number, radius: number, to: number): number {
  const hit = normalsNear(state, x, y, radius);
  for (const e of hit) {
    const d = Math.hypot(e.x - x, e.y - y),
      // Ink right on the centre goes out to the right (no random direction).
      ux = d > 1e-6 ? (e.x - x) / d : 1,
      uy = d > 1e-6 ? (e.y - y) / d : 0,
      reach = d + Math.max(0, to - d) * ctx.knockOf(e),
      pos = ctx.safePosition(state, x + ux * reach, y + uy * reach, ctx.enemyRadius(e));
    e.x = pos.x;
    e.y = pos.y;
  }
  if (hit.length) ctx.effect(state, x, y, "costume-push", EFFECT_LIFE["costume-push"], { radius });
  return hit.length;
}

/** Where an enemy lob is now along its flight. */
export function enemyShotAt(s: SimState["enemyShots"][number]): { x: number; y: number } {
  const k = s.flight > 0 ? Math.min(1, s.t / s.flight) : 1;
  return { x: s.x0 + (s.tx - s.x0) * k, y: s.y0 + (s.ty - s.y0) * k };
}

/** Removes enemy shots (the Boss's too) currently within `radius`; returns the count. */
export function clearEnemyShots(state: SimState, x: number, y: number, radius: number): number {
  let n = 0;
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    const at = enemyShotAt(s);
    if (Math.hypot(at.x - x, at.y - y) > radius) continue;
    s.alive = false;
    n++;
  }
  return n;
}

/**
 * Freezes ordinary ink within `radius` for `seconds` with the shared enemy
 * stun (stepEnemies skips stunned ink: no move, bite or knockback). Never the Boss.
 */
export function stunNormals(state: SimState, x: number, y: number, radius: number, seconds: number): number {
  const hit = normalsNear(state, x, y, radius);
  for (const e of hit) e.stun = Math.max(e.stun ?? 0, seconds);
  return hit.length;
}

/** Gathers living ink shards within `radius` onto (x, y); returns the count. */
export function pullShards(state: SimState, ctx: SimContext, x: number, y: number, radius: number): number {
  let n = 0;
  for (const s of state.pickups) {
    if (!s.alive || Math.hypot(s.x - x, s.y - y) > radius) continue;
    s.x = x;
    s.y = y;
    n++;
  }
  if (n) ctx.effect(state, x, y, "costume-pull", EFFECT_LIFE["costume-pull"], { radius });
  return n;
}

/**
 * Damages every living enemy touching the circle, the Boss included (bounded
 * damage is the one thing a costume may do to it). Returns the count hit.
 */
export function burst(state: SimState, ctx: SimContext, x: number, y: number, radius: number, damage: number): number {
  let n = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    if (Math.hypot(e.x - x, e.y - y) > radius + ctx.enemyRadius(e)) continue;
    ctx.hurtEnemy(state, e, damage);
    n++;
  }
  ctx.effect(state, x, y, "costume-burst", EFFECT_LIFE["costume-burst"], { radius });
  return n;
}

/** Adds a zone to the worn costume, dropping the oldest past COSTUME.maxZones. */
export function addZone(state: SimState, zone: CostumeZone): void {
  const c = state.costume;
  if (!c) return;
  c.zones.push(zone);
  while (c.zones.length > COSTUME.maxZones) c.zones.shift();
}

/** (x, y) is within the lane's half width (+ pad) of its centre line. */
export function insideLane(z: CostumeZone, x: number, y: number, pad = 0): boolean {
  return pointSegDist(x, y, z.x, z.y, z.x2 ?? z.x, z.y2 ?? z.y) <= z.radius + pad;
}

/** (x, y) is within the zone's radius (+ pad) of its centre. */
export function insideCircle(z: CostumeZone, x: number, y: number, pad = 0): boolean {
  return Math.hypot(x - z.x, y - z.y) <= z.radius + pad;
}
