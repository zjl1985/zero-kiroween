/** Deterministic mulberry32. Style switching must never consume this generator. */
export interface Rng {
  next(): number;
  float(min?: number, max?: number): number;
  int(min: number, max: number): number;
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    float(min = 0, max = 1) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min) * next());
    },
    state() {
      return s;
    },
  };
}
