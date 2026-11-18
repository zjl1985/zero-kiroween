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
import { ECOLOGY } from "../defs/ecology.js";
import type { Element, PropDef, PropSpot, SimContext } from "../defs/types.js";
import type { Capsule } from "./scenery.js";
import type { PropState, SimState } from "./types.js";
import { EFFECT_LIFE, STATS } from "./types.js";
import { chunkContent, chunkOf, hash2, nearProps } from "./world-gen.js";
import { pointSegDist } from "./collision.js";
import { paperTouchesWater, spreadCarriedFire, stepPaperStatus } from "./paper-status.js";

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
const colliderMemo = new WeakMap<readonly PropSpot[], { id: string; caps: Capsule[] }[]>();
/** Prop colliders around (x, y), one entry per prop that has any. */
export function nearPropColliders(seed: number, x: number, y: number): readonly { id: string; caps: Capsule[] }[] {
  const props = nearProps(seed, x, y);
  let out = colliderMemo.get(props);
  if (!out) {
    out = [];
    for (const p of props) {
      const caps = propDef(p.kind).colliders?.(seed, p.x, p.y, p.s);
      if (caps?.length) out.push({ id: p.id, caps });
    }
    colliderMemo.set(props, out);
  }
  return out;
}
/** A fold is not destruction. Expired folds stay open until the lifecycle safely unfolds them. */
export function propBlocks(state: SimState, id: string): boolean {
  const m = state.props[id];
  return !m || (m.phase < 2 && m.foldedUntil === undefined);
}
/** Colliders of props that still stand and have not been temporarily folded. */
export function standingPropColliders(state: SimState, x: number, y: number): readonly Capsule[][] {
  const out: Capsule[][] = [];
  for (const c of nearPropColliders(state.seed, x, y)) if (propBlocks(state, c.id)) out.push(c.caps);
  return out;
}

