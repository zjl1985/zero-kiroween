import { normalize } from "../../game/collision.js";
import { EFFECT_LIFE, type SimState } from "../../game/types.js";
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
 * Nicole's page fold: every few seconds the page folds along a crease through
 * her, facing the ink. Ink on the folded flap is flipped over to the other
 * side and pinned under the paper. From level 3 the crease stands up into a
 * short paper wall. Paper under the flap folds, and painted cells there are
 * protected from water while the fold lasts.
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
    };
  },
  step(state, ps, dt, _rng, ctx) {
    const f = ps.pageFold;
    if (!f || !weaponReady(state, "page-fold", dt)) return;
    const n = foldNormal(state, f.band * PAGE_FOLD.reach);
    // Wait for ink in reach; the fold is never wasted on an empty page.
    if (!n.any) return;
    state.weaponTimers["page-fold"] = f.interval;
    foldPage(state, n.x, n.y, f, ctx);
  },
};
