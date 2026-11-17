import type { SimState } from "../../game/types.js";

/** Counts down a weapon timer; true when it fires this step. */
export function weaponReady(state: SimState, id: string, dt: number): boolean {
  const t = (state.weaponTimers[id] ?? 0) - dt;
  state.weaponTimers[id] = Math.max(0, t);
  return t <= 0;
}