// ---------------------------------------------------------------- reactions
function mutable(state: SimState, p: PropSpot, def: PropDef): PropState {
  let m = state.props[p.id];
  if (!m) m = state.props[p.id] = { hp: propMaxHp(def), phase: 0, hitAt: -1e9 };
  return m;
}
/** Reaction helpers; neither treatment changes HP, destruction stats or drop history. */
export function foldProp(state: SimState, p: PropSpot, seconds: number): void {
  if (state.ended !== "playing" || seconds <= 0 || propPhase(state, p.id) === 2) return;
  const m = mutable(state, p, propDef(p.kind));
  m.foldedUntil = Math.max(m.foldedUntil ?? 0, state.elapsed + seconds);
}
export function inkProp(state: SimState, p: PropSpot, seconds: number): void {
  if (state.ended !== "playing" || seconds <= 0 || propPhase(state, p.id) === 2) return;
  const m = mutable(state, p, propDef(p.kind));
  m.inkedUntil = Math.max(m.inkedUntil ?? 0, state.elapsed + seconds);
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
  if (state.ended !== "playing" || power <= 0) return;
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
  if (state.ended !== "playing") return;
  const def = propDef(p.kind),
    m = mutable(state, p, def);
  if (m.phase === 2 || amount <= 0) return;
  const max = propMaxHp(def);
  m.hp = Math.max(0, m.hp - amount);
  m.phase = m.hp <= 0 ? PHASE.scraps : m.hp < max * def.damagedBelow ? PHASE.damaged : PHASE.intact;
  if (m.phase < 2) return;
  m.destroyedAt = state.elapsed;
  if (def.regrow) m.regrowAt = state.elapsed + (burnt ? def.regrow.burntSeconds ?? def.regrow.seconds : def.regrow.seconds);
  const claimed = m.dropsClaimed;
  // Burning also claims the one lifetime drop roll: ash cannot regrow into a loot farm.
  m.dropsClaimed = true;
  delete m.foldedUntil;
  delete m.inkedUntil;
  ctx.effect(state, p.x, p.y - 6 * p.s, "prop-scraps", EFFECT_LIFE["prop-scraps"], {
    src: def.art,
    amount: burnt ? 1 : 0,
  });
  if (burnt) {
    m.burnt = true;
    return;
  }
  state.stats.propsTorn++;
  if (claimed) return;
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

// ---------------------------------------------------------------- lifecycle
/** Resolve a touched prop without relying on currently loaded chunks or a frame RNG. */
function propFromId(seed: number, id: string): PropSpot | undefined {
  const [chunk, index] = id.split("#"),
    [cx, cy] = (chunk ?? "").split(",").map(Number),
    i = Number(index);
  if (!Number.isInteger(cx) || !Number.isInteger(cy) || !Number.isInteger(i) || i < 0) return;
  const p = chunkContent(seed, cx!, cy!).props[i];
  return p?.id === id ? p : undefined;
}
function occupied(state: SimState, p: PropSpot, def: PropDef, ctx: SimContext): boolean {
  const caps = def.colliders?.(state.seed, p.x, p.y, p.s) ?? [];
  if (!caps.length) return false;
  const overlaps = (x: number, y: number, radius: number) => caps.some((c) =>
    pointSegDist(x, y, c.x1, c.y1, c.x2, c.y2) <= radius + c.radius + ECOLOGY.actorClearance);
  if (state.player.hp > 0 && overlaps(state.player.x, state.player.y, STATS.playerRadius)) return true;
  return state.enemies.some((e) => e.alive && overlaps(e.x, e.y, ctx.enemyRadius(e)));
}
function fireNearProp(state: SimState, p: PropSpot, def: PropDef): boolean {
  for (const key of Object.keys(state.fire.cells)) {
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    if (inFootprint(p, def, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell, FIRE.cell * Math.SQRT1_2)) return true;
  }
  return false;
}
/** Touched state is retained across unloads; deadlines are simulation time, not visibility time. */
export function stepPropLifecycle(state: SimState, ctx: SimContext): void {
  if (state.ended !== "playing") return;
  for (const [id, m] of Object.entries(state.props)) {
    if (m.inkedUntil !== undefined && m.inkedUntil <= state.elapsed) delete m.inkedUntil;
    const regrow = m.phase === 2 && m.regrowAt !== undefined && m.regrowAt <= state.elapsed,
      unfold = m.foldedUntil !== undefined && m.foldedUntil <= state.elapsed;
    if (!regrow && !unfold && m.inkedUntil === undefined) continue;
    const p = propFromId(state.seed, id);
    if (!p) continue;
    const def = propDef(p.kind);
    if (m.inkedUntil !== undefined && paperTouchesWater(state.seed, p.x, p.y)) {
      delete m.inkedUntil;
      ctx.effect(state, p.x, p.y, "ink-wash", EFFECT_LIFE["ink-wash"], { src: def.art });
    }
    if (unfold) {
      if (occupied(state, p, def, ctx)) m.foldedUntil = state.elapsed + ECOLOGY.retrySeconds;
      else delete m.foldedUntil;
    }
    if (!regrow || !def.regrow) continue;
    if (occupied(state, p, def, ctx) || fireNearProp(state, p, def)) {
      m.regrowAt = state.elapsed + ECOLOGY.retrySeconds;
      continue;
    }
    m.hp = propMaxHp(def);
    m.phase = PHASE.intact;
    // Keep the lifetime loot claim, but the new paper is not the old scorched sheet.
    m.dropsClaimed = true;
    delete m.destroyedAt;
    delete m.regrowAt;
    delete m.burnt;
    delete m.burnAt;
    delete m.foldedUntil;
    delete m.inkedUntil;
    for (const key of Object.keys(state.fire.ash)) {
      const [ix, iy] = key.split(",").map(Number) as [number, number];
      if (!(key in state.fire.cells) && inFootprint(p, def, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell, 0))
        delete state.fire.ash[key];
    }
    ctx.effect(state, p.x, p.y, "regrow", EFFECT_LIFE.regrow, { src: def.art });
  }
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
    if (propFlammability(state, p, def) <= 0 || propPhase(state, p.id) === 2) continue;
    if (inFootprint(p, def, x, y, 0)) out.push(p);
  }
  return out;
}
function propFlammability(state: SimState, p: PropSpot, def: PropDef): number {
  const inked = (state.props[p.id]?.inkedUntil ?? 0) > state.elapsed;
  return MATERIALS.get(def.material).flammability * (inked ? ECOLOGY.inkFlammability : 1);
}
function wetCell(state: SimState, ix: number, iy: number): boolean {
  return paperTouchesWater(state.seed, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell, FIRE.cell * Math.SQRT1_2);
}
function flammability(state: SimState, ix: number, iy: number): number {
  if (wetCell(state, ix, iy)) return 0;
  let best = 0;
  for (const p of fuelAt(state, ix, iy)) best = Math.max(best, propFlammability(state, p, propDef(p.kind)));
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
  if (state.ended !== "playing" || radius < 0 || burningCount(state) >= FIRE.maxCells) return;
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
/** Water and actor status precede damage/spread; lifecycle keeps running without live cells. */
export function stepFire(state: SimState, dt: number, ctx: SimContext): void {
  if (dt <= 0 || !Number.isFinite(dt) || state.ended !== "playing") return;
  const fire = state.fire;
  for (const key of Object.keys(fire.cells)) {
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    if (!wetCell(state, ix, iy)) continue;
    delete fire.cells[key];
    ctx.effect(state, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell, "steam", EFFECT_LIFE.steam);
  }
  stepPropLifecycle(state, ctx);
  stepPaperStatus(state, dt, ctx);
  if (state.ended !== "playing") return;
  fire.clock += dt;
  while (fire.clock + 1e-9 >= FIRE.tick) {
    fire.clock = Math.max(0, fire.clock - FIRE.tick);
    fire.ticks++;
    spreadCarriedFire(state, ctx);
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
  const consumed = new Set<string>();
  for (const key of keys) {
    const [ix, iy] = key.split(",").map(Number) as [number, number];
    for (const p of fuelAt(state, ix, iy)) {
      if (consumed.has(p.id)) continue;
      consumed.add(p.id);
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
}
