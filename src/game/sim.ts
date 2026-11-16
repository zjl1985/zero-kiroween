import { createRng, type Rng } from "./rng.js";
import {
  circleHitsPolyline,
  circlesOverlap,
  clamp,
  keepInside,
  length,
  normalize,
} from "./collision.js";
import {
  DEFAULT_WORLD,
  STATS,
  YARD_TOP,
  type FrameInput,
  type SimConfig,
  type SimState,
  type StrokePoint,
} from "./types.js";

function defaultStroke(width: number, height: number): StrokePoint[] {
  const cx = width * 0.5;
  const cy = height * 0.62;
  return [
    { x: cx - 160, y: cy + 18 },
    { x: cx - 80, y: cy - 16 },
    { x: cx - 10, y: cy + 8 },
    { x: cx + 70, y: cy - 22 },
    { x: cx + 150, y: cy + 10 },
  ];
}

export function createSim(config: Partial<SimConfig> = {}): SimState {
  const world = config.world ?? DEFAULT_WORLD;
  const seed = config.seed ?? 1;
  const rng = createRng(seed);
  const session = config.sessionSeconds ?? STATS.sessionSeconds;
  const playerX = world.width * 0.54;
  const playerY = world.height * 0.70;
  const state: SimState = {
    seed,
    rngState: rng.state(),
    timeLeft: session,
    elapsed: 0,
    ended: "playing",
    player: {
      id: "zero",
      x: playerX,
      y: playerY,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: STATS.maxHp,
      maxHp: STATS.maxHp,
      invuln: 0,
      dashCooldown: 0,
      dashTime: 0,
      attackCooldown: 0.2,
      slow: 1,
    },
    partner: {
      id: "nicole",
      x: playerX - 180,
      y: playerY + 6,
      facing: 1,
    },
    decoy: { live: false, x: 0, y: 0, time: 0 },
    enemies: [],
    shots: [],
    stroke: {
      points: defaultStroke(world.width, world.height),
      thickness: 16,
      ink: 1,
      blankTime: 0,
    },
    nextEnemyId: 1,
    nextShotId: 1,
    spawnTimer: 9,
    world,
  };
  spawnBlob(state, rng, world.width * 0.78, world.height * 0.62);
  state.rngState = rng.state();
  return state;
}

function attachRng(state: SimState): Rng {
  const rng = createRng(state.rngState || state.seed);
  return rng;
}

function spawnBlob(state: SimState, _rng: Rng, x: number, y: number): void {
  const pos = keepInside(x, y, STATS.enemyRadius, state.world.width, state.world.height, 16, YARD_TOP);
  state.enemies.push({
    id: state.nextEnemyId,
    kind: "ink-blob",
    x: pos.x,
    y: pos.y,
    hp: STATS.enemyHp,
    alive: true,
  });
  state.nextEnemyId += 1;
}

function spawnAroundEdge(state: SimState, rng: Rng): void {
  const { width, height } = state.world;
  const side = rng.int(0, 4);
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = rng.float(24, width - 24);
    y = YARD_TOP + 12;
  } else if (side === 1) {
    x = rng.float(24, width - 24);
    y = height - 24;
  } else if (side === 2) {
    x = 24;
    y = rng.float(YARD_TOP + 8, height - 24);
  } else {
    x = width - 24;
    y = rng.float(YARD_TOP + 8, height - 24);
  }
  const dx = x - state.player.x;
  const dy = y - state.player.y;
  if (dx * dx + dy * dy < 90 * 90) {
    x = clamp(state.player.x + (dx < 0 ? -120 : 120), 24, width - 24);
    y = clamp(state.player.y + (dy < 0 ? -80 : 80), YARD_TOP + 8, height - 24);
  }
  spawnBlob(state, rng, x, y);
}

