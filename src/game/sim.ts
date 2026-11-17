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
  insideWorld,
  landmarks,
  nearColliders,
  viewCentre,
} from "./world-gen.js";
import {
  circlesOverlap,
  clamp,
  length,
  normalize,
  pointSegDist,
} from "./collision.js";
import { CHARACTERS, character } from "./characters.js";
import {
  playerStats,
  rollChoices,
  upgradeDef,
  xpForLevel,
  XP,
  UPGRADE_VALUES,
} from "./upgrades.js";
import {
  BAT,
  BOSS,
  BOSS_ATTACKS,
  CRUMPLE,
  ENEMIES,
  ENEMY_CAP,
  ENEMY_FX_LIFE,
  SMUDGE,
  SPAWN_TABLE,
  WAVES,
  type BossAttack,
  type EnemyKind,
} from "./enemies.js";
import {
  DEFAULT_WORLD,
  EFFECT_LIFE,
  STATS,
  YARD_TOP,
  type BossAct,
  type FrameInput,
  type Impact,
  type SimConfig,
  type SimState,
  type EnemyState,
  type StrokePoint,
  type Notice,
  type EffectKind,
} from "./types.js";
import { FISH, MOON_LANTERN, PUMPKIN } from "./interactions.js";

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
    id = config.cat ?? "zero",
    def = character(id);
  const seconds = config.sessionSeconds ?? STATS.sessionSeconds;
  const state: SimState = {
    seed,
    rngState: rng.state(),
    timeLeft: seconds,
    sessionSeconds: seconds,
    elapsed: 0,
    ended: "playing",
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
    spawnTimer: 4,
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
    },
    notice: null,
    xp: 0,
    level: 1,
    xpToNext: xpForLevel(1),
    upgrades: {},
    pendingChoice: null,
    pickups: [],
    nextPickupId: 1,
    pulseTimer: UPGRADE_VALUES["full-moon"].pulseInterval,
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
  };
  syncChunks(state);
  spawnBlob(state, world.width * 0.78, world.height * 0.62);
  spawnBlob(state, world.width * 0.24, world.height * 0.85);
  spawnBlob(state, world.width * 0.39, YARD_TOP + 18);
  return state;
}
/** Per-kind data, with optional per-enemy overrides (split blobs are smaller). */
export function enemyRadius(e: EnemyState): number {
  return e.radius ?? ENEMIES[e.kind].radius;
}
export function enemyMaxHp(e: EnemyState): number {
  return e.maxHp ?? ENEMIES[e.kind].hp;
}
export function bossEnemy(state: SimState): EnemyState | undefined {
  return state.boss.id === null
    ? undefined
    : state.enemies.find((e) => e.id === state.boss.id && e.alive);
}
function spawnBlob(state: SimState, x: number, y: number): EnemyState {
  return spawnEnemy(state, "ink-blob", x, y);
}
function spawnEnemy(
  state: SimState,
  kind: EnemyKind,
  x: number,
  y: number,
  hp: number = ENEMIES[kind].hp,
  spawnTime = 0.65,
): EnemyState {
  const def = ENEMIES[kind],
    pos = clampToWorld(x, y, def.radius + 6);
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
    radius: def.radius,
  };
  // No RNG here: bats get a swoop phase from their id.
  if (kind === "paper-bat") e.phase = (e.id * 2.399) % (Math.PI * 2);
  if (kind === "smudge") {
    e.timer = SMUDGE.cooldown * 0.5;
    e.windup = 0;
  }
  state.enemies.push(e);
  return e;
}
export function nightPhase(state: SimState): 0 | 1 | 2 | 3 {
  const progress = state.elapsed / state.sessionSeconds;
  return progress < 0.2 ? 0 : progress < 0.6 ? 1 : progress < 0.9 ? 2 : 3;
}
function pickKind(state: SimState, rng: Rng): EnemyKind {
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
/** Scripted waves (a bat flock from one side) at fixed times, and the Boss. */
function stepSchedule(state: SimState, rng: Rng): void {
  while (
    state.wavesDone < WAVES.length &&
    state.elapsed >= WAVES[state.wavesDone]!.at * state.sessionSeconds
  ) {
    const wave = WAVES[state.wavesDone++]!,
      side = rng.int(2, 4) as 2 | 3;
    for (let i = 0; i < wave.count && livingEnemies(state) < ENEMY_CAP; i++) {
      const { x, y } = ringPoint(state, rng, side);
      spawnEnemy(state, wave.kind, x, y, ENEMIES[wave.kind].hp, 0.65 + i * 0.12);
    }
  }
  if (
    !state.boss.spawned &&
    state.elapsed >= BOSS.spawnAt * state.sessionSeconds
  )
    spawnBoss(state);
}
function spawnBoss(state: SimState): void {
  // The Eraser makes room for itself by rubbing out the oldest ink at the cap.
  for (const e of state.enemies) {
    if (livingEnemies(state) < ENEMY_CAP) break;
    if (!e.alive) continue;
    e.alive = false;
    effect(state, e.x, e.y, "erase", ENEMY_FX_LIFE.erase);
  }
  // It walks in from just past the side of the view with more room.
  const p = state.player,
    c = viewCentre(p.x, p.y),
    hw = SCREEN.width / 2 + SPAWN_RING.marginX,
    r = ENEMIES["eraser-boss"].radius,
    right = insideWorld(c.x + hw, p.y, r + 6),
    x = right ? c.x + hw : c.x - hw,
    boss = spawnEnemy(
      state,
      "eraser-boss",
      x,
      p.y,
      ENEMIES["eraser-boss"].hp,
      BOSS.spawnTime,
    );
  boss.timer = BOSS.firstAttack;
  boss.act = null;
  boss.combo = 0;
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
  extra?: Pick<Impact, "amount" | "src">,
): void {
  state.impacts.push({ x, y, kind, life, seed: ++state.fxSeq, ...extra });
}
/** Boss and evolution banners outrank routine notices (skills, treats, shields). */
const MAJOR_NOTICES: ReadonlySet<Notice> = new Set<Notice>([
  "boss-incoming",
  "boss-defeated",
  "evolve-zero",
  "evolve-nicole",
]);
function notify(state: SimState, kind: Notice): void {
  const live = state.notice;
  if (live && MAJOR_NOTICES.has(live.kind) && !MAJOR_NOTICES.has(kind)) return;
  state.notice = { kind, life: 2.2 };
}
function safePosition(state: SimState, x: number, y: number, radius: number) {
  const a = clampToWorld(x, y, radius);
  // Only the colliders of the chunks around the actor are tested.
  const b = avoidScenery(a.x, a.y, radius, nearColliders(state.seed, a.x, a.y));
  return clampToWorld(b.x, b.y, radius);
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
    if (!e.alive || e.kind === "eraser-boss") continue;
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
    state.ended = "won";
    return;
  }
  for (const e of state.impacts) e.life -= dt;
  state.impacts = state.impacts.filter((e) => e.life > 0);
  for (const f of state.fields) f.life -= dt;
  state.fields = state.fields.filter((f) => f.life > 0);
  for (const h of state.hazards) h.life -= dt;
  state.hazards = state.hazards.filter((h) => h.life > 0);
  if (state.notice) {
    state.notice.life -= dt;
    if (state.notice.life <= 0) state.notice = null;
  }
  if (state.decoy.live) {
    state.decoy.time = Math.max(0, state.decoy.time - dt);
    state.decoy.live = state.decoy.time > 0;
    if (!state.decoy.live && playerStats(state).echo) echoBurst(state);
  }
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
  stepPlayer(state, input, dt);
  state.stats.distance += Math.hypot(state.player.x - px, state.player.y - py);
  syncChunks(state);
  discoverLandmarks(state);
  stepDecoy(state, dt);
  stepStroke(state, dt);
  if (state.player.id === "nicole") {
    stepOrbit(state);
    stepMoonPulse(state, dt);
  }
  stepShots(state, dt);
  stepEnemies(state, dt, rng);
  if (state.ended === "playing") leashEnemies(state, rng);
  stepEnemyShots(state, dt);
  stepPickups(state, dt, rng);
  stepInteractables(state, dt);
  stepTreats(state, dt);
  if (state.ended === "playing") {
    stepSchedule(state, rng);
    announcePhase(state);
    spawnTreat(state, dt, rng);
    const phase = nightPhase(state),
      // A live Boss leaves room on the page for its own summons.
      cap = Math.min(ENEMY_CAP, [7, 10, 14, 18][phase]! - (bossEnemy(state) ? 4 : 0));
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      for (
        let i = 0;
        i < [1, 2, 2, 3][phase]! && livingEnemies(state) < cap;
        i++
      )
        spawnAroundView(state, rng);
      state.spawnTimer = [3.8, 3.4, 2.4, 1.65][phase]!;
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
  state.shots = state.shots.filter((s) => s.alive);
  state.pickups = state.pickups.filter((s) => s.alive);
  state.enemyShots = state.enemyShots.filter((s) => s.alive);
  state.treats = state.treats.filter((s) => s.alive);
  state.rngState = rng.state();
}
function stepPlayer(state: SimState, input: FrameInput, dt: number): void {
  const p = state.player,
    def = character(p.id),
    ps = playerStats(state);
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
  if (
    state.hazards.some(
      (h) => Math.hypot(p.x - h.x, (p.y - h.y) * 1.6) <= h.radius,
    )
  )
    p.slow *= SMUDGE.puddleSlow;
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
    if (p.id === "zero") {
      // A re-dash replaces a live echo; it still bursts as it fades.
      if (state.decoy.live && ps.echo) echoBurst(state);
      state.decoy = {
        live: true,
        x: p.x,
        y: p.y,
        time: ps.decoyLife,
        fire: UPGRADE_VALUES["echo-legion"].fireInterval * 0.5,
      };
      p.empowerTime = CHARACTERS.zero.empowerDuration;
      p.attackCooldown = 0;
      effect(state, p.x, p.y, "dash", 0.4);
      notify(state, "zero-dash");
    } else {
      const n = CHARACTERS.nicole;
      state.fields.push({
        x: p.x,
        y: p.y,
        life: ps.fieldDuration,
        radius: ps.fieldRadius,
        duration: ps.fieldDuration,
      });
      p.shield = Math.max(p.shield, ps.shieldCharges);
      p.shieldTime = Math.max(p.shieldTime, n.shieldDuration);
      for (const e of state.enemies)
        if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) <= ps.fieldRadius) {
          e.slowTime = 0.5;
          const push = normalize(e.x - p.x, e.y - p.y),
            knock = 20 * ENEMIES[e.kind].knockback;
          const pos = safePosition(
            state,
            e.x + push.x * knock,
            e.y + push.y * knock,
            enemyRadius(e),
          );
          e.x = pos.x;
          e.y = pos.y;
        }
      effect(state, p.x, p.y, "fold", 0.6);
      notify(state, "nicole-fold");
    }
  }
  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  } else {
    const dir = normalize(input.ax, input.ay);
    p.vx = dir.x * ps.speed * p.slow;
    p.vy = dir.y * ps.speed * p.slow;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (Math.abs(dir.x) > 0.1) p.facing = dir.x < 0 ? -1 : 1;
  }
  const pos = safePosition(state, p.x, p.y, STATS.playerRadius);
  p.x = pos.x;
  p.y = pos.y;
  if (p.id === "zero") maybeShoot(state);
  maybeReink(state, p.x, p.y, STATS.playerRadius);
}
function maybeShoot(state: SimState): void {
  const p = state.player,
    z = CHARACTERS.zero,
    ps = playerStats(state);
  if (p.attackCooldown > 0) return;
  const target = nearestEnemy(state, p.x, p.y, z.shotSpeed * z.shotLife + 25);
  if (!target) return;
  const dir = normalize(target.x - p.x, target.y - p.y);
  if (!dir.x && !dir.y) return;
  const empowered = p.empowerTime > 0;
  p.attackCooldown = empowered ? ps.empoweredInterval : ps.attackInterval;
  const base = Math.atan2(dir.y, dir.x);
  for (let i = 0; i < ps.bolts; i++) {
    const a = base + (i - (ps.bolts - 1) / 2) * ps.spread;
    fireBolt(state, p.x, p.y, Math.cos(a), Math.sin(a), empowered, false);
  }
}
function nearestEnemy(
  state: SimState,
  x: number,
  y: number,
  range: number,
): EnemyState | undefined {
  let target: EnemyState | undefined,
    best = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < best && d <= range) {
      best = d;
      target = e;
    }
  }
  return target;
}
function fireBolt(
  state: SimState,
  x: number,
  y: number,
  dx: number,
  dy: number,
  empowered: boolean,
  echo: boolean,
): void {
  const z = CHARACTERS.zero;
  state.shots.push({
    id: state.nextShotId++,
    x: x + dx * 14,
    y: y + dy * 14,
    vx: dx * z.shotSpeed,
    vy: dy * z.shotSpeed,
    life: z.shotLife,
    alive: true,
    empowered,
    ...(echo ? { echo: true } : {}),
    hits: [],
  });
}
/** Echo Legion: the evolved afterimage keeps firing its own bolts. */
function stepDecoy(state: SimState, dt: number): void {
  const d = state.decoy;
  if (!d.live || state.player.id !== "zero" || !playerStats(state).echo)
    return;
  const echo = UPGRADE_VALUES["echo-legion"];
  d.fire -= dt;
  if (d.fire > 0) return;
  const target = nearestEnemy(state, d.x, d.y, echo.range);
  if (!target) {
    d.fire = 0;
    return;
  }
  const dir = normalize(target.x - d.x, target.y - d.y);
  if (!dir.x && !dir.y) return;
  d.fire = echo.fireInterval;
  fireBolt(state, d.x, d.y, dir.x, dir.y, false, true);
}
function echoBurst(state: SimState): void {
  const d = state.decoy,
    echo = UPGRADE_VALUES["echo-legion"];
  effect(state, d.x, d.y, "echo-burst", EFFECT_LIFE["echo-burst"]);
  for (const e of state.enemies)
    if (
      e.alive &&
      e.spawnTime <= 0 &&
      Math.hypot(e.x - d.x, e.y - d.y) <= echo.burstRadius
    )
      hurtEnemy(state, e, echo.burstDamage);
}
/** Full Moon: a periodic pulse from Nicole that hits and pushes the crowd. */
function stepMoonPulse(state: SimState, dt: number): void {
  const ps = playerStats(state);
  if (!ps.fullMoon) return;
  const moon = UPGRADE_VALUES["full-moon"],
    p = state.player;
  state.pulseTimer -= dt;
  if (state.pulseTimer > 0) return;
  state.pulseTimer = moon.pulseInterval;
  const reach = ps.orbitRadius + moon.pulseReach;
  effect(state, p.x, p.y, "moon-pulse", EFFECT_LIFE["moon-pulse"]);
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > reach) continue;
    hurtEnemy(state, e, moon.pulseDamage);
    const dir = normalize(e.x - p.x, e.y - p.y),
      knock = moon.pulsePush * ENEMIES[e.kind].knockback,
      pos = safePosition(
        state,
        e.x + dir.x * knock,
        e.y + dir.y * knock,
        enemyRadius(e),
      );
    e.x = pos.x;
    e.y = pos.y;
    e.slowTime = Math.max(e.slowTime, 0.4);
  }
}
/** These are the very same coordinates used to draw Nicole's stars. */
export function orbitPositions(state: SimState): { x: number; y: number }[] {
  const n = CHARACTERS.nicole,
    ps = playerStats(state);
  return Array.from({ length: ps.orbitCount }, (_, i) => {
    const a = state.elapsed * n.orbitSpeed + (i * Math.PI * 2) / ps.orbitCount;
    return {
      x: state.player.x + Math.cos(a) * ps.orbitRadius,
      y: state.player.y + Math.sin(a) * ps.orbitRadius,
    };
  });
}
function stepOrbit(state: SimState): void {
  const n = CHARACTERS.nicole,
    ps = playerStats(state);
  for (const star of orbitPositions(state)) {
    maybeReink(state, star.x, star.y, 9);
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0 || e.orbitCooldown > 0) continue;
      if (circlesOverlap(star.x, star.y, 9, e.x, e.y, enemyRadius(e))) {
        hurtEnemy(state, e, ps.orbitDamage);
        e.orbitCooldown = n.orbitHitInterval;
        e.slowTime = Math.max(e.slowTime, 0.3);
        const dir = normalize(e.x - state.player.x, e.y - state.player.y),
          knock = 12 * ENEMIES[e.kind].knockback,
          pos = safePosition(
            state,
            e.x + dir.x * knock,
            e.y + dir.y * knock,
            enemyRadius(e),
          );
        e.x = pos.x;
        e.y = pos.y;
      }
    }
  }
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
  if (!e.alive) {
    state.stats.kills++;
    effect(state, e.x, e.y, "dissolve", EFFECT_LIFE.dissolve, { src: e.kind });
    countStreak(state, e);
    if (e.kind === "eraser-boss") defeatBoss(state, e);
    else dropShard(state, e.x, e.y, ENEMIES[e.kind].xp);
    if (e.kind === "crumple") splitCrumple(state, e);
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
  state.phaseSeen = phase;
  if (state.notice?.kind !== "boss-incoming")
    notify(state, `phase${phase}` as Notice);
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
      }
    } else {
      const was = o.charge;
      o.charge = Math.min(1, o.charge + dt / MOON_LANTERN.chargeTime);
      if (was < 1 && o.charge >= 1 && !state.notice) notify(state, "moon-ready");
      if (o.charge >= 1 && touching) {
        o.charge = 0;
        moonStun(state, o.x, o.y);
      }
    }
  }
}
function pumpkinPulse(state: SimState, x: number, y: number): void {
  effect(state, x, y, "pumpkin-pulse", EFFECT_LIFE["pumpkin-pulse"]);
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > PUMPKIN.auraRadius + enemyRadius(e)) continue;
    hurtEnemy(state, e, PUMPKIN.damage);
    if (!e.alive) continue;
    const dir = d > 0 ? { x: (e.x - x) / d, y: (e.y - y) / d } : { x: 1, y: 0 },
      knock = PUMPKIN.push * ENEMIES[e.kind].knockback,
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
    e.stun = e.kind === "eraser-boss" ? MOON_LANTERN.bossStun : MOON_LANTERN.stunTime;
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
    state.stats.treatsEaten++;
    effect(state, t.x, t.y, "treat", EFFECT_LIFE.treat);
  }
}
/** A crumpled ball bursts into small blobs, as far as the cap allows. */
function splitCrumple(state: SimState, e: EnemyState): void {
  effect(state, e.x, e.y, "crumple", ENEMY_FX_LIFE.crumple);
  for (let i = 0; i < CRUMPLE.splitCount; i++) {
    if (livingEnemies(state) >= ENEMY_CAP) break;
    const side = i % 2 ? 1 : -1;
    spawnEnemy(
      state,
      "ink-blob",
      e.x + side * CRUMPLE.splitOffset,
      e.y + (i >> 1) * CRUMPLE.splitOffset,
      CRUMPLE.splitHp,
      0.2,
    );
  }
}
function defeatBoss(state: SimState, e: EnemyState): void {
  state.boss.defeated = true;
  state.stats.bossDefeated = true;
  e.act = null;
  effect(state, e.x, e.y, "boss-down", ENEMY_FX_LIFE["boss-down"]);
  notify(state, "boss-defeated");
  // A ring of heavy shards, placed without RNG.
  for (let i = 0; i < BOSS.rewardShards; i++) {
    const a = (i / BOSS.rewardShards) * Math.PI * 2;
    dropShard(
      state,
      e.x + Math.cos(a) * 22,
      e.y + Math.sin(a) * 14,
      BOSS.rewardValue,
    );
  }
}
function dropShard(state: SimState, x: number, y: number, value: number): void {
  // Shards collected this step stay in the array (alive = false) until the
  // end-of-step filter, so only living shards count toward the cap.
  let living = 0;
  for (const s of state.pickups) if (s.alive) living++;
  if (living >= XP.maxPickups) {
    // Fold the oldest living shard's worth into the newest so nothing is lost.
    const i = state.pickups.findIndex((s) => s.alive);
    value += state.pickups[i].value;
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
}
/** Applies card `index` of the pending choice. Returns false if nothing was applied. */
export function chooseUpgrade(state: SimState, index: number): boolean {
  const choice = state.pendingChoice,
    id = choice?.options[index],
    def = id ? upgradeDef(id) : undefined;
  if (!choice || !def) return false;
  const p = state.player;
  state.upgrades[def.id] = (state.upgrades[def.id] ?? 0) + 1;
  state.stats.upgradesTaken++;
  state.pendingChoice = null;
  if (def.id === "vitality") {
    p.maxHp += UPGRADE_VALUES.vitality.maxHp;
    p.hp = Math.min(p.maxHp, p.hp + UPGRADE_VALUES.vitality.heal);
  } else if (def.id === "snack")
    p.hp = Math.min(p.maxHp, p.hp + UPGRADE_VALUES.snack.heal);
  if (def.evolution) {
    if (def.id === "full-moon")
      state.pulseTimer = UPGRADE_VALUES["full-moon"].pulseInterval * 0.5;
    effect(state, p.x, p.y, "evolve", EFFECT_LIFE.evolve);
    notify(state, p.id === "zero" ? "evolve-zero" : "evolve-nicole");
  }
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
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    maybeReink(state, s.x, s.y, STATS.shotRadius + 6);
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
    for (const e of targets) {
      hurtEnemy(state, e, ps.shotDamage);
      hits.push(e.id);
      if (hits.length >= (s.empowered ? ps.empoweredPierce : ps.pierce)) {
        s.alive = false;
        break;
      }
    }
    if (s.life <= 0) s.alive = false;
  }
}
/**
 * Applies `damage` to the cat unless it is invulnerable. Shields, Nicole's
 * rescue and defeat are handled here for every enemy source.
 */
