import { normalize } from "../../game/collision.js";
import { EFFECT_LIFE, STATS, type FoldBridge, type SimState } from "../../game/types.js";
import { bridgeDecks, deepWaterBlocks, waterAt, waterRegionsNear, type WaterDecks } from "../../game/water.js";
import { waterStrip } from "../water.js";
import { ENEMY_DEFS } from "../registries.js";
import type { SimContext, WeaponDef } from "../types.js";
import { reflectAcross } from "./paper-geometry.js";
import { stepBonus } from "./steps.js";
import { weaponReady } from "./timers.js";

const BASE = {
  interval: 3.4,
  /** How deep the folded flap reaches past the crease. */
  band: 92,
  damage: 2,
  /** Seconds flipped ink stays pinned under the fold. */
  pin: 1.3,
  /** Seconds the standing paper wall lasts (from level WALL.fromLevel). */
  wall: 3,
  /** Seconds a paper bridge over deep water lasts (from level FOLD_BRIDGE.level). */
  bridge: 6,
} as const;
/** Fold numbers that never show on the card. */
export const PAGE_FOLD = {
  /** Half length of the crease along the page. */
  half: 112,
  /** Ink is looked for within band * reach to aim the fold. */
  reach: 1.6,
  /** Fold power for the paper and the wash grid under the flap. */
  power: 2,
  /** Seconds a flap is drawn (the fold, then the crease fading). */
  flapLife: 1.1,
  maxFlaps: 3,
  /** Bosses are too heavy to flip: they only take this share of the damage. */
  bossFactor: 0.5,
} as const;
/** The crease stands up into a paper wall in front of Nicole from this level. */
export const PAPER_WALL = {
  fromLevel: 3,
  /** Distance of the wall ahead of the crease, toward the folded side. */
  offset: 44,
  halfLength: 58,
  radius: 6,
  maxWalls: 3,
} as const;
/**
 * From this level, walking into deep water folds a straight paper strip across
 * it: a dry deck that every water query treats like a generated crossing.
 */
export const FOLD_BRIDGE = {
  level: 2,
  /** Deep water must start within this distance ahead of the cat. */
  reach: 70,
  /** Longest deck; with no far bank inside it, no bridge is laid. */
  length: 300,
  /** Deck width (the cat is STATS.playerRadius * 2 = 24 wide). */
  width: 40,
  /** The deck starts this far behind the cat and runs this far onto the far bank. */
  back: 10,
  land: 18,
  /** Step of the march along the move direction. */
  probe: 6,
  /** The cat must be moving at least this fast (units/s). */
  minSpeed: 20,
  cooldown: 8,
  max: 2,
  /** While an actor still stands over the deep part, removal is retried this often ... */
  retry: 0.5,
  /** ... for at most this many extra seconds; then actors are set on the nearest bank. */
  holdMax: 4,
} as const;
const STEPS = [{ damage: 1 }, { area: 18 }, { rate: 0.15 }, { area: 18, damage: 2 }] as const;

declare module "../types.js" {
  interface PlayerStats {
    pageFold:
      | false
      | {
          interval: number;
          band: number;
          half: number;
          damage: number;
          pin: number;
          /** 0 = no wall at this level. */
          wall: number;
          /** 0 = no bridge at this level, else its seconds. */
          bridge: number;
        };
  }
  interface WeaponBaseMap {
    "page-fold": typeof BASE;
  }
}

/** Fold direction: toward the middle of the ink in reach, else the way the cat faces. */
export function foldNormal(state: SimState, reach: number): { x: number; y: number; any: boolean } {
  const p = state.player;
  let sx = 0,
    sy = 0,
    n = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > reach) continue;
    sx += e.x - p.x;
    sy += e.y - p.y;
    n++;
  }
  if (!n || Math.hypot(sx, sy) < 1e-6) return { x: p.facing, y: 0, any: n > 0 };
  const d = normalize(sx, sy);
  return { x: d.x, y: d.y, any: true };
}

/**
 * Folds the page over the crease through the cat with unit normal (nx, ny):
 * ink on the folded side within the band is flipped across and pinned. Returns
 * how many were flipped.
 */
