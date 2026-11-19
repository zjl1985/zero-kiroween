/**
 * The deterministic night simulation. It is content-agnostic: cats, weapons,
 * passives, evolutions and enemies come from the registries filled by
 * src/defs/index.ts, and act through their hooks with the SimContext below.
 */
import "../defs/index.js";
import { BEHAVIOURS, CATS, ENEMY_DEFS, EVOLUTION_DEFS, PASSIVE_DEFS, SIM_EVENTS, WEAPON_DEFS } from "../defs/registries.js";
import { moonStarPositions } from "../defs/weapons/moon-stars.js";
import type {
  Element,
  EnemyDef,
  EnemyKind,
  EnemyMove,
  EvolutionDef,
  PlayerStats,
  SimContext,
  SimEvents,
  UpgradeId,
  WeaponTiming,
} from "../defs/types.js";
import { avoidScenery } from "./scenery.js";
import { createRng, type Rng } from "./rng.js";
import {
  ACTIVE,
  LANDMARK,
  SCREEN,
  SPAWN_RING,
  chunkContent,
  chunkIndex,
  chunkKey,
  chunksNear,
  clampToWorld,
  hash2,
  insideWorld,
  landmarks,
  nearStaticColliders,
  viewCentre,
} from "./world-gen.js";
import { circlesOverlap, clamp, length, normalize, pointSegDist } from "./collision.js";
import { chestCandidates, readyEvolution, rollChoices, upgradeDef, xpForLevel, XP } from "./upgrades.js";
import { playerStats } from "./stats.js";
import {
  ELITE,
  ENEMY_FX_LIFE,
  FILLER_KIND,
  HORDE,
  KIND_CAP,
  PHASE_AT,
  SPAWN_TABLE,
  WAVES,
  WAVE_RING,
  type WaveDef,
} from "./enemies.js";
import {
  DEFAULT_WORLD,
  EFFECT_LIFE,
  FX_CAP,
  STATS,
  YARD_TOP,
  type FrameInput,
  type Impact,
  type SimConfig,
  type SimState,
  type EnemyState,
  type ShotState,
  type StrokePoint,
  type Notice,
  type EffectKind,
} from "./types.js";
import { CHEST, FISH, MOON_LANTERN, PUMPKIN } from "./interactions.js";
import { FIRE } from "../defs/fire.js";
import { damageProp, elementHit, ignite, nearPropColliders, propBlocks, stepFire } from "./props.js";
import { hitLandmarkActions, stepLandmarkActions } from "./landmark-actions.js";
import { avoidDeepWater, bridgeDecks, resolveWaterMove, waterAt } from "./water.js";
import { WATER } from "../defs/water.js";
import { touchPaperEnvironment } from "./paper-status.js";
import { WASH } from "../defs/wash.js";
import {
  createWash,
  paintAt,
  quenchFire,
  sketchCells,
  stepWash,
  washAt,
  washCentre,
  washElement,
  washWetTouches,
} from "./wash.js";

export { inSweep, startBossAttack } from "../defs/enemies/eraser-boss/attacks.js";

/** Helpers handed to def hooks. */
const ctx: SimContext = {
  stats: playerStats,
  effect,
  notify,
  hurtEnemy,
  hurtPlayer,
  spawnEnemy,
  spawnShot(state, shot) {
    state.shots.push({ id: state.nextShotId++, ...shot });
  },
  safePosition,
  nearestEnemy,
  enemyRadius,
  knockOf,
  livingEnemies,
  maybeReink,
  dropShard,
  dropChest,
  dropTreat,
  elementHit: applyElement,
  damageProp: (state, prop, amount, burnt) => damageProp(state, prop, amount, ctx, burnt),
  ignite: (state, x, y, radius) => ignite(state, x, y, radius, ctx),
  wash: (state, x, y, radius, amount, soak = true) => spillWater(state, x, y, radius, amount, soak),
  paint: (state, x, y, radius, amount, hint) => {
    paintAt(state, x, y, radius, amount, hint);
  },
};
/** Element each shot tag applies to props (plain bolts are "bolt"). */
const SHOT_ELEMENT = new Map(
  WEAPON_DEFS.all()
    .filter((w) => w.shotTag && w.elements?.length)
    .map((w) => [w.shotTag!, w.elements![0]!] as const),
);
function emit<K extends keyof SimEvents>(name: K, state: SimState, payload: SimEvents[K]): void {
  SIM_EVENTS.emit(name, state, payload, ctx);
}
function enemyDef(kind: EnemyKind): EnemyDef {
  return ENEMY_DEFS.get(kind);
}
/** The kind that arrives on its own schedule (the Boss), if any is registered. */
const ARRIVAL = ENEMY_DEFS.all().find((d) => d.arrival);
/** The kind that wakes from colourless paper (pencil sketches), if any is registered. */
const SKETCH = ENEMY_DEFS.all().find((d) => d.wakesOn === "colourless");

