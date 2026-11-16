export const FIXED_DT = 1 / 60;
export const MAX_FRAME_SEC = 0.1;
export const MAX_STEPS = 6;

export interface Clock {
  acc: number;
}

export function createClock(): Clock {
  return { acc: 0 };
}

/** Returns how many fixed steps to run. Drops leftover time if the cap is hit. */
export function tickClock(clock: Clock, realDt: number): number {
  clock.acc += Math.min(Math.max(realDt, 0), MAX_FRAME_SEC);
  let steps = 0;
  while (clock.acc >= FIXED_DT && steps < MAX_STEPS) {
    clock.acc -= FIXED_DT;
    steps += 1;
  }
  if (steps === MAX_STEPS) clock.acc = 0;
  return steps;
}
