/** Build slots and the ink-shard XP curve (content data shared by every cat). */

/** Slot limits. The starting weapon takes one weapon slot. */
export const BUILD = { weaponSlots: 3, passiveSlots: 4 } as const;

export const XP = {
  shardValue: 1,
  pickupRadius: 52,
  collectRadius: 16,
  magnetSpeed: 230,
  maxPickups: 80,
  choices: 3,
};

/** Ink shards needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return Math.round(4 + n * 2.6 + n * n * 0.18);
}