function defaultStroke(width: number, height: number): StrokePoint[] {
  const cx = width * 0.5,
    cy = height * 0.62;
  return [
    { x: cx - 160, y: cy + 18 },
    { x: cx - 80, y: cy - 16 },
    { x: cx - 10, y: cy + 8 },
    { x: cx + 70, y: cy - 22 },
    { x: cx + 150, y: cy + 10 },
  ];
}
export function createSim(config: Partial<SimConfig> = {}): SimState {
  const world = config.world ?? DEFAULT_WORLD,
    seed = config.seed ?? 1,
    rng = createRng(seed),
    id = config.cat ?? CATS.all()[0]!.id,
    cat = CATS.get(id),
    def = cat.stats;
  const seconds = config.sessionSeconds ?? STATS.sessionSeconds;
  const state: SimState = {
    seed,
    rngState: rng.state(),
    timeLeft: seconds,
    sessionSeconds: seconds,
    elapsed: 0,
    ended: "playing",
    endReason: null,
    player: {
      id,
      x: world.width * 0.54,
      y: world.height * 0.7,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: def.maxHp,
      maxHp: def.maxHp,
      invuln: 0,
      dashCooldown: 0,
      dashTime: 0,
      attackCooldown: 0.15,
      slow: 1,
      empowerTime: 0,
      shield: 0,
      shieldTime: 0,
      rescueUsed: false,
    },
    decoy: { live: false, x: 0, y: 0, time: 0, fire: 0 },
    enemies: [],
    shots: [],
    impacts: [],
    fields: [],
    stroke: {
      points: defaultStroke(world.width, world.height),
      thickness: 16,
      ink: 1,
      blankTime: 0,
    },
    nextEnemyId: 1,
    nextShotId: 1,
    spawnTimer: HORDE.firstSpawn,
    world,
    stats: {
      kills: 0,
      skillUses: 0,
      damageDealt: 0,
      damageTaken: 0,
      shieldBlocks: 0,
      upgradesTaken: 0,
      shardsCollected: 0,
      bossDefeated: false,
      bestStreak: 0,
      pumpkinsLit: 0,
      treatsEaten: 0,
      moonPulses: 0,
      distance: 0,
      elitesDefeated: 0,
      chestsOpened: 0,
      propsTorn: 0,
      cellsBurnt: 0,
      colourKept: 100,
    },
    notice: null,
    xp: 0,
    level: 1,
    xpToNext: xpForLevel(1),
    upgrades: { [cat.startWeapon]: 1 },
    build: { weapons: [cat.startWeapon], passives: [] },
    weaponTimers: {},
    chestReveal: null,
    pendingChoice: null,
    pickups: [],
    nextPickupId: 1,
    // Weapon defs set their own timers below (Full Moon's pulse).
    pulseTimer: 0,
    enemyShots: [],
    hazards: [],
    nextHazardId: 1,
    boss: { spawned: false, defeated: false, id: null },
    wavesDone: 0,
    // Filled from the world chunks around the cat by syncChunks below.
    interactables: [],
    treats: [],
    nextTreatId: 1,
    treatTimer: FISH.firstAt,
    streak: { count: 0, timer: 0, best: 0 },
    phaseSeen: 0,
    fxSeq: 0,
    loadedChunks: [],
    landmarksFound: [],
    elitesDone: 0,
    chests: [],
    nextChestId: 1,
    props: {},
    fire: { cells: {}, ash: {}, clock: 0, ticks: 0 },
    wash: createWash(),
    landmarkEvents: {},
    cut: { points: [], outs: [], cuts: 0, nextId: 1, close: 0 },
    fold: { flaps: [], folds: 0, nextId: 1 },
    walls: [],
    nextWallId: 1,
  };
  for (const w of WEAPON_DEFS.all()) w.init?.(state);
  syncChunks(state);
  spawnBlob(state, world.width * 0.78, world.height * 0.62);
  spawnBlob(state, world.width * 0.24, world.height * 0.85);
  spawnBlob(state, world.width * 0.39, YARD_TOP + 18);
  return state;
}
/** Per-kind data, with optional per-enemy overrides (split blobs are smaller). */
export function enemyRadius(e: EnemyState): number {
  return e.radius ?? enemyDef(e.kind).stats.radius;
}
export function enemyMaxHp(e: EnemyState): number {
  return e.maxHp ?? enemyDef(e.kind).stats.hp;
}
/** Elites shrug off most knockback. */
function knockOf(e: EnemyState): number {
  return enemyDef(e.kind).stats.knockback * (e.elite ? ELITE.knockbackMul : 1);
}
export function bossEnemy(state: SimState): EnemyState | undefined {
  return state.boss.id === null
    ? undefined
    : state.enemies.find((e) => e.id === state.boss.id && e.alive);
}
function spawnBlob(state: SimState, x: number, y: number): EnemyState {
  return spawnEnemy(state, FILLER_KIND, x, y);
}
/** Index into the HORDE tables: one step per tenth of the night (a minute of 600 s). */
export function hordeStep(state: SimState): number {
  const n = HORDE.capByMinute.length;
  return Math.min(n - 1, Math.floor((state.elapsed / state.sessionSeconds) * n));
}
/** Living-enemy cap right now; never above HORDE.hardCap. */
export function hordeCap(state: SimState): number {
  return Math.min(HORDE.hardCap, HORDE.capByMinute[hordeStep(state)]!);
}
/** Common enemies toughen as the night goes on. */
function commonHp(state: SimState, kind: EnemyKind): number {
  const hp = enemyDef(kind).stats.hp * (1 + HORDE.hpPerMinute * hordeStep(state));
  return Math.round(hp * 10) / 10;
}
function spawnEnemy(
  state: SimState,
  kind: EnemyKind,
  x: number,
  y: number,
  hp: number = commonHp(state, kind),
  spawnTime = 0.65,
): EnemyState {
  const def = enemyDef(kind),
    pos = clampToWorld(x, y, def.stats.radius + 6);
  const e: EnemyState = {
    id: state.nextEnemyId++,
    kind,
    x: pos.x,
    y: pos.y,
    hp,
    alive: true,
    orbitCooldown: 0,
    slowTime: 0,
    spawnTime,
    maxHp: hp,
    radius: def.stats.radius,
  };
  // Kind setup (bat swoop phase, smudge reload, Boss attack timer) uses no RNG.
  def.onSpawn?.(e, state);
  state.enemies.push(e);
  return e;
}
export function nightPhase(state: SimState): 0 | 1 | 2 | 3 {
  const progress = state.elapsed / state.sessionSeconds;
  return progress < PHASE_AT[0] ? 0 : progress < PHASE_AT[1] ? 1 : progress < PHASE_AT[2] ? 2 : 3;
}
function livingOfKind(state: SimState, kind: EnemyKind): number {
  let n = 0;
  for (const e of state.enemies) if (e.alive && e.kind === kind) n++;
  return n;
}
function pickKind(state: SimState, rng: Rng): EnemyKind {
  const kind = rollKind(state, rng),
    cap = KIND_CAP[kind];
  // Kinds at their own cap (smudges, crumples) fall back to plain ink.
  return cap !== undefined && livingOfKind(state, kind) >= cap ? FILLER_KIND : kind;
}
function rollKind(state: SimState, rng: Rng): EnemyKind {
  const table = SPAWN_TABLE[nightPhase(state)]!;
  // A single-entry table consumes no RNG, so the opening stays as it was.
  if (table.length === 1) return table[0]![0];
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.float(0, total);
  for (const [kind, w] of table) {
    roll -= w;
    if (roll < 0) return kind;
  }
  return table[table.length - 1]![0];
}
/**
 * A point on the ring just outside the camera view around the cat, inside the
 * world. `side` 2 / 3 picks the left / right edge (scripted flocks); otherwise
 * the angle is random. Points beyond the map edge are re-rolled, then the
 * ring's axis points are tried, and only then is the point clamped inside.
 */
function ringPoint(state: SimState, rng: Rng, side?: 2 | 3): { x: number; y: number } {
  const c = viewCentre(state.player.x, state.player.y),
    hw = SCREEN.width / 2 + SPAWN_RING.marginX,
    hh = SCREEN.height / 2 + SPAWN_RING.marginY,
    pad = 22;
  for (let i = 0; i < SPAWN_RING.tries; i++) {
    let x: number, y: number;
    if (side !== undefined) {
      const left = (side === 2) !== (i % 2 === 1);
      x = c.x + (left ? -hw : hw);
      y = c.y + rng.float(-hh, hh) * 0.8;
    } else {
      const a = rng.float(0, Math.PI * 2),
        cs = Math.cos(a),
        sn = Math.sin(a),
        t = Math.min(hw / Math.max(Math.abs(cs), 1e-6), hh / Math.max(Math.abs(sn), 1e-6));
      x = c.x + cs * t;
      y = c.y + sn * t;
    }
    if (insideWorld(x, y, pad)) return { x, y };
  }
  for (const [dx, dy] of [
    [-hw, 0],
    [hw, 0],
    [0, hh],
    [0, -hh],
  ] as const)
    if (insideWorld(c.x + dx, c.y + dy, pad)) return { x: c.x + dx, y: c.y + dy };
  return clampToWorld(c.x + hw, c.y, pad);
}
function spawnAroundView(state: SimState, rng: Rng): void {
  const { x, y } = ringPoint(state, rng);
  spawnEnemy(state, pickKind(state, rng), x, y);
}
/** Scripted waves, elites on their timer, and the Boss. */
function stepSchedule(state: SimState, rng: Rng): void {
  while (
    state.wavesDone < WAVES.length &&
    state.elapsed >= WAVES[state.wavesDone]!.at * state.sessionSeconds
  )
    releaseWave(state, WAVES[state.wavesDone++]!, rng);
  for (;;) {
    const at = ELITE.first + state.elitesDone * ELITE.every;
    if (at > ELITE.until || state.elapsed < at) break;
    const index = state.elitesDone++;
    // The Eraser owns the page while it is out; that elite slot is skipped.
    if (!bossEnemy(state)) spawnElite(state, rng, index);
  }
  if (ARRIVAL && !state.boss.spawned && state.elapsed >= ARRIVAL.arrival!.at * state.sessionSeconds)
    spawnBoss(state, rng, ARRIVAL);
}
/** Room left under the hard cap, minus the Boss's summon room while it is out. */
function waveRoom(state: SimState): number {
  return HORDE.hardCap - (bossEnemy(state) ? HORDE.bossRoom : 0) - livingEnemies(state);
}
function releaseWave(state: SimState, wave: WaveDef, rng: Rng): void {
  const count = Math.min(wave.count, Math.max(0, waveRoom(state))),
    p = state.player;
  if (wave.pattern === "side") {
    const side = rng.int(2, 4) as 2 | 3;
    for (let i = 0; i < count; i++) {
      const { x, y } = ringPoint(state, rng, side);
      spawnEnemy(state, wave.kind, x, y, undefined, 0.65 + i * 0.12);
    }
  } else if (wave.pattern === "ring") {
    // An even ellipse around the view that closes in; points past the map edge are dropped.
    const c = viewCentre(p.x, p.y),
      rx = (SCREEN.width / 2 + SPAWN_RING.marginX) * WAVE_RING.scale,
      ry = (SCREEN.height / 2 + SPAWN_RING.marginY) * WAVE_RING.scale,
      turn = rng.float(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const a = turn + (i / count) * Math.PI * 2,
        x = c.x + Math.cos(a) * rx,
        y = c.y + Math.sin(a) * ry;
      if (insideWorld(x, y, 22)) spawnEnemy(state, wave.kind, x, y, undefined, 0.8);
    }
  } else {
    // A row marching in from the left or right edge of the view.
    const c = viewCentre(p.x, p.y),
      hw = SCREEN.width / 2 + SPAWN_RING.marginX,
      hh = (SCREEN.height / 2) * 0.8,
      left = rng.int(0, 2) === 0;
    let x = c.x + (left ? -hw : hw);
    if (!insideWorld(x, c.y, 22)) x = c.x + (left ? hw : -hw);
    for (let i = 0; i < count; i++) {
      const y = c.y - hh + (count > 1 ? (i / (count - 1)) * hh * 2 : hh);
      spawnEnemy(state, wave.kind, x, y, undefined, 0.65 + i * 0.05);
    }
  }
}