function hurtPlayer(state: SimState, damage: number): boolean {
  const p = state.player,
    n = CHARACTERS.nicole;
  if (p.invuln > 0 || state.ended !== "playing") return false;
  p.invuln = STATS.hurtIframes;
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
  if (p.id === "nicole" && !p.rescueUsed && p.hp > 0 && p.hp <= n.rescueThreshold) {
    p.rescueUsed = true;
    p.shield = n.rescueCharges;
    p.shieldTime = n.rescueDuration;
    effect(state, p.x, p.y, "rescue", 0.8);
    notify(state, "nicole-rescue");
  }
  if (p.hp <= 0) state.ended = "lost";
  return true;
}
function stepEnemies(state: SimState, dt: number, rng: Rng): void {
  const p = state.player,
    n = CHARACTERS.nicole,
    ps = playerStats(state);
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    // Moon-lantern stun: frozen ink neither moves nor bites.
    if ((e.stun ?? 0) > 0) continue;
    const def = ENEMIES[e.kind],
      boss = e.kind === "eraser-boss",
      radius = enemyRadius(e);
    let tx = p.x,
      ty = p.y;
    // The Eraser only follows the decoy when it is almost on top of it.
    const lure = boss ? Math.min(ps.decoyRange, BOSS.lureRange) : ps.decoyRange;
    if (
      state.decoy.live &&
      Math.hypot(e.x - state.decoy.x, e.y - state.decoy.y) <= lure
    ) {
      tx = state.decoy.x;
      ty = state.decoy.y;
    }
    const inside = state.fields.some(
      (f) => Math.hypot(e.x - f.x, e.y - f.y) <= (f.radius ?? n.fieldRadius),
    );
    if (inside) e.slowTime = Math.max(e.slowTime, 0.15);
    const slow = e.slowTime > 0 ? (boss ? BOSS.slowMultiplier : n.slowMultiplier) : 1,
      speed = (def.speed + (boss ? 0 : nightPhase(state) * 4)) * slow,
      dir = normalize(tx - e.x, ty - e.y);
    let dx = dir.x * speed * dt,
      dy = dir.y * speed * dt;
    if (e.kind === "paper-bat") {
      // Swoop across the line of approach on a sine path.
      const swoop =
        Math.cos(state.elapsed * BAT.swoopFrequency + (e.phase ?? 0)) *
        BAT.swoopAmount *
        speed *
        dt;
      dx += -dir.y * swoop;
      dy += dir.x * swoop;
    } else if (e.kind === "smudge") {
      const move = stepSmudge(state, e, dt, Math.hypot(p.x - e.x, p.y - e.y));
      dx *= move;
      dy *= move;
    } else if (boss) {
      const move = stepBoss(state, e, dt, rng);
      if (move === null) dx = dy = 0;
      else if (move !== "approach") {
        dx = move.dx * dt;
        dy = move.dy * dt;
      }
      if (!e.alive || state.ended !== "playing") return;
    }
    // A small deterministic separation keeps crowds legible rather than stacking sprites.
    if (!boss)
      for (const other of state.enemies) {
        if (other.id === e.id || !other.alive) continue;
        const dist = Math.hypot(e.x - other.x, e.y - other.y),
          gap = Math.max(20, (radius + enemyRadius(other)) * 0.9);
        if (dist > 0 && dist < gap) {
          dx += ((e.x - other.x) / dist) * (gap - dist) * dt * 2;
          dy += ((e.y - other.y) / dist) * (gap - dist) * dt * 2;
        }
      }
    const kept = safePosition(state, e.x + dx, e.y + dy, radius);
    e.x = kept.x;
    e.y = kept.y;
    if (
      p.invuln > 0 ||
      !circlesOverlap(e.x, e.y, radius, p.x, p.y, STATS.playerRadius)
    )
      continue;
    hurtPlayer(state, def.contactDamage);
    const push = normalize(p.x - e.x, p.y - e.y),
      pos = safePosition(
        state,
        p.x + push.x * (boss ? 16 : 8),
        p.y + push.y * (boss ? 16 : 8),
        STATS.playerRadius,
      );
    p.x = pos.x;
    p.y = pos.y;
    const back = 18 * def.knockback,
      enemyPos = safePosition(
        state,
        e.x - push.x * back,
        e.y - push.y * back,
        radius,
      );
    e.x = enemyPos.x;
    e.y = enemyPos.y;
    if (state.ended !== "playing") return;
  }
}
/** Returns a movement factor: smudges stand still while in range or winding up. */
function stepSmudge(
  state: SimState,
  e: EnemyState,
  dt: number,
  dist: number,
): number {
  const p = state.player;
  e.timer = Math.max(0, (e.timer ?? 0) - dt);
  if ((e.windup ?? 0) > 0) {
    e.windup = Math.max(0, e.windup! - dt);
    if (e.windup <= 0) throwInk(state, e);
    return 0;
  }
  if (dist > SMUDGE.range) return 1;
  if (e.timer <= 0) {
    e.windup = SMUDGE.windup;
    e.tx = p.x;
    e.ty = p.y;
  }
  return 0;
}
function throwInk(state: SimState, e: EnemyState): void {
  const tx = e.tx ?? state.player.x,
    ty = e.ty ?? state.player.y,
    d = Math.hypot(tx - e.x, ty - e.y);
  state.enemyShots.push({
    id: state.nextHazardId++,
    x0: e.x,
    y0: e.y,
    tx,
    ty,
    t: 0,
    flight: Math.max(SMUDGE.minFlight, d / SMUDGE.dropSpeed),
    alive: true,
  });
  e.timer = SMUDGE.cooldown;
}
/** Ink drops arc to their locked target, splash, and leave a slowing puddle. */
function stepEnemyShots(state: SimState, dt: number): void {
  if (state.ended !== "playing") return;
  const p = state.player;
  for (const s of state.enemyShots) {
    if (!s.alive) continue;
    s.t += dt;
    if (s.t < s.flight) continue;
    s.alive = false;
    effect(state, s.tx, s.ty, "splat", ENEMY_FX_LIFE.splat);
    state.hazards.push({
      id: state.nextHazardId++,
      kind: "puddle",
      x: s.tx,
      y: s.ty,
      radius: SMUDGE.puddleRadius,
      life: SMUDGE.puddleLife,
      maxLife: SMUDGE.puddleLife,
    });
    if (Math.hypot(p.x - s.tx, p.y - s.ty) <= SMUDGE.splashRadius + STATS.playerRadius)
      hurtPlayer(state, SMUDGE.splashDamage);
  }
}
/** Starts a telegraphed Boss attack aimed at the cat. Exported for tests. */
export function startBossAttack(
  state: SimState,
  e: EnemyState,
  kind: BossAttack,
): BossAct {
  const d = normalize(state.player.x - e.x, state.player.y - e.y),
    dir = d.x || d.y ? d : { x: 1, y: 0 };
  e.act = {
    kind,
    t: BOSS[kind].telegraph,
    run: 0,
    x: e.x,
    y: e.y,
    dx: dir.x,
    dy: dir.y,
  };
  return e.act;
}
/** True when (x, y) with `pad` lies inside the erase sweep rectangle. */
export function inSweep(a: BossAct, x: number, y: number, pad = 0): boolean {
  const rx = x - a.x,
    ry = y - a.y,
    along = rx * a.dx + ry * a.dy,
    across = Math.abs(rx * a.dy - ry * a.dx);
  return (
    along >= -ENEMIES["eraser-boss"].radius - pad &&
    along <= BOSS.sweep.length + pad &&
    across <= BOSS.sweep.width / 2 + pad
  );
}
/** Boss brain: approach, then rotate through telegraphed attacks. */
function stepBoss(
  state: SimState,
  e: EnemyState,
  dt: number,
  rng: Rng,
): { dx: number; dy: number } | "approach" | null {
  const a = e.act;
  if (a) {
    if (a.t > 0) {
      a.t -= dt;
      if (a.t > 0) return null;
      resolveBossAttack(state, e, a);
      return null;
    }
    if (a.kind === "charge" && a.run > 0) {
      a.run -= dt;
      if (a.run <= 0) endBossAttack(e);
      return { dx: a.dx * BOSS.charge.speed, dy: a.dy * BOSS.charge.speed };
    }
    endBossAttack(e);
    return null;
  }
  e.timer = (e.timer ?? 0) - dt;
  if (e.timer <= 0) {
    // Never the same attack twice in a row.
    const next = ((e.combo ?? 0) + 1 + rng.int(0, 2)) % BOSS_ATTACKS.length;
    e.combo = next;
    startBossAttack(state, e, BOSS_ATTACKS[next]!);
    return null;
  }
  return "approach";
}
function endBossAttack(e: EnemyState): void {
  e.act = null;
  e.timer = BOSS.attackGap;
}
function resolveBossAttack(state: SimState, e: EnemyState, a: BossAct): void {
  if (a.kind === "sweep") {
    eraseSweep(state, a);
    endBossAttack(e);
  } else if (a.kind === "summon") {
    effect(state, e.x, e.y, "summon", ENEMY_FX_LIFE.summon);
    for (let i = 0; i < BOSS.summon.count; i++) {
      if (livingEnemies(state) >= ENEMY_CAP) break;
      const ang = (i / BOSS.summon.count) * Math.PI * 2 + Math.PI / 2;
      spawnEnemy(
        state,
        "ink-blob",
        e.x + Math.cos(ang) * BOSS.summon.distance,
        e.y + Math.sin(ang) * BOSS.summon.distance * 0.6,
        ENEMIES["ink-blob"].hp,
        0.35,
      );
    }
    endBossAttack(e);
  } else {
    a.run = BOSS.charge.time;
  }
}
/** The erase sweep damages the cat inside it and rubs the page line blank. */
function eraseSweep(state: SimState, a: BossAct): void {
  const p = state.player,
    s = state.stroke,
    mid = BOSS.sweep.length / 2;
  effect(state, a.x + a.dx * mid, a.y + a.dy * mid, "erase", ENEMY_FX_LIFE.erase);
  if (inSweep(a, p.x, p.y, STATS.playerRadius)) hurtPlayer(state, BOSS.sweep.damage);
  if (s.points.some((q) => inSweep(a, q.x, q.y, s.thickness / 2))) {
    s.ink = 0;
    s.blankTime = STATS.strokeBlankTime;
  }
  for (const h of state.hazards) if (inSweep(a, h.x, h.y)) h.life = 0;
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
export function livingEnemies(state: SimState): number {
  return state.enemies.filter((e) => e.alive).length;
}
