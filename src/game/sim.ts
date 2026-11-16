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
  playerStats,
  rollChoices,
  upgradeDef,
  xpForLevel,
  XP,
  UPGRADE_VALUES,
} from "./upgrades.js";
import {
  DEFAULT_WORLD,
  EFFECT_LIFE,
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
  }
  stepPlayer(state, input, dt);
  stepDecoy(state, dt);
  stepStroke(state, dt);
  if (state.player.id === "nicole") {
    stepOrbit(state);
    stepMoonPulse(state, dt);
  }
  stepShots(state, dt);
  stepEnemies(state, dt);
  stepPickups(state, dt, rng);
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
  state.pickups = state.pickups.filter((s) => s.alive);
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
      pos = safePosition(
        state,
        e.x + dir.x * moon.pulsePush,
        e.y + dir.y * moon.pulsePush,
        STATS.enemyRadius,
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
      if (circlesOverlap(star.x, star.y, 9, e.x, e.y, STATS.enemyRadius)) {
        hurtEnemy(state, e, ps.orbitDamage);
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
  if (!e.alive) {
    state.stats.kills++;
    dropShard(state, e.x, e.y, XP.shardValue);
  }
}
function dropShard(state: SimState, x: number, y: number, value: number): void {
  if (state.pickups.length >= XP.maxPickups) {
    // Fold the oldest shard's worth into the newest so nothing is lost.
    const old = state.pickups.shift()!;
    value += old.value;
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
            STATS.shotRadius + STATS.enemyRadius,
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
function stepEnemies(state: SimState, dt: number): void {
  const p = state.player,
    n = CHARACTERS.nicole,
    ps = playerStats(state);
  for (const e of state.enemies) {
    if (!e.alive || e.spawnTime > 0) continue;
    let tx = p.x,
      ty = p.y;
    if (
      state.decoy.live &&
      Math.hypot(e.x - state.decoy.x, e.y - state.decoy.y) <= ps.decoyRange
    ) {
      tx = state.decoy.x;
      ty = state.decoy.y;
    }
    const inside = state.fields.some(
      (f) => Math.hypot(e.x - f.x, e.y - f.y) <= (f.radius ?? n.fieldRadius),
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