/**
 * Rubs out common ink until fewer than `limit` are alive: off-screen ink
 * first, farthest from the cat first, so the fight in view is kept. Elites
 * and the Boss are never rubbed out.
 */
export function makeRoom(state: SimState, limit: number): void {
  let living = livingEnemies(state);
  if (living < limit) return;
  const p = state.player,
    c = viewCentre(p.x, p.y),
    hw = SCREEN.width / 2,
    hh = SCREEN.height / 2,
    order = state.enemies
      .filter((e) => e.alive && !e.elite && !enemyDef(e.kind).boss)
      .map((e, i) => ({
        e,
        i,
        off: Math.abs(e.x - c.x) > hw || Math.abs(e.y - c.y) > hh ? 1 : 0,
        d: Math.hypot(e.x - p.x, e.y - p.y),
      }))
      .sort((a, b) => b.off - a.off || b.d - a.d || a.i - b.i);
  for (const { e } of order) {
    if (living < limit) break;
    e.alive = false;
    living--;
    effect(state, e.x, e.y, "erase", ENEMY_FX_LIFE.erase);
  }
}
function spawnElite(state: SimState, rng: Rng, index: number): void {
  const kind = ELITE.kinds[index % ELITE.kinds.length]!;
  makeRoom(state, HORDE.hardCap);
  const { x, y } = ringPoint(state, rng),
    e = spawnEnemy(state, kind, x, y, Math.round(commonHp(state, kind) * ELITE.hpMul), 1);
  e.elite = true;
  e.radius = enemyDef(kind).stats.radius * ELITE.radiusMul;
  notify(state, "elite");
}
function spawnBoss(state: SimState, rng: Rng, def: EnemyDef): void {
  // The Eraser makes room for itself and its summons by rubbing out old ink.
  makeRoom(state, HORDE.hardCap - HORDE.bossRoom);
  // It enters from the ring just outside the view, wherever the cat is.
  const { x, y } = ringPoint(state, rng),
    boss = spawnEnemy(state, def.id, x, y, def.stats.hp, def.arrival!.spawnTime);
  state.boss = { spawned: true, defeated: false, id: boss.id };
  notify(state, "boss-incoming");
}
export function snapshot(state: SimState): unknown {
  // Snapshot every combat-bearing field; rendering has no RNG or simulation side effects.
  return JSON.parse(
    JSON.stringify(state, (_key, value) =>
      typeof value === "number" ? Math.round(value * 10000) / 10000 : value,
    ),
  );
}
function effect(
  state: SimState,
  x: number,
  y: number,
  kind: EffectKind,
  life: number,
  extra?: Pick<Impact, "amount" | "src" | "angle" | "radius">,
): void {
  if (kind === "damage" || kind === "dissolve") {
    // Crowds would bury the page in tags; extra ones are simply not made.
    let live = 0;
    for (const i of state.impacts) if (i.kind === kind) live++;
    if (live >= FX_CAP[kind]) return;
  }
  state.impacts.push({ x, y, kind, life, seed: ++state.fxSeq, ...extra });
}
/** Boss and evolution banners outrank routine notices (skills, treats, shields). */
const MAJOR_NOTICES: ReadonlySet<Notice> = new Set<Notice>([
  "boss-incoming",
  "boss-defeated",
  ...EVOLUTION_DEFS.all().map((e) => e.notice),
]);
function notify(state: SimState, kind: Notice): boolean {
  const live = state.notice;
  if (live && MAJOR_NOTICES.has(live.kind) && !MAJOR_NOTICES.has(kind)) return false;
  state.notice = { kind, life: 2.2 };
  return true;
}
function safePosition(state: SimState, x: number, y: number, radius: number) {
  const decks = bridgeDecks(state.fold.bridges);
  const dry = avoidDeepWater(state.seed, x, y, radius, decks);
  const a = clampToWorld(dry.x, dry.y, radius);
  // Only the colliders of the chunks around the actor are tested.
  let b = avoidScenery(a.x, a.y, radius, nearStaticColliders(state.seed, a.x, a.y));
  // Props add their colliders until they are torn to scraps (the path opens).
  for (const c of nearPropColliders(state.seed, a.x, a.y))
    if (propBlocks(state, c.id)) b = avoidScenery(b.x, b.y, radius, c.caps);
  // Standing paper walls (page fold) block like scenery while they last.
  if (state.walls.length) b = avoidScenery(b.x, b.y, radius, state.walls);
  const shore = avoidDeepWater(state.seed, b.x, b.y, radius, decks);
  return clampToWorld(shore.x, shore.y, radius);
}
/**
 * Keeps interactables live for the chunks around the cat. Ids are stable from
 * the chunk index, so leaving and coming back recreates the same objects.
 * Idle pumpkins far away are dropped; moon-lanterns are few and keep their
 * charge once found.
 */
