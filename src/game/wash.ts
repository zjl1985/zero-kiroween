/**
 * The wash-out grid: spilled water lifts colour off the page, pigment puts it
 * back. Pure and deterministic: these helpers mutate only SimState.wash (and
 * the fire grid when water lands) and use no randomness at all; the sim rolls
 * sketch wake-ups with hash2. Cells that are fully painted are not stored.
 *
 * Imports only defs data and game/types, so reaction defs may read it while
 * the world registry is being built (no world-gen / props cycle).
 */
import { FIRE } from "../defs/fire.js";
import type { Element } from "../defs/types.js";
import { WASH } from "../defs/wash.js";
import { STATS, type SimState, type WashCell, type WashState } from "./types.js";

export function createWash(): WashState {
  return { cells: {}, size: 0, clock: 0, ticks: 0, touched: 0, lost: 0, splashes: 0, pigments: 0, rainPulses: 0, wipes: 0, sketchClock: 0 };
}
export function washCellOf(x: number, y: number): [number, number] {
  return [Math.floor(x / WASH.cell), Math.floor(y / WASH.cell)];
}
export function washKey(ix: number, iy: number): string {
  return `${ix},${iy}`;
}
/** True when no cell is stored (a kept count: enumerating a sparse record every call is slow). */
export function washEmpty(state: SimState): boolean {
  return !state.wash || state.wash.size <= 0;
}
function put(state: SimState, key: string, c: WashCell): void {
  const cells = state.wash.cells;
  if (!(key in cells)) state.wash.size++;
  cells[key] = c;
}
function drop(state: SimState, key: string): void {
  const cells = state.wash.cells;
  if (!(key in cells)) return;
  delete cells[key];
  state.wash.size--;
}
/** Centre of a cell key in world units. */
export function washCentre(key: string): [number, number] {
  const [ix, iy] = key.split(",").map(Number) as [number, number];
  return [(ix + 0.5) * WASH.cell, (iy + 0.5) * WASH.cell];
}
/** Colourless or blank: the colour is gone here. */
export function isColourless(c: WashCell | undefined): boolean {
  return !!c && (c.blank === true || c.level >= WASH.colourless);
}
/** Cells whose centre lies within radius (plus half a cell) of (x, y), row by row. */
function forCells(x: number, y: number, radius: number, fn: (key: string, cx: number, cy: number) => void): void {
  if (!(radius >= 0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const [ax, ay] = washCellOf(x - radius, y - radius),
    [bx, by] = washCellOf(x + radius, y + radius),
    reach = radius + WASH.cell * 0.5;
  for (let iy = ay; iy <= by; iy++)
    for (let ix = ax; ix <= bx; ix++) {
      const cx = (ix + 0.5) * WASH.cell,
        cy = (iy + 0.5) * WASH.cell;
      if (Math.hypot(cx - x, cy - y) <= reach) fn(washKey(ix, iy), cx, cy);
    }
}
/** Fold protection: a fold mark on the cell, or an active fold field over its centre. */
function folded(state: SimState, c: WashCell | undefined, cx: number, cy: number): boolean {
  if (c?.foldUntil !== undefined && c.foldUntil > state.elapsed) return true;
  return state.fields.some((f) => f.life > 0 && Math.hypot(cx - f.x, cy - f.y) <= (f.radius ?? 0));
}
function blankCell(state: SimState): WashCell {
  return { level: 0, changedAt: state.elapsed };
}
/** A painted cell with no live marks is the default page: forget it. */
function settle(state: SimState, key: string, c: WashCell): void {
  if (c.level > 0 || c.blank) return;
  const live = (t: number | undefined) => t !== undefined && t > state.elapsed;
  if (live(c.wetUntil) || live(c.cutUntil) || live(c.foldUntil)) return;
  drop(state, key);
}
/** Keeps the store under WASH.maxCells: painted cells go first, then the oldest washed ones (lost). */
function cap(state: SimState): void {
  if (state.wash.size <= WASH.maxCells) return;
  const cells = state.wash.cells,
    keys = Object.keys(cells);
  let over = state.wash.size - WASH.maxCells;
  if (over <= 0) return;
  for (const pass of [0, 1] as const)
    for (const key of keys) {
      if (over <= 0) return;
      const c = cells[key];
      if (!c || (pass === 0 && isColourless(c))) continue;
      if (isColourless(c)) state.wash.lost++;
      drop(state, key);
      over--;
    }
}
/** Water lifts `amount` of colour off every unprotected cell in the circle. Returns cells changed. */
export function washAt(state: SimState, x: number, y: number, radius: number, amount: number): number {
  if (state.ended !== "playing" || !(amount > 0)) return 0;
  const cells = state.wash.cells;
  let changed = 0;
  forCells(x, y, radius, (key, cx, cy) => {
    const known = cells[key];
    if (folded(state, known, cx, cy)) return;
    const c = known ?? blankCell(state),
      was = isColourless(c),
      level = Math.min(1, c.level + amount);
    c.wetUntil = Math.max(c.wetUntil ?? 0, state.elapsed + WASH.wetSeconds);
    if (level !== c.level) {
      c.level = level;
      c.changedAt = state.elapsed;
      changed++;
    }
    if (!was && isColourless(c)) state.wash.touched++;
    put(state, key, c);
  });
  cap(state);
  return changed;
}
/** Rubs out every cell whose centre passes `inside`, within the box: no colour, no pencil. */
export function blankWhere(
  state: SimState,
  box: { x0: number; y0: number; x1: number; y1: number },
  inside: (x: number, y: number) => boolean,
): number {
  if (state.ended !== "playing") return 0;
  const [ax, ay] = washCellOf(box.x0, box.y0),
    [bx, by] = washCellOf(box.x1, box.y1),
    cells = state.wash.cells;
  let changed = 0;
  for (let iy = ay; iy <= by; iy++)
    for (let ix = ax; ix <= bx; ix++) {
      const cx = (ix + 0.5) * WASH.cell,
        cy = (iy + 0.5) * WASH.cell;
      if (!inside(cx, cy)) continue;
      const key = washKey(ix, iy),
        c = cells[key] ?? blankCell(state);
      if (c.blank) continue;
      if (!isColourless(c)) state.wash.touched++;
      c.blank = true;
      c.level = 1;
      c.changedAt = state.elapsed;
      delete c.hint;
      put(state, key, c);
      changed++;
    }
  cap(state);
  return changed;
}
/** Paints `amount` of colour back into stored cells of the circle. Returns cells changed. */
export function paintAt(state: SimState, x: number, y: number, radius: number, amount: number, hint?: string): number {
  if (!(amount > 0)) return 0;
  const cells = state.wash.cells;
  if (washEmpty(state)) return 0;
  let changed = 0;
  forCells(x, y, radius, (key) => {
    const c = cells[key];
    if (!c || (c.level <= 0 && !c.blank)) return;
    c.level = Math.max(0, c.level - amount);
    if (c.level <= 0) delete c.blank;
    c.changedAt = state.elapsed;
    if (hint) c.hint = hint;
    changed++;
    settle(state, key, c);
  });
  return changed;
}
export function washCellAt(state: SimState, x: number, y: number): WashCell | undefined {
  const [ix, iy] = washCellOf(x, y);
  return state.wash?.cells[washKey(ix, iy)];
}
/** 0 painted .. 1 colourless; blank cells read 1. */
export function washLevelAt(state: SimState, x: number, y: number): number {
  const c = washCellAt(state, x, y);
  return !c ? 0 : c.blank ? 1 : c.level;
}
export function washBlankAt(state: SimState, x: number, y: number): boolean {
  const c = washCellAt(state, x, y);
  return !!c && (c.blank === true || (c.cutUntil ?? 0) > state.elapsed);
}
/** Wet washed paper at the point. */
export function washWetAt(state: SimState, x: number, y: number): boolean {
  const c = washCellAt(state, x, y);
  return !!c && (c.wetUntil ?? 0) > state.elapsed;
}
/** Any wet washed cell overlapping the circle (actors standing on wet paper); radius 0 = the point's own cell. */
export function washWetTouches(state: SimState, x: number, y: number, radius: number): boolean {
  if (washEmpty(state)) return false;
  const cells = state.wash.cells,
    r = Math.max(0, radius),
    [ax, ay] = washCellOf(x - r, y - r),
    [bx, by] = washCellOf(x + r, y + r);
  for (let iy = ay; iy <= by; iy++)
    for (let ix = ax; ix <= bx; ix++) {
      const c = cells[washKey(ix, iy)];
      if (!c || !((c.wetUntil ?? 0) > state.elapsed)) continue;
      // Circle against the whole square cell, not just its centre.
      const dx = Math.max(ix * WASH.cell - x, 0, x - (ix + 1) * WASH.cell),
        dy = Math.max(iy * WASH.cell - y, 0, y - (iy + 1) * WASH.cell);
      if (dx * dx + dy * dy <= r * r) return true;
    }
  return false;
}
/** Wet washed paper anywhere over a fire cell (FIRE.cell squares are smaller than wash cells). */
export function washBlocksFire(state: SimState, ix: number, iy: number): boolean {
  return washWetAt(state, (ix + 0.5) * FIRE.cell, (iy + 0.5) * FIRE.cell);
}
/**
 * Element hits on the page itself: a large cut leaves a white cut hole for a
 * moment; a large fold protects the painted page from water. Small shots
 * (bolts, cranes in flight) never mark the grid.
 */
export function washElement(state: SimState, x: number, y: number, radius: number, element: Element, power: number): void {
  if (state.ended !== "playing" || !(power > 0)) return;
  const mark = element === "cut" ? WASH.cut : element === "fold" ? WASH.fold : undefined;
  if (!mark || radius < mark.minRadius) return;
  const cells = state.wash.cells,
    until = state.elapsed + mark.seconds;
  forCells(x, y, radius, (key) => {
    const c = cells[key] ?? blankCell(state);
    if (element === "cut") {
      c.cutUntil = Math.max(c.cutUntil ?? 0, until);
      c.changedAt = state.elapsed;
    } else c.foldUntil = Math.max(c.foldUntil ?? 0, until);
    put(state, key, c);
  });
  cap(state);
}
/** Puts out fire cells within the circle; returns how many went out. */
export function quenchFire(state: SimState, x: number, y: number, radius: number): number {
  let out = 0;
  for (const key of Object.keys(state.fire.cells)) {
    const [ix, iy] = key.split(",").map(Number) as [number, number],
      cx = (ix + 0.5) * FIRE.cell,
      cy = (iy + 0.5) * FIRE.cell;
    if (Math.hypot(cx - x, cy - y) > radius + FIRE.cell * Math.SQRT1_2) continue;
    delete state.fire.cells[key];
    out++;
  }
  return out;
}
/** Colour kept this night, in percent (see RunStats.colourKept). */
export function colourKept(state: SimState): number {
  const w = state.wash;
  if (w.touched <= 0) return 100;
  let washed = 0;
  for (const c of Object.values(w.cells)) if (isColourless(c)) washed++;
  return Math.round(100 * Math.max(0, 1 - (washed + w.lost) / w.touched));
}
/** Washed share of the page around (x, y): colourless, not blank, not cut, at least minDistance away. */
export function sketchCells(state: SimState, x: number, y: number): { keys: string[]; fraction: number } {
  const { radius, minDistance } = WASH.sketch,
    keys: string[] = [];
  for (const [key, c] of Object.entries(state.wash.cells)) {
    if (c.blank || c.level < WASH.colourless || (c.cutUntil ?? 0) > state.elapsed) continue;
    const [cx, cy] = washCentre(key),
      d = Math.hypot(cx - x, cy - y);
    if (d <= radius && d >= minDistance) keys.push(key);
  }
  const area = (Math.PI * radius * radius) / (WASH.cell * WASH.cell);
  return { keys, fraction: keys.length / area };
}
/**
 * Advances the grid clock; returns how many WASH.tick beats ran this step.
 * Each beat: dawn repaint, expired marks forgotten, the colour-kept stat
 * refreshed until dawn starts (then it stays frozen).
 */
export function stepWash(state: SimState, dt: number): number {
  if (dt <= 0 || !Number.isFinite(dt) || state.ended !== "playing") return 0;
  const w = state.wash;
  w.clock += dt;
  let beats = 0;
  while (w.clock + 1e-9 >= WASH.tick) {
    w.clock = Math.max(0, w.clock - WASH.tick);
    w.ticks++;
    beats++;
    const dawn = state.sessionSeconds > STATS.dawnSeconds && state.timeLeft <= STATS.dawnSeconds;
    if (!dawn) state.stats.colourKept = colourKept(state);
    const restore = dawn ? WASH.tick / (STATS.dawnSeconds * WASH.dawnShare) : 0;
    for (const [key, c] of Object.entries(w.cells)) {
      if (restore > 0 && (c.level > 0 || c.blank)) {
        c.level = Math.max(0, c.level - restore);
        if (c.level <= 0) delete c.blank;
        c.changedAt = state.elapsed;
      }
      settle(state, key, c);
    }
  }
  return beats;
}
