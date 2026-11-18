import { FIRE } from "../defs/fire.js";
import type { SimContext, WaterPolygon, WaterRegion } from "../defs/types.js";
import { inWaterPolygon, nearestWaterEdge, prepareWater } from "../defs/water.js";
import { EFFECT_LIFE, STATS, type PaperStatus, type SimState } from "./types.js";
import { waterAt } from "./water.js";
import { waterRegionsNear } from "./world-gen.js";
import { washWetTouches } from "./wash.js";

type PaperActor = PaperStatus & { x: number; y: number };

// Shallow shore minus bridges, using the water system's same convex clipping.
// Cache pure geometry by region identity, not actor state or simulation time.
const wetShoreMemo = new WeakMap<WaterRegion, readonly WaterPolygon[]>();

/** Radius contact with exposed water: bridge decks are subtracted, not whole actors exempted. */
export function paperTouchesWater(seed: number, x: number, y: number, radius = 0): boolean {
  const centre = waterAt(seed, x, y);
  if (centre === "shallow" || centre === "deep") return true;
  if (radius <= 0) return false;
  const point = { x, y };
  return waterRegionsNear(seed, x, y, radius).some((region) => {
    let shore = wetShoreMemo.get(region);
    if (!shore) {
      shore = prepareWater({ ...region, core: region.shore }).solids;
      wetShoreMemo.set(region, shore);
    }
    return shore.some((polygon) => inWaterPolygon(point, polygon) || nearestWaterEdge(point, polygon).distance <= radius);
  });
}

/** Circle versus the whole burning square, not just the actor's centre cell. */
export function paperTouchesFire(state: SimState, x: number, y: number, radius: number): boolean {
  const cells = state.fire.cells;
  if (Object.keys(cells).length === 0) return false;
  for (let iy = Math.floor((y - radius) / FIRE.cell); iy <= Math.floor((y + radius) / FIRE.cell); iy++)
    for (let ix = Math.floor((x - radius) / FIRE.cell); ix <= Math.floor((x + radius) / FIRE.cell); ix++) {
      if (!(`${ix},${iy}` in cells)) continue;
      const dx = Math.max(ix * FIRE.cell - x, 0, x - (ix + 1) * FIRE.cell),
        dy = Math.max(iy * FIRE.cell - y, 0, y - (iy + 1) * FIRE.cell);
      if (dx * dx + dy * dy <= radius * radius) return true;
    }
  return false;
}

function extinguish(state: SimState, actor: PaperActor, ctx: SimContext, player: boolean): void {
  if ((actor.burnTime ?? 0) > 0) {
    ctx.effect(state, actor.x, actor.y, "steam", EFFECT_LIFE.steam);
    if (player) ctx.notify(state, "extinguished");
  }
  actor.burnTime = 0;
  actor.burnClock = 0;
}

/** Latch contact immediately after movement, before a later knockback can erase it. No timer advances here. */
export function touchPaperEnvironment(state: SimState, actor: PaperActor, radius: number, ctx: SimContext, player = false): "water" | "damp" | "dry" {
  // Wet washed paper soaks actors through the same path as exposed water.
  if (paperTouchesWater(state.seed, actor.x, actor.y, radius) || washWetTouches(state, actor.x, actor.y, radius)) {
    actor.wetTime = FIRE.wetTime;
    extinguish(state, actor, ctx, player);
    return "water";
  }
  if ((actor.wetTime ?? 0) > 0) {
    extinguish(state, actor, ctx, player);
    return "damp";
  }
  if (paperTouchesFire(state, actor.x, actor.y, radius)) {
    if (!(actor.burnTime && actor.burnTime > 0)) {
      actor.burnClock = 0;
      ctx.effect(state, actor.x, actor.y, "ember", EFFECT_LIFE.ember);
      if (player) ctx.notify(state, "burning");
    }
    actor.burnTime = FIRE.actorBurnTime;
  }
  return "dry";
}

function stepActor(
  state: SimState,
  actor: PaperActor,
  radius: number,
  dt: number,
  interval: number,
  damage: () => void,
  alive: () => boolean,
  ctx: SimContext,
  player = false,
): void {
  const contact = touchPaperEnvironment(state, actor, radius, ctx, player);
  if (contact === "water") return;
  if (contact === "damp") {
    actor.wetTime = Math.max(0, actor.wetTime! - dt);
    return;
  }
  const burning = actor.burnTime ?? 0;
  if (burning <= 0) return;
  actor.burnClock = (actor.burnClock ?? 0) + Math.min(dt, burning);
  actor.burnTime = Math.max(0, burning - dt);
  while (actor.burnClock + 1e-9 >= interval && alive() && state.ended === "playing") {
    actor.burnClock = Math.max(0, actor.burnClock - interval);
    damage();
  }
  if (actor.burnTime <= 0 || !alive()) {
    actor.burnTime = 0;
    actor.burnClock = 0;
  }
}

/** Runs every simulation step, including when the fire grid has become empty. */
export function stepPaperStatus(state: SimState, dt: number, ctx: SimContext): void {
  if (dt <= 0 || !Number.isFinite(dt) || state.ended !== "playing") return;
  const p = state.player;
  if (p.hp > 0)
    stepActor(state, p, STATS.playerRadius, dt, FIRE.playerInterval,
      () => { ctx.hurtPlayer(state, FIRE.playerDamage); }, () => p.hp > 0, ctx, true);
  if (state.ended !== "playing") return;
  // Death hooks can append enemies; newborn paper must not inherit this step's fire tick.
  for (const e of [...state.enemies]) {
    if (state.ended !== "playing") return;
    if (!e.alive || e.spawnTime > 0) continue;
    stepActor(state, e, ctx.enemyRadius(e), dt, FIRE.enemyInterval,
      () => ctx.hurtEnemy(state, e, FIRE.enemyDamage), () => e.alive, ctx);
  }
}

/** Called only on FIRE.tick: carried flame cannot ignite fuel at frame rate. */
export function spreadCarriedFire(state: SimState, ctx: SimContext): void {
  const spread = (actor: PaperActor, radius: number) => {
    if ((actor.burnTime ?? 0) <= 0 || (actor.wetTime ?? 0) > 0) return;
    if (paperTouchesWater(state.seed, actor.x, actor.y, radius) || washWetTouches(state, actor.x, actor.y, radius)) return;
    ctx.ignite(state, actor.x, actor.y, radius + FIRE.carryReach);
  };
  if (state.ended !== "playing") return;
  if (state.player.hp > 0) spread(state.player, STATS.playerRadius);
  for (const e of state.enemies)
    if (e.alive && e.spawnTime <= 0) spread(e, ctx.enemyRadius(e));
}