function syncChunks(state: SimState): void {
  const p = state.player,
    near = chunksNear(p.x, p.y, ACTIVE.load),
    keys = near.map((c) => chunkKey(c.cx, c.cy));
  if (
    keys.length === state.loadedChunks.length &&
    keys.every((k, i) => k === state.loadedChunks[i])
  )
    return;
  state.loadedChunks = keys;
  const keep = new Set(
    chunksNear(p.x, p.y, ACTIVE.drop).map((c) => chunkKey(c.cx, c.cy)),
  );
  state.interactables = state.interactables.filter(
    (o) =>
      o.kind === "lantern" ||
      o.lit > 0 ||
      o.cooldown > 0 ||
      !o.chunk ||
      keep.has(o.chunk),
  );
  const have = new Set(state.interactables.map((o) => o.id));
  for (const c of near) {
    const content = chunkContent(state.seed, c.cx, c.cy),
      base = 1 + chunkIndex(c.cx, c.cy) * 16;
    content.spots.forEach((s, i) => {
      const id = base + i;
      if (have.has(id)) return;
      state.interactables.push({
        id,
        kind: s.kind,
        x: s.x,
        y: s.y,
        lit: 0,
        cooldown: 0,
        charge: s.kind === "lantern" ? MOON_LANTERN.startCharge : 0,
        tick: 0,
        s: s.s,
        chunk: content.key,
      });
    });
  }
}
/** Landmarks within the discovery radius are marked found once, with a notice. */
function discoverLandmarks(state: SimState): void {
  const p = state.player;
  for (const l of landmarks(state.seed)) {
    if (state.landmarksFound.includes(l.id)) continue;
    if (Math.hypot(p.x - l.x, p.y - l.y) > LANDMARK.discoverRadius) continue;
    state.landmarksFound.push(l.id);
    notify(state, `found-${l.kind}` as Notice);
  }
}
/** Non-Boss ink that fell far behind the cat re-enters from the view ring. */
function leashEnemies(state: SimState, rng: Rng): void {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive || enemyDef(e.kind).boss) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) <= SPAWN_RING.leash) continue;
    const pos = ringPoint(state, rng),
      kept = clampToWorld(pos.x, pos.y, enemyRadius(e) + 6);
    e.x = kept.x;
    e.y = kept.y;
  }
}
export function step(state: SimState, input: FrameInput, dt: number): void {
  if (state.ended !== "playing" || dt <= 0) return;
  if (state.pendingChoice) {
    // The night is frozen while a card is on the table.
    if (typeof input.choose === "number") chooseUpgrade(state, input.choose);
    return;
  }
  const rng = createRng(state.rngState);
  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) {
    // Dawn only wins once the Boss is off the page; outrunning a live Eraser loses.
    // Defeating it never ends the night early, and a night without one still wins.
    const escaped = bossEnemy(state) !== undefined;
    state.ended = escaped ? "lost" : "won";
    state.endReason = escaped ? "boss-escaped" : "dawn";
    return;
  }
  for (const e of state.impacts) e.life -= dt;
  state.impacts = state.impacts.filter((e) => e.life > 0);
  for (const f of state.fields) f.life -= dt;
  state.fields = state.fields.filter((f) => f.life > 0);
  for (const h of state.hazards) h.life -= dt;
  state.hazards = state.hazards.filter((h) => h.life > 0);
  if (state.walls.length) {
    for (const w of state.walls) w.life -= dt;
    state.walls = state.walls.filter((w) => w.life > 0);
  }
  if (state.notice) {
    state.notice.life -= dt;
    if (state.notice.life <= 0) state.notice = null;
  }
  if (state.chestReveal) {
    state.chestReveal.life -= dt;
    if (state.chestReveal.life <= 0) state.chestReveal = null;
  }
  // Kit timers (Zero's decoy) count down here.
  emit("tick", state, { dt });
  for (const e of state.enemies) {
    e.orbitCooldown = Math.max(0, e.orbitCooldown - dt);
    e.slowTime = Math.max(0, e.slowTime - dt);
    e.spawnTime = Math.max(0, e.spawnTime - dt);
    if (e.hitFlash) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.stun) e.stun = Math.max(0, e.stun - dt);
  }
  const streak = state.streak;
  if (streak.count > 0) {
    streak.timer = Math.max(0, streak.timer - dt);
    if (streak.timer <= 0) streak.count = 0;
  }
  const px = state.player.x,
    py = state.player.y;
  stepPlayer(state, input, dt, rng);
  state.stats.distance += Math.hypot(state.player.x - px, state.player.y - py);
  syncChunks(state);
  discoverLandmarks(state);
  stepStroke(state, dt);
  runWeapons(state, "aura", dt, rng);
  runWeapons(state, "auto", dt, rng);
  stepShots(state, dt);
  stepEnemies(state, dt, rng);
  if (state.ended === "playing") leashEnemies(state, rng);
  for (const d of ENEMY_DEFS.all()) d.stepWorld?.(state, dt, ctx);
  stepChests(state, dt, rng);
  stepPickups(state, dt, rng);
  stepInteractables(state, dt);
  stepTreats(state, dt);
  stepFire(state, dt, ctx);
  stepWashWorld(state, dt);
  if (state.ended === "playing") {
    stepLandmarkActions(state, dt, ctx);
    stepSchedule(state, rng);
    announcePhase(state);
    spawnTreat(state, dt, rng);
    stepHorde(state, dt, rng);
  }
  prune(state.enemies);
  prune(state.shots);
  prune(state.pickups);
  prune(state.enemyShots);
  prune(state.treats);
  prune(state.chests);
  state.rngState = rng.state();
}
/** Removes dead entries in place, keeping order (stable ids, no new arrays). */
function prune<T extends { alive: boolean }>(list: T[]): void {
  let n = 0;
  for (let i = 0; i < list.length; i++) if (list[i]!.alive) list[n++] = list[i]!;
  list.length = n;
}
/**
 * Ring spawning at the current HORDE rate up to the current cap. The timer
 * does not bank spawns while the page is full, so a cleared crowd refills
 * at the normal rate rather than in a burst.
 */
function stepHorde(state: SimState, dt: number, rng: Rng): void {
  const step = hordeStep(state),
    interval = 1 / HORDE.spawnPerSecondByMinute[step]!,
    cap = hordeCap(state) - (bossEnemy(state) ? HORDE.bossRoom : 0);
  state.spawnTimer -= dt;
  while (state.spawnTimer <= 0) {
    if (livingEnemies(state) >= cap) {
      state.spawnTimer = 0;
      return;
    }
    spawnAroundView(state, rng);
    state.spawnTimer += interval;
  }
}
/**
 * Runs every owned weapon with this timing, in registration order. The
 * chosen cat's starting weapon is always owned.
 */
