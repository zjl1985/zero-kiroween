/** Render-only hash. Never use the simulation RNG for visual jitter. */
export function visHash(n: number): number {
  let s = n | 0;
  s = Math.imul(s ^ 0x9e3779b9, 0x85ebca6b);
  s ^= s >>> 13;
  s = Math.imul(s ^ 0x165667b1, 0x27d4eb2f);
  return (s >>> 0) / 4294967296;
}

export function jitter(id: number, i: number, amount: number): { x: number; y: number } {
  const a = visHash(id * 131 + i * 17 + 3);
  const b = visHash(id * 191 + i * 29 + 11);
  return { x: (a - 0.5) * 2 * amount, y: (b - 0.5) * 2 * amount };
}
