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
export function pushRing(
  state: SimState,
  ctx: SimContext,
  x: number,
  y: number,
  radius: number,
  to: number,
  /** False for a keep-out zone that pushes every step (no repeated effect). */
  fx = true,
): number {
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
  if (hit.length && fx) ctx.effect(state, x, y, "costume-push", EFFECT_LIFE["costume-push"], { radius });
  return hit.length;
}

/** Unit direction the cat is heading: its velocity, else the way it faces. */
export function heading(state: SimState): { x: number; y: number } {
  const p = state.player,
    v = Math.hypot(p.vx, p.vy);
  return v > 1e-6 ? { x: p.vx / v, y: p.vy / v } : { x: p.facing, y: 0 };
}

/**
 * Pushes ordinary ink touching a lane sideways out of it, to the side it is
 * already on (elites only part of the way). The Boss stays. Returns the count.
 */
export function pushOutOfLane(state: SimState, ctx: SimContext, z: CostumeZone): number {
  const x2 = z.x2 ?? z.x,
    y2 = z.y2 ?? z.y,
    len = Math.hypot(x2 - z.x, y2 - z.y);
  if (len < 1e-6) return 0;
  const ux = (x2 - z.x) / len,
    uy = (y2 - z.y) / len;
  let n = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0 || isBoss(e)) continue;
    const r = ctx.enemyRadius(e);
    if (!insideLane(z, e.x, e.y, r)) continue;
    const along = (e.x - z.x) * ux + (e.y - z.y) * uy,
      side = -(e.x - z.x) * uy + (e.y - z.y) * ux,
      // Ink right on the centre line goes to the left of the lane (no random side).
      sign = side < 0 ? -1 : 1,
      want = z.radius + r + 2,
      off = Math.abs(side) + Math.max(0, want - Math.abs(side)) * ctx.knockOf(e),
      cx = z.x + ux * along,
      cy = z.y + uy * along,
      pos = ctx.safePosition(state, cx - uy * off * sign, cy + ux * off * sign, r);
    e.x = pos.x;
    e.y = pos.y;
    n++;
  }
  return n;
}

/**
 * Slows ordinary ink passing `inside` to `factor` of its speed for its next
 * move (stepEnemies reads and clears it). The Boss is never slowed by a costume.
 */
export function slowNormals(state: SimState, inside: (e: EnemyState) => boolean, factor: number): number {
  let n = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0 || isBoss(e) || !inside(e)) continue;
    e.costumeSlow = Math.min(e.costumeSlow ?? 1, factor);
    n++;
  }
  return n;
}

/** Enemy shots within `radius` fly at `factor` of their speed this step. */
export function slowEnemyShots(state: SimState, x: number, y: number, radius: number, factor: number, dt: number): number {
  let n = 0;
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    const at = enemyShotAt(s);
    if (Math.hypot(at.x - x, at.y - y) > radius) continue;
    s.t = Math.max(0, s.t - dt * (1 - factor));
    n++;
  }
  return n;
}

/**
 * Telegraphed bursts: every "burst" zone whose `armed` time has come bursts
 * once (radius, damage = power) and is marked spent (`clock` 1).
 */
export function fireArmedBursts(state: SimState, ctx: SimContext): number {
  let n = 0;
  for (const z of state.costume?.zones ?? []) {
    if (z.kind !== "burst" || z.clock === 1 || (z.armed ?? 0) > state.elapsed) continue;
    z.clock = 1;
    burst(state, ctx, z.x, z.y, z.radius, z.power);
    n++;
  }
  return n;
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
