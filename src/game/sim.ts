import { avoidScenery } from "./scenery.js";
import { createRng, type Rng } from "./rng.js";
import {
  circlesOverlap,
  clamp,
  keepInside,
  length,
  normalize,
  pointSegDist,
} from "./collision.js";
import { CHARACTERS, character } from "./characters.js";
import {
  DEFAULT_WORLD,
  STATS,
  YARD_TOP,
  type FrameInput,
  type SimConfig,
  type SimState,
  type EnemyState,
  type StrokePoint,
  type Notice,
  type EffectKind,
} from "./types.js";

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
    decoy: { live: false, x: 0, y: 0, time: 0 },
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
    },
    notice: null,
  };
  spawnBlob(state, world.width * 0.78, world.height * 0.62);
  spawnBlob(state, world.width * 0.24, world.height * 0.85);
  spawnBlob(state, world.width * 0.39, YARD_TOP + 18);
  return state;
}
function spawnBlob(state: SimState, x: number, y: number): void {
  const pos = keepInside(
    x,
    y,
    STATS.enemyRadius,
    state.world.width,
    state.world.height,
    16,
    YARD_TOP,
  );
  state.enemies.push({
    id: state.nextEnemyId++,
    kind: "ink-blob",
    x: pos.x,
    y: pos.y,
    hp: STATS.enemyHp,
    alive: true,
    orbitCooldown: 0,
    slowTime: 0,
    spawnTime: 0.65,
  });
}
export function nightPhase(state: SimState): 0 | 1 | 2 | 3 {
  const progress = state.elapsed / state.sessionSeconds;
  return progress < 0.2 ? 0 : progress < 0.6 ? 1 : progress < 0.9 ? 2 : 3;
}
function spawnAroundEdge(state: SimState, rng: Rng): void {
  const { width, height } = state.world,
    side = rng.int(0, 4);
  let x = side < 2 ? rng.float(28, width - 28) : side === 2 ? 28 : width - 28;
  let y =
    side === 0
      ? YARD_TOP + 16
      : side === 1
        ? height - 26
        : rng.float(YARD_TOP + 16, height - 28);
  if (Math.hypot(x - state.player.x, y - state.player.y) < 120) {
    x = clamp(
      state.player.x + (x < state.player.x ? -160 : 160),
      28,
      width - 28,
    );
    y = clamp(y, YARD_TOP + 16, height - 26);
  }
  spawnBlob(state, x, y);
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
): void {
  state.impacts.push({ x, y, kind, life });
}
function notify(state: SimState, kind: Notice): void {
  state.notice = { kind, life: 2.2 };
}
function safePosition(state: SimState, x: number, y: number, radius: number) {
  const a = keepInside(
    x,
    y,
    radius,
    state.world.width,
    state.world.height,
    10,
    YARD_TOP,
  );
  const b = avoidScenery(a.x, a.y, radius, state.world.width);
  return keepInside(
    b.x,
    b.y,
    radius,
    state.world.width,
    state.world.height,
    10,
    YARD_TOP,
  );
}
export function step(state: SimState, input: FrameInput, dt: number): void {
  if (state.ended !== "playing" || dt <= 0) return;
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
  if (state.notice) {
    state.notice.life -= dt;
    if (state.notice.life <= 0) state.notice = null;
  }
  if (state.decoy.live) {
    state.decoy.time = Math.max(0, state.decoy.time - dt);
    state.decoy.live = state.decoy.time > 0;
  }
  for (const e of state.enemies) {
    e.orbitCooldown = Math.max(0, e.orbitCooldown - dt);
    e.slowTime = Math.max(0, e.slowTime - dt);
    e.spawnTime = Math.max(0, e.spawnTime - dt);
  }
  stepPlayer(state, input, dt);
  stepStroke(state, dt);
  if (state.player.id === "nicole") stepOrbit(state);
  stepShots(state, dt);
  stepEnemies(state, dt);
  if (state.ended === "playing") {
    const phase = nightPhase(state),
      cap = [7, 10, 14, 18][phase]!;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      for (
        let i = 0;
        i < [1, 2, 2, 3][phase]! && livingEnemies(state) < cap;
        i++
      )
        spawnAroundEdge(state, rng);
      state.spawnTimer = [3.8, 3.4, 2.4, 1.65][phase]!;
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
  state.shots = state.shots.filter((s) => s.alive);
  state.rngState = rng.state();
}
function stepPlayer(state: SimState, input: FrameInput, dt: number): void {
  const p = state.player,
    def = character(p.id);
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
  if (input.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    const dir =
      length(input.ax, input.ay) < 0.15
        ? { x: p.facing, y: 0 }
        : normalize(input.ax, input.ay);
    p.dashTime = def.dashTime;
    p.dashCooldown = def.cooldown;
    p.invuln = Math.max(p.invuln, def.invulnerability);
    p.vx = dir.x * def.dashSpeed;
    p.vy = dir.y * def.dashSpeed;
    if (dir.x) p.facing = dir.x < 0 ? -1 : 1;
    state.stats.skillUses++;
    if (p.id === "zero") {
      state.decoy = {
        live: true,
        x: p.x,
        y: p.y,
        time: CHARACTERS.zero.decoyLife,
      };
      p.empowerTime = CHARACTERS.zero.empowerDuration;
      p.attackCooldown = 0;
      effect(state, p.x, p.y, "dash", 0.4);
      notify(state, "zero-dash");
    } else {
      const n = CHARACTERS.nicole;
      state.fields.push({ x: p.x, y: p.y, life: n.fieldDuration });
      p.shield = Math.max(p.shield, n.shieldCharges);
      p.shieldTime = Math.max(p.shieldTime, n.shieldDuration);
      for (const e of state.enemies)
        if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) <= n.fieldRadius) {
          e.slowTime = 0.5;
          const push = normalize(e.x - p.x, e.y - p.y);
          const pos = safePosition(
            state,
            e.x + push.x * 20,
            e.y + push.y * 20,
            STATS.enemyRadius,
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
    p.vx = dir.x * def.speed * p.slow;
    p.vy = dir.y * def.speed * p.slow;
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
    z = CHARACTERS.zero;
  if (p.attackCooldown > 0) return;
  let target: EnemyState | undefined,
    best = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best && d <= z.shotSpeed * z.shotLife + 25) {
      best = d;
      target = e;
    }
  }
  if (!target) return;
  const dir = normalize(target.x - p.x, target.y - p.y);
  if (!dir.x && !dir.y) return;
  const empowered = p.empowerTime > 0;
  p.attackCooldown = empowered ? z.empoweredInterval : z.attackInterval;
  state.shots.push({
    id: state.nextShotId++,
    x: p.x + dir.x * 14,
    y: p.y + dir.y * 14,
    vx: dir.x * z.shotSpeed,
    vy: dir.y * z.shotSpeed,
    life: z.shotLife,
    alive: true,
    empowered,
    hits: [],
  });
}
/** These are the very same coordinates used to draw Nicole's stars. */
export function orbitPositions(state: SimState): { x: number; y: number }[] {
  const n = CHARACTERS.nicole;
  return Array.from({ length: n.orbitCount }, (_, i) => {
    const a = state.elapsed * n.orbitSpeed + (i * Math.PI * 2) / n.orbitCount;
    return {
      x: state.player.x + Math.cos(a) * n.orbitRadius,
      y: state.player.y + Math.sin(a) * n.orbitRadius,
    };
  });
}
function stepOrbit(state: SimState): void {
  const n = CHARACTERS.nicole;
  for (const star of orbitPositions(state)) {
    maybeReink(state, star.x, star.y, 9);
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTime > 0 || e.orbitCooldown > 0) continue;
      if (circlesOverlap(star.x, star.y, 9, e.x, e.y, STATS.enemyRadius)) {
        hurtEnemy(state, e, n.orbitDamage);
        e.orbitCooldown = n.orbitHitInterval;
        e.slowTime = Math.max(e.slowTime, 0.3);
        const dir = normalize(e.x - state.player.x, e.y - state.player.y),
          pos = safePosition(
            state,
            e.x + dir.x * 12,
            e.y + dir.y * 12,
            STATS.enemyRadius,
          );
        e.x = pos.x;
        e.y = pos.y;
      }
    }
  }
}
function hurtEnemy(state: SimState, e: EnemyState, damage: number): void {
  if (!e.alive) return;
  state.stats.damageDealt += Math.min(damage, e.hp);
  e.hp = Math.max(0, e.hp - damage);
  e.alive = e.hp > 0;
  effect(state, e.x, e.y, e.alive ? "hit" : "defeat", e.alive ? 0.16 : 0.32);
  if (!e.alive) state.stats.kills++;
}
function stepShots(state: SimState, dt: number): void {
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
            STATS.shotRadius + STATS.enemyRadius,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy),
      );
    for (const e of targets) {
      hurtEnemy(state, e, CHARACTERS.zero.shotDamage);
      hits.push(e.id);
      if (hits.length >= (s.empowered ? CHARACTERS.zero.empoweredPierce : 1)) {
        s.alive = false;
        break;
      }
    }
    if (s.life <= 0) s.alive = false;
  }
}
function stepEnemies(state: SimState, dt: number): void {
  const p = state.player,
    n = CHARACTERS.nicole;
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    let tx = p.x,
      ty = p.y;
    if (
      state.decoy.live &&
      Math.hypot(e.x - state.decoy.x, e.y - state.decoy.y) <=
        CHARACTERS.zero.decoyRange
    ) {
      tx = state.decoy.x;
      ty = state.decoy.y;
    }
    const inside = state.fields.some(
      (f) => Math.hypot(e.x - f.x, e.y - f.y) <= n.fieldRadius,
    );
    if (inside) e.slowTime = Math.max(e.slowTime, 0.15);
    const speed =
        (STATS.enemySpeed + nightPhase(state) * 4) *
        (e.slowTime > 0 ? n.slowMultiplier : 1),
      dir = normalize(tx - e.x, ty - e.y);
    // A small deterministic separation keeps crowds legible rather than stacking sprites.
    let dx = dir.x * speed * dt,
      dy = dir.y * speed * dt;
    for (const other of state.enemies) {
      if (other.id === e.id || !other.alive) continue;
      const dist = Math.hypot(e.x - other.x, e.y - other.y);
      if (dist > 0 && dist < 20) {
        dx += ((e.x - other.x) / dist) * (20 - dist) * dt * 2;
        dy += ((e.y - other.y) / dist) * (20 - dist) * dt * 2;
      }
    }
    const kept = safePosition(state, e.x + dx, e.y + dy, STATS.enemyRadius);
    e.x = kept.x;
    e.y = kept.y;
    if (
      p.invuln > 0 ||
      !circlesOverlap(e.x, e.y, STATS.enemyRadius, p.x, p.y, STATS.playerRadius)
    )
      continue;
    p.invuln = STATS.hurtIframes;
    if (p.shield > 0 && p.shieldTime > 0) {
      p.shield--;
      state.stats.shieldBlocks++;
      effect(state, p.x, p.y, "shield", 0.4);
      notify(state, "shield-block");
    } else {
      p.hp = Math.max(0, p.hp - STATS.contactDamage);
      state.stats.damageTaken++;
      effect(state, p.x, p.y, "hurt", 0.35);
      if (
        p.id === "nicole" &&
        !p.rescueUsed &&
        p.hp > 0 &&
        p.hp <= n.rescueThreshold
      ) {
        p.rescueUsed = true;
        p.shield = n.rescueCharges;
        p.shieldTime = n.rescueDuration;
        effect(state, p.x, p.y, "rescue", 0.8);
        notify(state, "nicole-rescue");
      }
    }
    const push = normalize(p.x - e.x, p.y - e.y),
      pos = safePosition(
        state,
        p.x + push.x * 8,
        p.y + push.y * 8,
        STATS.playerRadius,
      );
    p.x = pos.x;
    p.y = pos.y;
    const enemyPos = safePosition(
      state,
      e.x - push.x * 18,
      e.y - push.y * 18,
      STATS.enemyRadius,
    );
    e.x = enemyPos.x;
    e.y = enemyPos.y;
    if (p.hp <= 0) {
      state.ended = "lost";
      return;
    }
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
export function livingEnemies(state: SimState): number {
  return state.enemies.filter((e) => e.alive).length;
}