export function foldPage(
  state: SimState,
  nx: number,
  ny: number,
  f: { band: number; half: number; damage: number; pin: number; wall: number },
  ctx: SimContext,
): number {
  const p = state.player,
    tx = -ny,
    ty = nx;
  let flipped = 0;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const dx = e.x - p.x,
      dy = e.y - p.y,
      d = dx * nx + dy * ny,
      s = dx * tx + dy * ty,
      r = ctx.enemyRadius(e);
    if (d <= 0 || d > f.band + r || Math.abs(s) > f.half + r) continue;
    if (ENEMY_DEFS.get(e.kind).boss) {
      ctx.hurtEnemy(state, e, f.damage * PAGE_FOLD.bossFactor);
      continue;
    }
    const m = reflectAcross(e.x, e.y, p.x, p.y, nx, ny),
      pos = ctx.safePosition(state, m.x, m.y, r);
    e.x = pos.x;
    e.y = pos.y;
    e.stun = Math.max(e.stun ?? 0, f.pin);
    ctx.hurtEnemy(state, e, f.damage);
    flipped++;
  }
  // The flap lands on the near side: paper under it folds and painted cells there are protected.
  const half = f.band / 2;
  ctx.elementHit(state, p.x - nx * half, p.y - ny * half, Math.max(half, f.half * 0.6), "fold", PAGE_FOLD.power);
  ctx.effect(state, p.x, p.y, "page-fold", EFFECT_LIFE["page-fold"], { radius: f.band, angle: Math.atan2(ny, nx) });
  const fold = state.fold;
  fold.flaps.push({ id: fold.nextId++, x: p.x, y: p.y, nx, ny, band: f.band, half: f.half, at: state.elapsed });
  if (fold.flaps.length > PAGE_FOLD.maxFlaps) fold.flaps.splice(0, fold.flaps.length - PAGE_FOLD.maxFlaps);
  fold.folds++;
  if (f.wall > 0) {
    const cx = p.x + nx * PAPER_WALL.offset,
      cy = p.y + ny * PAPER_WALL.offset,
      h = PAPER_WALL.halfLength;
    state.walls.push({
      id: state.nextWallId++,
      x1: cx - tx * h,
      y1: cy - ty * h,
      x2: cx + tx * h,
      y2: cy + ty * h,
      radius: PAPER_WALL.radius,
      life: f.wall,
      maxLife: f.wall,
    });
    if (state.walls.length > PAPER_WALL.maxWalls) state.walls.splice(0, state.walls.length - PAPER_WALL.maxWalls);
  }
  return flipped;
}

/**
 * Lays a paper bridge when the cat walks toward deep water within reach and a
 * far bank lies within FOLD_BRIDGE.length: marching along the move direction
 * with waterAt, the deck runs from just behind the cat to FOLD_BRIDGE.land past
 * the end of the deep water. No RNG. Returns the new bridge, if any.
 */
export function layBridge(state: SimState, seconds: number, ctx: SimContext): FoldBridge | null {
  const fold = state.fold, b = FOLD_BRIDGE, p = state.player;
  if ((fold.bridgeReady ?? 0) > state.elapsed || (fold.bridges?.length ?? 0) >= b.max) return null;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed < b.minSpeed || p.hp <= 0) return null;
  if (!waterRegionsNear(state.seed, p.x, p.y, b.reach).length) return null;
  const dx = p.vx / speed, dy = p.vy / speed, decks = bridgeDecks(fold.bridges);
  let enter = -1, leave = -1;
  for (let d = b.probe; d <= b.length; d += b.probe) {
    const deep = waterAt(state.seed, p.x + dx * d, p.y + dy * d, decks) === "deep";
    if (enter < 0) {
      if (deep) enter = d;
      else if (d >= b.reach) return null;
    } else if (!deep) {
      leave = d;
      break;
    }
  }
  if (enter < 0 || leave < 0) return null;
  const from = { x: p.x - dx * b.back, y: p.y - dy * b.back },
    to = { x: p.x + dx * (leave + b.land), y: p.y + dy * (leave + b.land) };
  const bridge: FoldBridge = {
    id: fold.nextId++,
    polygon: waterStrip(from, to, b.width / 2).map((v) => ({ x: v.x, y: v.y })),
    at: state.elapsed,
    until: state.elapsed + seconds,
    hold: state.elapsed + seconds + b.holdMax,
  };
  // Replaced, not mutated: water queries cache the deck list by identity.
  fold.bridges = [...(fold.bridges ?? []), bridge];
  fold.bridgeReady = state.elapsed + b.cooldown;
  fold.folds++;
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  ctx.effect(state, mx, my, "page-fold", EFFECT_LIFE["page-fold"], {
    radius: Math.hypot(to.x - from.x, to.y - from.y) / 2, angle: Math.atan2(dy, dx) - Math.PI / 2,
  });
  return bridge;
}

