import { LANDMARK_ACTIONS, LANDMARK_ACTIVITY_SITES, landmarkActivityPoint } from "../defs/landmark-activities.js";
import { LANDMARK_DEFS, PROP_DEFS } from "../defs/registries.js";
import type { Element, LandmarkActivity, LandmarkPlace, SimContext } from "../defs/types.js";
import { EFFECT_LIFE, type LandmarkEventState, type SimState } from "./types.js";
import { landmarks, nearProps } from "./world-gen.js";

function eventFor(state: SimState, l: LandmarkPlace): LandmarkEventState {
  return state.landmarkEvents[l.id] ??= { progress: 0, cooldown: 0, activations: 0, wind: 0, turn: state.elapsed * LANDMARK_ACTIONS.idleTurn };
}

/** Schedule, never force, renewal: ecology still checks occupancy, fire and real max HP. */
function tendFlora(state: SimState, l: LandmarkPlace, ctx: SimContext): void {
  const renewal = LANDMARK_ACTIVITY_SITES[l.kind]?.renewal;
  if (!renewal) return;
  const point = landmarkActivityPoint(l);
  let count = 0;
  for (const p of nearProps(state.seed, point.x, point.y)) {
    if (count >= renewal.maxProps) break;
    const m = state.props[p.id];
    if (!m || m.phase !== 2 || !PROP_DEFS.get(p.kind).regrow) continue;
    if (m.regrowAt === undefined || !Number.isFinite(m.regrowAt) || m.regrowAt <= state.elapsed) continue;
    if (Math.hypot(p.x - point.x, p.y - point.y) > renewal.radius) continue;
    m.regrowAt = state.elapsed;
    // Old saves and burnt flora must not gain a fresh loot roll when tended.
    m.dropsClaimed = true;
    count++;
    ctx.effect(state, p.x, p.y, "regrow", EFFECT_LIFE.regrow, { src: p.kind });
  }
}

function activate(state: SimState, l: LandmarkPlace, activity: LandmarkActivity, event: LandmarkEventState, ctx: SimContext): void {
  event.progress = 0;
  event.cooldown = activity.cooldown;
  event.activations++;
  // Lock the cooldown before invoking content hooks, which may apply more elements.
  tendFlora(state, l, ctx);
  activity.activate(state, l, ctx);
  const p = landmarkActivityPoint(l);
  ctx.effect(state, p.x, p.y, "landmark-reward", EFFECT_LIFE["landmark-reward"], {
    src: l.kind, radius: activity.radius, amount: event.activations,
  });
  ctx.notify(state, activity.notice);
}

/**
 * One pass over the finite landmark list. Progress is in seconds (not 0..1),
 * cooldown/wind are seconds remaining. Leaving a court preserves earned charge;
 * cooldowns continue offscreen. The parent skips this call while paused/upgrading.
 */
export function stepLandmarkActions(state: SimState, dt: number, ctx: SimContext): void {
  if (!Number.isFinite(dt) || dt <= 0 || state.ended !== "playing") return;
  for (const l of landmarks(state.seed)) {
    const activity = LANDMARK_DEFS.get(l.kind).activity;
    if (!activity) continue;
    let event = state.landmarkEvents[l.id];
    const cooling = event?.cooldown ?? 0;
    if (event) {
      event.cooldown = Math.max(0, cooling - dt);
      const boosted = Math.min(dt, event.wind);
      event.turn = (event.turn ?? (state.elapsed - dt) * LANDMARK_ACTIONS.idleTurn) +
        boosted * LANDMARK_ACTIONS.windTurn + (dt - boosted) * LANDMARK_ACTIONS.idleTurn;
      event.wind = Math.max(0, event.wind - dt);
    }
    if (activity.element || cooling >= dt) continue;
    const p = landmarkActivityPoint(l);
    if (Math.hypot(state.player.x - p.x, state.player.y - p.y) > activity.radius) continue;
    event ??= eventFor(state, l);
    event.progress = Math.min(activity.seconds, event.progress + Math.max(0, dt - cooling));
    if (event.progress >= activity.seconds) activate(state, l, activity, event, ctx);
  }
}

/** Wind/fold hits charge courts, not impassable building centres; no step RNG is used. */
export function hitLandmarkActions(
  state: SimState, x: number, y: number, radius: number, element: Element, power: number, ctx: SimContext,
): void {
  if (state.ended !== "playing" || (element !== "wind" && element !== "fold") || !Number.isFinite(power) || power <= 0) return;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < 0) return;
  for (const l of landmarks(state.seed)) {
    const activity = LANDMARK_DEFS.get(l.kind).activity;
    if (!activity || activity.element !== element) continue;
    const p = landmarkActivityPoint(l);
    if (Math.hypot(x - p.x, y - p.y) > radius + activity.radius) continue;
    const event = eventFor(state, l);
    if (element === "wind") event.wind = LANDMARK_ACTIONS.windSeconds;
    if (event.cooldown > 0) continue;
    event.progress = Math.min(activity.seconds, event.progress + Math.min(power, LANDMARK_ACTIONS.maxHitCharge));
    if (event.progress >= activity.seconds) activate(state, l, activity, event, ctx);
  }
}