export function snapshot(state: SimState): unknown {
  return {
    seed: state.seed,
    rngState: state.rngState,
    timeLeft: round(state.timeLeft),
    elapsed: round(state.elapsed),
    ended: state.ended,
    player: slim(state.player),
    partner: { id: state.partner.id, x: round(state.partner.x), y: round(state.partner.y), facing: state.partner.facing },
    decoy: { ...state.decoy, x: round(state.decoy.x), y: round(state.decoy.y), time: round(state.decoy.time) },
    enemies: state.enemies.map((e) => ({
      id: e.id,
      kind: e.kind,
      x: round(e.x),
      y: round(e.y),
      hp: e.hp,
      alive: e.alive,
    })),
    shots: state.shots.map((s) => ({
      id: s.id,
      x: round(s.x),
      y: round(s.y),
      vx: round(s.vx),
      vy: round(s.vy),
      life: round(s.life),
      alive: s.alive,
    })),
    stroke: { ink: round(state.stroke.ink), blankTime: round(state.stroke.blankTime) },
    nextEnemyId: state.nextEnemyId,
    nextShotId: state.nextShotId,
    spawnTimer: round(state.spawnTimer),
  };
}

function slim(p: SimState["player"]): unknown {
  return {
    id: p.id,
    x: round(p.x),
    y: round(p.y),
    vx: round(p.vx),
    vy: round(p.vy),
    facing: p.facing,
    hp: p.hp,
    invuln: round(p.invuln),
    dashCooldown: round(p.dashCooldown),
    dashTime: round(p.dashTime),
    attackCooldown: round(p.attackCooldown),
    slow: round(p.slow),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function step(state: SimState, input: FrameInput, dt: number): void {
  if (state.ended !== "playing") return;
  const rng = attachRng(state);

  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) {
    state.ended = "won";
    state.rngState = rng.state();
    return;
  }

  stepDecoy(state, dt);
  stepPlayer(state, input, dt);
  stepPartner(state, dt);
  stepStroke(state, dt);
  stepShots(state, dt);
  stepEnemies(state, dt);
  stepSpawns(state, rng, dt);
  prune(state);
  state.rngState = rng.state();
}

function stepPlayer(state: SimState, input: FrameInput, dt: number): void {
  const p = state.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);

  const blank = state.stroke.ink <= 0 && state.stroke.blankTime > 0;
  const inBlank =
    blank &&
    circleHitsPolyline(p.x, p.y, STATS.playerRadius, state.stroke.points, state.stroke.thickness);
  p.slow = inBlank ? STATS.strokeSlow : 1;

  if (input.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    let dx = input.ax;
    let dy = input.ay;
    if (length(dx, dy) < 0.15) {
      dx = p.facing;
      dy = 0;
    }
    const dir = normalize(dx, dy);
    p.dashTime = STATS.dashTime;
    p.dashCooldown = STATS.dashCooldown;
    p.invuln = Math.max(p.invuln, STATS.dashIframes);
    p.vx = dir.x * STATS.dashSpeed;
    p.vy = dir.y * STATS.dashSpeed;
    if (dir.x !== 0) p.facing = dir.x < 0 ? -1 : 1;
    state.decoy = { live: true, x: p.x, y: p.y, time: STATS.decoyTime };
  }

  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.dashTime <= 0) {
      p.vx = 0;
      p.vy = 0;
    }
  } else {
    const dir = normalize(input.ax, input.ay);
    const speed = STATS.playerSpeed * p.slow;
    p.vx = dir.x * speed;
    p.vy = dir.y * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (dir.x > 0.1) p.facing = 1;
    else if (dir.x < -0.1) p.facing = -1;
  }

  const kept = keepInside(p.x, p.y, STATS.playerRadius, state.world.width, state.world.height, 10, YARD_TOP);
  p.x = kept.x;
  p.y = kept.y;

  maybeAttack(state);
  maybeReink(state, p.x, p.y, STATS.playerRadius);
}

function maybeAttack(state: SimState): void {
  const p = state.player;
  if (p.attackCooldown > 0) return;
  const target = nearestThreat(state, p.x, p.y);
  if (!target) return;
  const dir = normalize(target.x - p.x, target.y - p.y);
  if (dir.x === 0 && dir.y === 0) return;
  p.attackCooldown = STATS.attackCooldown;
  const nose = 14;
  state.shots.push({
    id: state.nextShotId,
    x: p.x + dir.x * nose,
    y: p.y + dir.y * nose,
    vx: dir.x * STATS.shotSpeed,
    vy: dir.y * STATS.shotSpeed,
    life: STATS.shotLife,
    alive: true,
  });
  state.nextShotId += 1;
}

