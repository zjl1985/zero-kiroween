import { normalize } from "../../../game/collision.js";
import type { Rng } from "../../../game/rng.js";
import { STATS, type BossAct, type EnemyState, type SimState } from "../../../game/types.js";
import { clampToWorld } from "../../../game/world-gen.js";
import { FILLER_KIND, HORDE } from "../../horde.js";
import type { SimContext } from "../../types.js";
import { ENEMY_FX_LIFE } from "../fx-life.js";
import { BOSS, BOSS_ATTACKS, ERASER_STATS, type BossAttack } from "./def.js";

/** Starts a telegraphed Boss attack aimed at the cat. */
export function startBossAttack(state: SimState, e: EnemyState, kind: BossAttack): BossAct {
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
    along >= -ERASER_STATS.radius - pad &&
    along <= BOSS.sweep.length + pad &&
    across <= BOSS.sweep.width / 2 + pad
  );
}

/** Boss brain: approach, then rotate through telegraphed attacks. */
export function stepBoss(
  state: SimState,
  e: EnemyState,
  dt: number,
  rng: Rng,
  ctx: SimContext,
): { dx: number; dy: number } | "approach" | null {
  const a = e.act;
  if (a) {
    if (a.t > 0) {
      a.t -= dt;
      if (a.t > 0) return null;
      resolveBossAttack(state, e, a, ctx);
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
  // Attacks wait until the hunt has closed in on the cat.
  const near = Math.hypot(state.player.x - e.x, state.player.y - e.y) <= BOSS.huntRange;
  if (e.timer <= 0 && near) {
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

function resolveBossAttack(state: SimState, e: EnemyState, a: BossAct, ctx: SimContext): void {
  if (a.kind === "sweep") {
    eraseSweep(state, a, ctx);
    endBossAttack(e);
  } else if (a.kind === "summon") {
    ctx.effect(state, e.x, e.y, "summon", ENEMY_FX_LIFE.summon);
    for (let i = 0; i < BOSS.summon.count; i++) {
      if (ctx.livingEnemies(state) >= HORDE.hardCap) break;
      const ang = (i / BOSS.summon.count) * Math.PI * 2 + Math.PI / 2;
      ctx.spawnEnemy(
        state,
        FILLER_KIND,
        e.x + Math.cos(ang) * BOSS.summon.distance,
        e.y + Math.sin(ang) * BOSS.summon.distance * 0.6,
        undefined,
        0.35,
      );
    }
    endBossAttack(e);
  } else {
    a.run = BOSS.charge.time;
  }
}

/** The erase sweep damages the cat inside it and rubs the page line blank. */
function eraseSweep(state: SimState, a: BossAct, ctx: SimContext): void {
  const p = state.player,
    s = state.stroke,
    mid = BOSS.sweep.length / 2,
    // The rub-out mark stays on the map even when the sweep reaches past the edge.
    mark = clampToWorld(a.x + a.dx * mid, a.y + a.dy * mid, 0);
  ctx.effect(state, mark.x, mark.y, "erase", ENEMY_FX_LIFE.erase);
  if (inSweep(a, p.x, p.y, STATS.playerRadius)) ctx.hurtPlayer(state, BOSS.sweep.damage);
  if (s.points.some((q) => inSweep(a, q.x, q.y, s.thickness / 2))) {
    s.ink = 0;
    s.blankTime = STATS.strokeBlankTime;
  }
  for (const h of state.hazards) if (inSweep(a, h.x, h.y)) h.life = 0;
}