/**
 * Removes bridges whose time is up, but never from under an actor: while any
 * living actor's circle would be in deep water without the deck, removal is
 * retried every FOLD_BRIDGE.retry seconds up to `hold`. After that the deck
 * goes and stranded actors are set on the nearest bank (safePosition, which
 * projects out of deep water).
 */
export function expireBridges(state: SimState, ctx: SimContext): void {
  const fold = state.fold, list = fold.bridges;
  if (!list?.length) return;
  let current = list;
  for (const bridge of list) {
    if (bridge.until > state.elapsed) continue;
    const rest = current.filter((b) => b !== bridge),
      actors = stranded(state, bridge, bridgeDecks(rest), ctx);
    if (actors.length && state.elapsed < bridge.hold) {
      bridge.until = Math.min(bridge.hold, state.elapsed + FOLD_BRIDGE.retry);
      continue;
    }
    // Replaced, not mutated; safePosition below already sees the deck gone.
    current = rest;
    if (rest.length) fold.bridges = rest;
    else delete fold.bridges;
    for (const a of actors) {
      const pos = ctx.safePosition(state, a.actor.x, a.actor.y, a.radius);
      a.actor.x = pos.x;
      a.actor.y = pos.y;
    }
  }
}
/** Living actors whose circle would be in deep water once `bridge` is gone (`decks`: the others). */
function stranded(state: SimState, bridge: FoldBridge, decks: WaterDecks | undefined, ctx: SimContext) {
  const out: { actor: { x: number; y: number }; radius: number }[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of bridge.polygon) {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  const check = (actor: { x: number; y: number }, radius: number) => {
    if (actor.x + radius < minX || actor.x - radius > maxX || actor.y + radius < minY || actor.y - radius > maxY) return;
    if (deepWaterBlocks(state.seed, actor.x, actor.y, radius, decks)) out.push({ actor, radius });
  };
  if (state.player.hp > 0) check(state.player, STATS.playerRadius);
  for (const e of state.enemies) if (e.alive && e.spawnTime <= 0) check(e, ctx.enemyRadius(e));
  return out;
}

/**
 * Nicole's page fold: every few seconds the page folds along a crease through
 * her, facing the ink. Ink on the folded flap is flipped over to the other
 * side and pinned under the paper. From level 3 the crease stands up into a
 * short paper wall. Paper under the flap folds, and painted cells there are
 * protected from water while the fold lasts. From level 2, walking into deep
 * water folds a paper bridge across it.
 */
export const PAGE_FOLD_WEAPON: WeaponDef = {
  id: "page-fold",
  pool: "nicole",
  kind: "weapon",
  steps: STEPS,
  base: BASE,
  timing: "auto",
  elements: ["fold"],
  stats(s, level) {
    const b = stepBonus(STEPS, level);
    s.pageFold = level > 0 && {
      interval: BASE.interval * (1 - b.rate),
      band: (BASE.band + b.area) * s.area,
      half: PAGE_FOLD.half * s.area,
      damage: BASE.damage + b.damage,
      pin: BASE.pin,
      wall: level >= PAPER_WALL.fromLevel ? BASE.wall : 0,
      bridge: level >= FOLD_BRIDGE.level ? BASE.bridge : 0,
    };
  },
  step(state, ps, dt, _rng, ctx) {
    const f = ps.pageFold;
    if (!f) return;
    expireBridges(state, ctx);
    if (f.bridge > 0) layBridge(state, f.bridge, ctx);
    if (!weaponReady(state, "page-fold", dt)) return;
    const n = foldNormal(state, f.band * PAGE_FOLD.reach);
    // Wait for ink in reach; the fold is never wasted on an empty page.
    if (!n.any) return;
    state.weaponTimers["page-fold"] = f.interval;
    foldPage(state, n.x, n.y, f, ctx);
  },
};