function runWeapons(
  state: SimState,
  timing: WeaponTiming,
  dt: number,
  rng: Rng,
  ps: PlayerStats = playerStats(state),
): void {
  const start = CATS.get(state.player.id).startWeapon;
  for (const w of WEAPON_DEFS.all()) {
    if (w.timing !== timing || !w.step) continue;
    if ((state.upgrades[w.id] ?? 0) > 0 || w.id === start) w.step(state, ps, dt, rng, ctx);
  }
}
function stepPlayer(state: SimState, input: FrameInput, dt: number, rng: Rng): void {
  const p = state.player,
    cat = CATS.get(p.id),
    def = cat.stats,
    ps = playerStats(state),
    from = { x: p.x, y: p.y };
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.empowerTime = Math.max(0, p.empowerTime - dt);
  p.shieldTime = Math.max(0, p.shieldTime - dt);
  if (p.shieldTime <= 0) p.shield = 0;
  p.slow =
    state.stroke.ink <= 0 &&
    state.stroke.blankTime > 0 &&
    state.stroke.points.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 24)
      ? STATS.strokeSlow
      : 1;
  // Leftovers of enemy kinds (smudge puddles) slow the cat.
  const unslowed = p.slow;
  for (const d of ENEMY_DEFS.all()) if (d.catSlow) p.slow *= d.catSlow(state);
  // One water slow at most: shallow water, or else wet washed paper (not on top of a puddle slow either).
  if (waterAt(state.seed, p.x, p.y, bridgeDecks(state.fold.bridges)) === "shallow") p.slow *= WATER.shallowSlow;
  else if (p.slow >= unslowed && washWetTouches(state, p.x, p.y, 0)) p.slow *= WASH.wetSlow;
  if (input.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    const dir =
      length(input.ax, input.ay) < 0.15
        ? { x: p.facing, y: 0 }
        : normalize(input.ax, input.ay);
    p.dashTime = def.dashTime;
    p.dashCooldown = ps.cooldown;
    p.invuln = Math.max(p.invuln, def.invulnerability);
    p.vx = dir.x * def.dashSpeed;
    p.vy = dir.y * def.dashSpeed;
    if (dir.x) p.facing = dir.x < 0 ? -1 : 1;
    state.stats.skillUses++;
    cat.onSkill(state, ps, ctx);
    emit("dash", state, { dx: dir.x, dy: dir.y });
  }
  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // A kit's dash may mark the page it crosses (a cut through the paper).
    const trail = cat.dashTrail;
    if (trail) washElement(state, p.x, p.y, trail.radius, trail.element, trail.power);
  } else {
    const dir = normalize(input.ax, input.ay);
    p.vx = dir.x * ps.speed * p.slow;
    p.vy = dir.y * ps.speed * p.slow;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (Math.abs(dir.x) > 0.1) p.facing = dir.x < 0 ? -1 : 1;
  }
  const bank = resolveWaterMove(state.seed, from, p, STATS.playerRadius, bridgeDecks(state.fold.bridges));
  const pos = safePosition(state, bank.x, bank.y, STATS.playerRadius);
  p.x = pos.x;
  p.y = pos.y;
  touchPaperEnvironment(state, p, STATS.playerRadius, ctx, true);
  // Hand weapons (Meow Bolt) fire from where the cat now stands.
  runWeapons(state, "move", dt, rng, ps);
  maybeReink(state, p.x, p.y, STATS.playerRadius);
}
function nearestEnemy(
  state: SimState,
  x: number,
  y: number,
  range: number,
  skip?: readonly number[],
): EnemyState | undefined {
  let target: EnemyState | undefined,
    best = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    if (skip && skip.includes(e.id)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < best && d <= range) {
      best = d;
      target = e;
    }
  }
  return target;
}
/** These are the very same coordinates used to draw Nicole's stars. */
export function orbitPositions(state: SimState): { x: number; y: number }[] {
  return moonStarPositions(state, playerStats(state));
}
function hurtEnemy(state: SimState, e: EnemyState, damage: number): void {
  if (!e.alive) return;
  const dealt = Math.min(damage, e.hp);
  state.stats.damageDealt += dealt;
  e.hp = Math.max(0, e.hp - damage);
  e.alive = e.hp > 0;
  e.hitFlash = STATS.hitFlash;
  effect(state, e.x, e.y, e.alive ? "hit" : "defeat", e.alive ? 0.16 : 0.32);
  effect(state, e.x, e.y - enemyRadius(e) * 2, "damage", EFFECT_LIFE.damage, {
    amount: Math.round(dealt * 10) / 10,
    src: e.kind,
  });
  emit("hit", state, { enemy: e, damage, dealt });
  if (!e.alive) {
    const def = enemyDef(e.kind);
    state.stats.kills++;
    effect(state, e.x, e.y, "dissolve", EFFECT_LIFE.dissolve, { src: e.kind });
    countStreak(state, e);
    if (def.dropsShard !== false)
      dropShard(state, e.x, e.y, def.stats.xp * (e.elite ? ELITE.xpMul : 1));
    if (e.elite) {
      state.stats.elitesDefeated++;
      dropChest(state, e.x, e.y, false);
    }
    // Its own colour splashes back onto washed paper.
    if (def.pigment && paintAt(state, e.x, e.y, WASH.pigment.radius, WASH.pigment.amount, def.pigment) > 0) {
      state.wash.pigments++;
      effect(state, e.x, e.y, "pigment", EFFECT_LIFE.pigment, { radius: WASH.pigment.radius, src: e.kind });
    }
    // Kind effects on defeat: crumple splits, the Eraser's reward.
    for (const onDeath of def.onDeath ?? []) onDeath(state, e, ctx);
    emit("kill", state, { enemy: e });
  }
}
/** Kills inside the streak window chain; milestones pay a little bonus XP. */
function countStreak(state: SimState, e: EnemyState): void {
  const s = state.streak;
  s.count++;
  s.timer = STATS.streakWindow;
  s.best = Math.max(s.best, s.count);
  state.stats.bestStreak = Math.max(state.stats.bestStreak, s.count);
  if (s.count % STATS.streakMilestone === 0) {
    state.xp += STATS.streakBonusXp;
    effect(state, e.x, e.y, "streak", EFFECT_LIFE.streak, { amount: s.count });
    if (!state.notice || state.notice.life < 1.2) notify(state, "streak");
  }
}
/** One ribbon notice per new night phase; the Boss banner takes priority. */
function announcePhase(state: SimState): void {
  const phase = nightPhase(state);
  if (phase <= state.phaseSeen) return;
  // Keep the latest phase pending while a major banner owns the ribbon.
  if (notify(state, `phase${phase}` as Notice)) state.phaseSeen = phase;
}
/** Pumpkins light on touch and scorch nearby ink; the lantern charges, then stuns. */
function stepInteractables(state: SimState, dt: number): void {
  if (state.ended !== "playing") return;
  const p = state.player;
  for (const o of state.interactables) {
    const touching =
      Math.hypot(p.x - o.x, p.y - o.y) <=
      (o.kind === "pumpkin" ? PUMPKIN.touchRadius : MOON_LANTERN.touchRadius) +
        STATS.playerRadius;
    if (o.kind === "pumpkin") {
      if (o.lit > 0) {
        o.lit = Math.max(0, o.lit - dt);
        o.tick -= dt;
        if (o.tick <= 0) {
          o.tick = PUMPKIN.tick;
          pumpkinPulse(state, o.x, o.y);
        }
        if (o.lit <= 0) o.cooldown = PUMPKIN.recharge;
      } else if (o.cooldown > 0) o.cooldown = Math.max(0, o.cooldown - dt);
      else if (touching) {
        o.lit = PUMPKIN.litTime;
        o.tick = 0;
        state.stats.pumpkinsLit++;
        effect(state, o.x, o.y, "pumpkin-light", EFFECT_LIFE["pumpkin-light"]);
        notify(state, "pumpkin-lit");
        emit("touchProp", state, { id: o.id, kind: o.kind });
      }
    } else {
      const was = o.charge;
      o.charge = Math.min(1, o.charge + dt / MOON_LANTERN.chargeTime);
      // Only a lantern the player can see announces itself.
      const visible =
        Math.abs(o.x - p.x) <= SCREEN.width / 2 && Math.abs(o.y - p.y) <= SCREEN.height / 2;
      if (was < 1 && o.charge >= 1 && !state.notice && visible) notify(state, "moon-ready");
      if (o.charge >= 1 && touching) {
        o.charge = 0;
        moonStun(state, o.x, o.y);
        emit("touchProp", state, { id: o.id, kind: o.kind });
      }
    }
  }
}
function pumpkinPulse(state: SimState, x: number, y: number): void {
  effect(state, x, y, "pumpkin-pulse", EFFECT_LIFE["pumpkin-pulse"]);
  // A lit pumpkin sets paper grass and bushes nearby alight.
  ignite(state, x, y, FIRE.pumpkinRadius, ctx);
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > PUMPKIN.auraRadius + enemyRadius(e)) continue;
    hurtEnemy(state, e, PUMPKIN.damage);
    if (!e.alive) continue;
    const dir = d > 0 ? { x: (e.x - x) / d, y: (e.y - y) / d } : { x: 1, y: 0 },
      knock = PUMPKIN.push * knockOf(e),
      pos = safePosition(state, e.x + dir.x * knock, e.y + dir.y * knock, enemyRadius(e));
    e.x = pos.x;
    e.y = pos.y;
  }
}
function moonStun(state: SimState, x: number, y: number): void {
  state.stats.moonPulses++;
  effect(state, x, y, "moon-stun", EFFECT_LIFE["moon-stun"]);
  notify(state, "moon-stun");
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.stun = enemyDef(e.kind).boss ? MOON_LANTERN.bossStun : MOON_LANTERN.stunTime;
    if (e.spawnTime <= 0) hurtEnemy(state, e, MOON_LANTERN.damage);
  }
}
/** Fish treats appear on a timer at an RNG-chosen spot near the cat. */
function spawnTreat(state: SimState, dt: number, rng: Rng): void {
  state.treatTimer -= dt;
  if (state.treatTimer > 0) return;
  state.treatTimer = FISH.interval + rng.float(-FISH.jitter, FISH.jitter);
  if (state.treats.filter((t) => t.alive).length >= FISH.max) return;
  const p = state.player,
    a = rng.float(0, Math.PI * 2),
    d = rng.float(FISH.near, FISH.far),
    pos = safePosition(state, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, FISH.radius);
  state.treats.push({ id: state.nextTreatId++, x: pos.x, y: pos.y, life: FISH.life, alive: true });
  notify(state, "fish-treat");
}
/** A treat dropped by a torn prop, if the treat cap allows. */
function dropTreat(state: SimState, x: number, y: number): void {
  if (state.treats.filter((t) => t.alive).length >= FISH.max) return;
  const pos = safePosition(state, x, y, FISH.radius);
  state.treats.push({ id: state.nextTreatId++, x: pos.x, y: pos.y, life: FISH.life, alive: true });
}
function stepTreats(state: SimState, dt: number): void {
  if (state.ended !== "playing") return;
  const p = state.player;
  for (const t of state.treats) {
    if (!t.alive) continue;
    t.life -= dt;
    if (t.life <= 0) {
      t.alive = false;
      continue;
    }
    if (Math.hypot(p.x - t.x, p.y - t.y) > FISH.radius + STATS.playerRadius) continue;
    t.alive = false;
    p.hp = Math.min(p.maxHp, p.hp + FISH.heal);
    p.healAt = state.elapsed;
    state.stats.treatsEaten++;
    effect(state, t.x, t.y, "treat", EFFECT_LIFE.treat);
  }
}
/** Drops a chest where an elite or the Eraser fell, kept inside the map and clear of scenery. */
function dropChest(state: SimState, x: number, y: number, big: boolean): void {
  const pos = safePosition(state, x, y, CHEST.radius + 4);
  state.chests.push({ id: state.nextChestId++, x: pos.x, y: pos.y, big, alive: true, age: 0 });
}
/**
 * Touching a settled chest opens it at once (no card): the cat's evolution
 * when it is ready, then one level each for random owned weapons and
 * passives up to the chest's level count. One chest per step.
 */