function nearestThreat(state: SimState, x: number, y: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function stepPartner(state: SimState, dt: number): void {
  const p = state.player;
  const n = state.partner;
  const followX = p.x - p.facing * 30;
  const followY = p.y + 10;
  n.x += (followX - n.x) * Math.min(1, 3.2 * dt);
  n.y += (followY - n.y) * Math.min(1, 3.2 * dt);
  const kept = keepInside(n.x, n.y, STATS.partnerRadius, state.world.width, state.world.height, 10, YARD_TOP);
  n.x = kept.x;
  n.y = kept.y;
  if (p.x - n.x > 4) n.facing = 1;
  else if (p.x - n.x < -4) n.facing = -1;
}

function stepDecoy(state: SimState, dt: number): void {
  if (!state.decoy.live) return;
  state.decoy.time -= dt;
  if (state.decoy.time <= 0) {
    state.decoy.live = false;
    state.decoy.time = 0;
  }
}

function stepStroke(state: SimState, dt: number): void {
  const s = state.stroke;
  if (s.blankTime > 0) {
    s.blankTime = Math.max(0, s.blankTime - dt);
    return;
  }
  s.ink = Math.max(0, s.ink - STATS.strokeFadePerSecond * dt);
  if (s.ink <= 0) {
    s.ink = 0;
    s.blankTime = STATS.strokeBlankTime;
  }
}

function maybeReink(state: SimState, x: number, y: number, radius: number): void {
  const s = state.stroke;
  if (s.blankTime > 0 && s.ink <= 0) {
    // Blank patches can still be re-inked, which ends the slow early.
  }
  if (!circleHitsPolyline(x, y, radius, s.points, s.thickness + 4)) return;
  s.ink = clamp(s.ink + STATS.strokeReink, 0, 1);
  if (s.ink > 0) s.blankTime = 0;
}

function stepShots(state: SimState, dt: number): void {
  for (const shot of state.shots) {
    if (!shot.alive) continue;
    shot.life -= dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.life <= 0) {
      shot.alive = false;
      continue;
    }
    maybeReink(state, shot.x, shot.y, STATS.shotRadius + 6);
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (!circlesOverlap(shot.x, shot.y, STATS.shotRadius, enemy.x, enemy.y, STATS.enemyRadius)) {
        continue;
      }
      enemy.hp -= STATS.shotDamage;
      shot.alive = false;
      if (enemy.hp <= 0) enemy.alive = false;
      break;
    }
  }
}

function stepEnemies(state: SimState, dt: number): void {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    let tx = p.x;
    let ty = p.y;
    if (state.decoy.live) {
      const ddx = e.x - state.decoy.x;
      const ddy = e.y - state.decoy.y;
      if (ddx * ddx + ddy * ddy <= STATS.decoyAttract * STATS.decoyAttract) {
        tx = state.decoy.x;
        ty = state.decoy.y;
      }
    }
    const dir = normalize(tx - e.x, ty - e.y);
    e.x += dir.x * STATS.enemySpeed * dt;
    e.y += dir.y * STATS.enemySpeed * dt;
    const kept = keepInside(e.x, e.y, STATS.enemyRadius, state.world.width, state.world.height, 8, YARD_TOP);
    e.x = kept.x;
    e.y = kept.y;

    if (p.invuln > 0) continue;
    if (circlesOverlap(e.x, e.y, STATS.enemyRadius, p.x, p.y, STATS.playerRadius)) {
      p.hp -= STATS.contactDamage;
      p.invuln = STATS.hurtIframes;
      const push = normalize(p.x - e.x, p.y - e.y);
      p.x += push.x * 10;
      p.y += push.y * 10;
      if (p.hp <= 0) {
        p.hp = 0;
        state.ended = "lost";
        return;
      }
    }
  }
}

function stepSpawns(state: SimState, rng: Rng, dt: number): void {
  const live = state.enemies.filter((e) => e.alive).length;
  if (live >= STATS.maxEnemies) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = STATS.spawnEvery;
  spawnAroundEdge(state, rng);
}

function prune(state: SimState): void {
  if (state.enemies.length > 12) state.enemies = state.enemies.filter((e) => e.alive);
  if (state.shots.length > 16) state.shots = state.shots.filter((s) => s.alive);
}

export function livingEnemies(state: SimState): number {
  let n = 0;
  for (const e of state.enemies) if (e.alive) n += 1;
  return n;
}
