/**
 * Composable enemy AI pieces, referenced by id from EnemyDef.behaviours.
 * Every enemy starts with a straight chase toward its target (the cat or a
 * nearby decoy); pieces then bend, pause or replace that move.
 */
import type { EnemyState, SimState } from "../../game/types.js";
import type { EnemyBehaviour } from "../types.js";
import type { BAT } from "./paper-bat/def.js";
import type { BOSS } from "./eraser-boss/def.js";
import { stepBoss } from "./eraser-boss/attacks.js";
import { KIRO_GHOST, kiroGhostMotion } from "./kiro-ghost/def.js";

/** Plain chase: the default move, unchanged. */
export const CHASE: EnemyBehaviour = { id: "chase" };

/** Keep the pulse on the actor clock so stuns pause both movement and folds. */
export const GHOST_GLIDE: EnemyBehaviour = {
  id: "ghost-glide",
  steer(_state, e, move) {
    e.timer = ((e.timer ?? 0) + move.dt) % KIRO_GHOST.cycle;
    const { speed } = kiroGhostMotion(e.timer);
    move.dx *= speed;
    move.dy *= speed;
  },
};

/** Swoop across the line of approach on a sine path. */
export const SWOOP: EnemyBehaviour<typeof BAT> = {
  id: "swoop",
  steer(state, e, m, bat) {
    const swoop =
      Math.cos(state.elapsed * bat.swoopFrequency + (e.phase ?? 0)) * bat.swoopAmount * m.speed * m.dt;
    m.dx += -m.dir.y * swoop;
    m.dy += m.dir.x * swoop;
  },
};

/** Numbers of a kiting lobber (smudge ink drops, wash water spit). */
export interface KiteLobParams {
  readonly range: number;
  readonly windup: number;
  readonly cooldown: number;
  readonly dropSpeed: number;
  readonly minFlight: number;
  /** What the lob carries; default the smudge's ink drop. */
  readonly shot?: "water";
}
export function lobFlightTime(distance: number, params: KiteLobParams): number {
  return Math.max(params.minFlight, distance / params.dropSpeed);
}
/** Stop at range, wind up, and lob a slow ink drop at the cat's locked spot. */
export const KITE_LOB: EnemyBehaviour<KiteLobParams> = {
  id: "kite-lob",
  steer(state, e, m, smudge) {
    const move = kiteLob(state, e, m.dt, m.dist, smudge);
    m.dx *= move;
    m.dy *= move;
  },
};

/** Returns a movement factor: kiting enemies stand still while in range or winding up. */
function kiteLob(state: SimState, e: EnemyState, dt: number, dist: number, smudge: KiteLobParams): number {
  const p = state.player;
  e.timer = Math.max(0, (e.timer ?? 0) - dt);
  if ((e.windup ?? 0) > 0) {
    e.windup = Math.max(0, e.windup! - dt);
    if (e.windup <= 0) throwInk(state, e, smudge);
    return 0;
  }
  if (dist > smudge.range) return 1;
  if (e.timer <= 0) {
    e.windup = smudge.windup;
    e.tx = p.x;
    e.ty = p.y;
  }
  return 0;
}

function throwInk(state: SimState, e: EnemyState, smudge: KiteLobParams): void {
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
    flight: lobFlightTime(d, smudge),
    alive: true,
    ...(smudge.shot ? { kind: smudge.shot } : {}),
  });
  e.timer = smudge.cooldown;
}

/** The Eraser hunts across the map at speed, slows to fight up close, and attacks. */
export const BOSS_HUNT: EnemyBehaviour<typeof BOSS> = {
  id: "boss-hunt",
  speed(state, e, def, boss) {
    const p = state.player;
    return Math.hypot(p.x - e.x, p.y - e.y) > boss.huntRange ? boss.huntSpeed : def.stats.speed;
  },
  steer(state, e, m, _boss, rng, ctx) {
    const move = stepBoss(state, e, m.dt, rng, ctx);
    if (move === null) m.dx = m.dy = 0;
    else if (move !== "approach") {
      m.dx = move.dx * m.dt;
      m.dy = move.dy * m.dt;
    }
    if (!e.alive || state.ended !== "playing") return "halt";
  },
};