function stepChests(state: SimState, dt: number, rng: Rng): void {
  if (state.ended !== "playing") return;
  const p = state.player;
  for (const c of state.chests) {
    if (!c.alive) continue;
    c.age += dt;
    if (c.age < CHEST.settle) continue;
    if (Math.hypot(p.x - c.x, p.y - c.y) > CHEST.touchRadius + STATS.playerRadius) continue;
    c.alive = false;
    state.stats.chestsOpened++;
    effect(state, c.x, c.y, "chest-open", EFFECT_LIFE["chest-open"]);
    openChest(state, rng, c.big);
    return;
  }
}
/** The filler card's id (the warm snack). */
const FILLER_UPGRADE = PASSIVE_DEFS.all().find((p) => p.filler)!.id;
/**
 * Grants a chest's contents and records them in state.chestReveal for the HUD.
 * A chest is the only way to evolve: readyEvolution needs the maxed weapon plus
 * its partner passive, or a full passive bar that locks the partner out.
 */
export function openChest(state: SimState, rng: Rng, big: boolean): void {
  let levels = big ? CHEST.bigLevels : CHEST.levels;
  const reveal: NonNullable<SimState["chestReveal"]> = {
    items: [],
    evolved: null,
    big,
    life: CHEST.revealTime,
  };
  const evo = readyEvolution(state);
  if (evo) {
    evolve(state, evo);
    reveal.evolved = evo.id;
    levels--;
  } else notify(state, "chest");
  for (let i = 0; i < levels; i++) {
    const pool = chestCandidates(state);
    // A fully grown build gets a warm snack instead.
    const id: UpgradeId = pool.length ? pool[rng.int(0, pool.length)]! : FILLER_UPGRADE;
    applyLevel(state, id);
    reveal.items.push({ id, level: state.upgrades[id]! });
  }
  state.chestReveal = reveal;
  emit("chestOpen", state, { big, evolved: reveal.evolved });
}
/** The evolution takes its base weapon's slot; the base weapon's levels keep feeding its stats. */
function evolve(state: SimState, evo: EvolutionDef): void {
  const p = state.player,
    slot = state.build.weapons.indexOf(evo.replaces);
  state.upgrades[evo.id] = 1;
  if (slot >= 0) state.build.weapons[slot] = evo.id;
  else state.build.weapons.push(evo.id);
  evo.onEvolve?.(state);
  effect(state, p.x, p.y, "evolve", EFFECT_LIFE.evolve);
  notify(state, evo.notice);
}
/** One level of a weapon, passive or the filler; new items take a slot. */
function applyLevel(state: SimState, id: UpgradeId): void {
  const def = upgradeDef(id)!,
    was = state.upgrades[id] ?? 0;
  state.upgrades[id] = was + 1;
  state.stats.upgradesTaken++;
  if (was === 0 && def.slot === "weapon") state.build.weapons.push(id);
  else if (was === 0 && def.slot === "passive") state.build.passives.push(id);
  PASSIVE_DEFS.find(id)?.onLevel?.(state, ctx);
}
function dropShard(state: SimState, x: number, y: number, value: number): void {
  // Shards collected this step stay in the array (alive = false) until the
  // end-of-step filter, so only living shards count toward the cap.
  let living = 0;
  for (const s of state.pickups) if (s.alive) living++;
  if (living >= XP.maxPickups) {
    // Fold the oldest living shard's worth into the newest so nothing is lost.
    const i = state.pickups.findIndex((s) => s.alive);
    value += state.pickups[i]!.value;
    state.pickups.splice(i, 1);
  }
  state.pickups.push({
    id: state.nextPickupId++,
    x,
    y,
    value,
    alive: true,
    age: 0,
  });
}
function stepPickups(state: SimState, dt: number, rng: Rng): void {
  if (state.ended !== "playing") return;
  const p = state.player,
    ps = playerStats(state);
  for (const s of state.pickups) {
    if (!s.alive) continue;
    s.age += dt;
    const dx = p.x - s.x,
      dy = p.y - s.y,
      d = Math.hypot(dx, dy);
    if (d <= XP.collectRadius) {
      s.alive = false;
      state.xp += s.value * ps.xpMultiplier;
      state.stats.shardsCollected += s.value;
      effect(state, s.x, s.y, "collect", EFFECT_LIFE.collect);
      emit("pickup", state, { value: s.value });
      continue;
    }
    if (d <= ps.pickupRadius) {
      const pull = XP.magnetSpeed * (1.4 - d / ps.pickupRadius) * dt,
        move = Math.min(d, pull);
      s.x += (dx / d) * move;
      s.y += (dy / d) * move;
    }
  }
  if (!state.pendingChoice && state.xp >= state.xpToNext) levelUp(state, rng);
}
function levelUp(state: SimState, rng: Rng): void {
  state.xp -= state.xpToNext;
  state.level++;
  state.xpToNext = xpForLevel(state.level);
  const options = rollChoices(state, rng);
  effect(state, state.player.x, state.player.y, "levelup", EFFECT_LIFE.levelup);
  if (options.length) state.pendingChoice = { options };
  emit("levelUp", state, { level: state.level });
}
/** Applies card `index` of the pending choice. Returns false if nothing was applied. */
export function chooseUpgrade(state: SimState, index: number): boolean {
  const choice = state.pendingChoice,
    id = choice?.options[index],
    def = id ? upgradeDef(id) : undefined;
  if (!choice || !def) return false;
  state.pendingChoice = null;
  applyLevel(state, def.id);
  // Banked shards may already cover the next level.
  if (state.xp >= state.xpToNext) {
    const rng = createRng(state.rngState);
    levelUp(state, rng);
    state.rngState = rng.state();
  }
  return true;
}
function stepShots(state: SimState, dt: number): void {
  const ps = playerStats(state);
  for (const s of state.shots) {
    if (!s.alive) continue;
    const ox = s.x,
      oy = s.y;
    s.life -= dt;
    if (s.homing) steerShot(state, s, dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    maybeReink(state, s.x, s.y, STATS.shotRadius + 6);
    // Shots in flight cut (bolts) or ruffle (cranes) paper props; seeds only burn when they burst.
    const element = s.burst ? undefined : SHOT_ELEMENT.get(s.weapon ?? "bolt");
    if (element) applyElement(state, s.x, s.y, STATS.shotRadius + 2, element, s.damage ?? ps.shotDamage);
    const hits = s.hits ?? (s.hits = []);
    // Swept collision prevents fast shots skipping small enemies between fixed steps.
    const targets = state.enemies
      .filter(
        (e) =>
          e.alive &&
          e.spawnTime <= 0 &&
          !hits.includes(e.id) &&
          pointSegDist(e.x, e.y, ox, oy, s.x, s.y) <=
            STATS.shotRadius + enemyRadius(e),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy),
      );
    if (s.burst && targets.length) {
      seedBurst(state, s);
      continue;
    }
    // Shots without their own numbers are bolts and use the bolt stats.
    const pierce = s.pierce ?? (s.empowered ? ps.empoweredPierce : ps.pierce);
    for (const e of targets) {
      hurtEnemy(state, e, s.damage ?? ps.shotDamage);
      hits.push(e.id);
      if (hits.length >= pierce) {
        s.alive = false;
        break;
      }
    }
    if (s.life <= 0 && s.alive) {
      if (s.burst) seedBurst(state, s);
      s.alive = false;
      // A shot that drops into a pond splashes the paper around it.
      const under = waterAt(state.seed, s.x, s.y, bridgeDecks(state.fold.bridges));
      if (under !== "dry" && under !== "bridge")
        washAt(state, s.x, s.y, WASH.splash.radius * 0.6, WASH.splash.amount);
    }
  }
}
/** Homing shots (paper cranes) turn toward the nearest ink at a capped rate. */
function steerShot(state: SimState, s: ShotState, dt: number): void {
  const speed = Math.hypot(s.vx, s.vy);
  if (!speed) return;
  const target = nearestEnemy(state, s.x, s.y, Infinity, s.hits);
  if (!target) return;
  const want = Math.atan2(target.y - s.y, target.x - s.x),
    now = Math.atan2(s.vy, s.vx);
  let turn = want - now;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const max = s.homing! * dt,
    a = now + clamp(turn, -max, max);
  s.vx = Math.cos(a) * speed;
  s.vy = Math.sin(a) * speed;
}
/** A bursting shot (pumpkin seed) hurts every ink blot inside its radius. */
function seedBurst(state: SimState, s: ShotState): void {
  s.alive = false;
  const r = s.burst!;
  effect(state, s.x, s.y, "seed-burst", EFFECT_LIFE["seed-burst"], { radius: r });
  const element = SHOT_ELEMENT.get(s.weapon ?? "bolt");
  if (element) applyElement(state, s.x, s.y, r, element, s.damage ?? 1);
  for (const e of state.enemies)
    if (e.alive && e.spawnTime <= 0 && Math.hypot(e.x - s.x, e.y - s.y) <= r + enemyRadius(e))
      hurtEnemy(state, e, s.damage ?? 1);
}
/**
 * Applies `damage` to the cat unless it is invulnerable. Shields and defeat
 * are handled here for every enemy source; kit reactions (Nicole's rescue)
 * subscribe to the "damaged" event.
 */
