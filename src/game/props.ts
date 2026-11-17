/**
 * Props and fire in the deterministic sim. Props come from world-gen
 * (pure hash); SimState.props stores only the ones that were touched. The
 * reaction table (REACTIONS, one row per material x element) decides what an
 * element does to a prop. Fire spreads on a sparse grid with a hard cap and
 * rolls from hash2, so it never consumes the step RNG.
 */
import { reactionFor } from "../defs/world-index.js";
import { MATERIALS, PROP_DEFS } from "../defs/registries.js";
import { FIRE, PROP_HITS } from "../defs/fire.js";
import type { Element, PropDef, PropSpot, SimContext } from "../defs/types.js";
import type { Capsule } from "./scenery.js";
import type { PropState, SimState } from "./types.js";
import { EFFECT_LIFE } from "./types.js";
import { chunkOf, hash2, nearProps } from "./world-gen.js";

const PHASE = { intact: 0, damaged: 1, scraps: 2 } as const;

export function propDef(kind: string): PropDef {
  return PROP_DEFS.get(kind);
}
export function propMaxHp(def: PropDef): number {
  return def.durability * MATERIALS.get(def.material).durability;
}
/** 0 intact, 1 damaged, 2 scraps. */
export function propPhase(state: SimState, id: string): 0 | 1 | 2 {
  return state.props[id]?.phase ?? 0;
}
/** True when the point lies in the prop's ground footprint grown by `radius`. */
export function inFootprint(p: PropSpot, def: PropDef, x: number, y: number, radius: number): boolean {
  const rx = (def.size.w / 2) * p.s + radius,
    ry = (def.size.d / 2) * p.s + radius,
    dx = (x - p.x) / rx,
    dy = (y - (p.y - def.size.d * p.s * 0.25)) / ry;
  return dx * dx + dy * dy <= 1;
}

// ---------------------------------------------------------------- colliders
const colliderMemo = new Map<string, { id: string; caps: Capsule[] }[]>();
/** Prop colliders around (x, y), one entry per prop that has any. */
export function nearPropColliders(seed: number, x: number, y: number): readonly { id: string; caps: Capsule[] }[] {
  const { cx, cy } = chunkOf(x, y),
    key = `${seed}:${cx},${cy}`;
  let out = colliderMemo.get(key);
  if (!out) {
    if (colliderMemo.size > 400) colliderMemo.clear();
    out = [];
    for (const p of nearProps(seed, x, y)) {
      const caps = propDef(p.kind).colliders?.(seed, p.x, p.y, p.s);
      if (caps?.length) out.push({ id: p.id, caps });
    }
    colliderMemo.set(key, out);
  }
  return out;
}
/** Colliders of the props around (x, y) that still stand (not scraps). */
export function standingPropColliders(state: SimState, x: number, y: number): readonly Capsule[][] {
  const out: Capsule[][] = [];
  for (const c of nearPropColliders(state.seed, x, y)) if (propPhase(state, c.id) < 2) out.push(c.caps);
  return out;
}

// ---------------------------------------------------------------- reactions
function mutable(state: SimState, p: PropSpot, def: PropDef): PropState {
  let m = state.props[p.id];
  if (!m) m = state.props[p.id] = { hp: propMaxHp(def), phase: 0, hitAt: -1e9 };
  return m;
}
export function elementHit(
  state: SimState,
  x: number,
  y: number,
  radius: number,
  element: Element,
  power: number,
  ctx: SimContext,
): void {
  if (power <= 0) return;
  for (const p of nearProps(state.seed, x, y)) {
    const def = propDef(p.kind);
    if (!def.accepts.includes(element)) continue;
    const known = state.props[p.id];
    if (known && (known.phase === 2 || state.elapsed - known.hitAt < PROP_HITS.hitInterval)) continue;
    if (!inFootprint(p, def, x, y, radius)) continue;
    const row = reactionFor(def.material, element);
    if (!row) continue;
    mutable(state, p, def).hitAt = state.elapsed;
    row.effect(state, { prop: p, def, material: MATERIALS.get(def.material), element, power }, ctx);
    ctx.effect(state, p.x, p.y - 8 * p.s, row.fx, (EFFECT_LIFE as Record<string, number>)[row.fx] ?? 0.4, { src: def.art });
  }
}
export function damageProp(state: SimState, p: PropSpot, amount: number, ctx: SimContext, burnt = false): void {
  const def = propDef(p.kind),
    m = mutable(state, p, def);
  if (m.phase === 2 || amount <= 0) return;
  const max = propMaxHp(def);
  m.hp = Math.max(0, m.hp - amount);
  m.phase = m.hp <= 0 ? PHASE.scraps : m.hp < max * def.damagedBelow ? PHASE.damaged : PHASE.intact;
  if (m.phase < 2) return;
  ctx.effect(state, p.x, p.y - 6 * p.s, "prop-scraps", EFFECT_LIFE["prop-scraps"], {
    src: def.art,
    amount: burnt ? 1 : 0,
  });
  if (burnt) {
    m.burnt = true;
    return;
  }
  state.stats.propsTorn++;
  // Seeded drops: the same prop always gives the same thing.
  const [cx, cy] = p.id.split("#")[0]!.split(",").map(Number) as [number, number],
    index = Number(p.id.split("#")[1]);
  if (hash2(state.seed, cx * 64 + index, cy, 71) < def.drops.shard) {
    const burst = def.drops.burst ?? 1;
    if (burst <= 1) ctx.dropShard(state, p.x, p.y, def.drops.shardValue);
    // A burst spills shards in a seeded ring around the prop (stuffed scarecrows).
    else
      for (let i = 0; i < burst; i++) {
        const a = (i / burst) * Math.PI * 2 + hash2(state.seed, cx * 64 + index, cy, 73) * Math.PI,
          r = PROP_HITS.burstRadius * p.s;
        ctx.dropShard(state, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, def.drops.shardValue);
      }
  }
  if (hash2(state.seed, cx * 64 + index, cy, 72) < def.drops.treat) ctx.dropTreat(state, p.x, p.y + 6);
}

