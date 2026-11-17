/** Parse a decimal uint32 seed pin; null means the caller should choose a fresh seed. */
export function parseSeed(value: string | null): number | null {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const seed = Number(value);
  return seed <= 0xffff_ffff ? seed : null;
}