function hurtPlayer(state: SimState, damage: number): boolean {
  const p = state.player;
  if (p.invuln > 0 || state.ended !== "playing") return false;
  p.invuln = STATS.hurtIframes + playerStats(state).hurtIframes;
  if (p.shield > 0 && p.shieldTime > 0) {
    p.shield--;
    state.stats.shieldBlocks++;
    effect(state, p.x, p.y, "shield", 0.4);
    notify(state, "shield-block");
    return true;
  }
  p.hp = Math.max(0, p.hp - damage);
  state.stats.damageTaken += damage;
  effect(state, p.x, p.y, "hurt", 0.35);
  emit("damaged", state, { damage });
  if (p.hp <= 0) {
    state.ended = "lost";
    state.endReason = "fallen";
  }
  return true;
}
function stepEnemies(state: SimState, dt: number, rng: Rng): void {
  const p = state.player,
    catSlow = CATS.get(p.id).enemySlow ?? 1,
    ps = playerStats(state),
    enemies = state.enemies,
    radii = enemies.map(enemyRadius),
    phaseSpeed = nightPhase(state) * HORDE.speedPerPhase;
  // Widest radius at the start of the step: |ox| or |oy| at or past the widest possible gap
  // means no overlap, so most pairs are skipped before the exact test (same result, same order).
  const listed = radii.length;
  let widest = 0;
  for (const r of radii) if (r > widest) widest = r;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive || e.spawnTime > 0) continue;
    // Stun covers the moon-lantern freeze and ink pinned under a Page Fold
    // (PAGE_FOLD pin): stunned ink neither moves, bites nor knocks the cat back.
    // This skip runs before the contact check; tests/paper-verbs.test.mjs guards it.
    if ((e.stun ?? 0) > 0) continue;
    const def = enemyDef(e.kind),
      radius = radii[i] ??= enemyRadius(e);
    let tx = p.x,
      ty = p.y;
    // Some kinds (the Eraser) only follow the decoy when it is almost on top of it.
    const lure = def.lureRange !== undefined ? Math.min(ps.decoyRange, def.lureRange) : ps.decoyRange;
    if (
      state.decoy.live &&
      Math.hypot(e.x - state.decoy.x, e.y - state.decoy.y) <= lure
    ) {
      tx = state.decoy.x;
      ty = state.decoy.y;
    }
    const inside = state.fields.some(
      (f) => Math.hypot(e.x - f.x, e.y - f.y) <= (f.radius ?? 0),
    );
    if (inside) e.slowTime = Math.max(e.slowTime, 0.15);
    const slow = e.slowTime > 0 ? (def.slowMultiplier ?? catSlow) : 1;
    let base: number | undefined;
    for (const ref of def.behaviours) {
      const b = BEHAVIOURS.get(ref.id);
      if (b.speed) base = b.speed(state, e, def, ref.params);
    }
    const speed =
        (base ??
          (def.stats.speed + phaseSpeed) * (e.elite ? ELITE.speedMul : 1)) *
        slow,
      dir = normalize(tx - e.x, ty - e.y),
      move: EnemyMove = {
        dx: dir.x * speed * dt,
        dy: dir.y * speed * dt,
        dir,
        speed,
        dt,
        dist: Math.hypot(p.x - e.x, p.y - e.y),
      };
    for (const ref of def.behaviours) {
      const b = BEHAVIOURS.get(ref.id);
      if (b.steer && b.steer(state, e, move, ref.params, rng, ctx) === "halt") return;
    }
    let { dx, dy } = move;
    // Apply after steering: custom charge velocities must obey shallow water too.
    if (waterAt(state.seed, e.x, e.y, bridgeDecks(state.fold.bridges)) === "shallow") {
      dx *= WATER.shallowSlow;
      dy *= WATER.shallowSlow;
    } else if (washWetTouches(state, e.x, e.y, 0)) {
      dx *= WASH.wetSlow;
      dy *= WASH.wetSlow;
    }
    // Keep separation in enemy order. Radius lookups are shared across all pairs,
    // with a lazy entry for summons appended while a Boss steers.
    if (def.crowd !== false) {
      const reach = Math.max(20, (radius + widest) * 0.9),
        ex = e.x,
        ey = e.y;
      for (let j = 0; j < enemies.length; j++) {
        const other = enemies[j]!,
          ox = ex - other.x,
          oy = ey - other.y;
        if (j < listed && (ox >= reach || ox <= -reach || oy >= reach || oy <= -reach)) continue;
        if (other.id === e.id || !other.alive) continue;
        const gap = Math.max(20, (radius + (radii[j] ??= enemyRadius(other))) * 0.9),
          d2 = ox * ox + oy * oy;
        if (d2 <= 0 || d2 >= gap * gap) continue;
        const dist = Math.sqrt(d2);
        dx += (ox / dist) * (gap - dist) * dt * 2;
        dy += (oy / dist) * (gap - dist) * dt * 2;
      }
    }
    const bank = resolveWaterMove(state.seed, e, { x: e.x + dx, y: e.y + dy }, radius, bridgeDecks(state.fold.bridges));
    const kept = def.throughScenery
      ? clampToWorld(bank.x, bank.y, radius)
      : safePosition(state, bank.x, bank.y, radius);
    e.x = kept.x;
    e.y = kept.y;
    touchPaperEnvironment(state, e, radius, ctx);
    if (
      p.invuln > 0 ||
      !circlesOverlap(e.x, e.y, radius, p.x, p.y, STATS.playerRadius)
    )
      continue;
    hurtPlayer(state, def.stats.contactDamage);
    // Knockback must see Page Fold decks too, or a hit on a bridge throws actors to the bank.
    const decks = bridgeDecks(state.fold.bridges),
      push = normalize(p.x - e.x, p.y - e.y),
      playerBank = resolveWaterMove(state.seed, p, { x: p.x + push.x * def.contactPush, y: p.y + push.y * def.contactPush }, STATS.playerRadius, decks),
      pos = safePosition(state, playerBank.x, playerBank.y, STATS.playerRadius);
    p.x = pos.x;
    p.y = pos.y;
    touchPaperEnvironment(state, p, STATS.playerRadius, ctx, true);
    const back = 18 * knockOf(e),
      enemyBank = resolveWaterMove(state.seed, e, { x: e.x - push.x * back, y: e.y - push.y * back }, radius, decks),
      enemyPos = safePosition(state, enemyBank.x, enemyBank.y, radius);
    e.x = enemyPos.x;
    e.y = enemyPos.y;
    touchPaperEnvironment(state, e, radius, ctx);
    if (state.ended !== "playing") return;
  }
}
function stepStroke(state: SimState, dt: number): void {
  const s = state.stroke;
  if (s.blankTime > 0) {
    s.blankTime = Math.max(0, s.blankTime - dt);
    return;
  }
  s.ink = Math.max(0, s.ink - STATS.strokeFadePerSecond * dt);
  if (s.ink <= 0) s.blankTime = STATS.strokeBlankTime;
}
function maybeReink(
  state: SimState,
  x: number,
  y: number,
  radius: number,
): void {
  const s = state.stroke;
  if (!s.points.some((p) => Math.hypot(x - p.x, y - p.y) <= radius + 12))
    return;
  s.ink = clamp(s.ink + STATS.strokeReink, 0, 1);
  if (s.ink > 0) s.blankTime = 0;
}
/** Applies an element to the props around (x, y) with the sim's own context (tools and tests). */
export function applyElement(
  state: SimState,
  x: number,
  y: number,
  radius: number,
  element: Element,
  power: number,
  within?: (x: number, y: number) => boolean,
): void {
  elementHit(state, x, y, radius, element, power, ctx, within);
  washElement(state, x, y, radius, element, power, within);
  hitLandmarkActions(state, x, y, radius, element, power, ctx);
}
/** Sets flammable cells around (x, y) alight with the sim's own context (tools and tests). */
export function igniteAt(state: SimState, x: number, y: number, radius: number): void {
  ignite(state, x, y, radius, ctx);
}
export function livingEnemies(state: SimState): number {
  let n = 0;
  for (const e of state.enemies) if (e.alive) n++;
  return n;
}