// ---------------------------------------------------------------- fire grid
export function cellOf(x: number, y: number): [number, number] {
  return [Math.floor(x / FIRE.cell), Math.floor(y / FIRE.cell)];
}
export function cellKey(ix: number, iy: number): string {
  return `${ix},${iy}`;
}
/** Flammable props whose footprint covers the centre of cell (ix, iy). */
function fuelAt(state: SimState, ix: number, iy: number): PropSpot[] {
  const x = (ix + 0.5) * FIRE.cell,
    y = (iy + 0.5) * FIRE.cell,
    out: PropSpot[] = [];
  for (const p of nearProps(state.seed, x, y)) {
    const def = propDef(p.kind);
    if (MATERIALS.get(def.material).flammability <= 0 || propPhase(state, p.id) === 2) continue;
    if (inFootprint(p, def, x, y, 0)) out.push(p);
  }
  return out;
}
function flammability(state: SimState, ix: number, iy: number): number {
  let best = 0;
  for (const p of fuelAt(state, ix, iy))
    best = Math.max(best, MATERIALS.get(propDef(p.kind).material).flammability);
  return best;
}
export function burningCount(state: SimState): number {
  return Object.keys(state.fire.cells).length;
}
function light(state: SimState, ix: number, iy: number): boolean {
  const key = cellKey(ix, iy),
    fire = state.fire;
  if (key in fire.cells || key in fire.ash) return false;
  if (burningCount(state) >= FIRE.maxCells) return false;
  if (flammability(state, ix, iy) <= 0) return false;
  fire.cells[key] = FIRE.burnTime;
  return true;
}
export function ignite(state: SimState, x: number, y: number, radius: number, ctx: SimContext): void {
  const [ax, ay] = cellOf(x - radius, y - radius),
    [bx, by] = cellOf(x + radius, y + radius);
  let lit = false;
  for (let iy = ay; iy <= by; iy++)
    for (let ix = ax; ix <= bx; ix++) {
      const cx = (ix + 0.5) * FIRE.cell,
        cy = (iy + 0.5) * FIRE.cell;
      if (Math.hypot(cx - x, cy - y) > radius + FIRE.cell * 0.5) continue;
      if (light(state, ix, iy)) lit = true;
    }
  if (lit) ctx.effect(state, x, y, "ember", EFFECT_LIFE.ember);
}
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
/** Spread, burn-out, prop and enemy damage on the FIRE.tick beat. */
export function stepFire(state: SimState, dt: number, ctx: SimContext): void {
  const fire = state.fire;
  if (burningCount(state) === 0) {
    fire.clock = 0;
    return;
  }
  fire.clock += dt;
  while (fire.clock >= FIRE.tick && burningCount(state) > 0) {
    fire.clock -= FIRE.tick;
    fire.ticks++;
    fireTick(state, ctx);
  }
}
function fireTick(state: SimState, ctx: SimContext): void {
  const fire = state.fire,
    keys = Object.keys(fire.cells);
  // Spread first, from the cells burning at the start of the tick.
  for (const key of keys) {
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    NEIGHBOURS.forEach(([dx, dy], n) => {
      const nx = ix + dx,
        ny = iy + dy,
        nk = cellKey(nx, ny);
      if (nk in fire.cells || nk in fire.ash) return;
      const f = flammability(state, nx, ny);
      if (f > 0 && hash2(state.seed, ix * 4 + n, iy, 900 + fire.ticks) < FIRE.spreadChance * f) light(state, nx, ny);
    });
  }
  for (const key of keys) {
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    for (const p of fuelAt(state, ix, iy)) {
      const m = mutable(state, p, propDef(p.kind));
      m.burnAt = state.elapsed;
      damageProp(state, p, FIRE.propBurn, ctx, true);
    }
    const left = fire.cells[key]! - FIRE.tick;
    fire.cells[key] = left;
    if (left <= 1e-9) {
      delete fire.cells[key];
      fire.ash[key] = fire.ticks;
      state.stats.cellsBurnt++;
    }
  }
  const ash = Object.keys(fire.ash);
  for (let i = 0; i < ash.length - FIRE.maxAsh; i++) delete fire.ash[ash[i]!];
  // Ink standing in flames scorches; the cat is never hurt by fire.
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const [ix, iy] = cellOf(e.x, e.y);
    if (cellKey(ix, iy) in fire.cells) ctx.hurtEnemy(state, e, FIRE.enemyDamage);
  }
}