/**
 * Spilled water (buckets, wash drips, rain, smudge stains; tools and tests):
 * washes the colour out of the circle, puts out fire there and, unless
 * `soak` is false, applies "water" to the props it reaches.
 */
export function spillWater(state: SimState, x: number, y: number, radius: number, amount: number, soak = true): void {
  if (state.ended !== "playing") return;
  washAt(state, x, y, radius, amount);
  if (quenchFire(state, x, y, radius) > 0) effect(state, x, y, "steam", EFFECT_LIFE.steam);
  if (soak) applyElement(state, x, y, radius, "water", 1);
  state.wash.splashes++;
}
/** Paints colour back with the sim's own context (tools and tests). */
export function paintColour(state: SimState, x: number, y: number, radius: number, amount: number, hint?: string): number {
  return paintAt(state, x, y, radius, amount, hint);
}
/**
 * The wash grid's world beat (WASH.tick): wading splashes, the paper-rain
 * spell, lantern and pumpkin repainting and sketches waking on colourless
 * paper. Rolls use hash2 only; the step RNG is never touched.
 */
function stepWashWorld(state: SimState, dt: number): void {
  const beats = stepWash(state, dt);
  for (let i = 0; i < beats && state.ended === "playing"; i++) {
    washSplashes(state);
    paperRain(state);
    for (const o of state.interactables) {
      if (o.kind === "pumpkin" && o.lit > 0)
        paintAt(state, o.x, o.y, WASH.pumpkin.radius, WASH.pumpkin.rate * WASH.tick, "#e8913a");
      else if (o.kind === "lantern" && o.charge >= 1)
        paintAt(state, o.x, o.y, WASH.lantern.radius, WASH.lantern.rate * WASH.tick, "#f2d27a");
    }
    wakeSketches(state);
  }
}
/** Actors wading in shallow water splash the page around them (a few per beat). */
function washSplashes(state: SimState): void {
  const { radius, amount, perTick } = WASH.splash,
    p = state.player,
    decks = bridgeDecks(state.fold.bridges);
  // Nobody wades on a paper deck: it is dry like a generated crossing.
  if (p.hp > 0 && waterAt(state.seed, p.x, p.y, decks) === "shallow") washAt(state, p.x, p.y, radius, amount);
  let n = 0;
  for (const e of state.enemies) {
    if (n >= perTick) break;
    if (!e.alive || e.spawnTime > 0 || waterAt(state.seed, e.x, e.y, decks) !== "shallow") continue;
    washAt(state, e.x, e.y, radius, amount);
    n++;
  }
}
/** One mid-night spell of paper rain: diagonal bands of water near the cat. */
function paperRain(state: SimState): void {
  const r = WASH.rain,
    start = r.at * state.sessionSeconds,
    end = r.until * state.sessionSeconds;
  if (state.elapsed < start || state.elapsed >= end) return;
  const due = Math.floor((state.elapsed - start) / r.every) + 1;
  while (state.wash.rainPulses < due) {
    const pulse = state.wash.rainPulses++;
    if (pulse === 0) notify(state, "paper-rain");
    const p = state.player;
    for (let b = 0; b < r.bands; b++) {
      const h = (salt: number) => hash2(state.seed, pulse, b, 1300 + salt),
        a = Math.PI * 0.32 + (h(0) - 0.5) * 0.5,
        cx = p.x + (h(1) - 0.5) * 2 * r.reach,
        cy = p.y + (h(2) - 0.5) * 2 * r.reach * 0.6,
        dx = Math.cos(a),
        dy = Math.sin(a),
        stepLen = r.width * 0.7,
        n = Math.ceil(r.length / stepLen);
      for (let k = 0; k <= n; k++) {
        const t = k * stepLen - r.length / 2,
          x = cx + dx * t,
          y = cy + dy * t;
        if (!insideWorld(x, y, 0)) continue;
        washAt(state, x, y, r.width / 2, r.amount);
        quenchFire(state, x, y, r.width / 2);
        applyElement(state, x, y, r.width / 2, "water", 1);
      }
    }
    state.wash.splashes++;
  }
}
/**
 * Pencil sketches wake on colourless (not blank) cells near the cat. The
 * chance grows with the washed share of the page around it; caps apply.
 */
function wakeSketches(state: SimState): void {
  if (!SKETCH) return;
  const w = state.wash;
  w.sketchClock += WASH.tick;
  if (w.sketchClock + 1e-9 < WASH.sketch.every) return;
  w.sketchClock = 0;
  const cap = Math.min(hordeCap(state), HORDE.hardCap) - (bossEnemy(state) ? HORDE.bossRoom : 0);
  if (livingEnemies(state) >= cap) return;
  if (livingOfKind(state, SKETCH.id) >= (KIND_CAP[SKETCH.id] ?? WASH.sketch.cap)) return;
  const p = state.player,
    { keys, fraction } = sketchCells(state, p.x, p.y);
  if (!keys.length || fraction < WASH.sketch.minFraction) return;
  if (hash2(state.seed, w.ticks, 0, 1401) >= Math.min(1, fraction * WASH.sketch.weight)) return;
  const key = keys[Math.min(keys.length - 1, Math.floor(hash2(state.seed, w.ticks, 1, 1402) * keys.length))]!,
    [x, y] = washCentre(key),
    pos = safePosition(state, x, y, SKETCH.stats.radius);
  spawnEnemy(state, SKETCH.id, pos.x, pos.y, undefined, 0.9);
}
